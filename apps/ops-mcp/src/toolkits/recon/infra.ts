import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class ReconToolkit implements Toolkit {
  name = "Recon Toolkit";
  description = "Tools for public infrastructure reconnaissance and tech stack identification";

  // SAFETY GUARD: Prevent scanning internal or protected domains
  private isSafeDomain(domain: string): boolean {
    const forbidden = [".internal", "localhost", "127.0.0.1", "10.", "192.168.", "172."];
    return !forbidden.some(f => domain.includes(f));
  }

  register(registry: ToolkitRegistry) {
    // 1. Tech Stack Recon (Header & Signature based)
    registry.registerTool(
      {
        name: "tech_stack_recon",
        description: "Identifies the technology stack (Server, Frameworks, CSS) of a public website.",
        category: "recon",
        inputSchema: z.object({
          domain: z.string().describe("The domain or URL to recon (e.g., 'google.com')"),
        }),
        tags: ["recon", "tech", "security"]
      },
      async (args) => {
        const domain = args.domain.replace(/^https?:\/\//, '').split('/')[0];

        if (!this.isSafeDomain(domain)) {
          return { content: [{ type: "text", text: "⚠️ Safety Alert: Recon blocked for protected or internal domain." }] };
        }

        try {
          const response = await fetch(`https://${domain}`, { method: 'HEAD' });
          const server = response.headers.get("Server") || "Unknown";
          const poweredBy = response.headers.get("X-Powered-By") || "Hidden";
          const cfRay = response.headers.has("CF-RAY") ? "Cloudflare" : "Direct/Other CDN";

          return {
            content: [{
              type: "text",
              text: `🔍 Tech Recon for ${domain}:\n- Server: ${server}\n- Infrastructure: ${cfRay}\n- Platform Hints: ${poweredBy}`
            }]
          };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Recon Error: ${error.message}` }] };
        }
      }
    );

    // 2. DNS Lookup (via Google/Cloudflare DNS-over-HTTPS)
    registry.registerTool(
      {
        name: "dns_lookup",
        description: "Performs a public DNS lookup (A, MX, TXT records) for a domain.",
        category: "recon",
        inputSchema: z.object({
          domain: z.string().describe("Target domain"),
          type: z.enum(["A", "MX", "TXT", "AAAA"]).default("A"),
        }),
        tags: ["recon", "dns", "ops"]
      },
      async (args) => {
        const { domain, type } = args;
        if (!this.isSafeDomain(domain)) return { content: [{ type: "text", text: "⚠️ Blocked." }] };

        const url = `https://cloudflare-dns.com/query?name=${domain}&type=${type}`;
        try {
          const res = await fetch(url, { headers: { "Accept": "application/dns-json" } });
          const data = await res.json() as any;
          const answers = data.Answer?.map((a: any) => a.data).join(", ") || "No records found.";

          return {
            content: [{
              type: "text",
              text: `🌐 DNS [${type}] for ${domain}:\n${answers}`
            }]
          };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ DNS Lookup Error: ${error.message}` }] };
        }
      }
    );

    // 3. System Log Reader (Simulating Logpush/KV retrieval)
    registry.registerTool(
      {
        name: "system_log_reader",
        description: "Fetch and analyze system logs from Cloudflare Logpush or KV storage.",
        category: "recon",
        inputSchema: z.object({
          source: z.enum(["logpush", "kv"]).default("kv"),
          timeRange: z.string().describe("Time range to fetch (e.g., 'last 1h', 'last 24h')"),
          filter: z.string().optional().describe("Regex or keyword to filter logs"),
        }),
        tags: ["ops", "logs", "monitor"]
      },
      async (args) => {
        const { source, timeRange, filter } = args;
        const env = registry.getEnv();

        // LOGIC: In a real scenario, this would query a KV namespace or a Logpush dataset
        // For now, we fetch from the system_logs table in D1 as a proxy if source is 'kv'
        try {
          let logs: any[] = [];
          if (source === "kv" && env.DB) {
            const currentEnv = env.ENVIRONMENT || "production";
            const query = filter
              ? `SELECT * FROM system_logs WHERE (message LIKE ? OR level LIKE ?) AND env = ? ORDER BY timestamp DESC LIMIT 20`
              : `SELECT * FROM system_logs WHERE env = ? ORDER BY timestamp DESC LIMIT 20`;

            const stmt = env.DB.prepare(query);
            const results = filter
              ? await stmt.bind(`%${filter}%`, `%${filter}%`, currentEnv).all()
              : await stmt.bind(currentEnv).all();
            logs = results.results;
          }

          if (logs.length === 0) {
            return { content: [{ type: "text", text: `📋 No logs found for ${timeRange} with filter '${filter || "none"}'.` }] };
          }

          const logSummary = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join("\n");
          return {
            content: [{
              type: "text",
              text: `📊 System Logs (Source: ${source}, Range: ${timeRange}):\n\n${logSummary}`
            }]
          };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Log Retrieval Error: ${error.message}` }] };
        }
      }
    );
  }
}
