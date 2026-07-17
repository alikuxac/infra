import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * JobsWorker - CV & Job Description Optimization Specialist
 */
export class JobsWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[Jobs] CV/Job evaluation: ${goal}`);

        // Web search for job market context or ATS benchmarks if relevant
        let searchContext = "";
        try {
            const query = goal.slice(0, 100);
            const search = await (this.env.ARM as any).callTool("system", "web_search", {
                query: `ATS resume benchmarks job market advice ${query}`
            });
            searchContext = search.content[0].text;
        } catch (e) {}

        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the CV & Jobs Specialist for 'Alikuxac' (Growth Dept).
Your mission:
1. Review, evaluate and build professional resumes (CV) and Job Descriptions (JD).
2. Align candidate resumes with target JDs to optimize ATS (Applicant Tracking System) matching score.
3. Recommend specific adjustments (keywords, active verbs, phrasing, structuring) to maximize recruiter visibility and call-back rates.
4. Support parsing resumes/JDs from text, links, or image descriptions.

PERSUASIVE PROTOCOL:
- Focus on technical precision and actionable suggestions.
- Output primarily in English.
- Give a score (e.g. ATS Match Score: X/100) if matching a CV with a JD, followed by concrete 'To-Do' list items.

Market Context: ${searchContext}`),
            prompt: goal,
            contextModel: context?.model
        });
        return result.text;
    }
}
