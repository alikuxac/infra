import { DurableObject } from "cloudflare:workers";
import { Env } from "./env.js";
import { TelegramAdapter } from "./adapters/telegram-adapter.js";

export class TelegramGatekeeper extends DurableObject<Env> {
    private adapter: TelegramAdapter;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.adapter = new TelegramAdapter(env);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Handle incoming webhook updates from Telegram
        if (request.method === "POST") {
            try {
                const update = await request.json();
                console.log(`[Telegram Gatekeeper] Received Update:`, JSON.stringify(update));
                await this.adapter.handleUpdate(update);
                return new Response("OK");
            } catch (err) {
                console.error("[Telegram Gatekeeper] Error handling update:", err);
                return new Response("Error", { status: 500 });
            }
        }


        // RPC: Send message via DO
        if (url.pathname === "/send") {
            const { chatId, text } = await request.json() as any;
            await this.adapter.sendMessage(chatId, text);
            return new Response("OK");
        }

        return new Response("Telegram Gatekeeper is active.");
    }

    // RPC method for direct access
    async sendMessage(chatId: string, text: string) {
        await this.adapter.sendMessage(chatId, text);
        return { success: true };
    }
}
