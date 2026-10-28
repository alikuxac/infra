import { z } from "zod";

export type McpServerLike = {
  tool?: (...args: any[]) => unknown;
  registerTool?: (...args: any[]) => unknown;
  connect: (transport: any) => Promise<void>;
};

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

export interface ToolEntry {
  metadata: ToolMetadata;
  handler: (args: any) => Promise<any>;
}

export class ToolkitRegistry {
  private server: McpServerLike;
  private categories: Map<string, ToolMetadata[]> = new Map();
  private toolEntries: Map<string, ToolEntry> = new Map();
  private env: any;

  constructor(server: McpServerLike, env: any) {
    this.server = server;
    this.env = env;
  }

  registerTool(
    metadata: ToolMetadata,
    handler: (args: any) => Promise<any>
  ) {
    const { name, description, inputSchema, category } = metadata;
    const schema = inputSchema || z.object({});

    if (typeof (this.server as any).tool === 'function') {
      (this.server as any).tool(name, description, schema, handler);
    } else if (typeof (this.server as any).registerTool === 'function') {
      (this.server as any).registerTool(name, description, schema, handler);
    }

    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push({ ...metadata, inputSchema: schema });
    this.toolEntries.set(name, { metadata: { ...metadata, inputSchema: schema }, handler });

    console.log(`[Registry] Tool registered: ${name} [${category}]`);
  }

  getTool(name: string): ToolEntry | undefined {
    return this.toolEntries.get(name);
  }

  registerToolkit(toolkit: Toolkit) {
    console.log(`[Registry] Loading toolkit: ${toolkit.name} (Public: ${!!toolkit.isPublic})`);

    const proxyRegistry = new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === 'registerTool') {
          return (metadata: ToolMetadata, handler: any) => {
            return target.registerTool({
              ...metadata,
              isPublic: metadata.isPublic ?? toolkit.isPublic
            }, handler);
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });

    toolkit.register(proxyRegistry as any);
  }

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

  getEnv() {
    return this.env;
  }
}
