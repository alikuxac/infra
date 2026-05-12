-- Migration: Initialize Ops AI D1 Schema
CREATE TABLE IF NOT EXISTS conversations (
    session_id TEXT PRIMARY KEY,
    history TEXT,
    metadata TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT,
    platform TEXT,
    preferences TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, platform)
);

CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    platform TEXT,
    tokens_used INTEGER,
    neurons_estimated REAL,
    model_id TEXT,
    action_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    namespace TEXT, -- 'brand', 'personal', 'technical', 'general'
    content TEXT,
    workspace TEXT DEFAULT 'global',
    project TEXT DEFAULT 'general',
    importance INTEGER DEFAULT 1,
    metadata TEXT, -- JSON extra data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facts_hierarchy ON facts (workspace, project);

CREATE TABLE IF NOT EXISTS research_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    channel_id TEXT,
    platform TEXT,
    goal TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    summary TEXT,
    result_context TEXT, -- JSON array of source snippets or URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT,
    query TEXT,
    result TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(task_id) REFERENCES research_tasks(id)
);

-- LAYER 1.6: Recipes (Learned Workflows)
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    steps JSON NOT NULL, -- Array of { tool: string, args: any }
    success_count INTEGER DEFAULT 1,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LAYER 5: Task Delegation & Scheduling
CREATE TABLE IF NOT EXISTS delegated_tasks (
    id TEXT PRIMARY KEY,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL, -- 'seo_audit', 'uptime_check', 'deep_research', etc.
    cron_schedule TEXT NOT NULL, -- CRON expression or human readable
    payload JSON, -- tool arguments
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
    last_run DATETIME,
    next_run DATETIME,
    user_id TEXT,
    channel_id TEXT,
    platform TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
