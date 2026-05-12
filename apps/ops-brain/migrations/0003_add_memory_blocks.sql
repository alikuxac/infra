-- Migration: Add Memory Blocks for Self-Improving AI Identity
CREATE TABLE IF NOT EXISTS memory_blocks (
    id TEXT PRIMARY KEY, 
    persona TEXT, -- 'planner', 'marketing', 'executive', null for global
    content TEXT NOT NULL,
    last_refined DATETIME DEFAULT CURRENT_TIMESTAMP,
    refinement_reason TEXT
);

-- Seed initial blocks
INSERT OR IGNORE INTO memory_blocks (id, persona, content, refinement_reason) VALUES 
('global_brand', null, 'Target: alikuxac.xyz brand empire. Core values: Efficiency, Privacy, Premium aesthetics.', 'Initial setup'),
('executive_protocols', 'executive', 'Protocols: Summarize all meetings, prioritize high-impact business tasks.', 'Initial setup'),
('technical_manual', 'planner', 'Guidelines: Use TypeScript, Alpine images for Docker, Cloudflare D1 for DB.', 'Initial setup');
