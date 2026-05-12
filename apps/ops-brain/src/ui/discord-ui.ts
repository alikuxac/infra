import { AgentPersona } from "@alikuxac/shared-types";
import { DiscordEmbed, DiscordEmbedField } from "../types";

export interface PersonaStyle {
    color: number;
    icon: string;
    displayName: string;
}

export class DiscordUI {
    private static readonly PERSONA_STYLES: Record<AgentPersona, PersonaStyle> = {
        [AgentPersona.PLANNER]: { color: 0x9b59b6, icon: "🧠", displayName: "Executive Planner" },
        [AgentPersona.RESEARCHER]: { color: 0x3498db, icon: "🔍", displayName: "Deep Researcher" },
        [AgentPersona.CEO]: { color: 0x2ecc71, icon: "👔", displayName: "Chief Executive" },
        [AgentPersona.LEAD]: { color: 0xe74c3c, icon: "🚩", displayName: "Project Lead" },
        [AgentPersona.GUARDIAN]: { color: 0x1abc9c, icon: "🛡️", displayName: "System Guardian" },
        [AgentPersona.CONTENT]: { color: 0xf1c40f, icon: "✍️", displayName: "Creative Content" },
        [AgentPersona.SEO]: { color: 0x34495e, icon: "📈", displayName: "SEO Specialist" },
        [AgentPersona.MARKET]: { color: 0xe67e22, icon: "📊", displayName: "Market Strategist" },
        [AgentPersona.CX]: { color: 0x95a5a6, icon: "💬", displayName: "CX Specialist" },
        [AgentPersona.GROWTH]: { color: 0x27ae60, icon: "🚀", displayName: "Growth Hacker" },
        [AgentPersona.GAMER]: { color: 0x8e44ad, icon: "🎮", displayName: "Gaming Analyst" },
        [AgentPersona.TRAVEL]: { color: 0x16a085, icon: "✈️", displayName: "Travel Planner" },
        [AgentPersona.HOBBY]: { color: 0xd35400, icon: "🛠️", displayName: "Hobby Specialist" },
        [AgentPersona.CINEMA]: { color: 0xc0392b, icon: "🎬", displayName: "Cinema Geek" },
        [AgentPersona.GACHA]: { color: 0xf39c12, icon: "🎰", displayName: "Gacha Strategist" },
        [AgentPersona.MARKETING]: { color: 0xe91e63, icon: "📢", displayName: "Marketing Agent" },
        [AgentPersona.RECON]: { color: 0x95a5a6, icon: "🕵️", displayName: "Recon Agent" },
        [AgentPersona.EXECUTIVE]: { color: 0x2c3e50, icon: "🏛️", displayName: "Executive Agent" },
        [AgentPersona.CHAT]: { color: 0x7f8c8d, icon: "💬", displayName: "AI Chat" },
    };

    static getStyle(persona: AgentPersona): PersonaStyle {
        return this.PERSONA_STYLES[persona] || { color: 0x7f8c8d, icon: "🤖", displayName: "Alikuxac Agent" };
    }

    static createEmbed(title: string, description: string, persona?: AgentPersona): DiscordEmbed {
        const style = persona ? this.getStyle(persona) : { color: 0x2b2d31, icon: "⚙️", displayName: "" };

        return {
            title: style.displayName ? `${style.icon} ${style.displayName} | ${title}` : title,
            description,
            color: style.color,
            timestamp: new Date().toISOString(),
            footer: { text: "Alikuxac Executive Suite" }
        };
    }

    static createAgentResponse(persona: AgentPersona, content: string): DiscordEmbed {
        const style = this.getStyle(persona);
        return {
            author: {
                name: `${style.displayName} Response`,
                icon_url: `https://raw.githubusercontent.com/alikuxac/infra/main/assets/icons/${persona.toLowerCase()}.png`
            },
            description: content,
            color: style.color,
            timestamp: new Date().toISOString(),
            footer: { text: "Alikuxac AI Workforce", icon_url: "https://alikuxac.xyz/favicon.ico" }
        };
    }

    static createDataGrid(title: string, fields: DiscordEmbedField[], persona?: AgentPersona): DiscordEmbed {
        const embed = this.createEmbed(title, "", persona);
        embed.fields = fields;
        return embed;
    }

    /**
     * Creates a Thread Dashboard with action buttons.
     */
    static createThreadDashboard(persona: AgentPersona, stats: { history: number; workspace: string; project: string }) {
        const embed: DiscordEmbed = this.createDataGrid("🎛️ Thread Control Panel", [
            { name: "🏛️ Workspace", value: `\`${stats.workspace}\``, inline: true },
            { name: "📁 Project", value: `\`${stats.project}\``, inline: true },
            { name: "💬 Messages", value: `\`${stats.history}\` / 60`, inline: true },
            { name: "🎭 Persona", value: `\`${persona}\``, inline: true }
        ], persona);

        return {
            embeds: [embed],
            components: [
                {
                    type: 1, // Action Row
                    components: [
                        { type: 2, style: 1, label: "🎭 Persona", custom_id: "dashboard_persona" },
                        { type: 2, style: 1, label: "🤖 Model", custom_id: "dashboard_model" },
                        { type: 2, style: 2, label: "📦 Compact", custom_id: "dashboard_summary" },
                        { type: 2, style: 4, label: "🗑️ Reset", custom_id: "dashboard_reset" }
                    ]
                }
            ]
        };
    }
}
