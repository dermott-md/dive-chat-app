import { NextRequest } from "next/server";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropic, CHAT_MODEL } from "@/lib/anthropic";
import { createMcpClient, getToolsForClaude, closeMcpClient } from "@/lib/mcp-client";
import { runAgent, type AgentEvent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only tools for answering questions about the data.
const CHAT_TOOLS = ["query", "list_databases", "list_tables", "list_columns", "search_catalog"];

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string; // optional free-text hint about what the user is looking at
}

function systemPrompt(context?: string): string {
  return `You are a helpful data analyst embedded in an analytics app. The user is looking at an interactive dashboard ("Dive") built on their MotherDuck data warehouse, and can ask you follow-up questions about the data.

TOOLS
- Use the "query" tool to run DuckDB SQL against MotherDuck. Explore first with list_databases / list_tables / list_columns / search_catalog when you are unsure of the schema.
- Never invent numbers — always query for facts. If a query errors, read the error, fix the SQL, and retry.

STYLE
- Be concise and lead with the answer. Follow with a short supporting table or bullets. Use GitHub-flavored markdown.
- Format numbers readably (thousands separators, sensible rounding).
- When you show SQL results, briefly explain what they mean for the user's question.
${context ? `\nCONTEXT (what the user is currently viewing):\n${context}` : ""}`;
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
      "The chat needs an Anthropic API key. Add `ANTHROPIC_API_KEY` to your environment (`.env.local` locally, or your Vercel project settings) and restart.",
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

  const tools = await getToolsForClaude(mcpClient, CHAT_TOOLS);
  const messages: MessageParam[] = body.messages.map((m) => ({ role: m.role, content: m.content }));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAgent({
          anthropic,
          model: CHAT_MODEL,
          system: systemPrompt(body.context),
          tools,
          messages,
          mcpClient: mcpClient!,
          maxTokens: 4096,
          maxTurns: 8,
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
