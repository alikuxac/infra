import { generateText } from "ai";
import { z } from "zod";
import { AgentPersona } from "@alikuxac/shared-types";
import { AIService } from "./ai-service.js";
import { MemoryService } from "../ops/memory-service.js";
import { ProfileService } from "./profile-service.js";
import { ProjectManager } from "../ops/project-manager.js";
import { NotificationService } from "../messaging/notification-service.js";
import { AIProvider, ChatMessage, MCPTool } from "../../types.js";
import { Env } from "../../env.js";
import { SubAgentContext } from "../../types.js";
import { CoreMemoryService } from "./core-memory-service.js";

import { generateWithFallback, getGatewayConfig, type GatewayConfig } from "@alikuxac/ai-core";

interface ARMService {
  listTools(): Promise<{ tools: MCPTool[] }>;
  callTool(provider: string, tool: string, args: unknown): Promise<any>;
}

export class Orchestrator {
  public ai: AIService;
  public memory: MemoryService;
  public profile: ProfileService;
  public projectManager: ProjectManager;
  public arm: ARMService;
  public coreMemory: CoreMemoryService;
  public env: Env;
  private _lastContext: { channelId?: string, userId?: string, platform?: string, sessionId?: string } = {};
  private _currentPersona: AgentPersona = AgentPersona.CHAT;

  constructor(env: Env) {
    this.env = env;
    this.arm = env.ARM as unknown as ARMService;
    const gatewayConfig = getGatewayConfig(env);
    this.ai = new AIService({
      accountId: gatewayConfig.accountId,
      gatewayName: gatewayConfig.gateway,
      token: gatewayConfig.apiKey
    });
    // Hybrid Memory: Vectorize + D1
    this.memory = new MemoryService(this.ai, env.VECTORIZE, env.DB, env);
    this.profile = new ProfileService(env);
    this.coreMemory = new CoreMemoryService(env);
    this.projectManager = new ProjectManager(env);
  }

  /**
   * Process intent with hybrid memory retrieval and brand awareness
   */
  async processIntent(
    history: ChatMessage[],
    persona: AgentPersona,
    modelAlias: string = "default",
    userMeta?: { userId: string, platform: string },
    providerOverride: AIProvider = "openrouter"
  ) {
    const startTime = Date.now();
    const userMessage = history[history.length - 1]?.content;
    const currentPersona = persona || AgentPersona.CHAT;
    this._currentPersona = currentPersona;

    // Capture context for background tasks
    const channelId = userMeta?.platform === "discord" ? history[0]?.role === "system" ? undefined : undefined : undefined; // Fallback logic
    // Actually, we should trust userMeta more.
    this._lastContext = {
      userId: userMeta?.userId,
      platform: userMeta?.platform,
      sessionId: `session_${userMeta?.platform || 'gen'}_${userMeta?.userId || 'anon'}`
    };

    const workspace = userMeta?.platform || "global";
    const project = this._lastContext.sessionId || "general";

    // Fetch real session data to get active workspace/project IDs
    let activeWs = workspace;
    let activePj = project;
    try {
      const { SessionService } = await import("./session-service.js");
      const sessionService = new SessionService(this.env);
      const sessionData = await sessionService.getSession(this._lastContext.sessionId || "");
      if (sessionData?.metadata?.workspace) activeWs = sessionData.metadata.workspace;
      if (sessionData?.metadata?.project) activePj = sessionData.metadata.project;
    } catch (e) { }

    console.log(`[Orchestrator] alikuxac Executive Brain | Persona: ${currentPersona} | Scope: ${activeWs}/${activePj}`);

    const namespace = this.getNamespaceForPersona(currentPersona);

    // 1. Hybrid Search (Facts + Semantic Context + Recipes)
    let context = await this.getRagContext(userMessage, namespace, activeWs, activePj);
    context += await this.getRecipeContext(userMessage);
    context += await this.getUserPreferences(activeWs, activePj);
    context += await this.coreMemory.getCoreContext(currentPersona);

    // 2. Get available tools from ARM + Internal "Memory" tool
    const tools = await this.getAvailableTools(namespace);

    // 2. Automated History Compaction (Keep context lean)
    const activeHistory = await this.compressHistory(history);

    // 3. AI Execution
    const gatewayConfig = getGatewayConfig(this.env);
    const contextWithEnv: SubAgentContext = {
      userId: this._lastContext.userId || "system",
      platform: this._lastContext.platform || "system",
      sessionId: this._lastContext.sessionId || "gen",
      Env: {
        CLOUDFLARE_AI_GATEWAY: gatewayConfig.gateway,
        GATEWAY_TOKEN: gatewayConfig.apiKey,
        CLOUDFLARE_ACCOUNT_ID: gatewayConfig.accountId,
      }
    };

    const result = await this.ai.chatWithGemma(
      activeHistory,
      currentPersona,
      modelAlias,
      tools,
      context,
      providerOverride
    );

    // 4. Post-processing: Learning from Experience
    if (result.toolResults && result.toolResults.length >= 2) {
      await this.learnFromExperience(userMessage, result.toolResults);
    }

    const latencyMs = Date.now() - startTime;
    if (userMeta && result.text) {
      await this.logTelemetry(userMeta, modelAlias, result.text, latencyMs);
    }

    return result;
  }

