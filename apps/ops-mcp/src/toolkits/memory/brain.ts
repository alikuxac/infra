import { Toolkit, ToolkitRegistry } from "../../core/registry.js";
import { z } from "zod";

export class MemoryToolkit implements Toolkit {
  name = "memory";
  description = "Access and manage the Ops Empire's shared long-term memory (D1 + Vectorize).";
  isPublic = true;

  register(registry: ToolkitRegistry) {
    const env = registry.getEnv();

    // Tool: search_memory
    registry.registerTool(
      {
        name: "search_memory",
        description: "Search for facts, brand details, or project context from long-term memory.",
        category: "utility",
        inputSchema: z.object({
          query: z.string().describe("What to look for"),
          namespace: z.string().default("general").describe("Knowledge domain (general, brand, technical)"),
          limit: z.number().default(5).describe("Max results to return"),
          workspace: z.string().optional().describe("Filter by workspace (default: global)"),
          project: z.string().optional().describe("Filter by project (default: general)"),
          env: z.string().optional().describe("Environment isolation")
        })
      },
      async ({ query, namespace, limit, workspace = "global", project = "general", env: envOverride }) => {
        try {
          const globalResults: string[] = [];
          const projectResults: string[] = [];
          const currentEnv = envOverride || env.ENVIRONMENT || "production";

          // 1. D1 Keyword Search
          const d1Results = await env.DB.prepare(
            "SELECT content, importance, workspace, project FROM facts " +
            "WHERE namespace = ? " +
            "AND env = ? " +
            "AND (workspace = 'global' OR workspace = ?) " +
            "AND (project = 'general' OR project = ?) " +
            "ORDER BY (project = ?) DESC, importance DESC LIMIT ?"
          ).bind(namespace, currentEnv, workspace, project, project, limit).all();

          if (d1Results.results) {
            d1Results.results.forEach((r: any) => {
              const text = `🔹 ${r.content} *(Imp: ${r.importance})*`;
              if (r.project !== "general" && r.project === project) {
                projectResults.push(text);
              } else {
                globalResults.push(text);
              }
            });
          }

          // 2. Vectorize Semantic Search
          const vector = await this.getEmbeddings(query, env);
          const vecMatches = await env.VECTORIZE.query(vector, {
            topK: limit,
            returnMetadata: true,
            filter: {
              namespace,
              env: currentEnv,
              workspace: { $in: ["global", workspace] },
              project: { $in: ["general", project] }
            }
          });

          if (vecMatches.matches) {
            vecMatches.matches
              .filter((m: any) => (m.score || 1) > 0.6)
              .forEach((m: any) => {
                const text = `💡 ${m.metadata?.text}`;
                if (m.metadata?.project !== "general" && m.metadata?.project === project) {
                  projectResults.push(text);
                } else {
                  globalResults.push(text);
                }
              });
          }

          if (globalResults.length === 0 && projectResults.length === 0) {
            return { content: [{ type: "text", text: "❌ No relevant information found." }] };
          }

          // 3. Assemble & Truncate for Discord (limit ~1900 chars)
          let output = `## 🧠 Memory Search: "${query}"\n\n`;

          if (projectResults.length > 0) {
            output += `### 📁 PROJECT CONTEXT (${project})\n` + projectResults.slice(0, 4).join("\n") + "\n\n";
          }
          if (globalResults.length > 0) {
            output += `### 🌐 GLOBAL KNOWLEDGE\n` + globalResults.slice(0, 3).join("\n") + "\n";
          }

          if (output.length > 1940) {
            output = output.substring(0, 1900) + "\n\n*... some results truncated due to length limits.*";
          }

          return { content: [{ type: "text", text: output }] };
        } catch (err: any) {
          return { content: [{ type: "text", text: `Memory query error: ${err.message}` }], isError: true };
        }
      }
    );

    // Tool: record_knowledge
    registry.registerTool(
      {
        name: "record_knowledge",
        description: "Save a new atomic fact, idea, or important detail to long-term memory.",
        category: "utility",
        inputSchema: z.object({
          fact: z.string().describe("The information to remember"),
          namespace: z.string().default("general").describe("Knowledge domain"),
          importance: z.number().min(1).max(5).default(2).describe("1: minor, 5: critical identity/security"),
          workspace: z.string().default("global").describe("Isolation layer"),
          project: z.string().default("general").describe("Specific project or session"),
          env: z.string().optional().describe("Environment override")
        })
      },
      async ({ fact, namespace, importance, workspace, project, env: envOverride }) => {
        try {
          const id = crypto.randomUUID();
          const currentEnv = envOverride || env.ENVIRONMENT || "production";
          await env.DB.prepare(
            "INSERT INTO facts (id, namespace, content, importance, workspace, project, env) VALUES (?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET content = excluded.content, importance = excluded.importance, env = excluded.env"
          ).bind(id, namespace, fact, importance, workspace, project, currentEnv).run();

          return {
            content: [{ type: "text", text: `Successfully recorded to ${workspace}/${project}:${namespace} memory.` }]
          };
        } catch (err: any) {
          return { content: [{ type: "text", text: `Failed to record knowledge: ${err.message}` }], isError: true };
        }
      }
    );
  }

  private async getEmbeddings(text: string, env: any): Promise<number[]> {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const gatewayName = env.AI_GATEWAY_NAME;
    const token = env.AI_GATEWAY_TOKEN;

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

    if (!response.ok) throw new Error(`Embedding service failed with status: ${response.status}`);
    const result: any = await response.json();
    return result.data?.[0]?.embedding;
  }
}
