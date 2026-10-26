/**
 * Cloudflare Worker Environment Bindings
 */
import type { RepoConfig } from '@alikuxac/shared-types';

declare global {
  interface Env {
    // KV Namespace (from wrangler.toml)
    COMPASS_REGISTRY: KVNamespace;

    // Secrets (set via wrangler secret put)
    GATEWAY_CLIENT_SECRET: string;
    ADMIN_TOKEN: string;
  }
}

export type { RepoConfig };
