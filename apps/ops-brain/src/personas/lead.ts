import { Orchestrator } from "../services/core/orchestrator.js";
import { AgentPersona } from "@alikuxac/shared-types";
import { ChatMessage, AIProvider } from "../types.js";
import { Env } from "../env.js";

/**
 * LeadWorker - Project Director & Quality Control
 */
export class LeadWorker {
    constructor(private env: Env) { }

    async execute(goal: string, context: any): Promise<string> {
        const orchestrator = new Orchestrator(this.env);
        const result = await orchestrator.processIntent(
            [{ role: "user", content: goal }],
            context?.persona || AgentPersona.EXECUTIVE,
            context?.model || "default",
            { userId: context?.userId || "system", platform: context?.platform || "rpc" }
        );
        return result.text;
    }

    async processIntent(
        historyOrMessage: ChatMessage[] | string,
        persona: AgentPersona,
        modelAlias: string = "default",
        userMeta?: { userId: string, platform: string },
        providerOverride: AIProvider = "google",
        sessionId?: string
    ) {
        const orchestrator = new Orchestrator(this.env);
        const { SessionService } = await import("../services/core/session-service.js");
        const sessionService = new SessionService(this.env);

        let activeHistory: ChatMessage[] = [];
        let newMessage: ChatMessage | null = null;

        if (typeof historyOrMessage === "string") {
            newMessage = { role: "user", content: historyOrMessage };
        } else {
            activeHistory = historyOrMessage;
        }

        if (sessionId) {
            const sessionData = await sessionService.getSession(sessionId);
            if (newMessage) {
                activeHistory = [...sessionData.history, newMessage];
            } else if (activeHistory.length === 0) {
                activeHistory = sessionData.history;
            }
        }

        const result = await orchestrator.processIntent(activeHistory, persona, modelAlias, userMeta, providerOverride);

        if (sessionId && activeHistory.length > 0) {
            await sessionService.saveSession(sessionId, {
                history: [...activeHistory, { role: "assistant", content: result.text }]
            });
        }

        return result;
    }

    async clearSession(sessionId: string) {
        const { SessionService } = await import("../services/core/session-service.js");
        const sessionService = new SessionService(this.env);
        await sessionService.clearSession(sessionId);
        return { success: true };
    }

    async updateSessionMetadata(sessionId: string, metadata: any) {
        const { SessionService } = await import("../services/core/session-service.js");
        const sessionService = new SessionService(this.env);
        await sessionService.updateMetadata(sessionId, metadata);
        return { success: true };
    }

    async summarize(history: ChatMessage[]) {
        const orchestrator = new Orchestrator(this.env);
        return await orchestrator.summarize(history);
    }

    async generateBriefing() {
        const { ProactiveService } = await import("../services/ops/proactive-service.js");
        const proactive = new ProactiveService(this.env);
        return await proactive.generateBriefing();
    }

    async indexMemory(text: string, metadata: any, namespace: string) {
        const orchestrator = new Orchestrator(this.env);
        return await orchestrator.indexMemory(text, metadata, namespace);
    }

    async listWorkspaces() {
        const orchestrator = new Orchestrator(this.env);
        return await orchestrator.projectManager.listWorkspaces();
    }

    async listProjects(workspaceId?: string) {
        const orchestrator = new Orchestrator(this.env);
        return await orchestrator.projectManager.listProjects(workspaceId);
    }

    async getSession(sessionId: string) {
        const { SessionService } = await import("../services/core/session-service.js");
        const sessionService = new SessionService(this.env);
        return await sessionService.getSession(sessionId);
    }

    async saveSession(sessionId: string, data: any) {
        const { SessionService } = await import("../services/core/session-service.js");
        const sessionService = new SessionService(this.env);
        return await sessionService.saveSession(sessionId, data);
    }
}
