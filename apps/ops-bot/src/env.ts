import type { DurableObjectNamespace, D1Database } from "@cloudflare/workers-types";

export interface Env {
    // Secret Bindings
    DISCORD_BOT_TOKEN: string;
    DISCORD_PUBLIC_KEY: string;
    TELEGRAM_BOT_TOKEN: string;

    // App Config
    ALLOWED_DISCORD_IDS: string;
    ALLOWED_TELEGRAM_IDS: string;
    OPS_INTERNAL_TOKEN: string;
    TELEGRAM_WEBHOOK_SECRET?: string;

    // Durable Objects
    DiscordGatekeeper: DurableObjectNamespace;
    TelegramGatekeeper: DurableObjectNamespace;

    // Service Bindings
    BRAIN: {
        processIntent(token: string, history: any[], persona: string, modelAlias: string, userMeta: any, provider: string): Promise<any>;
        summarize(token: string, history: any[]): Promise<string>;
    };
    ARM: {
        callTool(provider: string, tool: string, args: unknown): Promise<any>;
        listTools(): Promise<{ tools: any[] }>;
    };

    // Storage
    DB: D1Database;
    ENVIRONMENT: string;

}
