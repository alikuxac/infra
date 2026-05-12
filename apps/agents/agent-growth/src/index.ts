import { routeAgentRequest } from "agents";
import { GrowthWorker } from "./personas/growth";
import { MarketWorker } from "./personas/market";
import { CXWorker } from "./personas/cx";
import { SEOWorker } from "./personas/seo";

/**
 * Environment Interface
 */
export interface Env {
    // Services
    ARM: any;

    // Durable Objects
    GROWTH_AGENT: DurableObjectNamespace<GrowthWorker>;
    MARKET_AGENT: DurableObjectNamespace<MarketWorker>;
    CX_AGENT: DurableObjectNamespace<CXWorker>;
    SEO_AGENT: DurableObjectNamespace<SEOWorker>;

    // Secrets & Vars
    CF_ACCOUNT_ID: string;
    CF_GATEWAY_NAME: string;
    CF_GATEWAY_TOKEN: string;
}

// Re-export for DO registration
export { GrowthWorker, MarketWorker, CXWorker, SEOWorker };

export default {
    async fetch(request: Request, env: any) {
        return (await routeAgentRequest(request, env)) || new Response("Not Found", { status: 404 });
    }
};
