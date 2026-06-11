# CharacterHub Schema Draft

Status: draft. Do not implement migrations until this is reviewed.

## Tables To Add Or Replace

```txt
project_memberships(id, project_id, user_id, role, status, created_at, updated_at)
project_invites(id, project_id, token_hash, created_by, expires_at, revoked_at, created_at)
project_feature_settings(id, project_id, feature_key, enabled, settings_json, created_at, updated_at)

characters(id, owner_user_id, slug, name, rom, species, tagline, accent_color, display_mode, visibility, created_at, updated_at)
character_profiles(character_id, profile_fields_json)
character_swatches(id, character_id, name, rom, hex, note, group_name, sort_order)
character_checklist_items(id, character_id, kind, text, text_en, sort_order)
character_license_items(id, character_id, label, label_en, decision, sort_order)

project_character_links(id, project_id, character_id, owner_user_id, status, faction, role_label, tags_json, template_version_id, archived_at, created_at, updated_at)
character_templates(id, project_id, version, created_at, updated_at)
template_fields(id, template_id, field_type, name, help, required, visibility, options_json, sort_order)
project_field_values(id, project_character_link_id, field_id, value_json, updated_at)
character_applications(id, project_id, character_id, submitter_user_id, status, note, reviewed_by, reviewed_at, created_at, updated_at)

worldview_entries(id, owner_user_id, project_id, parent_id, slug, name, en_name, type, blurb, setting, visibility, created_at, updated_at)
worldview_entry_character_links(id, entry_id, character_id)
worldview_entry_relations(id, entry_id, target_entry_id, kind)
stories(id, owner_user_id, project_id, title, slug, status, visibility, created_at, updated_at)
story_chapters(id, story_id, title, body, sort_order, status, created_at, updated_at)
story_publications(id, story_id, published_at, visibility, created_at, updated_at)

relationships(id, project_id, source_type, source_id, target_type, target_id, label, style, source_label, target_label, description, created_at, updated_at)
relationship_timeline_items(id, relationship_id, when_label, body, sort_order)
relationship_groups(id, project_id, name, color, description, created_at, updated_at)
relationship_group_members(id, group_id, entity_type, entity_id)
relationship_layout_nodes(id, project_id, entity_type, entity_id, x, y, is_center, updated_at)

assets(id, owner_user_id, project_id, r2_key, original_name, mime_type, size_bytes, width, height, visibility, created_at)
asset_links(id, asset_id, target_type, target_id, category, caption, sort_order)
image_markers(id, asset_id, target_type, target_id, marker_type, x, y, w, h, label, sort_order)

ideas(id, project_id, owner_user_id, body, kind, tags_json, status, created_at, updated_at)
wishlist_items(id, project_id, owner_user_id, title, description, priority, budget, status, created_at, updated_at)
commissions(id, character_id, owner_user_id, title, artist, status, due_date, budget, usage, spec, ref_link, description, share_token_hash, created_at, updated_at)
commission_refs(id, commission_id, asset_id, label, sort_order)
commission_ref_markers(id, commission_ref_id, marker_type, x, y, w, h, label, sort_order)

content_submissions(id, project_id, submitter_user_id, submitter_name, submitter_handle, type, title, note, target_type, target_id, status, reviewed_by, reviewed_at, approved_action_json, created_at)
content_submission_values(id, submission_id, field_id, value_json)
content_submission_assets(id, submission_id, asset_id)

user_favorites(id, user_id, entity_type, entity_id, created_at)
recent_activity(id, user_id, entity_type, entity_id, visited_at)
activity_events(id, project_id, actor_user_id, event_type, target_type, target_id, summary, created_at)
audit_logs(id, actor_user_id, project_id, action, target_type, target_id, metadata_json, created_at)
```

## Index Needs

- `project_feature_settings(project_id, feature_key)`
- `project_memberships(user_id, project_id)`
- `project_character_links(project_id, status)`
- `project_character_links(project_id, character_id)`
- `project_field_values(project_character_link_id, field_id)`
- `character_applications(project_id, status, created_at)`
- `characters(owner_user_id, visibility, updated_at)`
- `worldview_entries(project_id, type, parent_id)`
- `relationships(project_id, source_type, source_id)`
- `relationships(project_id, target_type, target_id)`
- `assets(owner_user_id, project_id, visibility)`
- `content_submissions(project_id, status, created_at)`
- Search indexes or generated normalized columns for character/worldview/story titles.

## Existing Table Changes To Evaluate

```txt
projects
- add collaboration_mode
- add visibility
- add portal_enabled
- add join_policy
- add submissions_enabled
- add cover_asset_id
- add status
```

Do not model `personal/public/collaborative` as a permanent enum project type. Those are creation presets only.
