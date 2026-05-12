import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import { Agent, callable } from "agents";
import type { Env } from "../index";

/**
 * GuardianWorker - Infrastructure & Security Audit
 */
export class GuardianWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Guardian] Audit task: ${goal}`);

        let healthData = "No real-time health data available.";
        try {
            const logs = await (this.env.ARM as any).callTool("recon", "system_log_reader", {
                source: "kv",
                timeRange: "last 1h"
            });
            healthData = logs.content[0].text;
        } catch (e) { }

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Infrastructure Guardian for 'Alikuxac'. 
Your mission: Monitor uptime, audit logs, and protect the ecosystem from failures.
You have a stoic, vigilant, and highly technical personality.

### PLAYBOOK
${SKILL_PLAYBOOKS.SECURITY_AUDIT}

Current Health: ${healthData}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
