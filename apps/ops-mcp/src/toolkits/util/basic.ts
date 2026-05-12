import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class BasicToolkit implements Toolkit {
  name = "Basic Toolkit";
  description = "Essential utility tools for everyday operations";

  register(registry: ToolkitRegistry) {
    // 1. Get Weather (using wttr.in)
    registry.registerTool(
      {
        name: "get_weather",
        description: "Get real-time weather information for a specific city/location using wttr.in.",
        category: "utility",
        inputSchema: z.object({
          location: z.string().describe("City or location name (e.g., 'Hanoi', 'London')").default("Hanoi"),
        }),
        tags: ["weather", "utility"]
      },
      async (args) => {
        const { location } = args;
        const url = `https://wttr.in/${location}?format=3`; // Unified format

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
          const text = await response.text();
          return { content: [{ type: "text", text: `🌤️ Weather for ${location}: ${text}` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `❌ Weather Error: ${error.message}` }] };
        }
      }
    );

    // 2. Get Time
    registry.registerTool(
      {
        name: "get_time",
        description: "Returns the current UTC and Local time.",
        category: "utility",
        tags: ["time", "utility"]
      },
      async () => {
        const now = new Date();
        return {
          content: [{
            type: "text",
            text: `🕒 Current Time:\n- UTC: ${now.toISOString()}\n- Local: ${now.toLocaleString()}`
          }]
        };
      }
    );
  }
}
