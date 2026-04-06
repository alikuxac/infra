/**
 * Cloudflare Worker Environment Bindings
 */
import type { 
  RepoConfig, 
  EventType, 
  BaseEventInput, 
  CustomEventInput, 
  CompassEventPayload 
} from '@alikuxac/shared-types';

declare global {
  interface Env {
    // KV Namespace (from wrangler.toml)
    COMPASS_REGISTRY: KVNamespace;

    // Vars (from wrangler.toml)
    COMPASS_CLOUD_ID: string;

    // Secrets (set via wrangler secret put)
    ATLASSIAN_SITE_NAME: string;
    ATLASSIAN_EMAIL: string;
    ATLASSIAN_TOKEN: string;
    GATEWAY_CLIENT_SECRET: string;
    ADMIN_TOKEN: string;
  }
}

export type { 
  RepoConfig, 
  EventType, 
  BaseEventInput, 
  CustomEventInput, 
  CompassEventPayload 
};
