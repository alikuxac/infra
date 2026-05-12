import { Env } from "../env.js";
import { SessionService } from "./session-service.js";
import { ProfileService } from "./profile-service.js";
import { AgentPersona } from "@alikuxac/shared-types";

export class InteractionHandler {
    private session: SessionService;
    private profile: ProfileService;

    constructor(private env: Env) {
        this.session = new SessionService(env);
        this.profile = new ProfileService(env);
    }

    async handleCommand(name: string, interaction: any, sessionId: string): Promise<string> {
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const options = interaction.data?.options || [];

        switch (name) {
            case "ping":
                const startTime = Date.now();
                return `🏓 **Pong!**\n- Latency: \`${Date.now() - startTime}ms\`\n- Status: \`Operational\`\n- Worker: \`ops-bot\``;

            case "reset":
                await this.session.clearSession(sessionId);
                return "✅ Session history and metadata have been reset.";

            case "info":
                const sessionData = await this.session.getSession(sessionId);
                const metadata = sessionData.metadata || {};
                const infoPrefs = await this.profile.getPreferences();

                const { PROVIDER_CONFIGS } = await import("@alikuxac/ai-core");
                const currentProvider = metadata.provider || infoPrefs.current_provider || "openrouter";
                const currentAlias = metadata.modelAlias || infoPrefs.current_model || "default";

                // Resolve detailed model ID if it's an alias
                let resolvedModel = currentAlias;
                if (currentAlias === "default" && PROVIDER_CONFIGS[currentProvider]) {
                    resolvedModel = `${currentAlias} (${PROVIDER_CONFIGS[currentProvider].default})`;
                }

                return `👤 **System Info**
- **User ID**: \`${userId}\`
- **Active Model**: \`${resolvedModel}\`
- **Provider**: \`${currentProvider}\`
- **Persona**: \`${metadata.persona || infoPrefs.active_persona || "PLANNER"}\`
- **Workspace**: \`${metadata.workspace || "global"}\`
- **Project**: \`${metadata.project || "general"}\`
- **Session**: \`${sessionId}\``;

            case "agent":
                const newPersona = options.find((o: any) => o.name === "persona")?.value as AgentPersona;
                if (!newPersona) return "❌ Please specify a persona type.";
                await this.session.updateMetadata(sessionId, { persona: newPersona, is_manual_persona: true });
                return `🎭 Persona updated to: **${newPersona}**`;

            case "model":
                const modelValue = options.find((o: any) => o.name === "alias_or_id")?.value;
                if (!modelValue) return "❌ Please specify a model ID.";
                const modelProvider = options.find((o: any) => o.name === "provider")?.value || "openrouter";
                await this.session.updateMetadata(sessionId, { modelAlias: modelValue, provider: modelProvider });
                return `🤖 Default model updated to: **${modelValue}** (${modelProvider})`;

            case "gateway":
                const gatewayAction = options.find((o: any) => o.name === "action")?.value;
                const gatewayId = this.env.DiscordGatekeeper.idFromName("global");
                const gatewayStub = this.env.DiscordGatekeeper.get(gatewayId);
                const gatewayRes = await gatewayStub.fetch(new Request(`http://localhost/discord/${gatewayAction}`));
                return `🔌 **Gateway ${gatewayAction}**\n${await gatewayRes.text()}`;

            case "link":
                const linkWorkspace = options.find((o: any) => o.name === "workspace")?.value;
                const linkProject = options.find((o: any) => o.name === "project")?.value;
                const linkChannel = interaction.channel_id;

                if (!linkWorkspace && !linkProject) return "❌ Please specify either a Workspace or Project to link.";

                const internalType = linkWorkspace ? "workspace" : "project";
                const internalId = linkWorkspace || linkProject;

                await this.env.DB.prepare(
                    `INSERT INTO context_mappings (platform, external_id, internal_type, internal_id) 
                     VALUES (?, ?, ?, ?) 
                     ON CONFLICT(platform, external_id) DO UPDATE SET 
                     internal_type = excluded.internal_type, 
                     internal_id = excluded.internal_id`
                ).bind("discord", linkChannel, internalType, internalId).run();

                return `✅ Channel successfully linked to ${linkWorkspace ? `Workspace **${linkWorkspace}**` : `Project **${linkProject}**`}.`;

            default:
                return "❓ Unknown command: " + name;
        }
    }

    async handleAutocomplete(name: string, interaction: any, sessionId: string): Promise<any[]> {
        const options = interaction.data?.options || [];
        const focusedOption = options.find((o: any) => o.focused);
        if (!focusedOption) return [];

        const focusedValue = focusedOption.value?.toLowerCase() || "";

        switch (name) {
            case "model":
                if (focusedOption.name === "alias_or_id") {
                    const provider = options.find((o: any) => o.name === "provider")?.value || "openrouter";
                    const { PROVIDER_CONFIGS } = await import("@alikuxac/ai-core");
                    const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
                    if (!config) return [];

                    // Combine default and models as suggestions
                    const models = config.models || [config.default];
                    return models
                        .filter(m => m.toLowerCase().includes(focusedValue))
                        .map(m => ({ name: m, value: m }))
                        .slice(0, 25);
                }
                break;

            case "workspace":
            case "project":
            case "link":
                if (focusedOption.name === "id" || focusedOption.name === "workspace" || focusedOption.name === "parent") {
                    try {
                        const res = await this.env.ARM.callTool("project", "workspace_list", {});
                        const workspaces = JSON.parse((res as any).content?.[0]?.text || "[]");
                        return workspaces
                            .filter((w: any) => w.id.toLowerCase().includes(focusedValue) || w.name.toLowerCase().includes(focusedValue))
                            .map((w: any) => ({ name: w.name, value: w.id }))
                            .slice(0, 25);
                    } catch (e) { return []; }
                }

                if (name === "project" && focusedOption.name === "id") {
                    try {
                        const sessionData = await this.session.getSession(sessionId);
                        const workspaceId = sessionData.metadata.workspace;
                        const res = await this.env.ARM.callTool("project", "project_list", { workspaceId });
                        const projects = JSON.parse((res as any).content?.[0]?.text || "[]");
                        return projects
                            .filter((p: any) => p.id.toLowerCase().includes(focusedValue) || p.name.toLowerCase().includes(focusedValue))
                            .map((p: any) => ({ name: p.name, value: p.id }))
                            .slice(0, 25);
                    } catch (e) { return []; }
                }
                break;
        }

        return [];
    }
}
