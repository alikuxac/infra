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

export const discordGuildGetTool = defineMcpTool({
  name: "discord_guild_get",
  description: "Get detailed information about a Discord guild (server).",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the Discord guild/server")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const guild = await client.getGuild(args.guildId);
    return { content: [{ type: "text", text: JSON.stringify(guild, null, 2) }] };
  }
});

export const discordGuildModifyTool = defineMcpTool({
  name: "discord_guild_modify",
  description: "Modify Discord guild (server) settings such as name, description, icon, afk/system channel, and verification level.",
  inputSchema: z.object({
    guildId: z.string().describe("The ID of the Discord guild/server"),
    name: z.string().min(2).max(100).optional().describe("New server name (2-100 characters)"),
    description: z.string().max(120).nullable().optional().describe("New server description (up to 120 chars)"),
    icon: z.string().nullable().optional().describe("Base64 128x128 image data URI or null to remove"),
    afkChannelId: z.string().nullable().optional().describe("Voice channel ID for AFK members"),
    afkTimeout: z.number().optional().describe("AFK timeout in seconds (60, 300, 900, 1800, 3600)"),
    systemChannelId: z.string().nullable().optional().describe("Channel ID for system messages (join/boost)"),
    verificationLevel: z.number().min(0).max(4).optional().describe("Verification level: 0 (None), 1 (Low), 2 (Medium), 3 (High), 4 (Very High)"),
    defaultMessageNotifications: z.number().min(0).max(1).optional().describe("0 (All Messages), 1 (Only Mentions)"),
    explicitContentFilter: z.number().min(0).max(2).optional().describe("0 (Disabled), 1 (Members Without Roles), 2 (All Members)")
  }),
  handler: async (args, env) => {
    const client = getClient(env);
    const result = await client.modifyGuild(args.guildId, {
      name: args.name,
      description: args.description,
      icon: args.icon,
      afk_channel_id: args.afkChannelId,
      afk_timeout: args.afkTimeout,
      system_channel_id: args.systemChannelId,
      verification_level: args.verificationLevel,
      default_message_notifications: args.defaultMessageNotifications,
      explicit_content_filter: args.explicitContentFilter
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
});

export const guildTools: McpToolDefinition[] = [
  discordGuildGetTool,
  discordGuildModifyTool
];
