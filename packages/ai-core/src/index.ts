import { generateText, type LanguageModel } from "ai";
// import { createAiGateway } from 'ai-gateway-provider'; // Move to lazy
// import { createOpenRouter } from 'ai-gateway-provider/providers/openrouter';
// import { createGoogleGenerativeAI } from 'ai-gateway-provider/providers/google';
// import { createGroq } from 'ai-gateway-provider/providers/groq';
export * from './prompts';

/**
 * Central Model Configuration
 */
export const PROVIDER_CONFIGS: Record<string, { default: string; models: string[] }> = {
    google: {
        default: "gemini-2.0-flash",
        models: ["gemini-2.0-flash", "gemma-4-26b-a4b", "gemma-4-31b"]
    },
    groq: {
        default: "gpt-oss-120b",
        models: ["gpt-oss-120b", "gpt-oss-20b", "llama-3.3-70b", "llama-4-scout", "qwen/qwen3-32b"]
    },
    openrouter: {
        default: "nvidia/nemotron-3-nano-30b-a3b:free",
        models: [
            "openrouter/elephant-alpha",
            "google/gemma-4-31b:free",
            "minimax/minimax-m2.5:free",
            "nvidia/nemotron-3-nano-30b-a3b:free",
            "nvidia/nemotron-3-super:free",
            "openai/gpt-oss-120b:free",
            "qwen/qwen3-next-80b-a3b-instruct:free",
            "z-ai/glm-4.5-air:free",
            "meta-llama/llama-3.3-70b-instruct:free"
        ]
    }
};

export interface GatewayConfig {
    accountId: string;
    gateway: string;
    apiKey: string;
}

export const getGatewayConfig = (env: any): GatewayConfig => ({
    accountId: env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || env.ACCOUNT_ID,
    gateway: env.CLOUDFLARE_AI_GATEWAY || env.CF_GATEWAY_NAME || env.CLOUDFLARE_AI_GATEWAY_NAME || env.AI_GATEWAY_NAME,
    apiKey: env.GATEWAY_TOKEN || env.CF_GATEWAY_TOKEN || env.AI_GATEWAY_TOKEN
});

/**
 * Automatically resolve gateway config from env or ARM binding
 */
export const resolveGatewayConfig = async (env: any): Promise<GatewayConfig> => {
    const local = getGatewayConfig(env);

    // If any required field is missing, try to fetch from ARM (Central Secret Store)
    if ((!local.accountId || !local.gateway || !local.apiKey) && env.ARM?.getAIConfig) {
        try {
            const remote = await env.ARM.getAIConfig();
            return {
                accountId: local.accountId || remote.accountId,
                gateway: local.gateway || remote.gateway,
                apiKey: local.apiKey || remote.apiKey
            };
        } catch (e) {
            console.warn("[ai-core] Failed to fetch config from ARM:", e);
        }
    }

    return local;
};

/**
 * Common Model Configuration with AI Gateway
 */
export const getModel = async (env: GatewayConfig, provider: string, model: string): Promise<any> => {
    // Dynamic imports to reduce bundle size
    const { createAiGateway } = await import('ai-gateway-provider');

    const aigateway = createAiGateway({
        accountId: env.accountId,
        gateway: env.gateway,
        apiKey: env.apiKey
    });

    if (provider === "google") {
        const { createGoogleGenerativeAI } = await import('ai-gateway-provider/providers/google');
        return aigateway([createGoogleGenerativeAI({})(model)]);
    }
    if (provider === "groq") {
        const { createGroq } = await import('ai-gateway-provider/providers/groq');
        return aigateway([createGroq({})(model)]);
    }

    const { createOpenRouter } = await import('ai-gateway-provider/providers/openrouter');
    const actualModelId = (provider === "openrouter" && model.startsWith("openrouter/"))
        ? model.replace("openrouter/", "")
        : model;

    return (aigateway as any)([createOpenRouter({})(actualModelId)]);
};

export interface FallbackOptions {
    system: string;
    prompt?: string;
    messages?: any[];
    tools?: Record<string, any>;
    contextModel?: string;
    onFallback?: (model: string, error: any) => void;
}

/**
 * Unified Generation (Single Attempt - Fallback Disabled)
 */
