-- Migration 0003: relationship_groups + relationship perspective fields
-- Needed for v2 UI: asymmetric views, directional edge style, group hulls

-- New fields on relationships
ALTER TABLE relationships ADD COLUMN src_view TEXT;         -- A 眼中的 B
ALTER TABLE relationships ADD COLUMN tgt_view TEXT;         -- B 眼中的 A
ALTER TABLE relationships ADD COLUMN map_style TEXT NOT NULL DEFAULT 'line'; -- 'line' | 'arrows'

-- New table: named groups / circles drawn as hulls on the map
CREATE TABLE IF NOT EXISTS relationship_groups (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#A67F0E',
  description TEXT,
  -- JSON array of entity IDs (character IDs or world_entry IDs)
  member_ids_json TEXT NOT NULL DEFAULT '[]',
  -- JSON array of [time_label TEXT, event TEXT] tuples
  timeline_json   TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rel_groups_project
  ON relationship_groups(project_id, sort_order);

-- Ensure existing group_id FK is consistent (no CASCADE needed — soft reference)
-- relationships.group_id already exists and references relationship_groups.id informally