  /**
   * Generates a concise executive briefing from system stats
   */
  async generateBriefing(stats: any): Promise<string> {
    const prompt = `Based on the following system statistics, generate a concise, high-level executive briefing for alikuxac.
    Focus on:
    - Total Neurons/Tokens processed (health check)
    - Fact storage progress (Second Brain status)
    - Active Sub-Agents status
    - 2-3 most recent critical logs
    
    Tone: Professional, Executive, "Chief of Staff" style. Use Vietnamese.
    
    Stats:
    ${JSON.stringify(stats, null, 2)}`;

    try {
      const gatewayConfig = getGatewayConfig(this.env);

      const result = await generateWithFallback(gatewayConfig, {
        system: "You are the Executive Orchestrator. Provide a status update.",
        prompt: prompt
      });
      return `📊 **Alikuxac Empire - Hourly Briefing**\n\n${result.text}\n\n*View full details at /dashboard*`;
    } catch (err) {
      console.error("[Orchestrator] Briefing generation failed:", err);
      return "⚠️ [SYSTEM] Unable to generate briefing at this time. Dashboard is available.";
    }
  }

  /**
   * Layer 1.6: Query successful previous workflows (Recipes)
   */
  private async getRecipeContext(query: string): Promise<string> {
    try {
      // Basic keyword search for now
      const currentEnv = this.env.ENVIRONMENT || "production";
      const recipes = await this.env.DB.prepare(
        "SELECT name, steps FROM recipes WHERE (name LIKE ? OR description LIKE ?) AND env = ? LIMIT 2"
      ).bind(`%${query}%`, `%${query}%`, currentEnv).all();

      if (recipes.results && recipes.results.length > 0) {
        const formatted = recipes.results.map((r: any) => `* Recipe: ${r.name}\n  Steps: ${r.steps}`).join("\n");
        return `\n\n[SUCCESSFUL RECIPES FROM PAST EXPERIENCE]:\n${formatted}\n---`;
      }
    } catch (err) {
      console.warn("[Orchestrator] Recipe retrieval failed:", err);
    }
    return "";
  }

