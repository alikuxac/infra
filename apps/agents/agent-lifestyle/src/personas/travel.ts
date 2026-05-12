import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * TravelWorker - Itinerary Planning & Logistic Mastery
 */
export class TravelWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Travel] Itinerary plan: ${goal}`);

        let travelData = "";
        try {
            const search = await (this.env.ARM as any).callTool("system", "web_search", {
                query: `travel itineraries deals ${goal}`
            });
            travelData = search.content[0].text;
        } catch (e) { }

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Travel Specialist for 'Alikuxac' (Lifestyle Dept). 
Domain: Destination scouting, itinerary optimization, and travel hacks.`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
