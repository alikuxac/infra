import { Env } from "../../env.js";

/**
 * Lean AlertService for real-time error reporting to the executive channel.
 * Designed for minimum bundle overhead and zero-cost operation via ops-bot.
 */
export class AlertService {
    constructor(private env: Env) { }

    /**
     * Reports a critical error to the configured executive channel via ops-bot.
     */
    async reportError(error: unknown, context?: string): Promise<void> {
        if (this.env.ERROR_ALERTS === "false") return;

        const message = this.formatErrorMessage(error, context);

        try {
            // 1. Route to Telegram if configured
            if (this.env.EXECUTIVE_CHANNEL_ID) {
                const tgMsg = this.env.TELEGRAM_ALERT_MENTION ? `${this.env.TELEGRAM_ALERT_MENTION}\n${message}` : message;
                await this.env.MESSAGING.sendMessage("telegram", this.env.EXECUTIVE_CHANNEL_ID, tgMsg);
            }

            // 2. Route to Discord if configured
            if (this.env.DISCORD_EXECUTIVE_ID) {
                const dcMsg = this.env.DISCORD_ALERT_MENTION ? `${this.env.DISCORD_ALERT_MENTION}\n${message}` : message;
                await this.env.MESSAGING.sendMessage("discord", this.env.DISCORD_EXECUTIVE_ID, dcMsg);
            }
        } catch (err) {
            console.error("[AlertService] RPC Alert failed:", err);
        }
    }

    private formatErrorMessage(error: unknown, context?: string): string {
        const time = new Date().toLocaleTimeString();
        const err = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 3).join("\n") : "";

        return `🚨 *CRITICAL ERROR* [${time}]\n` +
            (context ? `📍 *Context*: \`${context}\`\n` : "") +
            `❌ *Error*: \`${err}\`\n` +
            (stack ? `\n*Stack Snippet*:\n\`\`\`\n${stack}\n\`\`\`` : "");
    }
}
