import { generateText } from "ai";
import { AIService } from "../core/ai-service.js";

/**
 * MemoryService - Handles persistent memory using Hybrid D1 + Cloudflare Vectorize.
 * Inspired by ClopinetteAI's 5-layer memory model.
 * Layer 1: D1 Database (Structured Facts/Knowledge)
 * Layer 2: Vectorize (Semantic/Contextual RAG)
 */
export class MemoryService {
  private aiService: AIService;
  private vectorize: VectorizeIndex;
  private db: D1Database;
  private env: any; // Type Env from ../../env.js

  constructor(aiService: AIService, vectorize: VectorizeIndex, db: D1Database, env: any) {
    this.aiService = aiService;
    this.vectorize = vectorize;
    this.db = db;
    this.env = env;
  }

  /**
   * Layer 1: Save a distilled fact to D1 for high-precision retrieval
   */
  async learnFact(
    content: string,
    namespace: string = "general",
    importance: number = 1,
    workspace: string = "global",
    project: string = "general"
  ) {
    console.log(`[MemoryService] Learning fact for [${workspace}/${project}:${namespace}]. Importance: ${importance}`);
    try {
      const currentEnv = this.env.ENVIRONMENT || "production";
      await this.db.prepare(
        "INSERT INTO facts (id, namespace, content, importance, workspace, project, env) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET content = excluded.content, importance = excluded.importance, last_accessed = CURRENT_TIMESTAMP, env = excluded.env"
      ).bind(crypto.randomUUID(), namespace, content, importance, workspace, project, currentEnv).run();
      return true;
    } catch (err) {
      console.error("[MemoryService] LearnFact Error:", err);
      return false;
    }
  }

  /**
   * Layer 1.5: AI-powered Fact Distillation.
   * Extracts atomic, high-importance facts from a text block and commits to D1.
   */
  async distillFacts(
    text: string,
    namespace: string = "general",
    workspace: string = "global",
    project: string = "general"
  ) {
    console.log(`[MemoryService] Distilling facts from input [${workspace}/${project}:${namespace}]...`);

    const prompt = `Extract exactly 3-7 critical, permanent facts from the following text.
Format each fact as a clear, atomic statement in English or Vietnamese (matching source).
Importance scale: 1 (minor) to 5 (critical brand, identity, or security).

Text:
${text.slice(0, 10000)}

Return ONLY a JSON array of objects: [{ "fact": string, "importance": number }]`;

    try {
      const config = this.aiService.resolveModelConfig("google", "default");
      const nativeProvider = (this.aiService as any).getNativeProvider(config);

      const { text: jsonResponse } = await generateText({
        model: nativeProvider,
        prompt: prompt,
      });

      // Simple JSON extraction to be safe
      const jsonStart = jsonResponse.indexOf("[");
      const jsonEnd = jsonResponse.lastIndexOf("]") + 1;
      const facts = JSON.parse(jsonResponse.slice(jsonStart, jsonEnd));

      for (const f of facts) {
        await this.learnFact(f.fact, namespace, f.importance, workspace, project);
      }
      return true;
    } catch (err) {
      console.error("[MemoryService] DistillFacts Error:", err);
      return false;
    }
  }

  /**
   * Layer 2: Save semantic memory to Vectorize
   */
  async addMemory(
    text: string,
    metadata: Record<string, any> = {},
    namespace: string = "general",
    workspace: string = "global",
    project: string = "general"
  ) {
    try {
      const vector = await this.aiService.getEmbeddings(text);
      await this.vectorize.upsert([
        {
          id: crypto.randomUUID(),
          values: vector,
          metadata: {
            ...metadata,
            text,
            namespace,
            workspace,
            project,
            env: this.env.ENVIRONMENT || "production",
            timestamp: new Date().toISOString()
          },
        },
      ]);
      return true;
    } catch (err) {
      console.error("[MemoryService] AddMemory Error:", err);
      return false;
    }
  }

  /**
   * Hybrid Query: D1 (Precision) + Vectorize (Context)
   * Implements hierarchy: Current Project > Global Knowledge
   */
  async queryMemory(
    query: string,
    topK: number = 5,
    namespace: string = "general",
    workspace: string = "global",
    project: string = "general"
  ) {
    const results: string[] = [];

    try {
      if (!this.vectorize) {
        console.warn("[MemoryService] VECTORIZE binding is missing. Semantic search skipped.");
        // We still continue to D1 search
      }

      // 1. D1 Quick Search (Keyword search on facts)
      // Filters for Global OR current Workspace OR current project context
      const currentEnv = this.env.ENVIRONMENT || "production";
      const d1Results = await this.db.prepare(
        "SELECT content, workspace, project FROM facts " +
        "WHERE namespace = ? " +
        "AND env = ? " +
        "AND (workspace = 'global' OR workspace = ?) " +
        "AND (project = 'general' OR project = ?) " +
        "AND (content LIKE ? OR importance >= 4) " +
        "ORDER BY (project = ?) DESC, (workspace = ?) DESC, importance DESC LIMIT 5"
      ).bind(namespace, currentEnv, workspace, project, `%${query}%`, project, workspace).all();

      if (d1Results.results) {
        results.push(...d1Results.results.map((r: any) => {
          let prefix = `[GLOBAL]`;
          if (r.project !== "general") prefix = `[PROJECT:${r.project}]`;
          else if (r.workspace !== "global") prefix = `[WORKSPACE:${r.workspace}]`;
          return `${prefix}: ${r.content}`;
        }));
      }

      // 2. Vectorize Semantic Search
      if (this.vectorize) {
        const vector = await this.aiService.getEmbeddings(query);
        const vecMatches = await this.vectorize.query(vector, {
          topK,
          returnMetadata: true,
          filter: {
            namespace,
            env: currentEnv,
            workspace: { $in: ["global", workspace] },
            project: { $in: ["general", project] }
          }
        });

        if (vecMatches.matches) {
          results.push(...vecMatches.matches
            .filter((m: any) => (m.score || 1) > 0.4) // Lower threshold for context
            .map((m: any) => {
              const meta = m.metadata as any;
              let p = `[GLOBAL]`;
              if (meta?.project !== "general") p = `[CONTEXT:${meta?.project}]`;
              else if (meta?.workspace !== "global") p = `[WORKSPACE:${meta?.workspace}]`;
              return `${p}: ${meta?.text}`;
            })
          );
        }
      }

      return results;
    } catch (err) {
      console.error("[MemoryService] Hybrid Query Error:", err);
      return [];
    }
  }
}
