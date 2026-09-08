/**
 * Standard Discord API Client for Alikuxac Infrastructure
 */

export enum DiscordChannelType {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
    GUILD_CATEGORY = 4,
    GUILD_ANNOUNCEMENT = 5,
    ANNOUNCEMENT_THREAD = 10,
    PUBLIC_THREAD = 11,
    PRIVATE_THREAD = 12,
    GUILD_FORUM = 15,
}

export interface DiscordChannel {
    id: string;
    type: DiscordChannelType;
    name?: string;
    parent_id?: string;
    guild_id?: string;
}

export class DiscordClient {
    private baseUrl = "https://discord.com/api/v10";

    constructor(private token: string) { }

    /**
     * Fetch channel metadata
     */
    async getChannel(channelId: string): Promise<DiscordChannel> {
        const response = await fetch(`${this.baseUrl}/channels/${channelId}`, {
            headers: {
                Authorization: `Bot ${this.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.json() as Promise<DiscordChannel>;
    }

    /**
     * Patch a message (e.g. for deferred original responses)
     */
    async patchMessage(applicationId: string, interactionToken: string, options: string | { content?: string, embeds?: any[], components?: any[] }) {
        const url = `${this.baseUrl}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
        const body = typeof options === "string" ? { content: options } : options;

        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...body,
                content: body.content && body.content.length > 2000 ? body.content.substring(0, 1990) + "..." : body.content
            })
        });
        return response.ok;
    }

    /**
   * Send an interaction response (callback)
   */
    async sendInteractionResponse(interactionId: string, interactionToken: string, options: string | { content?: string, embeds?: any[], components?: any[] }, type = 4) {
        const url = `${this.baseUrl}/interactions/${interactionId}/${interactionToken}/callback`;
        const body = typeof options === "string" ? { content: options } : options;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type,
                data: {
                    ...body,
                    content: body.content && body.content.length > 2000 ? body.content.substring(0, 1990) + "..." : body.content
                }
            })
        });
        return response.ok;
    }

    /**
     * Send an autocomplete response (choices)
     */
    async sendAutocompleteResponse(interactionId: string, interactionToken: string, choices: any[]) {
        const url = `${this.baseUrl}/interactions/${interactionId}/${interactionToken}/callback`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
                data: { choices }
            })
        });
        return response.ok;
    }

    /**
     * Create or get a DM channel for a specific user
     */
    async getOrCreateDM(userId: string): Promise<string> {
        const response = await fetch(`${this.baseUrl}/users/@me/channels`, {
            method: "POST",
            headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipient_id: userId }),
        });
        if (!response.ok) {
            throw new Error(`Failed to create DM: ${await response.text()}`);
        }
        const data = await response.json() as any;
        return data.id;
    }

    /**
   * Send a new message to a channel (with automatic chunking for content)
   */
    async sendMessage(channelId: string, options: string | { content?: string, embeds?: any[], components?: any[] }) {
        const body = typeof options === "string" ? { content: options } : options;

        // If there's no content or content is small, send as is
        if (!body.content || body.content.length <= 2000) {
            const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bot ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            if (response.ok) return [await response.json()];
            console.error(`[DiscordClient] Failed to send message:`, await response.text());
            return [];
        }

        // Handle chunking for large content
        const chunks = this.chunkString(body.content, 1950);
        const results = [];

        for (let i = 0; i < chunks.length; i++) {
            const isLast = i === chunks.length - 1;
            const chunkBody: any = { content: chunks[i] };

            // Send embeds and components only with the first (or last) chunk? 
            // Usually best with the last chunk so the message feels "complete" at the bottom.
            if (isLast) {
                if (body.embeds) chunkBody.embeds = body.embeds;
                if (body.components) chunkBody.components = body.components;
            }

            const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bot ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunkBody),
            });

            if (response.ok) {
                results.push(await response.json());
            } else {
                console.error(`[DiscordClient] Failed to send chunk ${i}:`, await response.text());
            }
        }
        return results;
    }

    private chunkString(str: string, size: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < str.length; i += size) {
            chunks.push(str.substring(i, i + size));
        }
        return chunks;
    }

    /**
     * Fetch guilds the bot is in
     */
    async getGuilds(): Promise<any[]> {
        const response = await fetch(`${this.baseUrl}/users/@me/guilds`, {
            headers: { Authorization: `Bot ${this.token}` },
        });
        if (!response.ok) return [];
        return response.json();
    }

    /**
     * Fetch guild channels
     */
    async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${this.token}` },
        });
        if (!response.ok) return [];
        return response.json();
    }

    /**
     * Create a guild channel
     */
    async createChannel(guildId: string, options: { name: string; type?: number; parent_id?: string; topic?: string; nsfw?: boolean; rate_limit_per_user?: number; position?: number; permission_overwrites?: any[] }) {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/channels`, {
            method: "POST",
            headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.json();
    }

    /**
     * Modify a channel
     */
    async modifyChannel(channelId: string, options: { name?: string; type?: number; position?: number; topic?: string; nsfw?: boolean; rate_limit_per_user?: number; bitrate?: number; user_limit?: number; permission_overwrites?: any[]; parent_id?: string }) {
        const response = await fetch(`${this.baseUrl}/channels/${channelId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.json();
    }

    /**
     * Delete a channel
     */
    async deleteChannel(channelId: string) {
        const response = await fetch(`${this.baseUrl}/channels/${channelId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bot ${this.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.json();
    }

    /**
     * Get guild roles
     */
    async getRoles(guildId: string): Promise<any[]> {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${this.token}` },
        });
        if (!response.ok) return [];
        return response.json();
    }

    /**
     * Create guild role
     */
    async createRole(guildId: string, options: { name?: string; permissions?: string; color?: number; hoist?: boolean; mentionable?: boolean }) {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/roles`, {
            method: "POST",
            headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.json();
    }

    /**
     * Modify guild role
     */
    async modifyRole(guildId: string, roleId: string, options: { name?: string; permissions?: string; color?: number; hoist?: boolean; mentionable?: boolean }) {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/roles/${roleId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.json();
    }

    /**
     * Delete guild role
     */
    async deleteRole(guildId: string, roleId: string) {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/roles/${roleId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bot ${this.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.ok;
    }

    /**
     * Add guild member role
     */
    async addMemberRole(guildId: string, userId: string, roleId: string) {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bot ${this.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.ok;
    }

    /**
     * Remove guild member role
     */
    async removeMemberRole(guildId: string, userId: string, roleId: string) {
        const response = await fetch(`${this.baseUrl}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bot ${this.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.ok;
    }

    /**
     * Edit channel permission overwrites
     */
    async setChannelPermission(channelId: string, overwriteId: string, options: { allow: string; deny: string; type: number }) {
        const response = await fetch(`${this.baseUrl}/channels/${channelId}/permissions/${overwriteId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.ok;
    }

    /**
     * Delete channel permission overwrites
     */
    async deleteChannelPermission(channelId: string, overwriteId: string) {
        const response = await fetch(`${this.baseUrl}/channels/${channelId}/permissions/${overwriteId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bot ${this.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Discord API Error: ${response.status} ${await response.text()}`);
        }
        return response.ok;
    }
}

