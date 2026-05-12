export class StorageService {
    private env: any;

    constructor(env: any) {
        this.env = env;
    }

    /**
     * Records a fact to D1 and Vectorize
     */
    async recordFact(data: { fact: string; namespace: string; importance: number; workspace: string; project: string }) {
        const id = crypto.randomUUID();

        // 1. Save to D1
        const currentEnv = this.env.ENVIRONMENT || "production";
        await this.env.DB.prepare(
            "INSERT INTO facts (id, namespace, content, importance, workspace, project, env) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, data.namespace, data.fact, data.importance, data.workspace, data.project, currentEnv).run();

        // 2. Generate Embedding & Save to Vectorize
        const embedding = await this.getEmbeddings(data.fact);
        await this.env.VECTORIZE.insert([{
            id,
            values: embedding,
            metadata: {
                text: data.fact,
                namespace: data.namespace,
                workspace: data.workspace,
                project: data.project,
                env: currentEnv
            }
        }]);

        return { id, status: "archived" };
    }

    /**
     * Logs a system event
     */
    async logEvent(level: string, message: string, context?: any) {
        const currentEnv = this.env.ENVIRONMENT || "production";
        await this.env.DB.prepare(
            "INSERT INTO system_logs (level, message, context, env) VALUES (?, ?, ?, ?)"
        ).bind(level, message, context ? JSON.stringify(context) : null, currentEnv).run();
    }

    /**
     * Gets aggregate system stats for the dashboard
     */
    async getSystemStats() {
        const currentEnv = this.env.ENVIRONMENT || "production";
        const memoryCount = await this.env.DB.prepare("SELECT COUNT(*) as total FROM facts WHERE env = ?").bind(currentEnv).first("total");
        const logs = await this.env.DB.prepare("SELECT * FROM system_logs WHERE env = ? ORDER BY timestamp DESC LIMIT 10").bind(currentEnv).all();
        const neuralUsage = await this.env.DB.prepare(
            "SELECT SUM(neurons_estimated) as total FROM usage_logs WHERE env = ? AND created_at > date('now', '-24 hours')"
        ).bind(currentEnv).first("total") || 0;

        return {
            memory: { total_facts: memoryCount },
            telemetry: { recent_logs: logs.results },
            neurons: { daily_total: neuralUsage }
        };
    }

    /**
     * Internal Embedding helper
     */
    private async getEmbeddings(text: string): Promise<number[]> {
        const accountId = this.env.CLOUDFLARE_ACCOUNT_ID;
        const gatewayName = this.env.AI_GATEWAY_NAME;
        const token = this.env.AI_GATEWAY_TOKEN;

        const url = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/compat/embeddings`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "cf-aig-authorization": `Bearer ${token}`,
                "cf-aig-byok-alias": "brain_workers_ai",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ model: "workers-ai/@cf/baai/bge-small-en-v1.5", input: [text] })
        });

        if (!response.ok) throw new Error(`Embedding service failed: ${response.status}`);
        const result: any = await response.json();
        return result.data?.[0]?.embedding;
    }
}
