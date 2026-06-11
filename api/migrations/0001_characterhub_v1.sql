-- CharacterHub Backend Skeleton v1 local-only D1 draft.
-- Do not run this against production. The existing legacy schema still uses OC-era
-- tables such as ocs/worldview_entries; this draft follows docs/productization/schema-v1-draft.md.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  bio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_disabled ON users(disabled_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  cover_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  theme_color TEXT NOT NULL DEFAULT '#8FA3B0',
  preset TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  collaboration_mode TEXT NOT NULL DEFAULT 'solo',
  portal_enabled INTEGER NOT NULL DEFAULT 0,
  join_policy TEXT NOT NULL DEFAULT 'closed',
  submissions_enabled INTEGER NOT NULL DEFAULT 0,
  enabled_features_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility, portal_enabled);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  permissions_json TEXT,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  joined_at TEXT NOT NULL,
  removed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id, role, status);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  romaji TEXT,
  nickname TEXT,
  species TEXT,
  summary TEXT,
  avatar_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  tags_json TEXT,
  general_profile_json TEXT,
  artist_profile_json TEXT,
  writer_profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(owner_user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_characters_owner ON characters(owner_user_id, archived_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_characters_visibility ON characters(visibility);

CREATE TABLE IF NOT EXISTS project_character_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  submitted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  faction_id TEXT,
  faction_label TEXT,
  project_role TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  template_version_id TEXT,
  field_values_json TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  removed_at TEXT,
  UNIQUE(project_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_pcl_project_status ON project_character_links(project_id, status);
CREATE INDEX IF NOT EXISTS idx_pcl_character ON project_character_links(character_id);
CREATE INDEX IF NOT EXISTS idx_pcl_template ON project_character_links(template_version_id);

CREATE TABLE IF NOT EXISTS world_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES world_entries(id) ON DELETE SET NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private',
  summary_cache_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(project_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_world_project_type ON world_entries(project_id, type, archived_at);
CREATE INDEX IF NOT EXISTS idx_world_parent ON world_entries(project_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_world_visibility ON world_entries(project_id, visibility);

CREATE TABLE IF NOT EXISTS entity_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_links_source ON entity_links(project_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_target ON entity_links(project_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_relation ON entity_links(project_id, relation_type);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(project_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_stories_project_status ON stories(project_id, status, archived_at);
CREATE INDEX IF NOT EXISTS idx_stories_visibility ON stories(project_id, visibility);

CREATE TABLE IF NOT EXISTS story_chapters (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_chapters_story ON story_chapters(story_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_story_chapters_status ON story_chapters(story_id, status);

CREATE TABLE IF NOT EXISTS story_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  time_label TEXT,
  sort_key TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_events_project ON story_events(project_id, sort_key);
CREATE INDEX IF NOT EXISTS idx_story_events_story ON story_events(story_id, sort_key);
CREATE INDEX IF NOT EXISTS idx_story_events_visibility ON story_events(project_id, visibility);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key TEXT UNIQUE,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  title TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  author_name TEXT,
  source_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  upload_status TEXT NOT NULL DEFAULT 'metadata_only',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_assets_visibility ON assets(visibility);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);

CREATE TABLE IF NOT EXISTS asset_links (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  role TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_links_asset ON asset_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_links_target ON asset_links(target_type, target_id, role);
CREATE INDEX IF NOT EXISTS idx_asset_links_project ON asset_links(project_id, target_type);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  direction TEXT NOT NULL DEFAULT 'undirected',
  group_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  album_json TEXT,
  timeline_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships(project_id, deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(project_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(project_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_group ON relationships(project_id, group_id);

CREATE TABLE IF NOT EXISTS relationship_layouts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'project',
  layout_json TEXT NOT NULL DEFAULT '{}',
  updated_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_relationship_layouts_project ON relationship_layouts(project_id);

CREATE TABLE IF NOT EXISTS public_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disabled',
  draft_json TEXT NOT NULL DEFAULT '{}',
  theme_json TEXT,
  settings_json TEXT,
  published_version_id TEXT REFERENCES public_page_versions(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  unpublished_at TEXT,
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_public_pages_status ON public_pages(status, published_at);

CREATE TABLE IF NOT EXISTS public_page_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  public_page_id TEXT NOT NULL REFERENCES public_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  note TEXT,
  published_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_at TEXT NOT NULL,
  UNIQUE(public_page_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_public_page_versions_project ON public_page_versions(project_id, published_at);

CREATE TABLE IF NOT EXISTS character_applications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applicant_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  applicant_name TEXT,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  draft_character_json TEXT,
  field_values_json TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_character_applications_project ON character_applications(project_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_character_applications_applicant ON character_applications(applicant_user_id, status);
CREATE INDEX IF NOT EXISTS idx_character_applications_character ON character_applications(character_id);

CREATE TABLE IF NOT EXISTS content_submissions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitter_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitter_name TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  text_content TEXT,
  related_character_ids_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  destination_type TEXT,
  destination_id TEXT,
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_submissions_project ON content_submissions(project_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_content_submissions_type ON content_submissions(project_id, type, status);
CREATE INDEX IF NOT EXISTS idx_content_submissions_destination ON content_submissions(destination_type, destination_id);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  budget TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  character_ids_json TEXT,
  converted_commission_id TEXT REFERENCES commissions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_wishlist_owner ON wishlist_items(owner_user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_project ON wishlist_items(project_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_converted ON wishlist_items(converted_commission_id);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_wishlist_id TEXT REFERENCES wishlist_items(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  creator_name TEXT,
  price TEXT,
  budget TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT,
  deadline TEXT,
  progress TEXT,
  links_json TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_commissions_owner ON commissions(owner_user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_commissions_source_wishlist ON commissions(source_wishlist_id);
CREATE INDEX IF NOT EXISTS idx_commissions_character ON commissions(character_id);
CREATE INDEX IF NOT EXISTS idx_commissions_project ON commissions(project_id);
