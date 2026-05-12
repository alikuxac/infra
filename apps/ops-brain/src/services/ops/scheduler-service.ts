import { Env } from "../../env.js";

export class SchedulerService {
  constructor(private Env: Env) { }

  async scheduleTask(params: {
    name: string;
    type: string;
    schedule: string;
    payload: any;
    userId: string;
    channelId: string | null;
    platform: string;
  }) {
    const id = crypto.randomUUID();
    const nextRun = this.calculateNextRun(params.schedule);

    await this.Env.DB.prepare(
      `INSERT INTO delegated_tasks 
       (id, task_name, task_type, cron_schedule, payload, next_run, user_id, channel_id, platform) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.name,
      params.type,
      params.schedule,
      JSON.stringify(params.payload),
      nextRun,
      params.userId,
      params.channelId,
      params.platform
    ).run();

    return id;
  }

  async processScheduledTasks() {
    const nowIso = new Date().toISOString();
    const tasks = await this.Env.DB.prepare(
      "SELECT * FROM delegated_tasks WHERE status = 'active' AND (next_run IS NULL OR next_run <= ?)"
    ).bind(nowIso).all();

    if (!tasks.results || tasks.results.length === 0) return;

    for (const task of tasks.results as any) {
      try {
        await this.Env.QUEUE.send({
          id: crypto.randomUUID(),
          type: task.task_type,
          payload: JSON.parse(task.payload),
          metadata: {
            delegatedTaskId: task.id,
            userId: task.user_id,
            channelId: task.channel_id,
            platform: task.platform,
            is_scheduled: true
          }
        });

        const nextRun = this.calculateNextRun(task.cron_schedule);
        await this.Env.DB.prepare(
          "UPDATE delegated_tasks SET last_run = ?, next_run = ? WHERE id = ?"
        ).bind(nowIso, nextRun, task.id).run();
      } catch (err) {
        console.error(`[Scheduler] Failed to trigger task ${task.id}:`, err);
      }
    }
  }

  private calculateNextRun(schedule: string): string {
    const next = new Date();
    const match = schedule.toLowerCase().match(/every (\d+) (hour|day|minute)s?/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      if (unit.startsWith("minute")) next.setMinutes(next.getMinutes() + amount);
      else if (unit.startsWith("hour")) next.setHours(next.getHours() + amount);
      else if (unit.startsWith("day")) next.setDate(next.getDate() + amount);
      return next.toISOString();
    }
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
}
