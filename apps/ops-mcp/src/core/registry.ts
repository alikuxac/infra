import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type ToolCategory = "dev" | "ops" | "utility" | "planning" | "seo" | "marketing" | "recon" | "system" | "search";

export interface ToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema?: any;
  tags?: string[];
  isPublic?: boolean;
}

export interface Toolkit {
  name: string;
  description: string;
  isPublic?: boolean;
  register(registry: ToolkitRegistry): void;
}

/**
 * ToolkitRegistry - Manages internal and remote toolkits with logical filtering.
 */
export class ToolkitRegistry {
  private server: McpServer;
  private categories: Map<string, ToolMetadata[]> = new Map();
  private toolHandlers: Map<string, (args: any) => Promise<any>> = new Map();
  private env: any;

  constructor(server: McpServer, env: any) {
    this.server = server;
    this.env = env;
  }

  /**
   * Register a single tool with metadata
   */
  registerTool(
    metadata: ToolMetadata,
    handler: (args: any) => Promise<any>
  ) {
    const { name, description, inputSchema, isPublic, category } = metadata;

    // Register with SDK server using the newer .tool() syntax if available, fallback to .registerTool
    // Register with SDK server using the newer .tool() syntax if available, fallback to .registerTool
    if (typeof (this.server as any).tool === 'function') {
      (this.server as any).tool(name, description, inputSchema || z.object({}), handler);
    } else if (typeof (this.server as any).registerTool === 'function') {
      (this.server as any).registerTool(name, description, inputSchema || z.object({}), handler);
    }

    // Track for logical filtering
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(metadata);
    this.toolHandlers.set(name, handler);

    console.log(`[Registry] Tool registered: ${name} [${category}]`);
  }

  /**
   * Get a registered tool handler
   */
  getToolHandler(name: string) {
    return this.toolHandlers.get(name);
  }

  /**
   * Register a whole toolkit
   */
  registerToolkit(toolkit: Toolkit) {
    console.log(`[Registry] Loading toolkit: ${toolkit.name} (Public: ${!!toolkit.isPublic})`);

    // Create a proxy registry that forces isPublic if toolkit is public
    const proxyRegistry = new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === 'registerTool') {
          return (metadata: ToolMetadata, handler: any) => {
            return target.registerTool({
              ...metadata,
              isPublic: toolkit.isPublic || metadata.isPublic
            }, handler);
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });

    toolkit.register(proxyRegistry as any);
  }

  /**
   * List tools with optional filters and access control
   */
  async listTools(filter?: { category?: ToolCategory; toolkit?: string; isPublicOnly?: boolean }) {
    const allTools: ToolMetadata[] = [];

    for (const [category, tools] of Array.from(this.categories.entries())) {
      if (filter?.category && filter.category !== category) continue;

      const filteredTools = filter?.isPublicOnly
        ? tools.filter(t => t.isPublic)
        : tools;

      allTools.push(...filteredTools);
    }

    return {
      tools: allTools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema || { type: "object", properties: {} },
        metadata: {
          category: t.category,
          tags: t.tags
        }
      }))
    };
  }

  /**
   * Get the environment variables
   */
  getEnv() {
    return this.env;
  }
}
