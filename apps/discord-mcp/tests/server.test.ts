import { describe, it, expect } from "vitest";
import DiscordMcpWorker from "../src/index.js";
import { Env } from "../src/types.js";

describe("DiscordMcpWorker", () => {
  const mockEnv: Env = {
    DISCORD_MCP_KEY: "secret-test-token",
    DISCORD_BOT_TOKEN: "mock-bot-token"
  };

  const createWorker = (env: Env = mockEnv) => {
    return new DiscordMcpWorker({} as any, env as any);
  };

  it("should return status on GET /health", async () => {
    const worker = createWorker();
    const req = new Request("https://discord-mcp.internal/health");
    const res = await worker.fetch(req);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("active");
    expect(body.toolCount).toBe(14);
  });

  it("should reject unauthenticated POST /mcp with 401", async () => {
    const worker = createWorker();
    const req = new Request("https://discord-mcp.internal/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      })
    });
    const res = await worker.fetch(req);

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error.code).toBe(-32001);
  });

  it("should return tools list on authenticated POST /mcp", async () => {
    const worker = createWorker();
    const req = new Request("https://discord-mcp.internal/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-test-token"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      })
    });
    const res = await worker.fetch(req);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.result.tools).toBeDefined();
    expect(body.result.tools.length).toBe(14);
    const toolNames = body.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("discord_guild_get");
    expect(toolNames).toContain("discord_channel_create");
    expect(toolNames).toContain("discord_role_modify");
  });

  it("should handle initialize rpc call", async () => {
    const worker = createWorker();
    const req = new Request("https://discord-mcp.internal/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-test-token"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 42,
        method: "initialize",
        params: { protocolVersion: "2025-06-18" }
      })
    });
    const res = await worker.fetch(req);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe(42);
    expect(body.result.serverInfo.name).toBe("Discord Server MCP");
    expect(body.result.serverInfo.version).toBe("0.0.1");
  });
});
