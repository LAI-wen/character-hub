-- Local-only seed for Backend Skeleton v1.
-- Do not run this against production.

INSERT OR IGNORE INTO users (
  id,
  email,
  handle,
  display_name,
  avatar_asset_id,
  bio,
  created_at,
  updated_at,
  disabled_at
) VALUES (
  'demo-user',
  'demo@characterhub.local',
  'demo',
  'Demo User',
  NULL,
  'Local demo workspace account',
  datetime('now'),
  datetime('now'),
  NULL
);
