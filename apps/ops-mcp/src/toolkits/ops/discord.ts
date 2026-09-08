import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";
import { DiscordClient } from "@alikuxac/discord-core";

export class DiscordToolkit implements Toolkit {
    name = "discord";
    description = "Manage Discord servers, channels, roles, and user role assignments.";

    register(registry: ToolkitRegistry) {
        const env = registry.getEnv();

        const getClient = () => {
            const token = env.DISCORD_BOT_TOKEN;
            if (!token) {
                throw new Error("DISCORD_BOT_TOKEN is not configured in the environment.");
            }
            return new DiscordClient(token);
        };

        // 1. Create Channel
        registry.registerTool({
            name: "discord_channel_create",
            description: "Create a new channel in a Discord guild.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server"),
                name: z.string().describe("The name of the channel"),
                type: z.number().optional().describe("Channel type (0: Guild Text, 2: Guild Voice, 4: Guild Category, 5: Guild Announcement, 15: Guild Forum)"),
                parentId: z.string().optional().describe("ID of the parent category channel"),
                topic: z.string().optional().describe("Channel topic"),
                nsfw: z.boolean().optional().describe("Whether the channel is NSFW"),
                position: z.number().optional().describe("Sorting position of the channel")
            })
        }, async (args) => {
            const client = getClient();
            const result = await client.createChannel(args.guildId, {
                name: args.name,
                type: args.type,
                parent_id: args.parentId,
                topic: args.topic,
                nsfw: args.nsfw,
                position: args.position
            });
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        });

        // 2. Modify Channel
        registry.registerTool({
            name: "discord_channel_modify",
            description: "Modify properties of an existing Discord channel.",
            category: "ops",
            inputSchema: z.object({
                channelId: z.string().describe("The ID of the channel to modify"),
                name: z.string().optional().describe("The new name of the channel"),
                type: z.number().optional().describe("The new channel type"),
                parentId: z.string().optional().describe("ID of the parent category channel"),
                topic: z.string().optional().describe("The new channel topic"),
                nsfw: z.boolean().optional().describe("Whether the channel is NSFW"),
                position: z.number().optional().describe("Sorting position of the channel")
            })
        }, async (args) => {
            const client = getClient();
            const result = await client.modifyChannel(args.channelId, {
                name: args.name,
                type: args.type,
                parent_id: args.parentId,
                topic: args.topic,
                nsfw: args.nsfw,
                position: args.position
            });
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        });

        // 3. Delete Channel
        registry.registerTool({
            name: "discord_channel_delete",
            description: "Delete a Discord channel.",
            category: "ops",
            inputSchema: z.object({
                channelId: z.string().describe("The ID of the channel to delete")
            })
        }, async ({ channelId }) => {
            const client = getClient();
            const result = await client.deleteChannel(channelId);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        });

        // 4. List Roles
        registry.registerTool({
            name: "discord_role_list",
            description: "List all roles in a Discord guild.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server")
            })
        }, async ({ guildId }) => {
            const client = getClient();
            const result = await client.getRoles(guildId);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        });

        // 5. Create Role
        registry.registerTool({
            name: "discord_role_create",
            description: "Create a new role in a Discord guild.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server"),
                name: z.string().optional().describe("The name of the role"),
                permissions: z.string().optional().describe("Permissions bitwise string representation"),
                color: z.number().optional().describe("RGB color code (integer) for the role"),
                hoist: z.boolean().optional().describe("Whether the role should be displayed separately in the sidebar"),
                mentionable: z.boolean().optional().describe("Whether the role should be mentionable")
            })
        }, async (args) => {
            const client = getClient();
            const result = await client.createRole(args.guildId, {
                name: args.name,
                permissions: args.permissions,
                color: args.color,
                hoist: args.hoist,
                mentionable: args.mentionable
            });
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        });

        // 6. Modify Role
        registry.registerTool({
            name: "discord_role_modify",
            description: "Modify properties of an existing Discord role.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server"),
                roleId: z.string().describe("The ID of the role to modify"),
                name: z.string().optional().describe("The new name of the role"),
                permissions: z.string().optional().describe("Permissions bitwise string representation"),
                color: z.number().optional().describe("RGB color code (integer) for the role"),
                hoist: z.boolean().optional().describe("Whether the role should be displayed separately in the sidebar"),
                mentionable: z.boolean().optional().describe("Whether the role should be mentionable")
            })
        }, async (args) => {
            const client = getClient();
            const result = await client.modifyRole(args.guildId, args.roleId, {
                name: args.name,
                permissions: args.permissions,
                color: args.color,
                hoist: args.hoist,
                mentionable: args.mentionable
            });
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        });

        // 7. Delete Role
        registry.registerTool({
            name: "discord_role_delete",
            description: "Delete a Discord role.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server"),
                roleId: z.string().describe("The ID of the role to delete")
            })
        }, async ({ guildId, roleId }) => {
            const client = getClient();
            const success = await client.deleteRole(guildId, roleId);
            return { content: [{ type: "text", text: success ? "Role deleted successfully." : "Failed to delete role." }] };
        });

        // 8. Add Member Role
        registry.registerTool({
            name: "discord_member_role_add",
            description: "Assign a role to a member in a Discord guild.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server"),
                userId: z.string().describe("The ID of the user"),
                roleId: z.string().describe("The ID of the role to assign")
            })
        }, async ({ guildId, userId, roleId }) => {
            const client = getClient();
            const success = await client.addMemberRole(guildId, userId, roleId);
            return { content: [{ type: "text", text: success ? "Role added to member successfully." : "Failed to add role." }] };
        });

        // 9. Remove Member Role
        registry.registerTool({
            name: "discord_member_role_remove",
            description: "Remove a role from a member in a Discord guild.",
            category: "ops",
            inputSchema: z.object({
                guildId: z.string().describe("The ID of the guild/server"),
                userId: z.string().describe("The ID of the user"),
                roleId: z.string().describe("The ID of the role to remove")
            })
        }, async ({ guildId, userId, roleId }) => {
            const client = getClient();
            const success = await client.removeMemberRole(guildId, userId, roleId);
            return { content: [{ type: "text", text: success ? "Role removed from member successfully." : "Failed to remove role." }] };
        });

        // 10. Set Channel Permission Overwrite
        registry.registerTool({
            name: "discord_channel_permission_set",
            description: "Create or edit permission overwrites for a role or member in a channel.",
            category: "ops",
            inputSchema: z.object({
                channelId: z.string().describe("The ID of the channel"),
                overwriteId: z.string().describe("The ID of the role or member to overwrite permissions for"),
                allow: z.string().describe("Bitwise string of allowed permissions (e.g. '1024' or '0')"),
                deny: z.string().describe("Bitwise string of denied permissions (e.g. '2048' or '0')"),
                type: z.number().describe("Overwrite type: 0 for role, 1 for member")
            })
        }, async ({ channelId, overwriteId, allow, deny, type }) => {
            const client = getClient();
            const success = await client.setChannelPermission(channelId, overwriteId, { allow, deny, type });
            return { content: [{ type: "text", text: success ? "Channel permissions updated successfully." : "Failed to update channel permissions." }] };
        });

        // 11. Delete Channel Permission Overwrite
        registry.registerTool({
            name: "discord_channel_permission_delete",
            description: "Delete permission overwrite for a role or member in a channel.",
            category: "ops",
            inputSchema: z.object({
                channelId: z.string().describe("The ID of the channel"),
                overwriteId: z.string().describe("The ID of the role or member to delete permission overwrites for")
            })
        }, async ({ channelId, overwriteId }) => {
            const client = getClient();
            const success = await client.deleteChannelPermission(channelId, overwriteId);
            return { content: [{ type: "text", text: success ? "Channel permissions deleted successfully." : "Failed to delete channel permissions." }] };
        });
    }
}
