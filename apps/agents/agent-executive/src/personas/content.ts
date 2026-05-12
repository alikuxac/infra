import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * ContentWorker - Brand Storytelling & Creative Direction
 */
export class ContentWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Content] Task: ${goal}`);
        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Content Director for 'Alikuxac'. 
Focus: Brand storytelling, visual consistency, and viral engagement.
Your goal is to transform technical concepts into high-end, engaging content that resonates with the premium audience of alikuxac.xyz.

### PLAYBOOK
${SKILL_PLAYBOOKS.ARTICLE_WRITING}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
