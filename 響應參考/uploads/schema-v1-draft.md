# CharacterHub D1 Schema v1 Draft

Status: draft. Do not create migrations yet.  
Storage target: Cloudflare D1 for relational metadata, R2 for binary assets.  
Conventions:

- IDs are application-generated `TEXT` ids.
- `created_at`, `updated_at`, `archived_at`, `deleted_at`, `reviewed_at`, and `published_at` are ISO-8601 `TEXT`.
- JSON columns are `TEXT` storing JSON. They are marked explicitly below.
- Visibility enums should be checked in application code first; D1 CHECK constraints can be added later.

---

## users

Purpose: account identity/profile root for owned content.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `email TEXT`, `handle TEXT`, `display_name TEXT`, `avatar_asset_id TEXT NULL`, `bio TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `disabled_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `avatar_asset_id -> assets.id` nullable, may be deferred in implementation |
| Indexes | `UNIQUE(email)`, `UNIQUE(handle)`, `idx_users_disabled(disabled_at)` |
| Visibility / permission | User can update self; admin-only disabled state |
| JSON | None |

---

## projects

Purpose: composable creative space. Public display and collaboration are independent capabilities.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `owner_user_id TEXT`, `slug TEXT`, `name TEXT`, `description TEXT`, `cover_asset_id TEXT NULL`, `theme_color TEXT`, `preset TEXT`, `visibility TEXT`, `collaboration_mode TEXT`, `portal_enabled INTEGER`, `join_policy TEXT`, `submissions_enabled INTEGER`, `enabled_features_json TEXT`, `status TEXT`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `owner_user_id -> users.id`, `cover_asset_id -> assets.id` nullable |
| Indexes | `UNIQUE(slug)`, `idx_projects_owner(owner_user_id, archived_at)`, `idx_projects_visibility(visibility, portal_enabled)`, `idx_projects_status(status)` |
| Visibility / permission | `visibility`, `portal_enabled`, `join_policy`, `submissions_enabled`, `status` drive public/workspace access |
| JSON | `enabled_features_json` temporary. May later split to `project_features(project_id, feature_key, enabled, sort_order, settings_json)` |

---

## project_members

Purpose: project role and membership.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `user_id TEXT`, `role TEXT`, `status TEXT`, `permissions_json TEXT NULL`, `invited_by TEXT NULL`, `joined_at TEXT`, `removed_at TEXT NULL`, `created_at TEXT`, `updated_at TEXT` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `user_id -> users.id`, `invited_by -> users.id` |
| Indexes | `UNIQUE(project_id, user_id)`, `idx_project_members_user(user_id, status)`, `idx_project_members_project(project_id, role, status)` |
| Visibility / permission | `role` is `owner`, `host`, `cohost`, `member`, `viewer`; `permissions_json` is an override escape hatch |
| JSON | `permissions_json` temporary; split to `project_member_permissions` if granular roles become complex |

---

## characters

Purpose: account-level character body. A character can exist without any project.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `owner_user_id TEXT`, `slug TEXT`, `name TEXT`, `romaji TEXT NULL`, `nickname TEXT NULL`, `species TEXT NULL`, `summary TEXT NULL`, `avatar_asset_id TEXT NULL`, `visibility TEXT`, `tags_json TEXT NULL`, `general_profile_json TEXT NULL`, `artist_profile_json TEXT NULL`, `writer_profile_json TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `owner_user_id -> users.id`, `avatar_asset_id -> assets.id` nullable |
| Indexes | `UNIQUE(owner_user_id, slug)`, `idx_characters_owner(owner_user_id, archived_at, updated_at)`, `idx_characters_visibility(visibility)` |
| Visibility / permission | Owner can edit body; project host cannot edit body unless owner |
| JSON | `tags_json` and profile JSON are temporary; likely split into `character_tags` and `character_profiles` when editor stabilizes |

---

## project_character_links

Purpose: project-scoped character version and roster state. This must not be merged into `characters`.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `character_id TEXT`, `submitted_by_user_id TEXT NULL`, `status TEXT`, `faction_id TEXT NULL`, `faction_label TEXT NULL`, `project_role TEXT NULL`, `visibility TEXT`, `template_version_id TEXT NULL`, `field_values_json TEXT NULL`, `submitted_at TEXT NULL`, `reviewed_at TEXT NULL`, `reviewed_by_user_id TEXT NULL`, `review_message TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `removed_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `character_id -> characters.id`, `submitted_by_user_id -> users.id`, `reviewed_by_user_id -> users.id` |
| Indexes | `UNIQUE(project_id, character_id)`, `idx_pcl_project_status(project_id, status)`, `idx_pcl_character(character_id)`, `idx_pcl_template(template_version_id)` |
| Visibility / permission | `status`, `visibility`, reviewer fields; owner/host permissions differ by field |
| JSON | `field_values_json` temporary; later split to `project_field_values(project_character_link_id, field_id, value_json)` when templates are versioned |

---

## world_entries

Purpose: project worldbuilding entries.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `parent_id TEXT NULL`, `created_by_user_id TEXT`, `type TEXT`, `slug TEXT`, `title TEXT`, `summary TEXT NULL`, `content TEXT NULL`, `sort_order INTEGER`, `visibility TEXT`, `summary_cache_json TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `parent_id -> world_entries.id`, `created_by_user_id -> users.id` |
| Indexes | `UNIQUE(project_id, slug)`, `idx_world_project_type(project_id, type, archived_at)`, `idx_world_parent(project_id, parent_id, sort_order)`, `idx_world_visibility(project_id, visibility)` |
| Visibility / permission | `visibility`; workspace membership required; `project:view` for reads; `relationship:create/update/delete` for writes |
| JSON | `summary_cache_json` may cache related character/entry names for UI. Source of truth is `entity_links` |

