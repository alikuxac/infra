import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt, SKILL_PLAYBOOKS } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * ResearcherWorker - Deep Investigation & Knowledge Synthesis
 */
export class ResearcherWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Researcher] Investigating: ${goal}`);

        // 1. Decompose
        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt("You are the Deep Research Specialist for alikuxac. Break down goals into precise search queries."),
            prompt: `Break down this research goal into 3 search queries:\n"${goal}"\nQueries ONLY, one per line.`,
            contextModel: context?.model
        });
        const queryRaw = result.text;
        const queries = queryRaw.split("\n").filter(q => q.trim()).slice(0, 3);

        // 2. Search & Analyze
        let allContext = "";
        for (const query of queries) {
            try {
                const search = await (this.env.ARM as any).callTool("system", "web_search", { query });
                allContext += `QUERY: ${query}\nRESULT: ${search.content[0].text}\n---\n`;
            } catch (e) {
                console.warn(`[Researcher] Search failed for ${query}:`, e);
            }
        }

        // 3. Synthesize
        const resultReport = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Deep Researcher for 'Alikuxac'. Synthesize data into professional Vietnamese reports.
            
### PLAYBOOK
${SKILL_PLAYBOOKS.MARKET_RESEARCH}`),
            prompt: `Data:\n${allContext}\n\nTask: ${goal}`,
            contextModel: context?.model
        });
        const report = resultReport.text;

        // 4. Record
        try {
            await (this.env.ARM as any).callTool("memory", "record_knowledge", {
                fact: report.substring(0, 500),
                importance: 3,
                workspace: "global",
                project: "research"
            });
        } catch (e) {
            console.warn("[Researcher] Knowledge recording failed.");
        }

        return report;
    }
}
