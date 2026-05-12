import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * CEOWorker - Strategic Alignment & Decision Making
 */
export class CEOWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[CEO] Strategic objective: ${goal}`);

        let portfolio = "Portfolio data currently unavailable.";
        try {
            const result = await (this.env.ARM as any).callTool("executive", "executive_get_portfolio", {});
            portfolio = result.content[0].text;
        } catch (e) {
            console.warn("[CEO] Failed to fetch portfolio:", e);
        }

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Chief Executive Officer (CEO) of 'Alikuxac'. 
Your mission: Define the vision, set strategic goals, and lead the empire to dominance.
You are visionary, authoritative, and focused on the big picture.

### PLAYBOOK
${SKILL_PLAYBOOKS.MARKET_RESEARCH}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