---

## entity_links

Purpose: shared relationship/link model between world entries, characters, story events, assets, and other entities.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `source_type TEXT`, `source_id TEXT`, `target_type TEXT`, `target_id TEXT`, `relation_type TEXT`, `label TEXT NULL`, `sort_order INTEGER`, `created_by_user_id TEXT`, `created_at TEXT`, `updated_at TEXT` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `created_by_user_id -> users.id`; polymorphic source/target validated in application code |
| Indexes | `idx_entity_links_source(project_id, source_type, source_id)`, `idx_entity_links_target(project_id, target_type, target_id)`, `idx_entity_links_relation(project_id, relation_type)` |
| Visibility / permission | Inherits source entity visibility and project permission |
| JSON | None |

---

## stories

Purpose: project story containers.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `created_by_user_id TEXT`, `slug TEXT`, `title TEXT`, `description TEXT NULL`, `status TEXT`, `visibility TEXT`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `created_by_user_id -> users.id` |
| Indexes | `UNIQUE(project_id, slug)`, `idx_stories_project_status(project_id, status, archived_at)`, `idx_stories_visibility(project_id, visibility)` |
| Visibility / permission | `visibility`, `status` |
| JSON | None |

---

## story_chapters

Purpose: ordered story chapter content.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `story_id TEXT`, `title TEXT`, `summary TEXT NULL`, `content TEXT NULL`, `sort_order INTEGER`, `status TEXT`, `visibility TEXT`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `story_id -> stories.id` |
| Indexes | `idx_story_chapters_story(story_id, sort_order)`, `idx_story_chapters_status(story_id, status)` |
| Visibility / permission | Inherits story project; chapter can have draft/published status |
| JSON | None |

---

## story_events

Purpose: timeline events for stories or project history.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `story_id TEXT NULL`, `title TEXT`, `summary TEXT NULL`, `time_label TEXT NULL`, `sort_key TEXT NULL`, `visibility TEXT`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `story_id -> stories.id` nullable |
| Indexes | `idx_story_events_project(project_id, sort_key)`, `idx_story_events_story(story_id, sort_key)`, `idx_story_events_visibility(project_id, visibility)` |
| Visibility / permission | `visibility`; write requires story/project content permission |
| JSON | Entity refs should use `entity_links`, not inline JSON |

---

## assets