  /**
   * Automatically records successful multi-step workflows as Recipes.
   */
  private async learnFromExperience(goal: string, toolResults: any[]) {
    console.log(`[Orchestrator] Analyzing experience for learning potential...`);

    try {
      const id = crypto.randomUUID();
      const name = goal.substring(0, 50);

      // We only save if there are successful tool calls
      const steps = toolResults.map(tr => ({
        tool: tr.toolName,
        args: tr.args,
        success: !tr.result?.error
      }));

      if (steps.filter(s => s.success).length < 2) return;
      const currentEnv = this.env.ENVIRONMENT || "production";
      await this.env.DB.prepare(
        "INSERT INTO recipes (id, name, description, steps, env) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, name, goal, JSON.stringify(steps), currentEnv).run();

      console.log(`[Orchestrator] Successfully learned new recipe: ${name}`);
    } catch (err) {
      console.error("[Orchestrator] Learning failed:", err);
    }
  }

  private getNamespaceForPersona(persona: AgentPersona): string {
    switch (persona) {
      case AgentPersona.MARKETING:
      case AgentPersona.EXECUTIVE:
        return "brand";
      case AgentPersona.PLANNER:
      case AgentPersona.RECON:
        return "technical";
      case AgentPersona.CHAT:
        return "personal";
      default:
        return "general";
    }
  }

  private async getRagContext(userMessage: string, namespace: string, workspace: string = "global", project: string = "general"): Promise<string> {
    try {
      if (!userMessage || userMessage.length < 3) return "";

      console.log(`[Orchestrator] Querying hybrid [${workspace}/${project}:${namespace}] memory...`);
      let memories = await this.memory.queryMemory(userMessage, 5, namespace, workspace, project);

      if (memories.length === 0) return "";

      let rawContext = memories.join("\n");

      // Smart Compression: If context exceeds 1500 chars, distill it
      if (rawContext.length > 1500) {
        console.log(`[Orchestrator] Context too long (${rawContext.length} chars). Distilling...`);
        const config = this.ai.resolveModelConfig("google", "default");
        const model = (this.ai as any).getNativeProvider(config);

        const { text: distilled } = await generateText({
          model,
          prompt: `Distill the following memory context into a concise list of atomic facts relevant to: "${userMessage}".\nContext:\n${rawContext}`
        });
        rawContext = distilled;
      }

      return `\n\n[BRAIN KNOWLEDGE & MEMORY]:\n${rawContext}\n---`;
    } catch (err) {
      console.warn("[Orchestrator] RAG search failed:", err);
    }
    return "";
  }

  /**
   * Compresses long history to save tokens while keeping the 3 most recent messages.
   */
  private async compressHistory(history: ChatMessage[]): Promise<ChatMessage[]> {
    if (history.length <= 15) return history;

    console.log(`[Orchestrator] Compressing long session history (${history.length} messages)...`);
    const recentMessages = history.slice(-3);
    const oldMessages = history.slice(0, -3);

    const workspace = this._lastContext.platform || "global";
    const project = this._lastContext.sessionId || "general";

    const summary = await this.ai.summarizeSession(oldMessages, workspace, project);

    return [
      { role: "system", content: `[PREVIOUS SESSION SUMMARY]:\n${summary}` },
      ...recentMessages
    ];
  }

  private async getUserPreferences(workspaceId?: string, projectId?: string): Promise<string> {
    try {
      const prefs = await this.profile.getEffectivePreferences(workspaceId, projectId);
      if (Object.keys(prefs).length > 0) {
        return `\n\n[COMMANDER PREFERENCES (Effective)]: ${JSON.stringify(prefs)}\n---`;
      }
    } catch (err) {
      console.warn("[Orchestrator] Preference fetch failed:", err);
    }
    return "";
  }

  /**
   * Enhanced Tools: MCP + Dynamic Memory Learning
   */
  private async getAvailableTools(currentNamespace: string): Promise<Record<string, unknown>> {
    const aiTools: Record<string, any> = {};

    // Internal Tool: memorize_fact (Layer 1 Memory)
    aiTools["memorize_fact"] = {
      description: "Permanently record a critical fact, brand detail, or identity information into long-term memory.",
      parameters: z.object({
        fact: z.string().describe("The atomic fact to remember"),
        importance: z.number().min(1).max(5).describe("1 for minor, 5 for critical brand/identity/security info"),
        workspace: z.string().optional().describe("Override workspace (default: current platform)"),
        project: z.string().optional().describe("Override project (default: current session)")
      }),
      execute: async ({ fact, importance, workspace, project }: any) => {
        const ws = workspace || this.env.CLOUDFLARE_AI_GATEWAY || "global"; // Use existing binding path
        const pj = project || this._lastContext.sessionId || "general";
        await this.memory.learnFact(fact, currentNamespace, importance, ws, pj);
        return { content: [{ type: "text", text: `Fact memorized in ${ws}/${pj}:${currentNamespace} layer.` }] };
      }
    };

    // Internal Tool: schedule_task (Task Delegation)
    aiTools["schedule_task"] = {
      description: "Schedule a recurring background task (e.g., SEO audit, domain monitoring).",
      parameters: z.object({
        name: z.string().describe("Descriptive name of the schedule"),
        task_type: z.string().describe("Type of task (e.g., 'seo_audit', 'uptime_check', 'deep_research')"),
        schedule: z.string().describe("Human readable schedule, e.g., 'every 2 hours', 'every 1 day'"),
        payload: z.record(z.string(), z.any()).describe("Arguments to pass to the tool when it runs")
      }),
      execute: async (args: any) => {
        const { SchedulerService } = await import("../ops/scheduler-service.js");
        const scheduler = new SchedulerService(this.env);
        const taskId = await scheduler.scheduleTask({
          ...args,
          userId: this._lastContext.userId || "system",
          channelId: this._lastContext.channelId || null,
          platform: this._lastContext.platform || "system"
        });
        return { content: [{ type: "text", text: `Task scheduled successfully with ID: ${taskId}. It will run ${args.schedule}.` }] };
      }
    };

    // Internal Tool: save_recipe (Manual Learning)
    aiTools["save_recipe"] = {
      description: "Manually save a sequence of steps as a reusable skill/recipe.",
      parameters: z.object({
        name: z.string().describe("Name of the skill"),
        description: z.string().describe("What this recipe accomplishes"),
        steps: z.array(z.object({
          tool: z.string(),
          args: z.record(z.string(), z.any())
        })).describe("List of tool calls")
      }),
      execute: async ({ name, description, steps }: any) => {
        const id = crypto.randomUUID();
        const currentEnv = this.env.ENVIRONMENT || "production";
        await this.env.DB.prepare(
          "INSERT INTO recipes (id, name, description, steps, env) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, name, description, JSON.stringify(steps), currentEnv).run();
        return { content: [{ type: "text", text: `Skill "${name}" learned and saved to recipe library.` }] };
      }
    };

    // Internal Tool: refine_core_memory (Self-Improving Memory)
    aiTools["refine_core_memory"] = {
      description: "Refine or update a core memory block (Identity, Protocols, Preferences) for the current persona or global brand.",
      parameters: z.object({
        block_id: z.string().describe("ID of the memory block to update (e.g., 'executive_protocols', 'persona_traits')"),
        is_global: z.boolean().describe("Whether this update applies to all personas (global) or just the current one"),
        content: z.string().describe("The new updated content for this memory block"),
        reason: z.string().describe("Why this refinement is being made (e.g., 'Target preferred TypeScript over Go based on feedback')")
      }),
      execute: async ({ block_id, is_global, content, reason }: any) => {
        const persona = is_global ? null : this._currentPersona;
        await this.coreMemory.refineBlock(block_id, persona, content, reason);
        return { content: [{ type: "text", text: `Core memory block "${block_id}" (Scope: ${persona || 'Global'}) refined successfully.` }] };
      }
    };

    // Internal Tool: delegate_to_subagent (Framework Delegation)
    aiTools["delegate_to_subagent"] = {
      description: "Delegate a specialized task to a sub-agent (e.g., guardian for health, ceo for strategy, seo for optimization).",
      parameters: z.object({
        agent_id: z.enum([
          "guardian", "ceo", "seo", "content", "researcher",
          "growth", "market", "cx", "lead", "gamer",
          "travel", "cinema", "hobby", "gacha"
        ]).describe("ID of the sub-agent to invoke"),
        task: z.string().describe("The specific instruction or goal for the sub-agent")
      }),
      execute: async ({ agent_id, task }: any) => {
        const context: SubAgentContext = {
          userId: this._lastContext.userId || "system",
          platform: this._lastContext.platform || "system",
          sessionId: this._lastContext.sessionId || "gen",
        };

        try {
          // Map specific agent IDs to their Category Workers
          let bindingName: keyof Env;

          if (["guardian", "lead"].includes(agent_id)) {
            bindingName = "AGENT_OPS" as keyof Env;
          } else if (["ceo", "content", "researcher"].includes(agent_id)) {
            bindingName = "AGENT_EXECUTIVE" as keyof Env;
          } else if (["seo", "growth", "market", "cx"].includes(agent_id)) {
            bindingName = "AGENT_GROWTH" as keyof Env;
          } else if (["gamer", "travel", "cinema", "hobby", "gacha"].includes(agent_id)) {
            bindingName = "AGENT_LIFESTYLE" as keyof Env;
          } else {
            return { error: `Unknown agent category for ${agent_id}` };
          }

          const agent = this.env[bindingName];

          if (!agent || typeof (agent as any).execute !== "function") {
            return { error: `Sub-agent category ${String(bindingName)} for ${agent_id} not found or does not support RPC.` };
          }

          const agentResult = await (agent as any).execute(task, context);
          return { content: [{ type: "text", text: agentResult }] };
        } catch (err) {
          console.error(`[Orchestrator] RPC call to ${agent_id} failed:`, err);
          return { error: `Failed to communicate with sub-agent ${agent_id}.` };
        }
      }
    };

    try {
      const { tools: mcpTools } = await this.arm.listTools();
      for (const tool of mcpTools) {
        if (!tool.name || aiTools[tool.name]) continue;
        aiTools[tool.name] = {
          description: tool.description || "No description provided",
          parameters: z.record(z.string(), z.any()).describe(`Args for ${tool.name}`),
          execute: async (args: unknown) => {
            try {
              const result = await this.arm.callTool("system", tool.name, args);

              // Handle background tasks returned by tools (e.g., deep_research)
              if (result && result.__background_task) {
                const { type, payload } = result.__background_task;
                // Capture context from current request if available
                const context = (this as any)._lastContext || {};
                await (this as any).queueBackgroundTask(type, payload, context);
              }

              return result;
            } catch (err) {
              return { error: `Execution failed: ${err}` };
            }
          }
        };
      }
    } catch (err) { }

    return aiTools;
  }

  private async logTelemetry(userMeta: { userId: string, platform: string }, modelId: string, text: string, latencyMs: number) {
    try {
      const tokens = text.length / 4;
      await this.profile.logUsage({
        userId: userMeta.userId,
        platform: userMeta.platform,
        tokensUsed: Math.ceil(tokens),
        neuronsEstimated: (tokens / 1000) * 1.5,
        modelId,
        actionType: "chat",
        latencyMs
      });
    } catch (err) { }
  }

  async summarize(history: any[]) {
    const workspace = this._lastContext.platform || "global";
    const project = this._lastContext.sessionId || "general";
    return await this.ai.summarizeSession(history, workspace, project);
  }

  async indexMemory(text: string, metadata: Record<string, any> = {}, namespace: string = "general") {
    // Background semantic indexing (Layer 2)
    return await this.memory.addMemory(text, metadata, namespace);
  }

  async saveToConfluence(space: string, title: string, history: any[], metadata: { persona: string, model: string }) {
    const workspace = this._lastContext.platform || "global";
    const project = this._lastContext.sessionId || "general";

    const formattedContent = history.map(m => `**${m.role.toUpperCase()}**: ${m.content}`).join("\n\n---\n\n");
    const pageBody = `h2. alikuxac Executive Session\n` +
      `* *Workspace*: ${workspace}\n` +
      `* *Project*: ${project}\n` +
      `* *Agent*: ${metadata.persona}\n` +
      `* *Model*: ${metadata.model}\n\n` +
      `h2. History\n${formattedContent}`;

    try {
      const fullTitle = `[${project.toUpperCase()}] ${title}`;
      return await this.arm.callTool("confluence", "createPage", {
        spaceId: space,
        title: fullTitle,
        body: pageBody,
        contentFormat: "markdown"
      });
    } catch (err) { throw err; }
  }

  async executeDirectTool(toolName: string, args: any) {
    return await this.arm.callTool("system", toolName, args);
  }

  /**
   * Pushes a task to the Cloudflare Queue.
   */
  private async queueBackgroundTask(type: string, payload: any, context: { channelId?: string, userId?: string, platform?: string, sessionId?: string }) {
    if (!this.env.QUEUE) {
      console.warn("[Orchestrator] QUEUE binding missing. Cannot run background task.");
      return;
    }

    try {
      const taskId = crypto.randomUUID();

      // If it's a research task, initialize it in the DB first
      if (type === "deep_research") {
        const currentEnv = this.env.ENVIRONMENT || "production";
        await this.env.DB.prepare(
          "INSERT INTO research_tasks (id, goal, status, user_id, channel_id, platform, session_id, env) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)"
        ).bind(
          taskId,
          payload.goal,
          context.userId || null,
          context.channelId || null,
          context.platform || null,
          context.sessionId || null,
          currentEnv
        ).run();
      }

      await this.env.QUEUE.send({
        id: taskId,
        type,
        payload
      });

      console.log(`[Orchestrator] Task ${type} queued with ID: ${taskId}`);
    } catch (err) {
      console.error("[Orchestrator] Fails to queue background task:", err);
    }
  }
}
