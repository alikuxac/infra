import { Env } from "../env.js";
import { DiscordClient, DiscordChannelType } from "@alikuxac/discord-core";
import { MappingService } from "./mapping-service.js";
import { AgentPersona } from "@alikuxac/shared-types";
import { APIChannel, APIThreadChannel } from "discord-api-types/v10";

export interface ResolvedContext {
    workspace: string;
    project: string;
    session: string;
    name?: string;
    persona?: AgentPersona;
}

export class ContextDiscoveryService {
    private client: DiscordClient;
    private mapping: MappingService;

    constructor(private env: Env) {
        this.client = new DiscordClient(env.DISCORD_BOT_TOKEN);
        this.mapping = new MappingService(env);
    }

    async resolveDiscordContext(channelId: string, guildId?: string): Promise<ResolvedContext> {
        if (!guildId) {
            return {
                workspace: "personal",
                project: "direct_messages",
                session: `dm_${channelId}`,
                name: "Direct Message"
            };
        }

        try {
            const channel = await this.client.getChannel(channelId);
            const parentId = channel.parent_id;

            const mapped = await this.mapping.resolveDiscordContext(guildId, channelId, parentId);

            let workspace = mapped.workspace;
            let project = mapped.project;
            let session = channelId;
            let name = channel.name || "Unknown";
            let persona: AgentPersona | undefined;

            if (channel.type === DiscordChannelType.PUBLIC_THREAD || channel.type === DiscordChannelType.PRIVATE_THREAD) {
                session = channel.id;

                const thread = channel as unknown as APIThreadChannel;
                if (thread.applied_tags && thread.applied_tags.length > 0 && parentId) {
                    persona = await this.resolvePersonaFromTags(parentId, thread.applied_tags);
                }

                if (project === "ephemeral" && parentId) {
                    project = parentId;
                    const forum = (await this.client.getChannel(parentId)) as unknown as APIChannel;
                    name = `${forum.name} > ${channel.name}`;
                }
            } else {
                if (project === "ephemeral") {
                    project = channelId;
                }
                session = `chat_${channel.id}`;
            }

            return { workspace, project, session, name, persona };
        } catch (err) {
            return {
                workspace: "global",
                project: "ephemeral",
                session: channelId
            };
        }
    }

    private async resolvePersonaFromTags(forumId: string, appliedTagIds: string[]): Promise<AgentPersona | undefined> {
        try {
            const forum = (await this.client.getChannel(forumId)) as unknown as any;
            if (!forum.available_tags) return undefined;

            const appliedTags = (forum.available_tags as any[]).filter((t: any) => appliedTagIds.includes(t.id));

            for (const tag of appliedTags) {
                const tagName = tag.name.toUpperCase();
                for (const p of Object.values(AgentPersona)) {
                    if (tagName === p.toString().toUpperCase()) {
                        return p as AgentPersona;
                    }
                }
            }
        } catch (err) { }
        return undefined;
    }
}
