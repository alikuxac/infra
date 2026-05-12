import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class ConfluenceToolkit implements Toolkit {
  name = "Confluence Toolkit";
  description = "Tools for interacting with Confluence Wiki";

  register(registry: ToolkitRegistry) {
    const env = registry.getEnv();

    registry.registerTool(
      {
        name: "confluence_api_call",
        description: "Universal Confluence API executor for wiki management.",
        category: "dev",
        inputSchema: z.object({
          path: z.string().describe("API path (e.g., '/wiki/api/v2/pages')"),
          method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
          body: z.any().optional().describe("Request body"),
        }),
        tags: ["atlassian", "confluence", "knowledge"]
      },
      async (args) => {
        const { path, method, body } = args;
        const domain = env.JIRA_DOMAIN || "your-domain.atlassian.net";
        const apiToken = env.JIRA_API_TOKEN;

        if (!apiToken) {
          return { content: [{ type: "text", text: "❌ Error: JIRA_API_TOKEN (for Confluence) not configured." }] };
        }

        const url = `https://${domain}${path}`;

        try {
          const response = await fetch(url, {
            method,
            headers: {
              "Authorization": apiToken.includes(":") ? `Basic ${btoa(apiToken)}` : `Basic ${apiToken}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { content: [{ type: "text", text: `❌ Confluence API Error (${response.status}): ${errorText}` }] };
          }

          const data = await response.json();
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Network Error: ${error.message}` }] };
        }
      }
    );
  }
}
