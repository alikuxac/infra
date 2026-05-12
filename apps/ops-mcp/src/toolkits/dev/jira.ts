import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class JiraToolkit implements Toolkit {
  name = "Jira Toolkit";
  description = "Tools for interacting with Jira Cloud";

  register(registry: ToolkitRegistry) {
    const env = registry.getEnv();

    // 1. Universal API Executor
    registry.registerTool(
      {
        name: "jira_api_call",
        description: "Universal Jira Cloud API executor. Use this for ANY Jira task (list, create, update, comment).",
        category: "dev",
        inputSchema: z.object({
          path: z.string().describe("API endpoint path (e.g., '/rest/api/3/search')"),
          method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
          body: z.unknown().optional().describe("Request body for POST/PUT methods"),
        }),
        tags: ["atlassian", "jira", "management"]
      },
      async (args) => {
        const { path, method, body } = args;
        const domain = env.JIRA_DOMAIN || "your-domain.atlassian.net";
        const apiToken = env.JIRA_API_TOKEN;

        if (!apiToken) {
          return { content: [{ type: "text", text: "❌ Error: JIRA_API_TOKEN not configured." }] };
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
            return { content: [{ type: "text", text: `❌ Jira API Error (${response.status}): ${errorText}` }] };
          }

          const data = await response.json();
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Network Error: ${error.message}` }] };
        }
      }
    );

    // 2. Discovery: Get Projects
    registry.registerTool(
      {
        name: "get_jira_projects",
        description: "Returns the mapping of active Jira project keys and their purpose.",
        category: "dev",
        tags: ["discovery", "jira"]
      },
      async () => ({
        content: [{
          type: "text",
          text: JSON.stringify({
            AIO: "Main AI Operations & Infrastructure",
            IDEA: "Brainstorming & Drafting Phase",
            SP: "Strategic Planning & Roadmap",
          }, null, 2)
        }]
      })
    );
  }
}
