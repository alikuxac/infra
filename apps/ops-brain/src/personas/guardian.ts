import { AgentPersona } from "@alikuxac/shared-types";
import { Orchestrator } from "../services/core/orchestrator.js";
import { Env } from "../env.js";

/**
 * GuardianWorker - System Health & Security Monitor
 */
export class GuardianWorker {
    constructor(private env: Env) { }

    async execute(goal: string, context: any): Promise<string> {
        const orchestrator = new Orchestrator(this.env);
        const result = await orchestrator.processIntent(
            [{ role: "user", content: goal }],
            AgentPersona.EXECUTIVE,
            "default",
            { userId: "system", platform: "guardian" }
        );
        return result.text;
    }

    async checkHealth(): Promise<string> {
        const stats = await this.env.DB.prepare("SELECT COUNT(*) as count FROM facts").first();
        return `System Health: OK. Total Facts: ${(stats as any)?.count || 0}`;
    }
}
