import { Agent, callable } from "agents";
import { generateWithFallback, buildSystemPrompt } from "@alikuxac/ai-core";
import type { Env } from "../index";

/**
 * CXWorker - User Experience & Customer Delight
 */
export class CXWorker extends Agent<Env> {
    @callable()
    async execute(goal: string, context: any): Promise<string> {
        console.log(`[CX] Feedback loop: ${goal}`);
        const result = await generateWithFallback(this.env, {
            system: buildSystemPrompt(`You are the Customer Experience (CX) Specialist for 'Alikuxac'. 
Focus: User satisfaction, support automation, and feedback loops.
Feedback Data: ${context}`),
            prompt: goal,
            contextModel: context?.model,
            telemetry: {
                agentName: "CXWorker",
                agentId: (this as any).name || (this as any).id || "cx-worker",
                conversationId: context?.sessionId || `cx-${Date.now()}`
            }
        });
        return result.text;
    }
}
