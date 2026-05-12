import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import { Agent, callable } from "agents";
import type { Env } from "../index";

/**
 * MarketWorker - Competitive Analysis & Trend Scouting
 */
export class MarketWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Market] Beginning Analysis Workflow: ${goal}`);

        // 1. Decompose into Market Research Queries
        const searchPlan = await generateWithFallback(this.env, {
            system: buildSystemPrompt("You are the Market Strategist. Break down market goals into 3 targeted search queries to identify competitors and trends."),
            prompt: `Goal: "${goal}"\nQueries ONLY, one per line.`,
            contextModel: context?.model
        });
        const queries = searchPlan.text.split("\n").filter(q => q.trim()).slice(0, 3);

        // 2. Multi-Vector Search
        let marketData = "";
        let potentialDomains: string[] = [];
        for (const query of queries) {
            try {
                const search = await (this.env.ARM as any).callTool("system", "web_search", { query });
                marketData += `QUERY: ${query}\nDATA: ${search.content[0].text}\n---\n`;

                // Heuristic to find potential competitor domains for recon
                const domains = search.content[0].text.match(/[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/g) || [];
                potentialDomains.push(...domains);
            } catch (e) { }
        }

        // 3. Tech Recon on identified competitors (Sampling)
        let techReconData = "";
        const uniqueDomains = [...new Set(potentialDomains)].slice(0, 2); // Top 2 unique domains
        for (const domain of uniqueDomains) {
            try {
                const recon = await (this.env.ARM as any).callTool("recon", "tech_stack_recon", { domain });
                techReconData += `COMPETITOR: ${domain}\nSTACK: ${recon.content[0].text}\n---\n`;
            } catch (e) { }
        }

        // 4. Strategic Synthesis
        const finalAnalysis = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Senior Market Analyst for 'Alikuxac'. 
Synthesize research and tech recon into a strategic report.
Structure: Market Landscape, Competitor Tech Advantage, Identified Opportunities, Recommendations.

### PLAYBOOK
${SKILL_PLAYBOOKS.MARKET_RESEARCH}`),
            prompt: `Research Data:\n${marketData}\n\nTech Stack Recon:\n${techReconData}\n\nPrimary Goal: ${goal}`,
            contextModel: context?.model
        });

        // 5. Record Strategic Intelligence
        try {
            await (this.env.ARM as any).callTool("memory", "record_knowledge", {
                fact: finalAnalysis.text.substring(0, 1000),
                importance: 4,
                workspace: "market",
                project: "analysis"
            });
        } catch (e) { }

        return finalAnalysis.text;
    }
}
