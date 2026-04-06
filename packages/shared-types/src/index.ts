/**
 * Repository Configuration stored in KV
 * Key: Repository ID (GitHub numeric ID)
 */
export interface RepoConfig {
  name: string;   // e.g., "alikuxac/infra"
  owner: string;  // e.g., "alikuxac" (Security Gate)
  mapping: Record<string, string>; // Path Prefix -> Component ID
}

/**
 * Event Types
 */
export type EventType = 'deployment' | 'build' | 'incident' | 'alert' | 'custom' | 'pullRequest';

/**
 * Base Event Input
 */
export interface BaseEventInput {
  type: EventType;
  repoId: string;
  owner: string;
  externalId?: string; // Unique ID from source (e.g. Deployment ID, Build Number)
  status?: string;
  path?: string;
  description?: string;
  meta?: Record<string, unknown>;
}

/**
 * Custom Event Input
 */
export interface CustomEventInput {
  repoId: string;
  owner: string;
  path?: string; // Support monorepo mapping
  title: string;
  description?: string;
  icon?: string;
  customId: string;
  url: string;
}

/**
 * Compass Event Payload
 * Based on Atlassian Compass API specification
 */
export interface CompassEventPayload {
  cloudId: string;        // REQUIRED: Atlassian Cloud ID
  componentId: string;    // Component ARI
  event: {
    [key: string]: unknown;
  };
}
