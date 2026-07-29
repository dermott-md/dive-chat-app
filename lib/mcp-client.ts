import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

const MCP_SERVER_URL = "https://api.motherduck.com/mcp";

interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/** Connect to MotherDuck's MCP server using the service-account token. */
export async function createMcpClient(): Promise<Client> {
  const token = process.env.MOTHERDUCK_TOKEN;
  if (!token) {
    throw new Error("MOTHERDUCK_TOKEN environment variable is not set");
  }

  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const client = new Client({ name: "dive-starter-kit", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

/** List MCP tools in Anthropic tool format, optionally filtered by name. */
export async function getToolsForClaude(client: Client, allow?: string[]): Promise<Tool[]> {
  const response = await client.listTools();
  const tools = response.tools.map((tool: McpTool) => ({
    name: tool.name,
    description: tool.description || "",
    input_schema: tool.inputSchema as Tool["input_schema"],
  }));
  return allow ? tools.filter((t) => allow.includes(t.name)) : tools;
}

/** Execute an MCP tool and return its text content. */
export async function executeTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const result = await client.callTool({ name: toolName, arguments: args });
  if (result.content && Array.isArray(result.content)) {
    return result.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  return JSON.stringify(result);
}

export async function closeMcpClient(client: Client): Promise<void> {
  try {
    await client.close();
  } catch {
    /* ignore */
  }
}
