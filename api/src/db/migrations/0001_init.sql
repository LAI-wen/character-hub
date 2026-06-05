CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT,
  avatar_url TEXT,
  bio TEXT,
  accent_color TEXT NOT NULL DEFAULT '#2E6F6A',
  social_links TEXT NOT NULL DEFAULT '[]',
  notification_prefs TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sub_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS ocs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  rom TEXT,
  species TEXT,
  tagline TEXT,
  card_color TEXT NOT NULL DEFAULT '#8FA3B0',
  display_mode TEXT NOT NULL DEFAULT 'full',
  avatar_url TEXT,
  cover_image_url TEXT,
  profile_fields TEXT NOT NULL DEFAULT '[]',
  swatches TEXT NOT NULL DEFAULT '[]',
  checklist TEXT NOT NULL DEFAULT '[]',
  license TEXT NOT NULL DEFAULT '[]',
  markers TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'public',
  password_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS oc_media (
  id TEXT PRIMARY KEY,
  oc_id TEXT NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  r2_key TEXT,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oc_relationships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  oc_a_id TEXT NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  oc_b_id TEXT NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(oc_a_id, oc_b_id)
);

CREATE TABLE IF NOT EXISTS worldview_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  en_name TEXT,
  type TEXT,
  blurb TEXT,
  setting TEXT,
  linked_oc_ids TEXT NOT NULL DEFAULT '[]',
  gallery_labels TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS worldview_entry_rels (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES worldview_entries(id) ON DELETE CASCADE,
  target_entry_id TEXT NOT NULL REFERENCES worldview_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  UNIQUE(entry_id, target_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_ocs_user_id ON ocs(user_id);
CREATE INDEX IF NOT EXISTS idx_ocs_project_id ON ocs(project_id);
CREATE INDEX IF NOT EXISTS idx_oc_media_oc_id ON oc_media(oc_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_worldview_user_id ON worldview_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_worldview_project_id ON worldview_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON oc_relationships(user_id);
