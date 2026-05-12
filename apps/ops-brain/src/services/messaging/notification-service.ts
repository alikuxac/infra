import { Env } from "../../env.js";

/**
 * NotificationService - Sends proactive messages back to user platforms via ops-bot.
 */
export class NotificationService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Sends a notification to the user about a task completion.
   */
  async notifyCompletion(platform: string, channelId: string | null, userId: string, message: string) {
    console.log(`[NotificationService] Notifying user ${userId} on ${platform} via RPC...`);

    try {
      if (platform === "discord" || platform === "telegram") {
        const targetId = platform === "discord" ? (channelId || userId) : userId;
        await this.env.MESSAGING.sendMessage(platform, targetId, message);
      } else {
        console.warn(`[NotificationService] Unsupported platform: ${platform}`);
      }
    } catch (err) {
      console.error(`[NotificationService] RPC failed:`, err);
    }
  }
}
