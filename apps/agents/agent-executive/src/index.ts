import { routeAgentRequest } from "agents";
import { CEOWorker } from "./personas/ceo";
import { ContentWorker } from "./personas/content";
import { ResearcherWorker } from "./personas/researcher";

/**
 * Environment Interface
 */
export interface Env {
    // Services
    ARM: any; // Resolved: Use any to avoid deep type instantiation from McpAgent

    // Durable Objects (Named Entrypoints)
    CEO_AGENT: DurableObjectNamespace<CEOWorker>;
    CONTENT_AGENT: DurableObjectNamespace<ContentWorker>;
    RESEARCHER_AGENT: DurableObjectNamespace<ResearcherWorker>;

    // Secrets & Vars
    CF_ACCOUNT_ID: string;
    CF_GATEWAY_NAME: string;
    CF_GATEWAY_TOKEN: string;
}

// Re-export for DO registration
export { CEOWorker, ContentWorker, ResearcherWorker };

/**
 * Main Worker Export with Routing
 */
export default {
    async fetch(request: Request, env: any) {
        return (await routeAgentRequest(request, env)) || new Response("Not Found", { status: 404 });
    }
};
