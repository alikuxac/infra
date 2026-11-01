import { z } from "zod";
import { DiscordClient } from "@alikuxac/discord-core";
import { Env, McpToolDefinition, defineMcpTool } from "../types.js";

function getClient(env: Env): DiscordClient {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured in environment.");
  }
  return new DiscordClient(token);
}

export const discordRoleListTool = defineMcpTool({
  name: "discord_role_list",
  description: "List all roles in a Discord guild.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const roles = await client.getRoles(args.guildId);
    return { content: [{ type: "text", text: JSON.stringify(roles, null, 2) }] };
  }
});

export const discordRoleCreateTool = defineMcpTool({
  name: "discord_role_create",
  description: "Create a new role in a Discord guild.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server"),
    name: z.string().max(100).optional().describe("Role name"),
    permissions: z.string().optional().describe("Bitwise permissions string (e.g. '8' for Administrator)"),
    color: z.number().optional().describe("RGB color integer (e.g. 0x3498db -> 3447003)"),
    hoist: z.boolean().optional().describe("Display role separately in sidebar"),
    mentionable: z.boolean().optional().describe("Allow anyone to mention this role")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.createRole(args.guildId, {
      name: args.name,
      permissions: args.permissions,
      color: args.color,
      hoist: args.hoist,
      mentionable: args.mentionable
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const discordRoleModifyTool = defineMcpTool({
  name: "discord_role_modify",
  description: "Modify properties of an existing Discord role.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server"),
    roleId: z.string().describe("The ID of the role to modify"),
    name: z.string().max(100).optional().describe("New role name"),
    permissions: z.string().optional().describe("Bitwise permissions string"),
    color: z.number().optional().describe("RGB color integer"),
    hoist: z.boolean().optional().describe("Display role separately in sidebar"),
    mentionable: z.boolean().optional().describe("Allow anyone to mention this role")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.modifyRole(args.guildId, args.roleId, {
      name: args.name,
      permissions: args.permissions,
      color: args.color,
      hoist: args.hoist,
      mentionable: args.mentionable
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const discordRoleDeleteTool = defineMcpTool({
  name: "discord_role_delete",
  description: "Delete a Discord role.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server"),
    roleId: z.string().describe("The ID of the role to delete")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const success = await client.deleteRole(args.guildId, args.roleId);
    return { content: [{ type: "text", text: success ? "Role deleted successfully." : "Failed to delete role." }] };
  }
});

export const discordRoleReorderTool = defineMcpTool({
  name: "discord_role_reorder",
  description: "Modify sorting positions of roles in a guild hierarchy.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server"),
    positions: z.array(z.object({
      id: z.string().describe("Role ID"),
      position: z.number().describe("Sorting position")
    })).describe("List of role position updates")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.modifyRolePositions(args.guildId, args.positions);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const discordChannelPermissionSetTool = defineMcpTool({
  name: "discord_channel_permission_set",
  description: "Create or edit permission overwrites for a role or member in a channel.",
  inputSchema: z.object({
    channelId: z.string().describe("The ID of the channel"),
    overwriteId: z.string().describe("The ID of the role or member to overwrite permissions for"),
    allow: z.string().describe("Bitwise string of allowed permissions (e.g. '1024' or '0')"),
    deny: z.string().describe("Bitwise string of denied permissions (e.g. '2048' or '0')"),
    type: z.number().describe("Overwrite type: 0 for role, 1 for member")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const success = await client.setChannelPermission(args.channelId, args.overwriteId, {
      allow: args.allow,
      deny: args.deny,
      type: args.type
    });
    return { content: [{ type: "text", text: success ? "Channel permissions updated successfully." : "Failed to update channel permissions." }] };
  }
});

export const discordChannelPermissionDeleteTool = defineMcpTool({
  name: "discord_channel_permission_delete",
  description: "Delete permission overwrite for a role or member in a channel.",
  inputSchema: z.object({
    channelId: z.string().describe("The ID of the channel"),
    overwriteId: z.string().describe("The ID of the role or member to delete permission overwrites for")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const success = await client.deleteChannelPermission(args.channelId, args.overwriteId);
    return { content: [{ type: "text", text: success ? "Channel permissions deleted successfully." : "Failed to delete channel permissions." }] };
  }
});

export const roleTools: McpToolDefinition[] = [
  discordRoleListTool,
  discordRoleCreateTool,
  discordRoleModifyTool,
  discordRoleDeleteTool,
  discordRoleReorderTool,
  discordChannelPermissionSetTool,
  discordChannelPermissionDeleteTool
];
