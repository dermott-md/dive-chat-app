import { NextRequest } from "next/server";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropic, BUILD_MODEL } from "@/lib/anthropic";
import { createMcpClient, getToolsForClaude, closeMcpClient } from "@/lib/mcp-client";
import { runAgent, type AgentEvent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // building a dive can take a while

// Read-only exploration + dive authoring tools.
const BUILD_TOOLS = [
  "get_dive_guide",
  "query",
  "list_databases",
  "list_tables",
  "list_columns",
  "search_catalog",
  "save_dive",
  "update_dive",
  "edit_dive_content",
];

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  currentDiveId?: string; // if set, tweak this dive instead of creating a new one
}

function systemPrompt(currentDiveId?: string): string {
  return `You are a report-building assistant inside an analytics app. Users describe a report or dashboard they want in natural language, and you build it for them as a MotherDuck "Dive" — an interactive React data app that queries their live data.

WORKFLOW (follow in order)
1. Call get_dive_guide FIRST to load the current rules for authoring a valid Dive. Follow it exactly.
2. Explore the data so your queries are correct: use list_databases / list_tables / list_columns / search_catalog and run small "query" probes. Never guess column names or invent data.
3. Build the Dive's React/TSX content per the guide, wiring it to real queries against the user's databases.
4. ${
    currentDiveId
      ? `The user is iterating on an EXISTING report (dive id: ${currentDiveId}). Apply their requested changes by calling update_dive (or edit_dive_content for small tweaks) with id="${currentDiveId}". Do NOT create a new dive unless the user explicitly asks for a brand-new report.`
      : `When the design is ready, call save_dive to create the report. It returns a dive id used to preview it. Give it a clear title and description.`
  }

STYLE
- Keep chat replies short and friendly. Say what you're building or changing in one or two sentences — the dive itself is the deliverable, not long prose.
- After saving/updating, tell the user it's ready in the preview and invite them to request tweaks (e.g. "want a different chart, filter, or time range?").
- If a query errors, fix it and retry rather than asking the user.`;
}

const sseHeaders = () => ({
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
});

export async function POST(request: NextRequest) {
  const body: Body = await request.json();
  const anthropic = getAnthropic();
  const encoder = new TextEncoder();

  if (!anthropic) {
    return sseError(
      encoder,
      "The report builder needs an Anthropic API key. Add `ANTHROPIC_API_KEY` to your environment and restart.",
    );
  }

  let mcpClient;
  try {
    mcpClient = await createMcpClient();
  } catch (e) {
    return sseError(
      encoder,
      `Could not connect to the MotherDuck MCP server. Check MOTHERDUCK_TOKEN. (${e instanceof Error ? e.message : e})`,
    );
  }

  const tools = await getToolsForClaude(mcpClient, BUILD_TOOLS);
  const messages: MessageParam[] = body.messages.map((m) => ({ role: m.role, content: m.content }));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAgent({
          anthropic,
          model: BUILD_MODEL,
          system: systemPrompt(body.currentDiveId),
          tools,
          messages,
          mcpClient: mcpClient!,
          maxTokens: 16000,
          maxTurns: 14,
          send,
        });
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        await closeMcpClient(mcpClient!);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function sseError(encoder: TextEncoder, message: string): Response {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `⚠️ ${message}` })}\n\n`));
      c.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      c.close();
    },
  });
  return new Response(stream, { headers: sseHeaders() });
}
