-- WARNING: THIS WILL WIPE ALL DATA IN THE SYSTEM
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS facts;
DROP TABLE IF EXISTS research_tasks;
DROP TABLE IF EXISTS research_queries;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS delegated_tasks;
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS memory_blocks;

-- Re-initialize all tables from schema.sql
CREATE TABLE conversations (
    session_id TEXT PRIMARY KEY,
    history TEXT,
    metadata TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id TEXT,
    platform TEXT,
    preferences TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, platform)
);

CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    platform TEXT,
    tokens_used INTEGER,
    neurons_estimated REAL,
    model_id TEXT,
    action_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facts (
    id TEXT PRIMARY KEY,
    namespace TEXT, 
    content TEXT,
    workspace TEXT DEFAULT 'global',
    project TEXT DEFAULT 'general',
    importance INTEGER DEFAULT 1,
    metadata TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facts_hierarchy ON facts (workspace, project);

CREATE TABLE research_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    channel_id TEXT,
    platform TEXT,
    goal TEXT,
    status TEXT DEFAULT 'pending',
    summary TEXT,
    result_context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE research_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT,
    query TEXT,
    result TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(task_id) REFERENCES research_tasks(id)
);

CREATE TABLE recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    steps JSON NOT NULL,
    success_count INTEGER DEFAULT 1,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delegated_tasks (
    id TEXT PRIMARY KEY,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    cron_schedule TEXT NOT NULL,
    payload JSON,
    status TEXT DEFAULT 'active',
    last_run DATETIME,
    next_run DATETIME,
    user_id TEXT,
    channel_id TEXT,
    platform TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT
);

CREATE INDEX idx_logs_timestamp ON system_logs (timestamp);

CREATE TABLE memory_blocks (
    id TEXT PRIMARY KEY, 
    persona TEXT,
    content TEXT NOT NULL,
    last_refined DATETIME DEFAULT CURRENT_TIMESTAMP,
    refinement_reason TEXT
);

-- Re-seed initial identity
INSERT INTO memory_blocks (id, persona, content, refinement_reason) VALUES 
('global_brand', null, 'Target: alikuxac.xyz brand empire. Core values: Efficiency, Privacy, Premium aesthetics.', 'Fresh start'),
('executive_protocols', 'executive', 'Protocols: Summarize all meetings, prioritize high-impact business tasks.', 'Fresh start'),
('technical_manual', 'planner', 'Guidelines: Use TypeScript, Alpine images for Docker, Cloudflare D1 for DB.', 'Fresh start');
