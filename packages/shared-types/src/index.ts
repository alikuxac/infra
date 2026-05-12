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

/**
 * Jira Projects for the Empire
 */
export enum JiraProject {
  AIO = 'AIO',   // Execution & Tasks
  IDEA = 'IDEA', // Planning & Drafts
  SP = 'SP'      // Support & Internal
}

/**
 * AI Provider Configuration for Rotation
 */
/**
 * AI Provider Configuration for Rotation
 */
export type ModelProvider = 'groq' | 'google' | 'cloudflare' | 'openrouter';

/**
 * Specialized Agent Personas
 */
export enum AgentPersona {
  PLANNER = 'planner',     // Technical & Ops Planning
  MARKETING = 'marketing', // Creative & Growth
  RECON = 'recon',          // Data gathering & Analysis
  EXECUTIVE = 'executive',  // Brand Strategy & Business Ops
  CHAT = 'chat',             // Casual Chat

  // Specialized Ops
  LEAD = 'lead',
  GUARDIAN = 'guardian',

  // Specialized Growth
  GROWTH = 'growth',
  MARKET = 'market',
  CX = 'cx',
  SEO = 'seo',

  // Specialized Executive
  CEO = 'ceo',
  CONTENT = 'content',
  RESEARCHER = 'researcher',

  // Specialized Lifestyle
  TRAVEL = 'travel',
  CINEMA = 'cinema',
  HOBBY = 'hobby',
  GACHA = 'gacha',
  GAMER = 'gamer'
}

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  priority: number; // Lower is higher priority
  persona?: AgentPersona;
  features?: {
    supportsToolCalling: boolean;
    supportsStructuredOutput: boolean;
    maxContextWindow: number;
  };
}
