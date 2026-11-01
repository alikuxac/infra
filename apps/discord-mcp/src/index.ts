import { WorkerEntrypoint } from "cloudflare:workers";
import { Env, JsonRpcRequest, McpToolDefinition } from "./types.js";
import { isRequestAuthorized, unauthorizedResponse } from "./auth.js";
import { guildTools } from "./tools/guild.js";
import { channelTools } from "./tools/channels.js";
import { roleTools } from "./tools/roles.js";

const allTools: McpToolDefinition[] = [
  ...guildTools,
  ...channelTools,
  ...roleTools
];

const toolMap = new Map<string, McpToolDefinition>(
  allTools.map(tool => [tool.name, tool])
);

function createJsonRpcResponse(id: string | number | null, result: unknown): Response {
  return Response.json({
    jsonrpc: "2.0",
    id,
    result
  });
}

function createJsonRpcError(id: string | number | null, code: number, message: string, status = 200): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code, message }
    },
    { status }
  );
}

function handleInitialize(id: string | number | null, rpc: JsonRpcRequest): Response {
  return createJsonRpcResponse(id, {
    protocolVersion: rpc.params?.protocolVersion ?? "2025-06-18",
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "Discord Server MCP", version: "0.0.1" }
  });
}

function handleToolsList(id: string | number | null): Response {
  const tools = allTools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: (t.inputSchema as any)?._def ? (t.inputSchema as any)._def : { type: "object", properties: {} }
  }));

  return createJsonRpcResponse(id, { tools });
}

async function handleToolCall(id: string | number | null, rpc: JsonRpcRequest, env: Env): Promise<Response> {
  const { name, arguments: args } = rpc.params ?? {};
  if (!name) {
    return createJsonRpcError(id, -32602, "Missing tool name in tools/call parameter");
  }

  const tool = toolMap.get(name);
  if (!tool) {
    return createJsonRpcError(id, -32602, `Tool not found: ${name}`);
  }

  const parsed = tool.inputSchema.safeParse(args ?? {});
  if (!parsed.success) {
    return createJsonRpcError(id, -32602, `Invalid arguments for ${name}: ${parsed.error.message}`);
  }

  try {
    const outcome = await tool.handler(parsed.data, env);
    return createJsonRpcResponse(id, outcome);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DiscordMCP] Tool ${name} execution error:`, error);
    return createJsonRpcResponse(id, {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
      isError: true
    });
  }
}

async function handleMcpRpc(request: Request, env: Env): Promise<Response> {
  const isAuthorized = await isRequestAuthorized(request, env);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  let rpc: JsonRpcRequest;
  try {
    rpc = (await request.json()) as JsonRpcRequest;
  } catch {
    return createJsonRpcError(null, -32700, "Parse error", 400);
  }

  const id = rpc.id ?? null;
  const isNotification = rpc.id === undefined || rpc.id === null;

  switch (rpc.method) {
    case "initialize":
      return handleInitialize(id, rpc);

    case "ping":
      return createJsonRpcResponse(id, {});

    case "tools/list":
      return handleToolsList(id);

    case "tools/call":
      return await handleToolCall(id, rpc, env);

    default:
      if (isNotification) return new Response(null, { status: 202 });
      return createJsonRpcError(id, -32601, `Method not found: ${rpc.method}`);
  }
}

export class DiscordMcpWorker extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        name: "Discord Server MCP",
        version: "0.0.1",
        status: "active",
        endpoint: "/mcp",
        toolCount: allTools.length
      });
    }

    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed. Use POST for MCP JSON-RPC.", { status: 405 });
      }
      return await handleMcpRpc(request, this.env);
    }

    return new Response("Not Found", { status: 404 });
  }
}

export default DiscordMcpWorker;
