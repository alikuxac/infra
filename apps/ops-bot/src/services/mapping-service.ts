import { Env } from "../env.js";

interface McpRPC {
    callTool(kit: string, name: string, args: any): Promise<any>;
}

export interface MappingResult {
    internalType: "workspace" | "project";
    internalId: string;
}

export class MappingService {
    private cache: Map<string, MappingResult | null> = new Map();

    constructor(private env: Env) { }

    async resolve(platform: string, externalId: string): Promise<MappingResult | null> {
        const cacheKey = `${platform}:${externalId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey) || null;
        }

        try {
            const result = await (this.env.ARM as unknown as McpRPC).callTool("project", "context_map_get", {
                platform,
                externalId
            });

            const content = (result as any).content?.[0]?.text;
            const data = content ? JSON.parse(content) : null;

            const mapping = data ? {
                internalType: data.internal_type,
                internalId: data.internal_id
            } : null;

            this.cache.set(cacheKey, mapping);
            return mapping as MappingResult | null;
        } catch (e) {
            return null;
        }
    }

    async resolveDiscordContext(guildId: string | undefined, channelId: string, parentId?: string): Promise<{ workspace: string; project: string }> {
        let workspace = "global";
        let project = "ephemeral";

        const channelMapping = await this.resolve("discord", channelId);
        if (channelMapping) {
            const id = channelMapping.internalId;
            if (channelMapping.internalType === "project") {
                if (id.includes(":")) {
                    const [ws, prj] = id.split(":");
                    workspace = ws;
                    project = prj;
                } else {
                    project = id;
                }
            } else {
                workspace = id;
            }
        }

        if (workspace === "global" && parentId) {
            const parentMapping = await this.resolve("discord", parentId);
            if (parentMapping && parentMapping.internalType === "workspace") {
                workspace = parentMapping.internalId;
            }
        }

        if (workspace === "global" && guildId) {
            const guildMapping = await this.resolve("discord", guildId);
            if (guildMapping && guildMapping.internalType === "workspace") {
                workspace = guildMapping.internalId;
            }
        }

        return { workspace, project };
    }
}
