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

export const discordChannelListTool = defineMcpTool({
  name: "discord_channel_list",
  description: "List all channels in a Discord guild.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the Discord guild/server")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const channels = await client.getGuildChannels(args.guildId);
    return { content: [{ type: "text", text: JSON.stringify(channels, null, 2) }] };
  }
});

export const discordChannelCreateTool = defineMcpTool({
  name: "discord_channel_create",
  description: "Create a new channel in a Discord guild.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server"),
    name: z.string().min(1).max(100).describe("The name of the channel"),
    type: z.number().optional().describe("Channel type (0: Guild Text, 2: Guild Voice, 4: Guild Category, 5: Guild Announcement, 15: Guild Forum)"),
    parentId: z.string().optional().describe("ID of parent category channel"),
    topic: z.string().max(1024).optional().describe("Channel topic"),
    nsfw: z.boolean().optional().describe("Whether channel is NSFW"),
    rateLimitPerUser: z.number().optional().describe("Slowmode duration in seconds"),
    position: z.number().optional().describe("Sorting position of the channel")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.createChannel(args.guildId, {
      name: args.name,
      type: args.type,
      parent_id: args.parentId,
      topic: args.topic,
      nsfw: args.nsfw,
      rate_limit_per_user: args.rateLimitPerUser,
      position: args.position
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const discordChannelModifyTool = defineMcpTool({
  name: "discord_channel_modify",
  description: "Modify properties of an existing Discord channel.",
  inputSchema: z.object({
    channelId: z.string().describe("The ID of the channel to modify"),
    name: z.string().min(1).max(100).optional().describe("The new name of the channel"),
    type: z.number().optional().describe("The new channel type"),
    parentId: z.string().nullable().optional().describe("ID of parent category (or null to remove from category)"),
    topic: z.string().max(1024).nullable().optional().describe("The new channel topic"),
    nsfw: z.boolean().optional().describe("Whether channel is NSFW"),
    rateLimitPerUser: z.number().optional().describe("Slowmode in seconds"),
    position: z.number().optional().describe("Sorting position")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.modifyChannel(args.channelId, {
      name: args.name,
      type: args.type,
      parent_id: args.parentId === null ? undefined : args.parentId,
      topic: args.topic === null ? undefined : args.topic,
      nsfw: args.nsfw,
      rate_limit_per_user: args.rateLimitPerUser,
      position: args.position
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const discordChannelDeleteTool = defineMcpTool({
  name: "discord_channel_delete",
  description: "Delete a Discord channel.",
  inputSchema: z.object({
    channelId: z.string().describe("The ID of the channel to delete")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.deleteChannel(args.channelId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const discordChannelReorderTool = defineMcpTool({
  name: "discord_channel_reorder",
  description: "Modify sorting positions and category placement for channels in a guild.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the guild/server"),
    positions: z.array(z.object({
      id: z.string().describe("Channel ID"),
      position: z.number().describe("Sorting position"),
      parentId: z.string().nullable().optional().describe("Parent category ID or null"),
      lockPermissions: z.boolean().nullable().optional().describe("Sync permissions with parent category")
    })).describe("List of channel position updates")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const updates = args.positions.map(p => ({
      id: p.id,
      position: p.position,
      parent_id: p.parentId,
      lock_permissions: p.lockPermissions
    }));
    const success = await client.modifyChannelPositions(args.guildId, updates);
    return { content: [{ type: "text", text: success ? "Channel positions updated successfully." : "Failed to update channel positions." }] };
  }
});

export const channelTools: McpToolDefinition[] = [
  discordChannelListTool,
  discordChannelCreateTool,
  discordChannelModifyTool,
  discordChannelDeleteTool,
  discordChannelReorderTool
];
