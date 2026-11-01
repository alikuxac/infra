import { z } from "zod";

export interface Env {
  DISCORD_BOT_TOKEN?: string;
  DISCORD_MCP_KEY?: string;
  ENVIRONMENT?: string;
  [key: string]: unknown;
}

export interface McpToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TInput;
  handler: (args: z.infer<TInput>, env: Env) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
}

export function defineMcpTool<TInput extends z.ZodTypeAny>(
  tool: McpToolDefinition<TInput>
): McpToolDefinition<TInput> {
  return tool;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    protocolVersion?: string;
    [key: string]: unknown;
  };
}

export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}
