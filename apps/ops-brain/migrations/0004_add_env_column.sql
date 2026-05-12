-- Migration: Add env column and missing tables for environment isolation
-- Support for production, staging, dev environments on a single D1 database

-- I. CREATE MISSING TABLES IF THEY DON'T EXIST
-- 1. context_mappings
CREATE TABLE IF NOT EXISTS context_mappings (
    platform TEXT,
    external_id TEXT,
    internal_type TEXT, -- 'workspace' | 'project'
    internal_id TEXT,
    env TEXT DEFAULT 'production',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (platform, external_id)
);
CREATE INDEX IF NOT EXISTS idx_context_mappings_env ON context_mappings(env);

-- 2. workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    env TEXT DEFAULT 'production',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workspaces_env ON workspaces(env);

-- 3. projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    env TEXT DEFAULT 'production',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_projects_env ON projects(env);

-- II. ADD env COLUMN TO EXISTING TABLES
-- Use a pattern that handles if the column already exists (D1 doesn't have IF NOT EXISTS for columns, but we'll try to apply this file directly)

-- 4. conversations
ALTER TABLE conversations ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_conversations_env ON conversations(env);

-- 5. user_profiles
ALTER TABLE user_profiles ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_user_profiles_env ON user_profiles(env);

-- 6. usage_logs
ALTER TABLE usage_logs ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_usage_logs_env ON usage_logs(env);

-- 7. facts
ALTER TABLE facts ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_facts_env ON facts(env);

-- 8. research_tasks
ALTER TABLE research_tasks ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_research_tasks_env ON research_tasks(env);

-- 9. recipes
ALTER TABLE recipes ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_recipes_env ON recipes(env);

-- 10. delegated_tasks
ALTER TABLE delegated_tasks ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_env ON delegated_tasks(env);

-- 11. system_logs
ALTER TABLE system_logs ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_system_logs_env ON system_logs(env);

-- 12. memory_blocks
ALTER TABLE memory_blocks ADD COLUMN env TEXT DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_memory_blocks_env ON memory_blocks(env);
