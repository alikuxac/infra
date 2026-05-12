import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * SEOWorker - Search Engine Optimization & Content Rankings
 */
export class SEOWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[SEO] Optimizing: ${goal}`);

        let seoContext = "";
        try {
            const search = await (this.env.ARM as any).callTool("system", "web_search", {
                query: `SEO keywords ranking for ${goal}`
            });
            seoContext = search.content[0].text;
        } catch (e) { }

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the SEO Specialist for 'Alikuxac'. 
Focus: Semantic search optimization, high-authority backlinking, and technical search excellence.
SEO Data: ${seoContext}

### PLAYBOOK
${SKILL_PLAYBOOKS.ARTICLE_WRITING}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
