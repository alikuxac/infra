import { Env } from "../../env.js";

export class SessionService {
  constructor(private env: Env) { }

  async getSession(sessionId: string): Promise<any> {
    try {
      const result = await this.env.ARM.callTool("session", "get_session", { sessionId });
      return JSON.parse((result as any).content?.[0]?.text || '{"history": [], "metadata": {}}');
    } catch (e) {
      return { history: [], metadata: {} };
    }
  }

  async saveSession(sessionId: string, data: any): Promise<void> {
    try {
      await this.env.ARM.callTool("session", "save_session", { sessionId, ...data });
    } catch (e) { }
  }

  async updateMetadata(sessionId: string, metadata: any): Promise<void> {
    try { await this.env.ARM.callTool("session", "update_metadata", { sessionId, metadata }); } catch (e) { }
  }

  async clearSession(sessionId: string): Promise<void> {
    try { await this.env.ARM.callTool("session", "clear_session", { sessionId }); } catch (e) { }
  }

  static getSessionId(platform: string, userId: string, suffix: string = "general"): string {
    return `${platform}:${userId}:${suffix}`;
  }
}