export const generateWithFallback = async (env: GatewayConfig | any, options: FallbackOptions, providerHint: string = "groq") => {
    // Automatically resolve config if raw env is provided
    const config = (env.accountId && env.gateway && env.apiKey)
        ? env as GatewayConfig
        : await resolveGatewayConfig(env);

    // Determine the single model to try
    const safeProvider = PROVIDER_CONFIGS[providerHint] ? providerHint : "groq";
    let provider = safeProvider;
    let modelId = options.contextModel || PROVIDER_CONFIGS[safeProvider].default;

    if (options.contextModel) {
        provider = options.contextModel.includes("/") ? "openrouter" : safeProvider;
        modelId = options.contextModel;
    }

    try {
        const model = await getModel(config, provider, modelId);
        const result = await generateText({
            model: model as any,
            system: options.system,
            ...(options.prompt ? { prompt: options.prompt } : { messages: options.messages || [] }),
            tools: options.tools,
        });

        // Some providers/wrappers might hide text in individual steps if the aggregate property is buggy
        const stepText = result.steps?.map(s => s.text).filter(Boolean).join("\n") || "";
        const finalOutput = result.text || stepText;
        // Comprehensive check for content (Text, Reasoning, Tool Results, or Tool Calls)
        const hasToolResults = result.toolResults && result.toolResults.length > 0;
        const hasToolCalls = result.toolCalls && result.toolCalls.length > 0;
        const hasReasoning = (result as any).reasoning && (result as any).reasoning.length > 0;

        // Check for content in various potential fields
        const meta = result.providerMetadata || {};
        const openRouterResponse = meta.openrouter as any;
        const openRouterReasoning = openRouterResponse?.reasoning_details;
        const hasOpenRouterReasoning = openRouterReasoning && openRouterReasoning.length > 0;

        // Exhaustive Content Rescue: Search multiple potential paths for the real output
        const orMetadata = (result as any).providerMetadata?.openrouter;
        const oaMetadata = (result as any).providerMetadata?.openai;

        // Try to find content in response messages if meta is empty
        const respMessages = (result as any).response?.messages;
        const assistantMsg = respMessages?.find((m: any) => m.role === 'assistant');
        const respContent = assistantMsg?.content?.find((c: any) => c.type === 'text')?.text;

        const rescuedContent = orMetadata?.content ||
            orMetadata?.message?.content ||
            orMetadata?.choices?.[0]?.message?.content ||
            oaMetadata?.choices?.[0]?.message?.content ||
            respContent;

        if (!result.text && rescuedContent) {
            (result as any).text = rescuedContent;
        }

        const hasContent = finalOutput || hasReasoning || hasOpenRouterReasoning || hasToolResults || hasToolCalls;

        if (!hasContent) {
            const debugInfo = {
                textLen: result.text?.length || 0,
                stepTextLen: stepText.length,
                reasoningLen: (result as any).reasoning?.length || 0,
                finishReason: result.finishReason,
                usage: result.usage,
                stepCount: result.steps?.length || 0,
                hasToolCalls,
                hasToolResults,
                // Include first step details if available for deeper debugging
                firstStepType: (result.steps?.[0] as any)?.type,
                firstStepHasText: !!result.steps?.[0]?.text
            };
            throw new Error(`Model ${modelId} empty response. Debug: ${JSON.stringify(debugInfo)}`);
        }

        // Patch result.text if it was empty but we found it in steps
        if (!result.text && stepText) {
            (result as any).text = stepText;
        }

        // Patch reasoning and/or text if found in OpenRouter metadata (Sophisticated parsing)
        if (hasOpenRouterReasoning) {
            let reasoningAcc = "";
            let textAcc = "";

            for (const detail of openRouterReasoning) {
                const type = detail.type || "";
                if (type === "response.text" || type === "text" || type === "response.output_text") {
                    textAcc += detail.text || "";
                } else {
                    reasoningAcc += detail.text || "";
                }
            }

            if (!(result as any).reasoning && reasoningAcc) {
                (result as any).reasoning = reasoningAcc.trim();
            }
            if (!result.text && textAcc) {
                (result as any).text = textAcc.trim();
            }

            // Ultimate Fallback: If text is still empty but we have reasoning, use it.
            // Aggressive Filtering: Skip if it looks like an internal monologue.
            if (!result.text && (result as any).reasoning) {
                const rText = (result as any).reasoning.trim();
                const thoughtPrefixes = [
                    "okay,", "hmm,", "let me", "the user", "i should", "i will",
                    "chào bạn!", "xin chào" // Exception: if it starts with a greeting, it's probably the result
                ];

                const lowerText = rText.toLowerCase();
                const isInternalMonologue = (lowerText.startsWith("okay") || lowerText.startsWith("hmm") ||
                    lowerText.startsWith("the user") || lowerText.includes("i should") ||
                    lowerText.startsWith("i'll") || lowerText.startsWith("drafting")) &&
                    !rText.includes("Chào bạn"); // Keep it if it has a greeting

                if (!isInternalMonologue) {
                    (result as any).text = rText;
                }
            }
        }

        return result;
    } catch (e: any) {
        console.error(`[ai-core] Model ${modelId} execution failed: ${e.message}`);
        if (options.onFallback) {
            options.onFallback(modelId, e);
        }
        throw e;
    }
};
