-- user_profiles: Lưu trữ sở thích và cấu hình cá nhân của người dùng
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'discord' | 'telegram'
  preferences TEXT DEFAULT '{}', -- JSON string: { language, style, code_pref, etc. }
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, platform)
);

-- usage_logs: Lưu trữ số lượng Neuron sử dụng để thống kê
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  neurons_estimated REAL DEFAULT 0,
  model_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'chat' | 'embedding' | 'summary'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- conversations: Lưu trữ lịch sử chat cho các nền tảng stateless (như Telegram)
CREATE TABLE IF NOT EXISTS conversations (
  session_id TEXT PRIMARY KEY, -- format: {platform}_{user_id}_{chat_id}
  history TEXT DEFAULT '[]', -- JSON string of CoreMessage[]
  metadata TEXT DEFAULT '{}', -- JSON string for persona, settings, etc.
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
