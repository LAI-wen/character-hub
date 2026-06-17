-- User preferences blob: commission, privacy, notifications
ALTER TABLE users ADD COLUMN preferences_json TEXT NOT NULL DEFAULT '{}';
