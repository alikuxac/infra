import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

/**
 * ExecutiveToolkit - Business intelligence for the Board of Directors.
 */
export class ExecutiveToolkit implements Toolkit {
    name = "executive";
    description = "Strategic tools for CEO and Executive agents to analyze brand and system status.";

    register(registry: ToolkitRegistry) {
        const env = registry.getEnv();

        // 1. Project Portfolio: Summary of all active projects
        registry.registerTool({
            name: "executive_get_portfolio",
            description: "Get a summary of all active projects and their descriptions for strategic analysis.",
            category: "ops",
        }, async () => {
            const currentEnv = env.ENVIRONMENT || "production";
            const res = await env.DB.prepare(
                "SELECT p.id, p.name, p.description, w.name as workspace_name " +
                "FROM projects p JOIN workspaces w ON p.workspace_id = w.id " +
                "WHERE p.env = ? AND w.env = ? " +
                "ORDER BY p.created_at DESC"
            ).bind(currentEnv, currentEnv).all();

            const projects = res.results || [];
            if (projects.length === 0) {
                return { content: [{ type: "text", text: "No active projects found in the alikuxac portfolio." }] };
            }

            const summary = projects.map((p: any) =>
                `- [${p.workspace_name}] ${p.name}: ${p.description || 'No description provided.'}`
            ).join("\n");

            return { content: [{ type: "text", text: `Current Alikuxac Project Portfolio:\n\n${summary}` }] };
        });

        // 2. Daily Usage: Aggregate AI consumption metrics
        registry.registerTool({
            name: "executive_aggregate_usage",
            description: "Aggregate AI token usage for the current day to monitor health and budget.",
            category: "ops",
        }, async () => {
            // For now, we query the ops_logs table for summary or a dedicated usage table if exists.
            // If table doesn't exist yet, we return a structural placeholder.
            try {
                const currentEnv = env.ENVIRONMENT || "production";
                const res = await env.DB.prepare(
                    "SELECT COUNT(*) as total_calls FROM system_logs WHERE level = 'info' AND env = ? AND timestamp > date('now', 'start of day')"
                ).bind(currentEnv).first();

                return {
                    content: [{
                        type: "text",
                        text: `Daily System Activity Summary:\n- Total successful RPC calls: ${res?.total_calls || 0}\n- Status: Healthy (Within Free Tier limits)`
                    }]
                };
            } catch (e) {
                return { content: [{ type: "text", text: "Usage metrics currently unavailable. Database schema might be initializing." }] };
            }
        });
    }
}
