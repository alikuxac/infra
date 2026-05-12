import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * HobbyWorker - Skill Acquisition & Passion Projects
 */
export class HobbyWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Hobby] Exploring: ${goal}`);
        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Hobby Specialist for 'Alikuxac' (Lifestyle Dept). 
Domain: Crafting, collecting, and niche skill development.`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
