import { Env } from "../../env.js";
import { AgentPersona } from "@alikuxac/shared-types";

export interface MemoryBlock {
    id: string;
    persona: string | null;
    content: string;
    last_refined: string;
    refinement_reason: string;
}

/**
 * CoreMemoryService - Manages Long-Term Memory Blocks for AI Identity and Protocols.
 * This ensures the Agent evolves its behavior and knowledge per user/brand/persona.
 */
export class CoreMemoryService {
    private Env: Env;

    constructor(Env: Env) {
        this.Env = Env;
    }

    /**
     * Retrieves relevant memory blocks for a given persona.
     */
    async getCoreContext(persona: AgentPersona): Promise<string> {
        try {
            const result = await this.Env.ARM.callTool("memory", "search_memory", {
                query: `persona:${persona}`,
                namespace: "identity",
                workspace: "global",
                project: "general"
            });

            const content = (result as any).content?.[0]?.text || "";
            return content ? `### CORE IDENTITY & PROTOCOLS:\n${content}` : "";
        } catch (err) {
            console.error("[CoreMemoryService] MCP Memory retrieval failed:", err);
            return "";
        }
    }

    /**
     * Updates or creates a core memory block.
     */
    async refineBlock(id: string, persona: AgentPersona | null, content: string, reason: string): Promise<void> {
        try {
            await this.Env.ARM.callTool("memory", "record_knowledge", {
                fact: content,
                namespace: "identity",
                importance: 4,
                workspace: "global",
                project: "general"
            });
        } catch (err) {
            console.error("[CoreMemoryService] MCP Memory update failed:", err);
        }
    }
}
