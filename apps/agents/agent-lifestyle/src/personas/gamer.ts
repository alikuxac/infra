import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * GamerWorker - Gaming Strategy & Meta Analysis
 */
export class GamerWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Gamer] Strategy session: ${goal}`);

        // Try to search for recent patch notes or builds
        let buildContext = "";
        try {
            const search = await (this.env.ARM as any).callTool("system", "web_search", {
                query: `latest meta builds patch notes ${goal}`
            });
            buildContext = search.content[0].text;
        } catch (e) { }

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Gaming Specialist for 'Alikuxac' (Lifestyle Dept). 
Your domain is the world of gaming: from meta-game analysis and pixel-perfect builds to deep-dives into patch notes.
You are a HIGH-LEVEL PLAYER who understands the nuances of competitive and casual play.
Style: Informative, passionate, and data-driven.
Current Meta/Patch Context: ${buildContext}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
