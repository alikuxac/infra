import { WorkerEntrypoint } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

import { ToolkitRegistry, type McpServerLike, type Toolkit } from "./core/registry.js";

import { JiraToolkit } from "./toolkits/dev/jira.js";
import { GitHubToolkit } from "./toolkits/dev/github.js";
import { ConfluenceToolkit } from "./toolkits/dev/confluence.js";
import { BasicToolkit } from "./toolkits/util/basic.js";
import { PlanningToolkit } from "./toolkits/planning/design.js";
import { SEOToolkit } from "./toolkits/seo/google.js";
import { ReconToolkit } from "./toolkits/recon/infra.js";
import { SearchToolkit } from "./toolkits/search/web.js";
import { MemoryToolkit } from "./toolkits/memory/brain.js";
import { ProjectToolkit } from "./toolkits/ops/projects.js";
import { ProfileToolkit } from "./toolkits/ops/profiles.js";
import { ExecutiveToolkit } from "./toolkits/ops/executive.js";
import { MarketingToolkit } from "./toolkits/ops/marketing.js";
import { LifestyleToolkit } from "./toolkits/ops/lifestyle.js";
import { DiscordToolkit } from "./toolkits/ops/discord.js";

export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  [key: string]: any;
}

async function constantTimeEquals(presented: string, expected: string | undefined): Promise<boolean> {
  if (!expected) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(presented);
  const b = encoder.encode(expected);
  if (a.byteLength !== b.byteLength) return false;

  return crypto.subtle.timingSafeEqual(a, b);
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: { code: -32001, message: "Unauthorized: Invalid or missing API Key" }
  }), {
    status: 401,
    headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="ops-mcp"' }
  });
}

export class OpsMCP extends McpAgent {
  env: Env;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private registry!: ToolkitRegistry;

  constructor(state: any, env: Env) {
    super(state, env);
    this.env = env;
  }

  server = new McpServer({
    name: "Ops AI Empire MCP",
    version: "0.0.1",
  }) as unknown as InstanceType<typeof McpAgent>["server"];

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.registry = new ToolkitRegistry(this.server as unknown as McpServerLike, this.env);

      (this.server as any).registerTool("ping", "Ping the MCP server to verify it is online.", z.object({}), async () => ({
        content: [{ type: "text", text: "pong (Executor Arm is online and ready)" }],
      }));

      const toolkits: Toolkit[] = [
        new JiraToolkit(),
        new GitHubToolkit(),
        new ConfluenceToolkit(),
        new BasicToolkit(),
        new PlanningToolkit(),
        new SEOToolkit(),
        new ReconToolkit(),
        new SearchToolkit({ isPublic: true }),
        new MemoryToolkit(),
        new ProfileToolkit(),
        new ProjectToolkit(),
        new ExecutiveToolkit(),
        new MarketingToolkit(),
        new LifestyleToolkit(),
        new DiscordToolkit()
      ];

      for (const toolkit of toolkits) {
        try {
          this.registry.registerToolkit(toolkit);
        } catch (err) {
          console.error(`[OpsMCP] Failed to load toolkit ${toolkit.constructor.name || "unknown"}:`, err);
        }
      }

      const { StorageService } = await import("./services/storage-service.js");
      const storage = new StorageService(this.env);

      this.registry.registerTool({
        name: "data_log_event",
        description: "Log a system event to the central warehouse.",
        category: "utility",
        inputSchema: z.object({
          level: z.enum(["info", "warn", "error"]),
          message: z.string(),
          context: z.any().optional()
        })
      }, async (args) => {
        await storage.logEvent(args.level, args.message, args.context);
        return { content: [{ type: "text", text: "Log recorded in Warehouse." }] };
      });

      this.registry.registerTool({
        name: "data_get_stats",
        description: "Get aggregate system statistics from the warehouse.",
        category: "utility"
      }, async () => {
        const stats = await storage.getSystemStats();
        return { content: [{ type: "text", text: JSON.stringify(stats) }] };
      });

