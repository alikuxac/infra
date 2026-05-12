import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * GrowthWorker - User Acquisition & Data Analytics
 */
export class GrowthWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Growth] Strategy: ${goal}`);
        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Growth Hacker for 'Alikuxac'. 
Focus: Viral loops, referral systems, and AARRR funnel optimization.
Style: Aggressive, data-oriented, and creative.

### PLAYBOOK
${SKILL_PLAYBOOKS.ARTICLE_WRITING}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
