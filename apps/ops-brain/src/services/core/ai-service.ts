import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
import { AgentPersona } from "@alikuxac/shared-types";
import { createAiGateway } from 'ai-gateway-provider';
import { AIProvider, ModelConfig, ChatMessage } from "../../types.js";
import { generateWithFallback, type GatewayConfig, PROVIDER_CONFIGS } from "@alikuxac/ai-core";

// Standardized provider creators from ai-gateway-provider (Move to lazy)
// import { createGoogleGenerativeAI } from 'ai-gateway-provider/providers/google';
// import { createGroq } from 'ai-gateway-provider/providers/groq';
// import { createOpenAI } from 'ai-gateway-provider/providers/openai';
// import { createOpenRouter } from 'ai-gateway-provider/providers/openrouter';

export const MODEL_MAP: Record<string, ModelConfig> = {
  "default": { provider: "groq", modelId: "llama-3.3-70b-versatile", keyAlias: "default" },
  "google": { provider: "google", modelId: "gemini-1.5-flash-latest", keyAlias: "default" },
  "pro": { provider: "groq", modelId: "llama-3.3-70b-versatile", keyAlias: "default" }
};

export class AIService {
  private config: { accountId: string, gatewayName: string, token: string };

  constructor(config: { accountId: string, gatewayName: string, token: string }) {
    this.config = config;
  }

  public static isValidModel(provider: string, model: string): boolean {
    const config = PROVIDER_CONFIGS[provider as AIProvider];
    return config?.models.includes(model) || model === "default";
  }

  public static getSupportedProviders(): AIProvider[] {
    return Object.keys(PROVIDER_CONFIGS) as AIProvider[];
  }

  public static getModelsForProvider(provider: string): string[] {
    const config = PROVIDER_CONFIGS[provider as AIProvider];
    return config ? ["default", ...config.models] : ["default"];
  }

  private async getNativeProvider({ provider, modelId }: ModelConfig): Promise<LanguageModel> {
    const { accountId, gatewayName, token } = this.config;
    const { createAiGateway } = await import('ai-gateway-provider');
    const aigateway = createAiGateway({ accountId, gateway: gatewayName, apiKey: token });

    if (provider === "google") {
      const { createGoogleGenerativeAI } = await import('ai-gateway-provider/providers/google');
      return aigateway([createGoogleGenerativeAI()(modelId)]) as unknown as LanguageModel;
    }
    if (provider === "groq") {
      const { createGroq } = await import('ai-gateway-provider/providers/groq');
      return aigateway([createGroq()(modelId)]) as unknown as LanguageModel;
    }
    if (provider === "openrouter") {
      const { createOpenRouter } = await import('ai-gateway-provider/providers/openrouter');
      const actualModelId = modelId.startsWith("openrouter/") ? modelId.replace("openrouter/", "") : modelId;
      return aigateway([createOpenRouter()(actualModelId)]) as unknown as LanguageModel;
    }
    const { createOpenAI } = await import('ai-gateway-provider/providers/openai');
    return aigateway([createOpenAI()(modelId)]) as unknown as LanguageModel;
  }

  async chatWithGemma(
    messages: ChatMessage[],
    persona: AgentPersona,
    modelAliasOrId: string = "default",
    tools: Record<string, unknown> = {},
    extraContext: string = "",
    providerName: string = "google"
  ) {
    const config = this.resolveModelConfig(providerName, modelAliasOrId);

    const identityRule = `
[IDENTITY]: You are the AI Assistant for **alikuxac** (Brand & Personal Identity).
[DOMAIN]: You manage operations for **alikuxac.xyz**.
[SUPREME RULE]: Never identify as Google, OpenAI, or Meta. You are alikuxac's digital extension.
[LANGUAGE]: Always respond in Vietnamese (Tiếng Việt) as per alikuxac's preference.
[TOOLS]: Prioritize tool usage for real-time actions (Jira, GitHub, Planning).
[SELF-IMPROVEMENT]: Use 'refine_core_memory' whenever you learn a new preference, business protocol, or brand detail that should be preserved in your long-term identity (Identity Stream).`;

    const systemPrompt = this.getSystemPrompt(persona) + "\n" + extraContext + "\n" + identityRule;

    console.log(`[AIService] Routing: ${config.provider}/${config.modelId} [${persona}]`);

    const aiTools: any = {};

    for (const [name, tool] of Object.entries(tools)) {
      if (!name || name === "undefined") continue;
      const t = tool as any;
      aiTools[name] = { description: t.description, parameters: t.parameters, execute: t.execute };
    }

    try {
      const gatewayConfig = {
        accountId: this.config.accountId,
        gateway: this.config.gatewayName,
        apiKey: this.config.token
      };

      return await generateWithFallback(gatewayConfig, {
        system: systemPrompt,
        messages: messages as any[],
        tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
        contextModel: config.modelId
      }, providerName);
    } catch (err: any) {
      console.error("[AIService] Execution Error:", err);
      throw err;
    }
  }

