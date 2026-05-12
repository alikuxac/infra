-- Migration: Add System Logs for Dashboard Audit Trail
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL, -- 'INFO', 'WARN', 'ERROR'
    message TEXT NOT NULL,
    context TEXT -- JSON detail
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs (timestamp);
