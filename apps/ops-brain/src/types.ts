import { AgentPersona } from "@alikuxac/shared-types";

/**
 * AI Provider Types
 */
export type AIProvider = 'google' | 'groq' | 'openrouter' | 'openai';

export interface ModelConfig {
  provider: AIProvider;
  modelId: string;
  keyAlias?: string;
}

/**
 * Session & Metadata
 */
export interface SessionMetadata {
  persona?: AgentPersona;
  modelAlias?: string;
  provider?: AIProvider;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SessionData {
  history: ChatMessage[];
  metadata: SessionMetadata;
}

/**
 * Discord Interactions
 */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: {
    id: string;
    name: string;
    options?: Array<{
      name: string;
      value: any;
      type: number;
    }>;
    custom_id?: string;
  };
  token: string;
  member?: {
    user: DiscordUser;
  };
  user?: DiscordUser;
  channel_id?: string;
  guild_id?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: DiscordEmbedField[];
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordMessageOptions {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: any[];
}

/**
 * MCP & Tools
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPToolResult {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
}

/**
 * Telemetry
 */
export interface AIUsageLog {
  userId: string;
  platform: string;
  tokensUsed: number;
  neuronsEstimated: number;
  modelId: string;
  actionType: string;
  latencyMs?: number;
}

/**
 * Sub-Agent Framework
 */
export interface SubAgentContext {
  userId: string;
  platform: string;
  sessionId: string;
  workspace?: string;
  project?: string;
  Env?: {
    GATEWAY_TOKEN?: string;
    CLOUDFLARE_AI_GATEWAY?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
  };
}

export interface SubAgent {
  id: string;
  persona: AgentPersona;
  description: string;
  execute(goal: string, context: SubAgentContext): Promise<string>;
}
