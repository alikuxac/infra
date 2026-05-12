import { Hono } from "hono";
import { Env } from "./env.js";
import { DiscordGatekeeper } from "./discord-gatekeeper.js";
import { TelegramGatekeeper } from "./telegram-gatekeeper.js";
import { verifyKey } from "discord-interactions";
import { WorkerEntrypoint } from "cloudflare:workers";

const app = new Hono<{ Bindings: Env }>();

// Re-export DOs for registration
export { DiscordGatekeeper, TelegramGatekeeper };

app.get("/", (c) => c.text("Alikuxac Messaging Bot (ops-bot) | Unified Discord & Telegram"));

/**
 * Discord Webhook (Interactions)
 */
app.post("/webhook/discord", async (c) => {
    const signature = c.req.header("X-Signature-Ed25519");
    const timestamp = c.req.header("X-Signature-Timestamp");
    const body = await c.req.text();

    if (!signature || !timestamp || !(await verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY))) {
        return c.text("Unauthorized", 401);
    }

    const interaction = JSON.parse(body);
    const { DiscordAdapter } = await import("./adapters/discord-adapter.js");
    const adapter = new DiscordAdapter(c.env, c.executionCtx);
    return c.json(await adapter.handleInteraction(interaction));
});

/**
 * Gateway Control
 */
app.get("/gateway/connect", async (c) => {
    const id = c.env.DiscordGatekeeper.idFromName("global");
    const stub = c.env.DiscordGatekeeper.get(id);
    const result = await (stub as any).connect();
    return c.json(result);
});

app.get("/gateway/disconnect", async (c) => {
    const id = c.env.DiscordGatekeeper.idFromName("global");
    const stub = c.env.DiscordGatekeeper.get(id);
    await stub.fetch(new Request("http://localhost/discord/disconnect"));
    return c.text("Sent disconnect command to Discord Gatekeeper");
});

app.get("/gateway/reset", async (c) => {
    const id = c.env.DiscordGatekeeper.idFromName("global");
    const stub = c.env.DiscordGatekeeper.get(id);
    const resp = await stub.fetch(new Request("http://localhost/discord/reset"));
    return c.text(await resp.text());
});

/**
 * Telegram Webhook
 */
app.post("/webhook/telegram", async (c) => {
    const id = c.env.TelegramGatekeeper.idFromName("global");
    const stub = c.env.TelegramGatekeeper.get(id);
    const resp = await stub.fetch(c.req.raw);
    return resp;
});

app.get("/setup/telegram", async (c) => {
    const url = new URL(c.req.url);
    const webhookUrl = `${url.protocol}//${url.host}/webhook/telegram`;

    const { TelegramAdapter } = await import("./adapters/telegram-adapter.js");
    const adapter = new TelegramAdapter(c.env);

    try {
        await adapter.setWebhook(webhookUrl);
        await adapter.setCommands();
        return c.text(`✅ Webhook & Commands set up successfully:\n- Webhook: ${webhookUrl}\n- Commands registered`);
    } catch (err: any) {
        return c.text(`❌ Failed to set up Telegram: ${err.message}`, 500);
    }
});



/**
 * Health & Status
 */
app.get("/status", async (c) => {
    const dId = c.env.DiscordGatekeeper.idFromName("global");
    const dStub = c.env.DiscordGatekeeper.get(dId);
    const dStatus = await (await dStub.fetch(new Request("http://localhost/discord/status"))).text();

    const tId = c.env.TelegramGatekeeper.idFromName("global");
    const tStub = c.env.TelegramGatekeeper.get(tId);
    const tStatus = await (await tStub.fetch(new Request("http://localhost/telegram/status"))).text();

    return c.text(`${dStatus}\n\n${tStatus}`);
});

export default class extends WorkerEntrypoint<Env> {
    async fetch(request: Request) {
        return app.fetch(request, this.env, this.ctx);
    }

    // RPC methods for ops-brain to call messaging
    async sendMessage(platform: "discord" | "telegram", channelId: string, content: string) {
        if (platform === "discord") {
            const id = this.env.DiscordGatekeeper.idFromName("global");
            const stub = this.env.DiscordGatekeeper.get(id);
            return await (stub as any).sendMessage(channelId, content);
        } else {
            const id = this.env.TelegramGatekeeper.idFromName("global");
            const stub = this.env.TelegramGatekeeper.get(id);
            return await (stub as any).sendMessage(channelId, content);
        }
    }
}
