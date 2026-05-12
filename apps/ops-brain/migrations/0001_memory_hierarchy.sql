-- Add workspace and project columns to facts table
ALTER TABLE facts ADD COLUMN workspace TEXT DEFAULT 'global';
ALTER TABLE facts ADD COLUMN project TEXT DEFAULT 'general';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_facts_hierarchy ON facts (workspace, project);
