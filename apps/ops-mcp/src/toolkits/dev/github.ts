import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class GitHubToolkit implements Toolkit {
  name = "GitHub Toolkit";
  description = "Tools for interacting with GitHub REST API";

  register(registry: ToolkitRegistry) {
    const env = registry.getEnv();

    registry.registerTool(
      {
        name: "github_api_call",
        description: "Universal GitHub REST API executor. Use this to list files, read content, or search code.",
        category: "dev",
        inputSchema: z.object({
          path: z.string().describe("API endpoint path (e.g., '/repos/{owner}/{repo}/contents/{path}')"),
          method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
          body: z.any().optional().describe("Request body for POST/PUT methods"),
        }),
        tags: ["github", "vcs"]
      },
      async (args) => {
        const { path, method, body } = args;
        const githubToken = env.GITHUB_TOKEN;

        if (!githubToken) {
          return { content: [{ type: "text", text: "❌ Error: GITHUB_TOKEN not configured." }] };
        }

        const url = `https://api.github.com${path.startsWith("/") ? path : `/${path}`}`;

        try {
          const response = await fetch(url, {
            method,
            headers: {
              "Authorization": `Bearer ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Ops-AI-Empire-MCP",
              "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { content: [{ type: "text", text: `❌ GitHub API Error (${response.status}): ${errorText}` }] };
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
