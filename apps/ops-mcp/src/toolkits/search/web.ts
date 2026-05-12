import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class SearchToolkit implements Toolkit {
  name = "search";
  description = "Tools for web searching and information gathering";
  isPublic: boolean;

  constructor(options: { isPublic?: boolean } = {}) {
    this.isPublic = !!options.isPublic;
  }

  register(registry: ToolkitRegistry) {
    // 1. Web Search (using DuckDuckGo HTML fallback)
    registry.registerTool(
      {
        name: "web_search",
        description: "Searches the web for information using free search engines.",
        category: "search",
        inputSchema: z.object({
          query: z.string().describe("The search query"),
          count: z.number().optional().default(5).describe("Number of results to return"),
        }),
        tags: ["search", "web", "research"]
      },
      async (args) => {
        const { query, count } = args;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        try {
          // Note: In Cloudflare Workers, we might need a User-Agent or handle blocks
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });

          if (!response.ok) throw new Error(`Search service returned ${response.status}`);

          const html = await response.text();

          // Simple regex-based extraction for DuckDuckGo HTML
          // Result blocks are <div class="result results_links results_links_deep web-result ">
          const results: any[] = [];
          const resultRegex = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>.*?<a class="result__snippet" href="[^"]+">([^<]+)<\/a>/gs;

          let match;
          let i = 0;
          while ((match = resultRegex.exec(html)) !== null && i < (count || 5)) {
            const link = decodeURIComponent(match[1].split("uddg=")[1]?.split("&")[0] || match[1]);
            results.push({
              title: match[2].trim(),
              url: link,
              snippet: match[3].trim()
            });
            i++;
          }

          if (results.length === 0) {
            return { content: [{ type: "text", text: "No results found. Search engine might be blocking or query too specific." }] };
          }

          const textResults = results.map(r => `### ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
          return { content: [{ type: "text", text: `🌐 Web Search Results for "${query}":\n\n${textResults}` }] };

        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Search Error: ${error.message}` }] };
        }
      }
    );
  }
}
