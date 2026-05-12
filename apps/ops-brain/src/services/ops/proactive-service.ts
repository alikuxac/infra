import { Env } from "../../env.js";
import { DashboardService } from "../core/dashboard-service.js";
import { Orchestrator } from "../core/orchestrator.js";

export class ProactiveService {
    constructor(private env: Env) { }

    async generateBriefing(): Promise<string> {
        const dashboard = new DashboardService(this.env);
        const stats = await dashboard.getStats();
        return await new Orchestrator(this.env).generateBriefing(stats);
    }

    async runPeriodicCheck() {
        console.log("[ProactiveService] Awakening...");
        const briefing = await this.generateBriefing();
        const discordChannelId = this.env.DISCORD_EXECUTIVE_ID;
        const telegramChatId = this.env.EXECUTIVE_CHANNEL_ID;

        try {
            if (discordChannelId) {
                await this.env.MESSAGING.sendMessage("discord", discordChannelId, briefing);
            }
            if (telegramChatId) {
                await this.env.MESSAGING.sendMessage("telegram", telegramChatId, briefing);
            }
        } catch (err) {
            console.error("[ProactiveService] Briefing delivery failed:", err);
        }
    }
}
