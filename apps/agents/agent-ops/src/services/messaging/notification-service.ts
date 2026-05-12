import { Env } from "../../index.js";
import { DiscordClient } from "@alikuxac/discord-core";

/**
 * NotificationService - Sends proactive messages back to user platforms.
 */
export class NotificationService {
  private discord: DiscordClient;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.discord = new DiscordClient(env.DISCORD_BOT_TOKEN || "");
  }

  /**
   * Sends a notification to the user about a task completion.
   */
  async notifyCompletion(platform: string, channelId: string | null, userId: string, message: string) {
    console.log(`[NotificationService] Notifying user ${userId} on ${platform}...`);

    if (platform === "discord") {
      await this.discord.sendMessage(channelId || userId, message);
    } else if (platform === "telegram") {
      await this.sendTelegram(userId, message);
    } else {
      console.warn(`[NotificationService] Unsupported platform: ${platform}`);
    }
  }

  private async sendTelegram(chatId: string, content: string) {
    if (!this.env.TELEGRAM_BOT_TOKEN) return;

    try {
      const url = `https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: content,
          parse_mode: "Markdown",
        }),
      });

      if (!resp.ok) {
        console.error(`[NotificationService] Telegram API Error:`, await resp.text());
      }
    } catch (err) {
      console.error("[NotificationService] Telegram Notify Error:", err);
    }
  }
}
