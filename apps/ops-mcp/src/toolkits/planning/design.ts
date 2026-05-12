import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

export class PlanningToolkit implements Toolkit {
  name = "Business & Planning Toolkit";
  description = "Tools for project planning, brand strategy, and business operations";

  register(registry: ToolkitRegistry) {
    // 1. Mermaid Designer
    registry.registerTool(
      {
        name: "mermaid_designer",
        description: "Generates Mermaid.js code for flowcharts, sequence diagrams, and roadmaps.",
        category: "planning",
        inputSchema: z.object({
          description: z.string().describe("What the diagram should represent"),
          type: z.enum(["flowchart", "sequence", "gantt", "roadmap"]).default("flowchart"),
        }),
        tags: ["planning", "design", "mermaid"]
      },
      async (args) => {
        const { description, type } = args;
        return {
          content: [{ type: "text", text: `Base Mermaid template for ${type} of ${description} provided. Please finalize the syntax.` }]
        };
      }
    );

    // 2. Brand Identity Builder
    registry.registerTool(
      {
        name: "brand_identity_builder",
        description: "Defines the core identity of a brand or personal brand.",
        category: "planning",
        inputSchema: z.object({
          brand_name: z.string().describe("Name of the brand or person"),
          core_values: z.string().describe("Core values or mission"),
          target_audience: z.string().describe("Desired audience"),
        }),
        tags: ["brand", "strategy", "marketing"]
      },
      async (args) => {
        const { brand_name, core_values, target_audience } = args;
        return {
          content: [{
            type: "text",
            text: `🎯 Brand Guide for ${brand_name}:\n- Values: ${core_values}\n- Audience: ${target_audience}\n- Recommended Tone: Professional yet Creative\n- Next Step: Use the content planner to reach this audience.`
          }]
        };
      }
    );

    // 3. Personal Brand Planner
    registry.registerTool(
      {
        name: "personal_brand_planner",
        description: "Generates a 30-day content strategy for personal branding.",
        category: "planning",
        inputSchema: z.object({
          platform: z.enum(["LinkedIn", "X", "YouTube", "Blog"]),
          niche: z.string().describe("Your area of expertise"),
        }),
        tags: ["brand", "content", "marketing"]
      },
      async (args) => {
        const { platform, niche } = args;
        return {
          content: [{
            type: "text",
            text: `📅 30-Day ${platform} Strategy for ${niche}:\n- Week 1: Authority building (How-to posts)\n- Week 2: Personal stories & Vulnerability\n- Week 3: Engagement & Questions\n- Week 4: Product/Service Promotion`
          }]
        };
      }
    );

    // 4. Project Doc Templater
    registry.registerTool(
      {
        name: "project_doc_templater",
        description: "Generates Jira/Confluence documentation templates based on a project goal.",
        category: "planning",
        inputSchema: z.object({
          objective: z.string().describe("The main project objective"),
          type: z.enum(["jira_story", "confluence_spec", "pr_template"]),
        }),
        tags: ["ops", "documentation", "management"]
      },
      async (args) => {
        const { objective, type } = args;
        let template = "";
        if (type === "jira_story") template = `As a [user], I want to [do something] so that [value].\n\n**Acceptance Criteria:**\n- [ ] Task 1\n- [ ] Task 2`;
        else if (type === "confluence_spec") template = `h1. ${objective} Specification\n\nh2. Overview\nDescribe the project...\nh2. Requirements\n- Req 1`;

        return {
          content: [{ type: "text", text: `📄 Template Generated for ${type}:\n\n${template}` }]
        };
      }
    );

    // 5. Company Ops Orchestrator
    registry.registerTool(
      {
        name: "company_ops_orchestrator",
        description: "Coordinates a multi-departmental plan for a small company.",
        category: "planning",
        inputSchema: z.object({
          objective: z.string().describe("General goal (e.g., 'Scale to 100 users')"),
        }),
        tags: ["ops", "strategy", "management"]
      },
      async (args) => {
        const { objective } = args;
        return {
          content: [{
            type: "text",
            text: `🏢 Operations Plan: ${objective}\n\n- Product: Ship MVP with core features.\n- Marketing: Outreach to top 10 influencers.\n- Finance: Monitor burn rate and LTV.`
          }]
        };
      }
    );

    // 6. Budget and Resource Planner
    registry.registerTool(
      {
        name: "budget_and_resource_planner",
        description: "Estimates financial and human resource needs for a project.",
        category: "planning",
        inputSchema: z.object({
          project_scope: z.string().describe("Scope of the project"),
          estimated_duration: z.string().describe("e.g., '3 months'").default("1 month"),
        }),
        tags: ["finance", "resources", "planning"]
      },
      async (args) => {
        const { project_scope, estimated_duration } = args;
        return {
          content: [{
            type: "text",
            text: `💰 Budget & Resource Estimate for ${project_scope} (${estimated_duration}):\n- Infrastructure: $50-200/mo (Cloudflare, DB)\n- Tools: $100/mo\n- Talent: 1 Lead Dev, 1 Part-time Marketing\n- Buffer: 20% for unexpected risks.`
          }]
        };
      }
    );

    // 7. Deep Research (Autonomous)
    registry.registerTool(
      {
        name: "deep_research",
        description: "Starts an autonomous deep research task. The process runs in the background and reports back when complete.",
        category: "planning",
        inputSchema: z.object({
          goal: z.string().describe("The research objective (e.g., 'Competitor analysis for AI tools')"),
          breadth: z.number().optional().default(3).describe("Number of search queries to perform (1-5)"),
        }),
        tags: ["research", "autonomous", "ops"]
      },
      async (args) => {
        const { goal, breadth } = args;
        return {
          content: [{
            type: "text",
            text: `🧪 **Deep Research Started**\n- **Objective**: ${goal}\n- **Depth**: ${breadth} query threads\n- **Status**: Processing in background...\n\nI will analyze the web and distill the most important facts into my memory. A preview report will be shown to you once ready.`
          }],
          // Meta fields for Orchestrator to intercept
          __background_task: {
            type: "deep_research",
            payload: { goal, breadth }
          }
        };
      }
    );
  }
}
