import { Env } from "../env.js";
import { SessionService } from "../services/session-service.js";
import { AuthService } from "../services/auth-service.js";
import { InteractionHandler } from "../services/interaction-handler.js";
import { ContextDiscoveryService } from "../services/context-discovery.js";
import { AgentPersona } from "@alikuxac/shared-types";
import { DiscordInteraction, ChatMessage } from "../types.js";
import { DiscordClient } from "@alikuxac/discord-core";
import { ExecutionContext } from "@cloudflare/workers-types";

export enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}

export enum InteractionResponseType {
    PONG = 1,
    CHANNEL_MESSAGE_WITH_SOURCE = 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
    DEFERRED_UPDATE_MESSAGE = 6,
    UPDATE_MESSAGE = 7,
    APPLICATION_COMMAND_AUTOCOMPLETE = 8,
}

export class DiscordAdapter {
    private session: SessionService;
    private interactionHandler: InteractionHandler;
    private env: Env;
    private ctx: ExecutionContext;
    private client: DiscordClient;

    constructor(env: Env, ctx: ExecutionContext) {
        this.env = env;
        this.ctx = ctx;
        this.session = new SessionService(env);
        this.interactionHandler = new InteractionHandler(env);
        this.client = new DiscordClient(env.DISCORD_BOT_TOKEN);
    }

    async handleInteraction(interaction: DiscordInteraction) {
        if (interaction.type === InteractionType.PING) {
            return { type: InteractionResponseType.PONG };
        }

        if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
            const { name, options } = interaction.data;
            const interactionToken = interaction.token;
            const applicationId = interaction.application_id;
            const userId = interaction.member?.user?.id || interaction.user?.id;
            const channelId = interaction.channel_id;

            if (!userId || !channelId) return this.formatResponse("❌ Error: Identified user or channel.");

            if (!AuthService.isAuthorized(userId, "discord", this.env)) {
                return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: "🚫 You are not authorized." } };
            }

            const discovery = new ContextDiscoveryService(this.env);
            const guildId = interaction.guild_id;
            const discovered = await discovery.resolveDiscordContext(channelId, guildId);
            const sessionId = `discord:${channelId || userId}`;

            // Auto-connect Durable Object if needed
            const id = this.env.DiscordGatekeeper.idFromName("global");
            const stub = this.env.DiscordGatekeeper.get(id);
            this.ctx.waitUntil(stub.fetch(new Request("http://localhost/discord/connect")).catch(() => { }));

            const sessionData = await this.session.getSession(sessionId);
            if (!sessionData.metadata.is_manual_context) {
                await this.session.updateMetadata(sessionId, {
                    workspace: discovered.workspace,
                    project: discovered.project,
                    contextName: discovered.name
                });
            }

            try {
                const responseText = await this.interactionHandler.handleCommand(name, interaction, sessionId);
                if (typeof responseText === "string" && !responseText.startsWith("❓ Unknown command")) {
                    return this.formatResponse(responseText);
                }

                const AI_COMMANDS = ["chat", "summarize", "ask", "q"];
                if (AI_COMMANDS.includes(name)) {
                    const userInput = options?.[0]?.value || interaction.data?.name || "Hello";
                    this.ctx.waitUntil((async () => {
                        try {
                            let responseText = "";
                            if (name === "summarize") {
                                responseText = await this.env.BRAIN.summarize(sessionData.history);
                            } else {
                                const history: ChatMessage[] = [...sessionData.history, { role: "user", content: String(userInput) }];
                                const result = await this.env.BRAIN.processIntent(
                                    history,
                                    (sessionData.metadata.persona as AgentPersona) || AgentPersona.PLANNER,
                                    sessionData.metadata.modelAlias || "default",
                                    { userId, platform: "discord" },
                                    (sessionData.metadata.provider as any) || "openrouter"
                                );
                                await this.session.saveSession(sessionId, { history: [...history, { role: "assistant", content: result.text }] });
                                responseText = `**[Ops Empire - Agent]**\n${result.text}`;
                            }
                            await this.client.patchMessage(applicationId, interactionToken, responseText);
                        } catch (err: any) {
                            await this.client.patchMessage(applicationId, interactionToken, `❌ AI Error: ${err.message}`).catch(() => { });
                        }
                    })());
                    return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
                }
                return this.formatResponse(responseText);
            } catch (error: any) {
                return this.formatResponse(`❌ System Error: ${error.message}`);
            }
        }

        if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE && interaction.data) {
            const { name } = interaction.data;
            const channelId = interaction.channel_id;
            const userId = interaction.member?.user?.id || interaction.user?.id;
            const sessionId = `discord:${channelId || userId}`;

            const choices = await this.interactionHandler.handleAutocomplete(name, interaction, sessionId);
            return {
                type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE,
                data: { choices }
            };
        }

        return { error: "Unknown interaction type" };
    }

    private formatResponse(text: string) {
        return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: `**[Ops Empire - Agent]**\n${text}` } };
    }
}
