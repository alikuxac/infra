import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class ProjectToolkit implements Toolkit {
    name = "project";
    description = "Manage Workspaces and Projects in the Ops Empire Data Warehouse.";

    register(registry: ToolkitRegistry) {
        const env = registry.getEnv();

        // Ensure table exists
        registry.registerTool({ name: "_init_context_mappings", description: "internal", category: "ops", inputSchema: {} }, async () => {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS context_mappings (
                    platform TEXT,
                    external_id TEXT,
                    internal_type TEXT,
                    internal_id TEXT,
                    env TEXT DEFAULT 'production',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (platform, external_id)
                )
            `).run();
            // Migrate existing data to have env if needed (Optional but safe)
            await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_context_mappings_env ON context_mappings(env)`).run();
            return { content: [{ type: "text", text: "Table initialized." }] };
        });

        // 1. Workspace: create
        registry.registerTool({
            name: "workspace_create",
            description: "Create a new workspace.",
            category: "ops",
            inputSchema: z.object({
                name: z.string(),
                id: z.string().optional()
            })
        }, async ({ name, id }) => {
            const slug = id || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const currentEnv = env.ENVIRONMENT || "production";
            await env.DB.prepare(
                "INSERT INTO workspaces (id, name, env) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, env = excluded.env"
            ).bind(slug, name, currentEnv).run();
            return { content: [{ type: "text", text: slug }] };
        });

        // 2. Workspace: list
        registry.registerTool({
            name: "workspace_list",
            description: "List all workspaces.",
            category: "ops"
        }, async () => {
            const currentEnv = env.ENVIRONMENT || "production";
            const res = await env.DB.prepare("SELECT * FROM workspaces WHERE env = ? ORDER BY created_at DESC").bind(currentEnv).all();
            return { content: [{ type: "text", text: JSON.stringify(res.results || []) }] };
        });

        // 3. Project: create
        registry.registerTool({
            name: "project_create",
            description: "Create a new project within a workspace.",
            category: "ops",
            inputSchema: z.object({
                name: z.string(),
                workspaceId: z.string(),
                id: z.string().optional(),
                description: z.string().optional()
            })
        }, async ({ name, workspaceId, id, description }) => {
            const slug = id || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const currentEnv = env.ENVIRONMENT || "production";
            await env.DB.prepare(
                "INSERT INTO projects (id, workspace_id, name, description, env) VALUES (?, ?, ?, ?, ?) " +
                "ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, env = excluded.env"
            ).bind(slug, workspaceId, name, description || null, currentEnv).run();
            return { content: [{ type: "text", text: slug }] };
        });

        // 4. Project: list
        registry.registerTool({
            name: "project_list",
            description: "List projects, optionally filtered by workspace.",
            category: "ops",
            inputSchema: z.object({
                workspaceId: z.string().optional()
            })
        }, async ({ workspaceId }) => {
            const currentEnv = env.ENVIRONMENT || "production";
            let query = "SELECT * FROM projects WHERE env = ?";
            const params: any[] = [currentEnv];
            if (workspaceId) {
                query += " AND workspace_id = ?";
                params.push(workspaceId);
            }
            query += " ORDER BY created_at DESC";
            const res = await env.DB.prepare(query).bind(...params).all();
            return { content: [{ type: "text", text: JSON.stringify(res.results || []) }] };
        });

        // 5. Context Map: add
        registry.registerTool({
            name: "context_map_add",
            description: "Link an external platform ID to a Workspace or Project. Use platform='discord' for chat channels, and platform='discord_guild' for Discord servers/guilds.",
            category: "ops",
            inputSchema: z.object({
                platform: z.string().describe("The platform (e.g. 'discord' for chat channel mapping, 'discord_guild' for server/guild mapping)"),
                externalId: z.string().describe("The external ID (e.g. Discord Guild ID or Channel ID)"),
                internalType: z.enum(["workspace", "project"]),
                internalId: z.string()
            })
        }, async (args) => {
            const currentEnv = env.ENVIRONMENT || "production";
            await env.DB.prepare(
                `INSERT INTO context_mappings (platform, external_id, internal_type, internal_id, env) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON CONFLICT(platform, external_id) DO UPDATE SET 
                 internal_type = excluded.internal_type, 
                 internal_id = excluded.internal_id,
                 env = excluded.env`
            ).bind(args.platform, args.externalId, args.internalType, args.internalId, currentEnv).run();
            return { content: [{ type: "text", text: "Mapping created." }] };
        });

        // 6. Context Map: get
        registry.registerTool({
            name: "context_map_get",
            description: "Get internal mapping for an external ID.",
            category: "ops",
            inputSchema: z.object({
                platform: z.string().describe("The platform name (e.g. 'discord')"),
                externalId: z.string()
            })
        }, async ({ platform, externalId }) => {
            const currentEnv = env.ENVIRONMENT || "production";
            const res = await env.DB.prepare(
                "SELECT * FROM context_mappings WHERE platform = ? AND external_id = ? AND env = ?"
            ).bind(platform, externalId, currentEnv).first();
            return { content: [{ type: "text", text: JSON.stringify(res || null) }] };
        });

        // 7. Context Map: find external
        registry.registerTool({
            name: "context_map_find_external",
            description: "Find the external platform ID mapped to a Workspace or Project. Use platform='discord' for chat channels, and platform='discord_guild' for Discord servers/guilds.",
            category: "ops",
            inputSchema: z.object({
                platform: z.string().describe("The external platform (e.g. 'discord' for chat channels, 'discord_guild' for server/guild mapping)"),
                internalType: z.enum(["workspace", "project"]).describe("The internal type ('workspace' or 'project')"),
                internalId: z.string().describe("The ID of the workspace or project")
            })
        }, async ({ platform, internalType, internalId }) => {
            const currentEnv = env.ENVIRONMENT || "production";
            const res = await env.DB.prepare(
                "SELECT * FROM context_mappings WHERE platform = ? AND internal_type = ? AND internal_id = ? AND env = ?"
            ).bind(platform, internalType, internalId, currentEnv).all();
            return { content: [{ type: "text", text: JSON.stringify(res.results || []) }] };
        });
    }
}
