import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class ProfileToolkit implements Toolkit {
    name = "profile";
    description = "Manage User Profiles, Preferences, and Telemetry in the Warehouse.";

    register(registry: ToolkitRegistry) {
        const env = registry.getEnv();

        // 1. set_preference
        registry.registerTool({
            name: "set_preference",
            description: "Set a preference value at a specific scope.",
            category: "ops",
            inputSchema: z.object({
                key: z.string(),
                value: z.any(),
                scopeId: z.string(),
                scopeType: z.string()
            })
        }, async ({ key, value, scopeId, scopeType }) => {
            const currentEnv = env.ENVIRONMENT || "production";
            const result = await env.DB.prepare(
                "SELECT preferences FROM user_profiles WHERE user_id = ? AND platform = ? AND env = ?"
            ).bind(scopeId, scopeType, currentEnv).first();

            let prefs = result ? JSON.parse((result as any).preferences) : {};
            prefs[key] = value;

            await env.DB.prepare(
                `INSERT INTO user_profiles (user_id, platform, preferences, updated_at, env) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
         ON CONFLICT(user_id, platform) DO UPDATE SET 
         preferences = excluded.preferences, 
         updated_at = CURRENT_TIMESTAMP,
         env = excluded.env`
            ).bind(scopeId, scopeType, JSON.stringify(prefs), currentEnv).run();

            return { content: [{ type: "text", text: "Preference updated." }] };
        });

        // 2. get_preferences
        registry.registerTool({
            name: "get_preferences",
            description: "Get preferences for a specific context.",
            category: "ops",
            inputSchema: z.object({
                id: z.string(),
                scope: z.string()
            })
        }, async ({ id, scope }) => {
            const currentEnv = env.ENVIRONMENT || "production";
            const result = await env.DB.prepare(
                "SELECT preferences FROM user_profiles WHERE user_id = ? AND platform = ? AND env = ?"
            ).bind(id, scope, currentEnv).first();
            return { content: [{ type: "text", text: (result as any)?.preferences || "{}" }] };
        });

        // 3. log_usage
        registry.registerTool({
            name: "log_usage",
            description: "Record AI usage telemetry.",
            category: "ops",
            inputSchema: z.object({
                userId: z.string(),
                platform: z.string(),
                tokensUsed: z.number(),
                neuronsEstimated: z.number(),
                modelId: z.string(),
                actionType: z.string(),
                latencyMs: z.number().optional()
            })
        }, async (args) => {
            const currentEnv = env.ENVIRONMENT || "production";
            await env.DB.prepare(
                `INSERT INTO usage_logs (user_id, platform, tokens_used, neurons_estimated, model_id, action_type, latency_ms, env) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                args.userId,
                args.platform,
                args.tokensUsed,
                args.neuronsEstimated,
                args.modelId,
                args.actionType,
                args.latencyMs || null,
                currentEnv
            ).run();
            return { content: [{ type: "text", text: "Usage logged." }] };
        });
    }
}
