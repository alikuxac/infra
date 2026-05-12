import { Hono } from "hono";
import { Env } from "./env.js";
import { DashboardService } from "./services/core/dashboard-service.js";
import { renderDashboard } from "./ui/dashboard-template.js";
import { AlertService } from "./services/core/alert-service.js";
import type { MessageBatch, ScheduledEvent, ExecutionContext } from "@cloudflare/workers-types";

const app = new Hono<{ Bindings: Env }>();

app.onError(async (err, c) => {
  console.error("[Hono] Global Error Caught:", err);
  const alerts = new AlertService(c.env);
  c.executionCtx.waitUntil(alerts.reportError(err, `Hono:${c.req.method}:${c.req.path}`));
  return c.text("Internal Server Error", 500);
});

app.get("/", (c) => c.text("alikuxac Executive Brain Gateway (Unified)"));

app.get("/dashboard", async (c) => {
  const cssContent = `
        :root { --bg-color: #0d0f14; --card-bg: rgba(255, 255, 255, 0.03); --card-border: rgba(255, 255, 255, 0.08); --text-primary: #f8fafc; --text-secondary: #94a3b8; --accent-color: #6366f1; --accent-glow: rgba(99, 102, 241, 0.2); --success: #10b981; --warning: #f59e0b; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: var(--bg-color); color: var(--text-primary); font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 2rem; }
  `;
  const dashboard = new DashboardService(c.env);
  const stats = await dashboard.getStats();
  return c.html(renderDashboard(stats, cssContent));
});

import { WorkerEntrypoint } from "cloudflare:workers";

/**
 * Unified Entry Point with Fetch, Queue, and Scheduled Handlers
 */
export default class extends WorkerEntrypoint<Env> {
  /**
   * Main Fetch Handler (Hono)
   */
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request, this.env, this.ctx);
  }

  /**
   * RPC Methods for Messaging Delegation (ops-bot)
   */
  async processIntent(
    history: any[],
    persona: string,
    modelAlias: string = "default",
    userMeta?: { userId: string, platform: string },
    providerOverride: any = "google"
  ) {
    const { Orchestrator } = await import("./services/core/orchestrator.js");
    const orchestrator = new Orchestrator(this.env);
    const result = await orchestrator.processIntent(history, persona as any, modelAlias, userMeta, providerOverride);
    return {
      text: result.text,
      toolResults: result.toolResults,
      usage: result.usage,
      finishReason: result.finishReason
    };
  }

  async summarize(history: any[]) {
    const { Orchestrator } = await import("./services/core/orchestrator.js");
    const orchestrator = new Orchestrator(this.env);
    const result = await orchestrator.summarize(history);
    return result;
  }

  /**
   * Queue Consumer for background tasks
   */
  async queue(batch: MessageBatch<any>): Promise<void> {
    const { Orchestrator } = await import("./services/core/orchestrator.js");
    const orch = new Orchestrator(this.env);

    for (const message of batch.messages) {
      const task = message.body;
      console.log(`[Queue] Processing task: ${task.type} (${task.id})`);

      try {
        switch (task.type) {
          case "deep_research":
            const { LeadWorker } = await import("./personas/lead.js");
            const lead = new LeadWorker(this.env);
            await lead.execute(task.payload.goal, {
              userId: "system", platform: "system", sessionId: task.id
            });
            break;
        }
        message.ack();
      } catch (err) {
        console.error(`[Queue] Task ${task.type} failed:`, err);
        const alerts = new AlertService(this.env);
        this.ctx.waitUntil(alerts.reportError(err, `Queue:${task.type}:${task.id}`));
      }
    }
  }

  /**
   * Scheduled Handler for Cron jobs
   */
  async scheduled(event: ScheduledEvent): Promise<void> {
    console.log(`[Scheduled] Triggered at ${event.scheduledTime}`);
    try {
      const { SchedulerService } = await import("./services/ops/scheduler-service.js");
      const scheduler = new SchedulerService(this.env);
      this.ctx.waitUntil(scheduler.processScheduledTasks());
    } catch (err) {
      console.error("[Scheduled] Handler failed:", err);
      const alerts = new AlertService(this.env);
      this.ctx.waitUntil(alerts.reportError(err, "Scheduled:Cron"));
    }
  }
}
