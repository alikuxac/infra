import { AgentPersona } from "@alikuxac/shared-types";

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface DiscordUser {
    id: string;
    username: string;
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
