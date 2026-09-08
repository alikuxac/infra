import { WorkerEntrypoint } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Core Registry
import { ToolkitRegistry } from "./core/registry.js";

// Toolkits
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

/**
 * Environment Interface
 */
export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  [key: string]: any;
}

/**
 * OpsMCP - The Executing Arm of the Empire.
 * Refactored to use ToolkitRegistry for modular tool management.
 */
export class OpsMCP extends McpAgent {
  env: Env;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private registry!: ToolkitRegistry;

  constructor(state: any, env: Env) {
    super(state, env);
    this.env = env;
  }

  // Core MCP Server instance
  server = new McpServer({
    name: "Ops AI Empire MCP",
    version: "0.0.1",
  });

  /**
   * Initialize and register toolkits. Safe for concurrent calls.
   */
  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.registry = new ToolkitRegistry(this.server, this.env);

      // 1. Core System Tools
      (this.server as any).registerTool("ping", "Ping the MCP server to verify it is online.", z.object({}), async () => ({
        content: [{ type: "text", text: "pong (Executor Arm is online and ready)" }],
      }));

      // 2. Register Modular Toolkits
      const toolkits: any[] = [
        new JiraToolkit(),
        new GitHubToolkit(),
        new ConfluenceToolkit(),
        new BasicToolkit(),
        new PlanningToolkit(),
        new SEOToolkit(),
        new ReconToolkit(),
        new SearchToolkit({ isPublic: true }),
        new MemoryToolkit(),
        new ProfileToolkit()
      ];

      for (const toolkit of toolkits) {
        try {
          if (toolkit.register) {
            this.registry.registerToolkit(toolkit);
          }
        } catch (err) {
          console.error(`[OpsMCP] Failed to load toolkit ${toolkit.constructor.name || 'unknown'}:`, err);
        }
      }

      // 3. Functional Toolkits (non-public or specific registration)
      try {
        new ProjectToolkit().register(this.registry);
        new ExecutiveToolkit().register(this.registry);
        new MarketingToolkit().register(this.registry);
        new LifestyleToolkit().register(this.registry);
        new DiscordToolkit().register(this.registry);
      } catch (err) {
        console.error(`[OpsMCP] Failed to load functional toolkits:`, err);
      }

      // 3. Central Data Tools (Warehouse)
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

  /**
   * Manual JSON-RPC Handler with Security Filtering
   */
  async fetch(request: Request): Promise<Response> {
    await this.init();

    // 1. Authentication Layer
    const authHeader = request.headers.get("Authorization");
    const secret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const isAdmin = secret === this.env.INTERNAL_OPS_KEY;
    const isMember = secret === this.env.MEMBER_MCP_KEY;

    if (!isAdmin && !isMember) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: Invalid or missing API Key" }
      }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    try {
      const rpc = await request.json() as any;

      // Handle tools/list with potential filtering
      if (rpc.method === "tools/list") {
        const filter = {
          ...rpc.params,
          isPublicOnly: !isAdmin // If not admin, restrict to public tools only
        };
        const result = await this.registry.listTools(filter);
        return Response.json({ jsonrpc: "2.0", id: rpc.id, result });
      }

      // Handle tools/call
      if (rpc.method === "tools/call") {
        const { name, arguments: args } = rpc.params;

        const handler = this.registry.getToolHandler(name);
        if (handler) {
          const result = await handler(args);
          return Response.json({ jsonrpc: "2.0", id: rpc.id, result });
        }

        throw new Error(`MCP Tool not found or restricted: ${name}`);
      }

      return Response.json({
        jsonrpc: "2.0",
        id: rpc.id,
        error: { code: -32601, message: "Method not implemented" }
      });

    } catch (err: any) {
      console.error("[OpsMCP] RPC Error:", err);
      return Response.json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: err.message }
      });
    }
  }

  /**
   * RPC: List all available tools (Internal Service Binding)
   */
  async listTools(filter?: any) {
    await this.init();
    // Service Bindings are trusted (isAdmin: true)
    return await this.registry.listTools({ ...filter, isPublicOnly: false });
  }

  /**
   * RPC: Call a specific tool (Internal Service Binding)
   */
  async callTool(kit: string, name: string, args: any) {
    await this.init();

    const handler = this.registry.getToolHandler(name);
    if (!handler) {
      throw new Error(`MCP Tool not found: ${name} (Requested kit: ${kit})`);
    }

    return await handler(args);
  }

  /**
   * RPC: Get centralized AI Gateway configuration (Internal Service Binding)
   */
  async getAIConfig() {
    return {
      accountId: this.env.CLOUDFLARE_ACCOUNT_ID || this.env.CF_ACCOUNT_ID || this.env.ACCOUNT_ID,
      gateway: this.env.CLOUDFLARE_AI_GATEWAY || this.env.CF_GATEWAY_NAME || this.env.AI_GATEWAY_NAME,
      apiKey: this.env.GATEWAY_TOKEN || this.env.CF_GATEWAY_TOKEN || this.env.AI_GATEWAY_TOKEN
    };
  }
}

/**
 * Worker Entry Point
 */
export class OpsWorker extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      const id = this.env.MCP_OBJECT.idFromName("ops-empire-main");
      const obj = this.env.MCP_OBJECT.get(id);
      return obj.fetch(request);
    }

    return new Response("Ops AI Empire Arm (v0.0.1) - Status: Active. Endpoint: /mcp", {
      headers: { "content-type": "text/plain" },
    });
  }

  async listTools(filter?: any) {
    const id = this.env.MCP_OBJECT.idFromName("ops-empire-main");
    const obj = this.env.MCP_OBJECT.get(id) as any;
    // Proxies to Durable Object
    return await obj.listTools(filter);
  }

  async callTool(kit: string, name: string, args: any) {
    const id = this.env.MCP_OBJECT.idFromName("ops-empire-main");
    const obj = this.env.MCP_OBJECT.get(id) as any;
    // Proxies to Durable Object
    return await obj.callTool(kit, name, args);
  }

  /**
   * RPC: Get AI Gateway configuration (Proxied)
   */
  async getAIConfig() {
    const id = this.env.MCP_OBJECT.idFromName("ops-empire-main");
    const obj = this.env.MCP_OBJECT.get(id) as any;
    return await obj.getAIConfig();
  }
}

export default OpsWorker;
