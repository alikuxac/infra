import { Env } from "../../env.js";

export class ProfileService {
  constructor(private env: Env) { }

  async getPreferences() {
    return this.getEffectivePreferences();
  }

  async getEffectivePreferences(workspaceId?: string, projectId?: string): Promise<Record<string, any>> {
    try {
      const result = await this.env.ARM.callTool("profile", "get_preferences", { id: workspaceId || "global_owner", scope: workspaceId ? "workspace" : "unified" });
      const prefsString = (result as any).content?.[0]?.text || "{}";
      return JSON.parse(prefsString);
    } catch (e) {
      return {};
    }
  }

  async logUsage(data: any): Promise<void> {
    try {
      await this.env.ARM.callTool("profile", "log_usage", { ...data, userId: "global_owner" });
    } catch (e) { }
  }

  async setPreference(key: string, value: any): Promise<void> {
    try {
      await this.env.ARM.callTool("profile", "set_preference", { key, value, scopeId: "global_owner", scopeType: "unified" });
    } catch (e) { }
  }
}