Purpose: R2-backed file metadata.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `owner_user_id TEXT`, `r2_key TEXT NULL`, `original_name TEXT NULL`, `mime_type TEXT NULL`, `size_bytes INTEGER NULL`, `width INTEGER NULL`, `height INTEGER NULL`, `title TEXT`, `asset_type TEXT`, `author_name TEXT NULL`, `source_url TEXT NULL`, `visibility TEXT`, `upload_status TEXT`, `created_at TEXT`, `updated_at TEXT`, `deleted_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `owner_user_id -> users.id` |
| Indexes | `UNIQUE(r2_key)`, `idx_assets_owner(owner_user_id, deleted_at)`, `idx_assets_visibility(visibility)`, `idx_assets_type(asset_type)` |
| Visibility / permission | `visibility`, `owner_user_id`, linked project permissions |
| JSON | None |

---

## asset_links

Purpose: links assets to projects, characters, world entries, stories, commissions, etc.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `asset_id TEXT`, `project_id TEXT NULL`, `target_type TEXT`, `target_id TEXT`, `role TEXT`, `caption TEXT NULL`, `sort_order INTEGER`, `visibility TEXT`, `created_at TEXT`, `updated_at TEXT` |
| Primary key | `id` |
| Foreign keys | `asset_id -> assets.id`, `project_id -> projects.id` nullable |
| Indexes | `idx_asset_links_asset(asset_id)`, `idx_asset_links_target(target_type, target_id, role)`, `idx_asset_links_project(project_id, target_type)` |
| Visibility / permission | Link visibility can be stricter than asset visibility; target entity permission applies |
| JSON | None |

---

## relationships

Purpose: graph edges and relationship details between entities.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `source_type TEXT`, `source_id TEXT`, `target_type TEXT`, `target_id TEXT`, `type TEXT`, `label TEXT`, `description TEXT NULL`, `direction TEXT`, `group_id TEXT NULL`, `visibility TEXT`, `album_json TEXT NULL`, `timeline_json TEXT NULL`, `sort_order INTEGER`, `created_by_user_id TEXT`, `created_at TEXT`, `updated_at TEXT`, `deleted_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `created_by_user_id -> users.id`; `group_id` is app-validated in v1 unless relationship groups become a table |
| Indexes | `idx_relationships_project(project_id, deleted_at, sort_order)`, `idx_relationships_source(project_id, source_type, source_id)`, `idx_relationships_target(project_id, target_type, target_id)`, `idx_relationships_group(project_id, group_id)` |
| Visibility / permission | `visibility`; project content permission required for writes |
| JSON | `album_json` and `timeline_json` temporary; can split into `relationship_timeline_items` and asset links later |

---

## relationship_layouts

Purpose: project-scoped relationship graph layout.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `scope TEXT`, `layout_json TEXT`, `updated_by_user_id TEXT`, `created_at TEXT`, `updated_at TEXT` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `updated_by_user_id -> users.id` |
| Indexes | `UNIQUE(project_id, scope)`, `idx_relationship_layouts_project(project_id)` |
| Visibility / permission | Follows project workspace access; `project:view` for read and `relationship:layout` for write |
| JSON | `layout_json` stores project-scoped `nodes`, `labels`, `paths`, and `groups` in v1; current selection, hover, lightbox, and focus are UI-only; Worker skeleton caps JSON at 50KB |
| Visibility / permission | `scope` is `project` in v1; update requires `relationship:layout` |
| JSON | `layout_json` stores nodes, labels, paths, groups. Future user overrides can become `user_relationship_layouts` |

---

## public_pages

Purpose: public page state and builder draft. Builder payload and renderer payload are separate.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `slug TEXT`, `status TEXT`, `draft_json TEXT`, `theme_json TEXT NULL`, `settings_json TEXT NULL`, `published_version_id TEXT NULL`, `updated_by_user_id TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `published_at TEXT NULL`, `unpublished_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `published_version_id -> public_page_versions.id`, `updated_by_user_id -> users.id` |
| Indexes | `UNIQUE(project_id)`, `UNIQUE(slug)`, `idx_public_pages_status(status, published_at)` |
| Visibility / permission | Project visibility + `portal_enabled` + `status` decide renderer availability |
| JSON | `draft_json` stores blocks; `theme_json` and `settings_json` store builder config. Block table intentionally deferred |

---

## public_page_versions

Purpose: immutable published renderer payload snapshots.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `public_page_id TEXT`, `version_number INTEGER`, `payload_json TEXT`, `note TEXT NULL`, `published_by_user_id TEXT`, `published_at TEXT` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `public_page_id -> public_pages.id`, `published_by_user_id -> users.id` |
| Indexes | `UNIQUE(public_page_id, version_number)`, `idx_public_page_versions_project(project_id, published_at)` |
| Visibility / permission | Renderer reads only the selected published version; no builder controls included |
| JSON | `payload_json` is visitor-safe published JSON. Future block table still should publish snapshots |

---

## character_applications

