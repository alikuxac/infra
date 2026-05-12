import { Env } from "../../env.js";
import { AgentPersona } from "@alikuxac/shared-types";

export interface DashboardStats {
    systemState: "online" | "maintenance" | "error";
    activeAgents: string[];
    totalNeurons: number;
    memoryUsage: {
        vectors: number;
        facts: number;
    };
    recentLogs: Array<{
        timestamp: string;
        level: string;
        message: string;
    }>;
}

export class DashboardService {
    private Env: Env;

    constructor(Env: Env) {
        this.Env = Env;
    }

    async getStats(): Promise<DashboardStats> {
        try {
            // 1. Get stats from Central Warehouse (ops-mcp)
            const result = await this.Env.ARM.callTool("data", "data_get_stats", {});
            const stats = JSON.parse((result as any).content?.[0]?.text || "{}");

            // 2. Active Agents (Hardcoded metadata, can be refined later)
            const activeAgents = [
                AgentPersona.PLANNER,
                AgentPersona.EXECUTIVE,
                "Guardian",
                "CEO",
                "SEO"
            ];

            return {
                systemState: "online",
                activeAgents,
                totalNeurons: stats.neurons?.daily_total || 0,
                memoryUsage: {
                    vectors: 0,
                    facts: stats.memory?.total_facts || 0
                },
                recentLogs: (stats.telemetry?.recent_logs || []).map((l: any) => ({
                    timestamp: l.timestamp,
                    level: l.level,
                    message: l.message
                }))
            };
        } catch (err) {
            console.error("[DashboardService] Failed to fetch stats from Warehouse:", err);
            return {
                systemState: "error",
                activeAgents: [],
                totalNeurons: 0,
                memoryUsage: { vectors: 0, facts: 0 },
                recentLogs: []
            };
        }
    }
}
