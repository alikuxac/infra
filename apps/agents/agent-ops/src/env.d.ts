/**
 * Agent Ops Environment - Overrides and Extensions
 */
export interface Env {
    // Durable Objects
    GUARDIAN_AGENT: DurableObjectNamespace<import("./index").GuardianWorker>;

    // Base Bindings
    ARM: any; // Using any for RPC support to resolve callTool errors
    DB: D1Database;
    VECTORIZE: VectorizeIndex;
    AI: any;
    QUEUE?: Queue;

    // AI Configuration
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_AI_GATEWAY: string;
    GATEWAY_TOKEN: string;
    EXECUTIVE_CHANNEL_ID?: string;
    TELEGRAM_BOT_TOKEN?: string;
    DISCORD_BOT_TOKEN?: string;

    // Authorization
    ALLOWED_DISCORD_IDS?: string;
    ALLOWED_TELEGRAM_IDS?: string;
}
