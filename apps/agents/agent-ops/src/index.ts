import type { Env } from "./env";
import { GuardianWorker } from "./personas/guardian.js";

/**
 * Agent Ops - Specialized Infrastructure & Security Worker.
 * Acts as a support category for the Master Brain.
 */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        return new Response("Alikuxac Agent Ops (Support Category) is online.", { status: 200 });
    }
};

// Export durable objects and entrypoints
export { GuardianWorker };
export type { Env };