Purpose: character join application flow. Separate from content submissions.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `applicant_user_id TEXT NULL`, `applicant_name TEXT NULL`, `character_id TEXT NULL`, `draft_character_json TEXT NULL`, `field_values_json TEXT NULL`, `message TEXT NULL`, `status TEXT`, `submitted_at TEXT`, `reviewed_at TEXT NULL`, `reviewed_by_user_id TEXT NULL`, `review_message TEXT NULL`, `created_at TEXT`, `updated_at TEXT` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `applicant_user_id -> users.id`, `character_id -> characters.id`, `reviewed_by_user_id -> users.id` |
| Indexes | `idx_character_applications_project(project_id, status, submitted_at)`, `idx_character_applications_applicant(applicant_user_id, status)`, `idx_character_applications_character(character_id)` |
| Visibility / permission | Applicant can view own; host/cohost can review |
| JSON | `draft_character_json`, `field_values_json` temporary; field values may split when templates stabilize |

---

## content_submissions

Purpose: image/text content submission flow. Separate from character applications.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `project_id TEXT`, `submitter_user_id TEXT NULL`, `submitter_name TEXT NULL`, `type TEXT`, `title TEXT`, `message TEXT NULL`, `asset_id TEXT NULL`, `text_content TEXT NULL`, `related_character_ids_json TEXT NULL`, `status TEXT`, `destination_type TEXT NULL`, `destination_id TEXT NULL`, `submitted_at TEXT`, `reviewed_at TEXT NULL`, `reviewed_by_user_id TEXT NULL`, `review_message TEXT NULL`, `created_at TEXT`, `updated_at TEXT` |
| Primary key | `id` |
| Foreign keys | `project_id -> projects.id`, `submitter_user_id -> users.id`, `asset_id -> assets.id`, `reviewed_by_user_id -> users.id` |
| Indexes | `idx_content_submissions_project(project_id, status, submitted_at)`, `idx_content_submissions_type(project_id, type, status)`, `idx_content_submissions_destination(destination_type, destination_id)` |
| Visibility / permission | Submitter can view own; host/cohost can review |
| JSON | `related_character_ids_json` temporary; can split to `content_submission_links` |

Approved submissions must populate `destination_type` and `destination_id`.

---

## wishlist_items

Purpose: account-level wishlist tool. Not a project module.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `owner_user_id TEXT`, `project_id TEXT NULL`, `title TEXT`, `description TEXT NULL`, `type TEXT NULL`, `priority TEXT`, `budget TEXT NULL`, `status TEXT`, `character_ids_json TEXT NULL`, `converted_commission_id TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `owner_user_id -> users.id`, `project_id -> projects.id` nullable, `converted_commission_id -> commissions.id` nullable |
| Indexes | `idx_wishlist_owner(owner_user_id, status, updated_at)`, `idx_wishlist_project(project_id)`, `idx_wishlist_converted(converted_commission_id)` |
| Visibility / permission | Owner-only by default; optional referenced project does not make it project-owned |
| JSON | `character_ids_json` temporary; split to `wishlist_item_links` if filtering grows |

---

## commissions

Purpose: account-level commission tracking. Not forced into project.

| Property | Value |
|---|---|
| Columns | `id TEXT`, `owner_user_id TEXT`, `source_wishlist_id TEXT NULL`, `project_id TEXT NULL`, `character_id TEXT NULL`, `title TEXT`, `creator_name TEXT NULL`, `price TEXT NULL`, `budget TEXT NULL`, `status TEXT`, `payment_status TEXT NULL`, `deadline TEXT NULL`, `progress TEXT NULL`, `links_json TEXT NULL`, `notes TEXT NULL`, `created_at TEXT`, `updated_at TEXT`, `archived_at TEXT NULL` |
| Primary key | `id` |
| Foreign keys | `owner_user_id -> users.id`, `source_wishlist_id -> wishlist_items.id`, `project_id -> projects.id`, `character_id -> characters.id` |
| Indexes | `idx_commissions_owner(owner_user_id, status, updated_at)`, `idx_commissions_source_wishlist(source_wishlist_id)`, `idx_commissions_character(character_id)`, `idx_commissions_project(project_id)` |
| Visibility / permission | Owner-only by default; share links should use a separate share config later |
| JSON | `links_json` temporary; deliverables may later use `asset_links` or `commission_assets` |

---

## Deferred Tables

These are intentionally deferred from v1 D1 draft, but likely later:

- `project_features`
- `character_tags`
- `project_field_values`
- `relationship_timeline_items`
- `content_submission_links`
- `wishlist_item_links`
- `commission_assets`
- `user_preferences`
- `audit_logs`
