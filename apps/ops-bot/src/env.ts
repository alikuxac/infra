import type { DurableObjectNamespace, D1Database, ExecutionContext } from "@cloudflare/workers-types";

export interface Env {
    // Secret Bindings
    DISCORD_BOT_TOKEN: string;
    DISCORD_PUBLIC_KEY: string;
    TELEGRAM_BOT_TOKEN: string;

    // App Config
    ALLOWED_DISCORD_IDS: string;
    ALLOWED_TELEGRAM_IDS: string;

    // Durable Objects
    DiscordGatekeeper: DurableObjectNamespace;
    TelegramGatekeeper: DurableObjectNamespace;

    // Service Bindings
    BRAIN: {
        processIntent(history: any[], persona: string, modelAlias: string, userMeta: any, provider: string): Promise<any>;
        summarize(history: any[]): Promise<string>;
    };
    ARM: {
        callTool(provider: string, tool: string, args: unknown): Promise<any>;
        listTools(): Promise<{ tools: any[] }>;
    };

    // Storage
    DB: D1Database;
    ENVIRONMENT: string;

}
