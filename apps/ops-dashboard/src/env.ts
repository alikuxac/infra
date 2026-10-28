import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
    // Secret Bindings
    DISCORD_BOT_TOKEN: string;
    ADMIN_KEY: string;

    // Service Bindings
    BRAIN: {
        processIntent(token: string, history: unknown[], persona: string, modelAlias: string, userMeta: unknown, provider: string): Promise<unknown>;
    };
    OPS_INTERNAL_TOKEN: string;
    ARM: {
        callTool(kit: string, tool: string, args: unknown): Promise<unknown>;
        listTools(): Promise<{ tools: unknown[] }>;
    };

    // Storage
    DB: D1Database;
}

