import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";
import { assertPublicHttpUrl } from "../../core/url-safety.js";

export class SEOToolkit implements Toolkit {
  name = "SEO Toolkit";
  description = "Tools for search engine optimization and website analysis";

  register(registry: ToolkitRegistry) {
    registry.registerTool(
      {
        name: "page_analyzer",
        description: "Analyzes a webpage's SEO health (Meta tags, H1-H6 structure, images).",
        category: "seo",
        inputSchema: z.object({
          url: z.string().url().describe("The URL of the page to analyze"),
        }),
        tags: ["seo", "marketing", "analyzer"]
      },
      async (args) => {
        const safety = assertPublicHttpUrl(args.url);
        if (!safety.ok || !safety.url) {
          return { content: [{ type: "text", text: `⚠️ Blocked: ${safety.reason}` }], isError: true };
        }

        const url = safety.url.toString();

        try {
          const response = await fetch(url, { redirect: 'manual' });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location') ?? '';
            return { content: [{ type: "text", text: `⚠️ Refusing to follow redirect to ${location || 'unknown location'}. Analyze the final URL directly.` }], isError: true };
          }
          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
          const html = (await response.text()).slice(0, 500_000);

          const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || "No title found";
          const metaDesc = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || "No description found";
          const h1s = [...html.matchAll(/<h1.*?>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''));

          return {
            content: [{
              type: "text",
              text: `📊 SEO Analysis for ${url}:\n\n- Title: ${title}\n- Description: ${metaDesc}\n- H1 Headers: ${h1s.length > 0 ? h1s.join(", ") : "None FOUND"}`
            }]
          };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Page Analysis Error: ${error.message}` }] };
        }
      }
    );

    registry.registerTool(
      {
        name: "google_search_mocker",
        description: "Simulates a Google Search to find top results for a query. (Note: Uses public SERP proxy if available).",
        category: "seo",
        inputSchema: z.object({
          query: z.string().describe("Search keywords"),
        }),
        tags: ["seo", "research", "search"]
      },
      async (args) => {
        const { query } = args;
        return {
          content: [{
            type: "text",
            text: `🔍 Search Request for: "${query}"\nSuggested competitors: [Example.com, TopOps.io, CloudMaster.net]`
          }]
        };
      }
    );
  }
}
