import type Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ContentBlock,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { executeTool } from "./mcp-client";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Tools that create or change a dive — after these run we surface the dive id
// to the client so it can (re)load the embedded preview.
const DIVE_WRITE_TOOLS = new Set(["save_dive", "update_dive", "edit_dive_content"]);

/** Event shapes streamed to the browser as Server-Sent Events. */
export type AgentEvent =
  | { type: "text"; content: string }
  | { type: "tool"; tool: string; summary: string }
  | { type: "dive"; diveId: string; title?: string; description?: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface RunAgentArgs {
  anthropic: Anthropic;
  model: string;
  system: string;
  tools: Tool[];
  messages: MessageParam[];
  mcpClient: Client;
  maxTokens?: number;
  maxTurns?: number;
  send: (e: AgentEvent) => void;
}

/** A short, human-friendly label for a tool call shown as an activity chip. */
function toolSummary(name: string, input: Record<string, unknown>): string {
  const sql = (input.query as string) || (input.sql as string);
  if (name === "query" && sql) return sql;
  switch (name) {
    case "get_dive_guide":
      return "Reading the dive building guide…";
    case "save_dive":
      return `Creating report${input.title ? `: ${input.title}` : ""}…`;
    case "update_dive":
    case "edit_dive_content":
      return "Updating the report…";
    case "list_databases":
      return "Listing databases…";
    case "list_tables":
      return "Listing tables…";
    case "list_columns":
      return "Inspecting columns…";
    case "search_catalog":
      return "Searching the data catalog…";
    default:
      return `Running ${name}…`;
  }
}

/**
 * Run the Claude ⇄ MCP tool-use loop, streaming text + activity to `send`.
 * Emits a `dive` event whenever a dive is created or updated.
 */
export async function runAgent(args: RunAgentArgs): Promise<void> {
  const { anthropic, model, system, tools, mcpClient, send } = args;
  const maxTokens = args.maxTokens ?? 4096;
  const maxTurns = args.maxTurns ?? 8;
  let msgs = [...args.messages];

  let turns = 0;
  while (turns < maxTurns) {
    turns++;
    const res = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      tools,
      messages: msgs,
      stream: true,
    });

    const blocks: ContentBlock[] = [];
    let cur: { id: string; name: string; input: string } | null = null;
    let curText = "";
    let hasTool = false;

    for await (const ev of res) {
      if (ev.type === "content_block_start" && ev.content_block.type === "tool_use") {
        if (curText) {
          blocks.push({ type: "text", text: curText, citations: [] });
          curText = "";
        }
        cur = { id: ev.content_block.id, name: ev.content_block.name, input: "" };
        hasTool = true;
      } else if (ev.type === "content_block_delta") {
        if (ev.delta.type === "text_delta") {
          curText += ev.delta.text;
          send({ type: "text", content: ev.delta.text });
        } else if (ev.delta.type === "input_json_delta" && cur) {
          cur.input += ev.delta.partial_json;
        }
      } else if (ev.type === "content_block_stop") {
        if (cur) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(cur.input || "{}");
          } catch {
            /* keep empty */
          }
          blocks.push({ type: "tool_use", id: cur.id, name: cur.name, input });
          cur = null;
        } else if (curText) {
          blocks.push({ type: "text", text: curText, citations: [] });
          curText = "";
        }
      }
    }

    if (!hasTool) return; // Claude is done talking.

    // Execute every tool call in this turn, then feed results back.
    const toolBlocks = blocks.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
    const results: ToolResultBlockParam[] = [];

    for (const b of toolBlocks) {
      const input = (b.input || {}) as Record<string, unknown>;
      send({ type: "tool", tool: b.name, summary: toolSummary(b.name, input) });
      try {
        const out = await executeTool(mcpClient, b.name, input);
        results.push({ type: "tool_result", tool_use_id: b.id, content: out });

        if (DIVE_WRITE_TOOLS.has(b.name)) {
          const idFromInput = typeof input.id === "string" ? input.id : undefined;
          const idFromResult = out.match(UUID_RE)?.[0];
          const diveId = idFromInput || idFromResult;
          if (diveId) {
            send({
              type: "dive",
              diveId,
              title: typeof input.title === "string" ? input.title : undefined,
              description: typeof input.description === "string" ? input.description : undefined,
            });
          }
        }
      } catch (e) {
        results.push({
          type: "tool_result",
          tool_use_id: b.id,
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
          is_error: true,
        });
      }
    }

    msgs = [...msgs, { role: "assistant", content: blocks }, { role: "user", content: results }];
  }
}
