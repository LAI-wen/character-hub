# CharacterHub Productization Domain Model

Status: draft.

## Principle

Do not collapse all content into one generic `entities` table. Keep durable domain tables specific, and expose a common `EntityRef` projection for linking, search, mentions, hover cards, recent activity, and relationship maps.

Projects are composable creative spaces. Public display and multi-user management are independent capabilities, not one combined "public/collab project type".

## Project Capability Model

```txt
Project
- collaboration_mode: solo | collaborative
- visibility: private | unlisted | public
- portal_enabled: boolean
- join_policy: closed | invite | application | open
- submissions_enabled: boolean
- enabled_features: string[]
```

Creation presets should only set initial values. The owner can later enable or disable features.

| Preset | Initial Configuration |
| --- | --- |
| Personal organization | private, solo, no public portal, no participants, no submissions |
| Public showcase | public or unlisted, solo, public portal enabled, no role/submission management |
| Collaborative project | solo/collaborative configurable, members enabled, template/roster/applications/submissions available |

This means the sidebar, API permissions, and settings page must be generated from project capabilities plus the current user's permission set.

## EntityRef

```txt
EntityRef
- entity_type: character | worldview_entry | story | event | organization | asset | relationship_group
- entity_id
- project_id nullable
- owner_user_id nullable
- title
- subtitle nullable
- color nullable
- visibility
```

## Core Domains

```txt
users
projects
project_memberships
project_invites
project_feature_settings

characters
character_profiles
character_swatches
character_checklist_items
character_license_items
character_visibility

project_character_links
character_templates
template_fields
project_field_values
character_applications

worldview_entries
worldview_entry_character_links
worldview_entry_relations
stories
story_chapters
story_publications

relationships
relationship_timeline_items
relationship_groups
relationship_group_members
relationship_layout_nodes

assets
asset_links
image_markers

ideas
wishlist_items
commissions
commission_refs
commission_ref_markers
content_submissions
content_submission_assets
content_submission_values

user_favorites
recent_activity
activity_events
audit_logs
notifications
```

## Key Modeling Decisions

- A character belongs to a creator, not necessarily to a project.
- A project includes a character through `project_character_links`.
- Project-specific character data lives on a `project_character_link` and its field values, not in the character core record.
- `ProjectCharacterLink` is the source of truth for project roster status, faction, project role, template version, and project-scoped field values.
- Worldview entries may belong to one or more project scopes and can link to characters.
- Relationships should point to `EntityRef` endpoints, not only `oc_a_id` and `oc_b_id`.
- Assets are general and linked to characters, projects, submissions, commissions, relationships, or worldview entries through `asset_links`.
- Host-only data must be modeled with visibility and permission checks, not merely hidden in frontend UI.
- Account-level tools such as wishlist, commissions, height comparison, global character library, and global search should not be forced into every project. They can optionally filter by project.
- Applications and content submissions share review UI, but they have different domain results:
  - Character application approval creates or updates a `project_character_link`.
  - Image submission approval creates or links an `asset`.
  - Story/text submission approval creates or links a `story`, `story_chapter`, or `story_publication`.