      this.initialized = true;
      console.log("[OpsMCP] Arm initialized with modular toolkits and Central Warehouse tools.");
    })();

    return this.initPromise;
  }

  private async invokeTool(
    name: string,
    args: unknown,
    isAdmin: boolean
  ): Promise<{ ok: true; result: unknown } | { ok: false; message: string }> {
    const tool = this.registry.getTool(name);

    if (!tool || (!isAdmin && !tool.metadata.isPublic)) {
      return { ok: false, message: `Tool not found or not permitted: ${name}` };
    }

    const parsed = tool.metadata.inputSchema?.safeParse
      ? tool.metadata.inputSchema.safeParse(args ?? {})
      : { success: true as const, data: args ?? {} };

    if (!parsed.success) {
      return { ok: false, message: `Invalid arguments: ${parsed.error.message}` };
    }

    try {
      return { ok: true, result: await tool.handler(parsed.data) };
    } catch (toolErr) {
      const message = toolErr instanceof Error ? toolErr.message : String(toolErr);
      console.error(`[OpsMCP] Tool ${name} failed:`, toolErr);
      return {
        ok: true,
        result: { content: [{ type: "text", text: `❌ ${message}` }], isError: true }
      };
    }
  }

  private async resolveAccess(secret: string | null): Promise<"admin" | "member" | null> {
    if (!secret) return null;
    if (await constantTimeEquals(secret, this.env.INTERNAL_OPS_KEY)) return "admin";
    if (await constantTimeEquals(secret, this.env.MEMBER_MCP_KEY)) return "member";
    return null;
  }

  async fetch(request: Request): Promise<Response> {
    await this.init();

    const authHeader = request.headers.get("Authorization");
    const presented = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const access = await this.resolveAccess(presented);
    const isAdmin = access === "admin";

    if (!access) {
      return unauthorizedResponse();
    }

    let rpc: any;
    try {
      rpc = await request.json();
    } catch {
      return Response.json(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        { status: 400 }
      );
    }

    const isNotification = rpc.id === undefined || rpc.id === null;

    try {
      switch (rpc.method) {
        case "initialize":
          return Response.json({
            jsonrpc: "2.0",
            id: rpc.id,
            result: {
              protocolVersion: rpc.params?.protocolVersion ?? "2025-06-18",
              capabilities: { tools: { listChanged: false } },
              serverInfo: { name: "Ops AI Empire MCP", version: "0.0.1" }
            }
          });

        case "ping":
          return Response.json({ jsonrpc: "2.0", id: rpc.id, result: {} });

        case "tools/list": {
          const filter = { ...rpc.params, isPublicOnly: !isAdmin };
          const result = await this.registry.listTools(filter);
          return Response.json({ jsonrpc: "2.0", id: rpc.id, result });
        }

        case "tools/call": {
          const { name, arguments: args } = rpc.params ?? {};
          const outcome = await this.invokeTool(name, args, isAdmin);

          if (!outcome.ok) {
            return Response.json({
              jsonrpc: "2.0",
              id: rpc.id,
              error: { code: -32602, message: outcome.message }
            });
          }

          return Response.json({ jsonrpc: "2.0", id: rpc.id, result: outcome.result });
        }

        default:
          if (isNotification) return new Response(null, { status: 202 });
          return Response.json({
            jsonrpc: "2.0",
            id: rpc.id,
            error: { code: -32601, message: `Method not found: ${rpc.method}` }
          });
      }
    } catch (err) {
      console.error("[OpsMCP] RPC Error:", err);
      return Response.json({
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        error: { code: -32603, message: "Internal error" }
      });
    }
  }

  async listTools(filter?: any) {
    await this.init();
    return await this.registry.listTools({ ...filter, isPublicOnly: false });
  }

  async callTool(kit: string, name: string, args: any) {
    await this.init();

    const outcome = await this.invokeTool(name, args, true);
    if (!outcome.ok) {
      throw new Error(`${outcome.message} (Requested kit: ${kit})`);
    }

    return outcome.result;
  }

  async getAIConfig() {
    return {
      accountId: this.env.CLOUDFLARE_ACCOUNT_ID || this.env.CF_ACCOUNT_ID || this.env.ACCOUNT_ID,
      gateway: this.env.CLOUDFLARE_AI_GATEWAY || this.env.CF_GATEWAY_NAME || this.env.AI_GATEWAY_NAME,
      apiKey: this.env.GATEWAY_TOKEN || this.env.CF_GATEWAY_TOKEN || this.env.AI_GATEWAY_TOKEN
    };
  }
}

const INTERNAL_SESSION_KEY = "internal-service-binding";

async function sessionName(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const hex = [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
  return `streamable-http:${hex}`;
}

export class OpsWorker extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const presented = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

      if (!presented || !(await this.isKnownKey(presented))) {
        return unauthorizedResponse();
      }

      const obj = this.env.MCP_OBJECT.get(this.env.MCP_OBJECT.idFromName(await sessionName(presented)));
      return obj.fetch(request);
    }

    return new Response("Ops AI Empire Arm (v0.0.1) - Status: Active. Endpoint: /mcp", {
      headers: { "content-type": "text/plain" },
    });
  }

  private async isKnownKey(presented: string): Promise<boolean> {
    for (const expected of [this.env.INTERNAL_OPS_KEY, this.env.MEMBER_MCP_KEY]) {
      if (await constantTimeEquals(presented, expected)) return true;
    }
    return false;
  }

  private async internalObject(): Promise<any> {
    const name = await sessionName(INTERNAL_SESSION_KEY);
    return this.env.MCP_OBJECT.get(this.env.MCP_OBJECT.idFromName(name)) as any;
  }

  async listTools(filter?: any) {
    return await (await this.internalObject()).listTools(filter);
  }

  async callTool(kit: string, name: string, args: any) {
    return await (await this.internalObject()).callTool(kit, name, args);
  }

  async getAIConfig() {
    return await (await this.internalObject()).getAIConfig();
  }
}

export default OpsWorker;