import { routeAgentRequest } from "agents";
import { TravelWorker } from "./personas/travel";
import { CinemaWorker } from "./personas/cinema";
import { HobbyWorker } from "./personas/hobby";
import { GachaWorker } from "./personas/gacha";
import { GamerWorker } from "./personas/gamer";

/**
 * Environment Interface
 */
export interface Env {
    // Services
    ARM: any;

    // Durable Objects
    TRAVEL_AGENT: DurableObjectNamespace<TravelWorker>;
    CINEMA_AGENT: DurableObjectNamespace<CinemaWorker>;
    HOBBY_AGENT: DurableObjectNamespace<HobbyWorker>;
    GACHA_AGENT: DurableObjectNamespace<GachaWorker>;
    GAMER_AGENT: DurableObjectNamespace<GamerWorker>;

    // Secrets & Vars
    CF_ACCOUNT_ID: string;
    CF_GATEWAY_NAME: string;
    CF_GATEWAY_TOKEN: string;
}

// Re-export for DO registration
export { TravelWorker, CinemaWorker, HobbyWorker, GachaWorker, GamerWorker };

export default {
    async fetch(request: Request, env: any) {
        return (await routeAgentRequest(request, env)) || new Response("Not Found", { status: 404 });
    }
};
