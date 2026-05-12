import { DurableObject } from "cloudflare:workers";
import { Env } from "./env.js";
import { InteractionHandler } from "./services/interaction-handler.js";
import { DiscordClient } from "@alikuxac/discord-core";
import { AuthService } from "./services/auth-service.js";
import { AgentPersona } from "@alikuxac/shared-types";
import { ChatMessage } from "./types.js";
import { APIThreadChannel, GatewayMessageCreateDispatchData } from "discord-api-types/v10";

export class DiscordGatekeeper extends DurableObject<Env> {
    private isHandshaked = false;
    private isConnecting = false;
    private currentWs: WebSocket | null = null;
    private storage: DurableObjectStorage;
    private interactionHandler: InteractionHandler;
    private discord: DiscordClient;
    private session: { session_id?: string, seq?: number } = {};

    private lastActivity = Date.now();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.storage = ctx.storage;
        this.interactionHandler = new InteractionHandler(env);
        this.discord = new DiscordClient(env.DISCORD_BOT_TOKEN);

        ctx.blockConcurrencyWhile(async () => {
            const saved = await this.storage.get<{ session_id: string, seq: number }>("discord_session");
            if (saved) this.session = saved;
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const websockets = this.ctx.getWebSockets();
        const isConnected = websockets.length > 0 && this.isHandshaked;

        if (url.pathname === "/discord/connect") {
            await this.initGatewayConnection();
            return new Response("Connection sequence initiated.");
        }
        if (url.pathname === "/discord/disconnect") {
            this.disconnect();
            return new Response("Disconnected.");
        }
        if (url.pathname === "/discord/reset") {
            await this.forceReset();
            return new Response("Gateway Reset and Reconnecting...");
        }
        if (url.pathname === "/discord/status") {
            const status = isConnected ? "Connected" : (this.isConnecting ? "Connecting" : "Disconnected");
            const last = new Date(this.lastActivity).toLocaleTimeString();
            return new Response(`[Ops Bot - Discord Gatekeeper]\nStatus: ${status}\nLast Activity: ${last}\nActive Sockets: ${websockets.length}`);
        }
        return new Response("Not Found", { status: 404 });
    }

    async forceReset() {
        console.log("[Discord Gatekeeper] FORCE RESET initiated");
        this.isHandshaked = false;
        this.isConnecting = false;
        this.storage.deleteAll();
        this.session = {};
        const websockets = this.ctx.getWebSockets();
        for (const ws of websockets) {
            try { ws.close(1001, "Force Reset"); } catch (e) { }
        }
        await this.initGatewayConnection();
    }

    async connect() {
        return await this.initGatewayConnection();
    }

    private async initGatewayConnection() {
        if (this.isConnecting) return;

        // Cleanup existing if any
        this.stopHeartbeat();
        if (this.currentWs) {
            try { this.currentWs.close(1001, "Reconnecting"); } catch (e) { }
            this.currentWs = null;
        }

        this.isConnecting = true;

        try {
            console.log("[Discord Gatekeeper] Connecting via Standard WebSocket (No Hibernation)...");
            const gatewayUrl = "wss://gateway.discord.gg/?v=10&encoding=json";
            const ws = new WebSocket(gatewayUrl);

            ws.addEventListener("message", (event) => {
                this.lastActivity = Date.now();
                this.handleGatewayMessage(ws, event.data as string);
            });

            ws.addEventListener("close", (event) => {
                console.log(`[Discord Gatekeeper] WebSocket closed (${event.code}): ${event.reason}`);
                this.isHandshaked = false;
                this.currentWs = null;
                this.stopHeartbeat();
                if (event.code !== 1000) {
                    this.ctx.storage.setAlarm(Date.now() + 5000);
                }
            });

            ws.addEventListener("error", (err) => {
                console.error("[Discord Gatekeeper] WebSocket error:", err);
            });

            this.currentWs = ws;
            console.log("[Discord Gatekeeper] WebSocket initialized and listeners attached");
        } catch (err) {
            console.error("[Discord Gatekeeper] Connection failed:", err);
            this.ctx.storage.setAlarm(Date.now() + 10000);
        } finally {
            this.isConnecting = false;
        }
    }

    async alarm() {
        console.log("[Discord Gatekeeper] Alarm triggered, reconnecting...");
        await this.initGatewayConnection();
    }

    private disconnect() {
        this.storage.deleteAlarm();
        this.stopHeartbeat();
        if (this.currentWs) {
            this.currentWs.close(1000, "Clean Manual Disconnect");
            this.currentWs = null;
        }
        this.isHandshaked = false;
    }

    private handleGatewayMessage(ws: WebSocket, data: string) {
        let packet;
        try {
            packet = JSON.parse(data);
        } catch (e) {
            console.error("[Discord Gatekeeper] Failed to parse packet:", data.substring(0, 100));
            return;
        }

        const { op, d, t, s } = packet;
        if (s) this.session.seq = s;

        switch (op) {
            case 10: // HELLO
                console.log(`[Discord Gatekeeper] Received HELLO (Interval: ${d.heartbeat_interval}ms)`);
                this.startHeartbeat(ws, d.heartbeat_interval);
                this.identify(ws);
                break;
            case 0: // DISPATCH
                this.handleDispatch(t, d);
                break;
            case 1: // HEARTBEAT REQUEST
                console.log("[Discord Gatekeeper] Server requested heartbeat");
                this.sendHeartbeat(ws);
                break;
            case 11: // HEARTBEAT ACK
                break;
            case 9: // INVALID SESSION
                console.warn("[Discord Gatekeeper] Invalid Session, re-identifying...");
                this.identify(ws);
                break;
            case 7: // RECONNECT
                console.log("[Discord Gatekeeper] Gateway requested reconnect");
                ws.close(1012, "Gateway Reconnect Request");
                break;
        }
    }

    private heartbeatInterval: any = null;

    private startHeartbeat(ws: WebSocket, interval: number) {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(ws), interval * 0.9);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private sendHeartbeat(ws: WebSocket) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 1, d: this.session.seq || null }));
            }
        } catch (e) {
            console.error("[Discord Gatekeeper] Heartbeat failed:", e);
        }
    }

    private identify(ws: WebSocket) {
        console.log("[Discord Gatekeeper] Sending IDENTIFY...");
        ws.send(JSON.stringify({
            op: 2,
            d: {
                token: this.env.DISCORD_BOT_TOKEN,
                intents: 37377, // GUILDS + GUILD_MESSAGES + DIRECT_MESSAGES + MESSAGE_CONTENT
                properties: { os: "linux", browser: "worker", device: "ops-bot" },
                presence: {
                    status: "online",
                    activities: [{ name: "Managing Ops", type: 0 }],
                    afk: false
                }
            }
        }));
    }

    private async handleDispatch(type: string, data: any) {
        console.log(`[Discord Gatekeeper] Received Dispatch: ${type}`);
        if (type === "READY") {
            this.isHandshaked = true;
            this.session.session_id = data.session_id;
            console.log(`[Discord Gatekeeper] Gateway READY. User: ${data.user.username}#${data.user.discriminator}`);
            await this.ctx.storage.put("discord_session", this.session);
            return;
        }

        if (type === "MESSAGE_CREATE") {
            await this.onMessage(data as GatewayMessageCreateDispatchData);
        }
    }

    private async onMessage(message: GatewayMessageCreateDispatchData) {
        if (!message.id) return;

        // Deduplication to prevent double-processing
        const processedKey = `msg_proc_${message.id}`;
        const alreadyProcessed = await this.storage.get<boolean>(processedKey);
        if (alreadyProcessed) {
            console.log(`[Discord Gatekeeper] Skipping already processed message: ${message.id}`);
            return;
        }
        await this.storage.put(processedKey, true);
        // Clean up old deduplication keys periodically (every 15 mins)
        this.lastActivity = Date.now();
        await this.storage.setAlarm(Date.now() + 15 * 60 * 1000);

        if (message.author?.bot) return;

        const userId = message.author.id;
        const content = message.content?.trim();

        if (!AuthService.isAuthorized(userId, "discord", this.env)) return;

        const channelId = message.channel_id;
        const guildId = message.guild_id;
        const sessionId = `discord:${channelId || userId}`;

        try {
            const { ContextDiscoveryService } = await import("./services/context-discovery.js");
            const discovery = new ContextDiscoveryService(this.env);
            const discovered = await discovery.resolveDiscordContext(channelId, guildId);

            const { SessionService } = await import("./services/session-service.js");
            const sessionService = new SessionService(this.env);

            const sd = await sessionService.getSession(sessionId);

            // Update metadata via ARM
            if (!sd.metadata.is_manual_context) {
                await sessionService.updateMetadata(sessionId, {
                    workspace: discovered.workspace,
                    project: discovered.project,
                    contextName: discovered.name,
                    persona: sd.metadata.is_manual_persona ? sd.metadata.persona : (discovered.persona || sd.metadata.persona)
                });
            }

            const history: ChatMessage[] = [...sd.history, { role: "user", content }];

            // Call BRAIN via RPC
            const result = await this.env.BRAIN.processIntent(
                history,
                (sd.metadata.persona as AgentPersona) || AgentPersona.PLANNER,
                sd.metadata.modelAlias || "default",
                { userId, platform: "discord" },
                (sd.metadata.provider as any) || "openrouter"
            );

            await sessionService.saveSession(sessionId, {
                history: [...history, { role: "assistant", content: result.text }]
            });

            await this.discord.sendMessage(channelId, `**[Ops Empire - Agent]**\n${result.text}`);
        } catch (err) {
            console.error("[Discord Gateway] Error processing message:", err);
        }
    }

    // RPC method for ops-brain or other workers
    async sendMessage(channelId: string, content: string) {
        await this.discord.sendMessage(channelId, content);
        return { success: true };
    }
}
