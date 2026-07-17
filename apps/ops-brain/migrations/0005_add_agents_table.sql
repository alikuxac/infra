-- Migration: Add agents table and seed initial agents
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'ops' | 'growth' | 'lifestyle' | 'executive'
    workspace_id TEXT,
    status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'paused'
    config TEXT, -- JSON configuration string
    env TEXT DEFAULT 'production',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_agents_env ON agents(env);
CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);

-- Seed initial agents
INSERT OR IGNORE INTO agents (id, name, description, type, status, config) VALUES 
('agent-ops', 'Ops Agent', 'Manages system operations, deployments, and infrastructure tasks.', 'ops', 'active', '{"platforms":["discord"],"log_level":"info"}'),
('agent-growth', 'Growth Agent', 'Analyzes product metrics, user growth, and marketing automations.', 'growth', 'active', '{"platforms":["discord"],"log_level":"info"}'),
('agent-lifestyle', 'Lifestyle Agent', 'Handles personal productivity, calendar management, and daily reports.', 'lifestyle', 'active', '{"platforms":["discord"],"log_level":"info"}'),
('agent-executive', 'Executive Agent', 'Orchestrates high-level business decisions, planning, and task delegations.', 'executive', 'active', '{"platforms":["discord"],"log_level":"info"}');
