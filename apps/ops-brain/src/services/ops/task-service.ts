import { Env as Env } from "../../env.js";

export class TaskService {
  constructor(private env: Env) { }

  async getTasks(status?: string): Promise<any[]> {
    try {
      const result = await this.env.ARM.callTool("task", "list_tasks", { status });
      return JSON.parse((result as any).content?.[0]?.text || "[]");
    } catch (e) {
      return [];
    }
  }

  async createTask(title: string, description?: string): Promise<any> {
    try {
      const result = await this.env.ARM.callTool("task", "create_task", { title, description });
      return (result as any).content?.[0]?.text;
    } catch (e) {
      throw new Error("Task creation failed");
    }
  }
}
