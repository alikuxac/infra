import { Bot } from "grammy";
import { Env } from "../env.js";
import { ProfileService } from "../services/profile-service.js";
import { SessionService } from "../services/session-service.js";
import { AuthService } from "../services/auth-service.js";
import { AgentPersona } from "@alikuxac/shared-types";
import { ChatMessage } from "../types.js";
import { InteractionHandler } from "../services/interaction-handler.js";

export class TelegramAdapter {
    private bot: Bot;
    private env: Env;
    private profile: ProfileService;
    private session: SessionService;
    private interactionHandler: InteractionHandler;

    constructor(env: Env) {
        this.env = env;
        this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
        this.profile = new ProfileService(env);
        this.session = new SessionService(env);
        this.interactionHandler = new InteractionHandler(env);
        this.setupHandlers();
    }

    async handleUpdate(update: any) {
        console.log(`[Telegram] Received update:`, JSON.stringify(update));

        // Ensure bot is initialized (required by grammy for proper update handling)
        if (!this.bot.isInited()) {
            await this.bot.init();
        }

        return this.bot.handleUpdate(update);
    }



    private setupHandlers() {
        // Shared Command Wrapper
        const handle = async (ctx: any, name: string, args?: string) => {
            const userId = ctx.from?.id.toString() || "";
            if (!AuthService.isAuthorized(userId, "telegram", this.env)) {
                console.warn(`[Telegram] Unauthorized access attempt from ${userId}`);
                return;
            }


            const sessionId = SessionService.getSessionId("telegram", userId);

            // Mock interaction for handler
            const interaction = {
                user: { id: userId },
                data: {
                    options: args ? args.split(" ").map((val, i) => ({
                        name: i === 0 ? (name === "model" ? "alias_or_id" : "persona") : "provider",
                        value: val
                    })) : []
                }
            };

            try {
                const response = await this.interactionHandler.handleCommand(name, interaction, sessionId);
                await ctx.reply(response, { parse_mode: "Markdown" });
            } catch (err) {
                console.error(`[Telegram] Command ${name} failed:`, err);
            }
        };

        this.bot.command("start", (ctx) => handle(ctx, "ping"));
        this.bot.command("ping", (ctx) => handle(ctx, "ping"));
        this.bot.command("reset", (ctx) => handle(ctx, "reset"));
        this.bot.command("info", (ctx) => handle(ctx, "info"));

        this.bot.command("agent", async (ctx) => {
            const persona = ctx.match?.trim();
            if (!persona) return ctx.reply("🎭 Usage: `/agent [persona]`\nExample: `/agent CEO`", { parse_mode: "Markdown" });
            await handle(ctx, "agent", persona);
        });

        this.bot.command("model", async (ctx) => {
            const args = ctx.match?.trim();
            if (!args) return ctx.reply("🤖 Usage: `/model [alias_or_id] [provider?]`\nExample: `/model gemini-pro google`", { parse_mode: "Markdown" });
            await handle(ctx, "model", args);
        });

        this.bot.on("message:text", async (ctx) => {
            const userId = ctx.from!.id.toString();
            if (!AuthService.isAuthorized(userId, "telegram", this.env)) return;

            const sessionId = SessionService.getSessionId("telegram", userId);
            const text = ctx.message.text;

            try {
                const sd = await this.session.getSession(sessionId);
                const history: ChatMessage[] = [...sd.history, { role: "user", content: text }];

                // Call BRAIN via RPC
                const result = await this.env.BRAIN.processIntent(
                    history,
                    (sd.metadata.persona as AgentPersona) || AgentPersona.PLANNER,
                    sd.metadata.modelAlias || "default",
                    { userId, platform: "telegram" },
                    (sd.metadata.provider as any) || "openrouter"
                );


                await this.session.saveSession(sessionId, {
                    history: [...history, { role: "assistant", content: result.text }]
                });
                await ctx.reply(`**[Ops Empire - Agent]**\n${result.text}`);
            } catch (err: any) {
                console.error("[Telegram Adapter] Error:", err);
                // Silently fail or send minimal error to avoid spam
            }
        });
    }

    // Method to send message via Bot API (can be called by DO)
    async sendMessage(chatId: string, text: string) {
        return this.bot.api.sendMessage(chatId, text);
    }

    async setWebhook(url: string) {
        console.log(`[Telegram] Setting webhook to: ${url}`);
        return this.bot.api.setWebhook(url);
    }

    async setCommands() {
        console.log(`[Telegram] Registering commands...`);
        return this.bot.api.setMyCommands([
            { command: "start", description: "Start interaction with the bot" },
            { command: "ping", description: "Check system health and status" },
            { command: "reset", description: "Reset current session and chat history" },
            { command: "info", description: "View session, model, and agent info" },
            { command: "agent", description: "Change Agent Persona (e.g., /agent CEO)" },
            { command: "model", description: "Change AI Model (e.g., /model gemini-pro)" }
        ]);
    }

}


