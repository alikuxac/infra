import { describe, it, expect } from "vitest";
import { guildTools } from "../src/tools/guild.js";
import { channelTools } from "../src/tools/channels.js";
import { roleTools } from "../src/tools/roles.js";

describe("discord mcp tools", () => {
  const allTools = [...guildTools, ...channelTools, ...roleTools];

  it("should have all expected tools defined", () => {
    const names = allTools.map(t => t.name);
    expect(names).toContain("discord_guild_get");
    expect(names).toContain("discord_guild_modify");
    expect(names).toContain("discord_channel_list");
    expect(names).toContain("discord_channel_create");
    expect(names).toContain("discord_channel_modify");
    expect(names).toContain("discord_channel_delete");
    expect(names).toContain("discord_channel_reorder");
    expect(names).toContain("discord_role_list");
    expect(names).toContain("discord_role_create");
    expect(names).toContain("discord_role_modify");
    expect(names).toContain("discord_role_delete");
    expect(names).toContain("discord_role_reorder");
    expect(names).toContain("discord_channel_permission_set");
    expect(names).toContain("discord_channel_permission_delete");
    expect(allTools.length).toBe(14);
  });

  describe("guild schema validation", () => {
    const modifyTool = guildTools.find(t => t.name === "discord_guild_modify")!;

    it("should accept valid guild modify payload", () => {
      const valid = {
        guildId: "1234567890",
        name: "My Awesome Server",
        description: "Official community server",
        verificationLevel: 2
      };
      const result = modifyTool.inputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject payload without guildId", () => {
      const invalid = {
        name: "Missing Guild ID"
      };
      const result = modifyTool.inputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("channel schema validation", () => {
    const createTool = channelTools.find(t => t.name === "discord_channel_create")!;

    it("should accept valid channel creation payload", () => {
      const valid = {
        guildId: "1234567890",
        name: "general-chat",
        type: 0,
        topic: "Welcome to general chat"
      };
      const result = createTool.inputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject channel creation with empty name", () => {
      const invalid = {
        guildId: "1234567890",
        name: ""
      };
      const result = createTool.inputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("role schema validation", () => {
    const createTool = roleTools.find(t => t.name === "discord_role_create")!;

    it("should accept valid role creation payload", () => {
      const valid = {
        guildId: "1234567890",
        name: "Moderator",
        color: 0x3498db,
        hoist: true,
        permissions: "268435456"
      };
      const result = createTool.inputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
