import type { DurableObjectNamespace, Fetcher, D1Database, Queue, Ai, VectorizeIndex, ExecutionContext } from "@cloudflare/workers-types";

/**
 * Global Environment Interface (Unified)
 */
export interface Env {
	// App Config
	ALLOWED_DISCORD_IDS: string;
	ALLOWED_TELEGRAM_IDS: string;
	EXECUTIVE_CHANNEL_ID: string;
	DISCORD_EXECUTIVE_ID?: string;
	ENVIRONMENT: string;


	// Cloudflare & Third Party Keys
	GATEWAY_TOKEN: string;
	CLOUDFLARE_AI_GATEWAY: string;
	CLOUDFLARE_ACCOUNT_ID: string;

	// Service Bindings - Use any for RPC-capable bindings
	ARM: any;
	MESSAGING: any;
	AGENT_OPS: any;
	AGENT_EXECUTIVE: any;
	AGENT_GROWTH: any;
	AGENT_LIFESTYLE: any;

	// Infrastructure Bindings
	DB: D1Database;
	VECTORIZE: VectorizeIndex;
	QUEUE: Queue;
	AI: Ai;
	ASSETS: Fetcher;

	// Monitoring Config
	ERROR_ALERTS?: string;
	LOG_LEVEL?: string;
	DISCORD_ALERT_MENTION?: string; // e.g. <@&ROLE_ID>
	TELEGRAM_ALERT_MENTION?: string; // e.g. @username
}
