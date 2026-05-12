import { InteractionType, InteractionResponseType } from "discord-interactions";

/**
 * This script is used to register Slash Commands with Discord.
 * Run command: npx tsx scripts/register.ts
 */

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error("Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in environment!");
  process.exit(1);
}

const COMMANDS = [
  {
    name: "reset",
    description: "Clear chat history and Agent Persona for this channel",
  },
  {
    name: "usage",
    description: "View information about AI Gateway, Neurons, and available Models",
  },
  {
    name: "model",
    description: "Change AI Model (Only applies to current Provider)",
    options: [
      {
        name: "alias_or_id",
        description: "Model ID (e.g., gemini-2.5-pro, llama-3.3-70b-versatile)",
        type: 3,
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: "provider",
    description: "Change AI Provider (Google, Groq, OpenRouter)",
    options: [
      {
        name: "name",
        description: "Provider Name",
        type: 3,
        required: true,
        choices: [
          { name: "Google", value: "google" },
          { name: "Groq", value: "groq" },
          { name: "OpenRouter", value: "openrouter" }
        ]
      }
    ]
  },
  {
    name: "agent",
    description: "Change Agent Persona for this channel",
    options: [
      {
        name: "persona",
        description: "Agent Persona Type",
        type: 3,
        required: true,
        choices: [
          { name: "Executive Advisor", value: "PLANNER" },
          { name: "Deep Researcher", value: "RESEARCHER" },
          { name: "Chief Executive", value: "CEO" },
          { name: "Project Lead", value: "LEAD" },
          { name: "System Guardian", value: "GUARDIAN" },
          { name: "Growth Hacker", value: "GROWTH" },
          { name: "Market Strategist", value: "MARKET" },
          { name: "Content Creator", value: "CONTENT" },
          { name: "SEO Specialist", value: "SEO" },
          { name: "Lightweight Chat", value: "CHAT" }
        ]
      },
    ],
  },
  {
    name: "link",
    description: "Map Discord locations (Server/Category/Channel) to Workspaces/Projects",
    options: [
      {
        name: "type",
        description: "Internal context type",
        type: 3,
        required: true,
        choices: [
          { name: "Workspace", value: "workspace" },
          { name: "Project", value: "project" }
        ]
      },
      {
        name: "scope",
        description: "Discord target level",
        type: 3,
        required: true,
        choices: [
          { name: "Whole Server (Guild)", value: "server" },
          { name: "Category (Parent)", value: "category" },
          { name: "This Channel", value: "channel" }
        ]
      },
      {
        name: "slug",
        description: "Internal ID name (Workspace or Project Slug)",
        type: 3,
        required: true
      },
      {
        name: "parent",
        description: "Parent Workspace ID (Optional, for Projects)",
        type: 3,
        required: false,
        autocomplete: true
      }
    ]
  },
  {
    name: "pref",
    description: "Set preferences at different scopes (Global, Workspace, Project)",
    options: [
      { name: "key", description: "Preference key (e.g., language)", type: 3, required: true },
      { name: "value", description: "Preference value", type: 3, required: true },
      {
        name: "scope",
        description: "Where to apply this preference",
        type: 3,
        required: false,
        choices: [
          { name: "Global", value: "global" },
          { name: "Current Workspace", value: "workspace" },
          { name: "Current Project", value: "project" }
        ]
      }
    ]
  },
  {
    name: "inject",
    description: "Inject data into session OR permanent memory",
    options: [
      { name: "context", description: "Content to inject", type: 3, required: true },
      {
        name: "persist",
        description: "Save to permanent project memory? (Default: false)",
        type: 5,
        required: false
      }
    ]
  },
  {
    name: "save",
    description: "Archive session to Confluence with context auto-grouping",
    options: [
      { name: "space", description: "Confluence Space Key (Default: AI)", type: 3, required: false },
      { name: "title", description: "Document title", type: 3, required: false }
    ]
  },
  {
    name: "ping",
    description: "Check system health and status",
  },
  {
    name: "chat",
    description: "Talk to the alikuxac AI Assistant",
    options: [
      {
        name: "message",
        description: "Your message to the AI",
        type: 3,
        required: true
      }
    ]
  },
  {
    name: "summarize",
    description: "Generate an executive summary of the current session",
  },
  {
    name: "info",
    description: "View detailed information about current Session, Model, and Agent",
  },
  {
    name: "gateway",
    description: "Manual control for Discord AI Gateway status",
    options: [
      {
        name: "action",
        description: "Action to perform",
        type: 3,
        required: true,
        choices: [
          { name: "Connect (Force Online)", value: "connect" },
          { name: "Disconnect (Go Offline)", value: "disconnect" },
          { name: "Status (Check state)", value: "status" }
        ]
      }
    ]
  },
  {
    name: "workspace",
    description: "Manage high-level Workspaces (Parent Projects)",
    options: [
      {
        name: "list",
        description: "List all existing workspaces",
        type: 1
      },
      {
        name: "create",
        description: "Create a new organization/workspace",
        type: 1,
        options: [
          { name: "name", description: "Workspace Name", type: 3, required: true }
        ]
      },
      {
        name: "switch",
        description: "Switch active workspace (Auto-picks latest project)",
        type: 1,
        options: [
          { name: "id", description: "Workspace ID", type: 3, required: true, autocomplete: true }
        ]
      }
    ]
  },
  {
    name: "project",
    description: "Manage granular Projects (Child tasks)",
    options: [
      {
        name: "list",
        description: "List projects in current or specified workspace",
        type: 1,
        options: [
          { name: "workspace", description: "Target Workspace ID", type: 3, required: false, autocomplete: true }
        ]
      },
      {
        name: "create",
        description: "Create a new project/task",
        type: 1,
        options: [
          { name: "name", description: "Project Name", type: 3, required: true },
          { name: "workspace", description: "Parent Workspace ID (Default: Current)", type: 3, required: false, autocomplete: true }
        ]
      },
      {
        name: "switch",
        description: "Switch active project context",
        type: 1,
        options: [
          { name: "id", description: "Project ID", type: 3, required: true, autocomplete: true }
        ]
      }
    ]
  }
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(COMMANDS),
  });

  if (response.ok) {
    console.log("✅ Slash Commands registered successfully!");
    const data = await response.json();
    console.log(data);
  } else {
    console.error("❌ Registration failed:", await response.text());
  }
}

registerCommands();
