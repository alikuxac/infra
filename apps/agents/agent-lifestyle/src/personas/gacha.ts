import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * GachaWorker - Probability Analysis & Collection Strategy
 */
export class GachaWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Gacha] Analyst objective: ${goal}`);

        let gachaContext = "";
        try {
            const search = await (this.env.ARM as any).callTool("system", "web_search", {
                query: `latest gacha banners pity rates ${goal}`
            });
            gachaContext = search.content[0].text;
        } catch (e) { }

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Gacha Specialist for 'Alikuxac' (Lifestyle Dept). 
Domain: Probability analysis, resource management, and character meta.`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
