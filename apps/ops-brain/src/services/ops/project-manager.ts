import { Env } from "../../env.js";

export class ProjectManager {
  constructor(private env: Env) { }

  async createWorkspace(name: string, id?: string): Promise<string> {
    const result = await this.env.ARM.callTool("project", "workspace_create", { name, id });
    return (result as any).content?.[0]?.text || "";
  }

  async listWorkspaces(): Promise<any[]> {
    const result = await this.env.ARM.callTool("project", "workspace_list", {});
    return JSON.parse((result as any).content?.[0]?.text || "[]");
  }

  async createProject(name: string, workspaceId: string, id?: string, description?: string): Promise<string> {
    const result = await this.env.ARM.callTool("project", "project_create", { name, workspaceId, id, description });
    return (result as any).content?.[0]?.text || "";
  }

  async listProjects(workspaceId?: string): Promise<any[]> {
    const result = await this.env.ARM.callTool("project", "project_list", { workspaceId });
    return JSON.parse((result as any).content?.[0]?.text || "[]");
  }
}