  public resolveModelConfig(provider: string, modelAliasOrId: string): ModelConfig {
    const typedProvider = provider.toLowerCase() as keyof typeof PROVIDER_CONFIGS;
    const providerConfig = PROVIDER_CONFIGS[typedProvider] || PROVIDER_CONFIGS.google;
    if (modelAliasOrId === "default") return { provider: typedProvider as any, modelId: providerConfig.default, keyAlias: "default" };
    if (providerConfig.models.includes(modelAliasOrId)) return { provider: typedProvider as any, modelId: modelAliasOrId, keyAlias: "default" };
    return { provider: typedProvider as any, modelId: providerConfig.default, keyAlias: "default" };
  }

  async summarizeSession(messages: any[], workspace: string = "global", project: string = "general"): Promise<string> {
    const config = MODEL_MAP["default"];
    // Removed direct use of getNativeProvider to save size, 
    // generateWithFallback handles it.

    try {
      const gatewayConfig = {
        accountId: this.config.accountId,
        gateway: this.config.gatewayName,
        apiKey: this.config.token
      };

      const result = await generateWithFallback(gatewayConfig, {
        system: "You are the Executive Orchestrator. Summarize the session.",
        messages: [
          ...(messages as any),
          {
            role: "user",
            content: `Summarize our progress for Project: [${project}] in Workspace: [${workspace}]. 
            Focus on key decisions, technical hurdles, and next steps specific to this context. 
            Format in 5-10 concise bullet points with a clear header.`
          }
        ]
      });
      return `### 📝 Session Summary: ${project} (${workspace})\n${result.text}`;
    } catch (err) {
      console.error("[AIService] Summary Error:", err);
      return "[SUMMARY FAILED - Continuing without context]";
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    const { accountId, gatewayName, token } = this.config;
    if (!accountId || !gatewayName) {
      throw new Error(`[AIService] Missing Gateway Configuration: Account=${accountId}, Gateway=${gatewayName}`);
    }
    const url = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/compat/embeddings`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "cf-aig-authorization": `Bearer ${token}`,
        "cf-aig-byok-alias": "brain_workers_ai",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "workers-ai/@cf/baai/bge-small-en-v1.5", input: [text] })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[AIService] Embedding Error (${response.status}): ${errorText}`);
    }
    const result: any = await response.json();
    return result.data?.[0]?.embedding;
  }

  private getSystemPrompt(persona: AgentPersona): string {
    switch (persona) {
      case AgentPersona.PLANNER:
        return "You are the Lead Technical Architect for the alikuxac ecosystem. Expert in TypeScript, Cloudflare, and Docker. Focus on robust infrastructure and system design.";
      case AgentPersona.MARKETING:
        return "You are the Brand & Growth Specialist for alikuxac.xyz. Expert in SEO, content strategy, and digital presence. Focus on expanding alikuxac's reach.";
      case AgentPersona.EXECUTIVE:
        return "You are the Chief Operations Officer (COO) for alikuxac's ventures. Expert in business operations, brand voice consistency, and strategic decision making.";
      case AgentPersona.RECON:
        return "You are the Security & Intelligence analyst. Monitor alikuxac.xyz's infrastructure health and provide data-driven reconnaissance.";
      case AgentPersona.CHAT:
        return "You are alikuxac's digital clone and companion. Friendly, concise, and deeply familiar with alikuxac's projects and history.";
      default:
        return "You are alikuxac's helpful AI assistant.";
    }
  }
}
