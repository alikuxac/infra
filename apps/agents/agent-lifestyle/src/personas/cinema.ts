import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * CinemaWorker - Entertainment & Narrative Analysis
 */
export class CinemaWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Cinema] Review: ${goal}`);
        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Cinema Specialist for 'Alikuxac' (Lifestyle Dept). 
Domain: Film analysis, cinematography, and box office trends.`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
