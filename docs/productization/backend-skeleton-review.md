# Backend Skeleton Review + Migration Strategy Decision

Status: review fix v1  
Scope: Backend Skeleton v1 under `api/src/app/*` and local-only D1 draft `api/migrations/0001_characterhub_v1.sql`.  
Decision: do not connect frontend repositories yet; do not deploy; do not run remote migrations.

---

## Review Fix v1 Summary

Fixed in this pass:

- Demo auth headers are local/demo/test only. Non-local `/api/app` requests now reject `X-Demo-User-Id` / `X-Demo-Username` and require the future production session path.
- `requirePermission()` now enforces a minimal role matrix instead of always returning true.
- `/api/app/projects/:id` now requires workspace membership; public visitor payloads remain reserved for `/api/public/projects/:slug`.
- Project PATCH now checks field-level permissions: content fields use `project:update`, settings use `project:manage_settings`, visibility/public availability uses `project:publish`.
- Project create now batches project, owner membership, and public page draft writes.
- Character create with `projectId` now batches character body and ProjectCharacterLink writes.
- WorldEntry create/update now batch entry and `entity_links` writes.
- WorldEntry parent validation now walks the parent chain to prevent cycles such as `A -> B -> C -> A`.
- WorldEntry archive now removes source/target entity links in the same batch.
- CORS no longer reflects arbitrary origins with credentials.
- Local-only seed added at `api/seeds/local-demo.sql`.
- API docs now clarify that `/projects/:projectId/characters/:linkId` uses ProjectCharacterLink id, not Character id.

Still intentionally not fixed:

- Production HttpOnly cookie session is not implemented.
- Public renderer remains 501.
- Collaboration/Application routes remain 501.
- Story/Gallery/Relationship/Wishlist/Commission routes remain 501.
- Forward migration from legacy schema is not implemented.

Production blockers:

- Replace demo auth with HttpOnly cookie session and CSRF strategy before exposing `/api/app`.
- Finalize exact production CORS origins and avoid allowing localhost outside local/demo/test.
- Reconcile auth schema before clean v1 DB reset; current legacy auth router expects legacy `users`.
- Decide whether `POST /api/app/characters` stays a compound character+project-link endpoint or becomes body-only.
- Consolidate migration locations/scripts before remote D1 migration.

Legacy schema strategy remains: use clean v1 DB reset or new v1 D1 database; do not use current draft as forward migration against the existing OC-era database.

---

## Executive Decision

Use a clean v1 D1 database reset for the next backend stage, preferably as a new D1 database binding or a clearly reset local/staging database, not as an `IF NOT EXISTS` forward migration over the current OC-era schema.

Reason:

- The old schema models `ocs`, `worldview_entries`, and `projects.user_id`; v1 routes expect `characters`, `world_entries`, `project_character_links`, and `projects.owner_user_id`.
- Applying the v1 draft on top of an existing old database would leave old `users` and `projects` tables untouched because the migration uses `CREATE TABLE IF NOT EXISTS`, so new routes would fail on missing columns.
- The product model changed enough that a forward migration would need table rebuilds, backfill rules, slug conflict policy, timestamp conversion, visibility conversion, and auth compatibility work.

Forward migration should be deferred until the v1 schema and API are stable. If remote D1 already contains valuable data, export/backup first and design a separate data migration plan.

---

## 1. API Contract vs Route Response

Mostly aligned for the first implemented CRUD chain.

| Area | Contract | Current route | Status |
|---|---|---|---|
| Project list | `{ projects, nextCursor }` | `GET /api/app/projects` returns `{ projects, nextCursor }` | OK |
| Project detail | `{ project, viewerRole, stats }` | `GET /api/app/projects/:projectId` returns that shape | OK |
| Project create | `{ project, membership }` | `POST /api/app/projects` returns that shape | OK |
| Project update | `{ project, navigation }` | `PATCH /api/app/projects/:projectId` returns that shape | OK |
| Character list | `{ characters, nextCursor }` | `GET /api/app/characters` returns that shape | OK |
| Character detail | `{ character, projectLink }` | `GET /api/app/characters/:characterId` returns that shape | OK |
| Character create | `{ character, projectLink, application }` | `POST /api/app/characters` returns that shape | OK, but see boundary note below |
| Character update | `{ character }` | `PATCH /api/app/characters/:characterId` returns that shape | OK |
| WorldEntry list | `{ entries, entityLinks, nextCursor }` | `GET /api/app/projects/:projectId/world-entries` returns that shape | OK |
| WorldEntry create/update | `{ entry, entityLinks }` | create/update return that shape | OK |
| Public renderer | `/api/public/projects/:slug` | returns 501 | OK for skeleton |

Gaps to decide before wiring frontend:

- `GET /api/app/projects/:projectId/characters` returns `{ roster, nextCursor }`, but `api-contract-v1.md` mainly defines project-scoped character listing through `GET /api/app/characters?projectId=...`. Keep both only if the contract explicitly names the roster endpoint as `ProjectCharacterLink`/roster API.
- `POST /api/app/characters` currently accepts optional `projectId`, `projectRole`, `factionId`, `factionLabel`, and `fieldValues`. It stores these in `project_character_links` or `character_applications`, not in `characters`, but this makes the endpoint a compound Character + optional project-link workflow.
- `POST /api/app/characters` can create a `character_applications` row when join policy is `application`, while Collaboration routes are otherwise 501. That is contract-compatible with `CharacterRepository.createCharacter(input)`, but it is a partial collaboration write and should be intentionally kept or moved to `CollaborationRepository.submitCharacterApplication`.

---

## 2. 501 Error Shape

All new skeleton routes use the shared `notImplemented()` helper, which returns:

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "RepositoryName is not implemented in Backend Skeleton v1"
  }
}
```

Covered 501 routes:

- `StoryRepository`
- `GalleryRepository`
- `PublicPageRepository`
- `RelationshipRepository`
- `CollaborationRepository`
- `CommissionRepository`
- public renderer `PublicPageRepository.publicRenderer`

Status: OK.

Note: legacy `/api/v1/commissions/*` also returns an error object, but it is outside this v1 app skeleton.

---

## 3. CRUD Validation

Basic validation exists through Zod schemas and shared `validateJson()`.

| Area | Current validation | Gaps |
|---|---|---|
| Project create/update | required name, preset enum, visibility enum, collaboration enum, join policy enum, booleans | `enabledFeatures` accepts arbitrary strings; capability combinations are not domain-validated |
| Character create | required name, visibility enum, string max lengths, tags array | `projectId` is just string; no strict entity id format yet because demo IDs are not UUID-only |
| Character update | body fields only, profile JSON objects, visibility enum | no stale version / optimistic lock |
| ProjectCharacterLink create/update | status enum, visibility enum, project fields only | `fieldValues` shape not validated against a template version |
| WorldEntry create/update | type/title required on create, visibility enum, parent self-check on update | parent cycle check is only one level; related IDs existence is not fully validated |
| Pagination | `limit` integer 1-100 | `cursor` is not implemented yet |

Status: acceptable for skeleton, not production-ready.

---

## 4. Character Body Boundary

`PATCH /api/app/characters/:characterId` does not accept `projectRole`, `faction`, `status`, or `fieldValues`. It only maps character body fields into `characters`.

Status for update endpoint: OK.

Important nuance:

- `POST /api/app/characters` accepts `projectRole`, `factionId`, `factionLabel`, and `fieldValues` only for the optional project-link/application workflow.
- It does not insert those fields into `characters`.
- It does not accept `status`.

Recommendation:

- If strict separation is preferred, change v1 contract so `POST /api/app/characters` creates only a global character, and require `POST /api/app/projects/:projectId/characters` or `POST /api/app/projects/:projectId/applications/characters` for project-scoped data.
- If ergonomic one-step creation is preferred, keep the current contract but document it as a compound endpoint that returns `character` and `projectLink` separately.

---

## 5. ProjectCharacterLink Boundary

The project character endpoints only operate on project-scoped fields:

- `status`
- `factionId`
- `factionLabel`
- `projectRole`
- `visibility`
- `templateVersionId`
- `fieldValues`
- `reviewMessage`

They do not update character body fields such as name, species, summary, avatar, or profiles.

Status: OK.

---

## 6. WorldEntry Entity Links and Transaction Requirement

Current behavior:

- `relatedCharacterIds` are written to `entity_links` with `source_type = "world_entry"` and `target_type = "character"`.
- `relatedEntryIds` are written to `entity_links` with `source_type = "world_entry"` and `target_type = "world_entry"`.
- `entity_links` is therefore being used as the source of truth, as intended.

Fixed:

- WorldEntry create/update now use D1 `batch()` for the entry mutation plus link replacement statements.
- Cloudflare D1 documents `D1Database.batch()` as executing prepared statements sequentially and rolling back the whole sequence if a statement fails, so it is the right primitive for this stage.
- Parent cycles are checked before the batch.
- Related character and world-entry references are validated before replacing links.

Related issue:

- `GET /world-entries` now filters `entity_links` through non-archived `world_entries`.
- WorldEntry archive removes source/target `entity_links` in the same batch.

---

## 7. DELETE Route Behavior

Implemented delete routes:

| Route | Current behavior | Recommendation |
|---|---|---|
| `DELETE /api/app/projects/:projectId/characters/:linkId` | soft remove via `removed_at`, `status = "removed"` | keep soft delete |
| `DELETE /api/app/projects/:projectId/world-entries/:entryId` | soft archive via `archived_at` | keep soft archive, but clean/filter `entity_links` |

Not implemented yet:

- Project delete/archive
- Character delete/archive
- Asset delete
- Relationship delete
- Story delete
- Wishlist/Commission archive

Recommended delete policy:

- Projects: soft archive with `archived_at` and `status = "archived"`.
- Characters: soft archive with `archived_at`; do not hard delete while project links or applications reference it.
- ProjectCharacterLink: soft remove is correct.
- WorldEntry: soft archive is correct; entity links need transaction/filter handling.
- Assets: soft delete with `deleted_at`; R2 object deletion should be a separate deliberate operation.
- Relationships: soft delete with `deleted_at`.
- Applications/Submissions: prefer status transitions over delete.
- Wishlist/Commissions: soft archive with `archived_at`.

---

## 8. Legacy Migration vs v1 Migration Conflicts

Current legacy migration lives at `api/src/db/migrations/0001_init.sql`. New v1 draft lives at `api/migrations/0001_characterhub_v1.sql`.

Major conflicts:

| Domain | Legacy schema | v1 schema | Conflict |
|---|---|---|---|
| Migration location | `src/db/migrations` used by package script `db:migrate` with `d1 execute` | `api/migrations` used by wrangler migrations | Two migration systems/locations |
| Users | `username`, `password_hash`, `accent_color`, integer `created_at` | `handle`, no password hash in draft, ISO text timestamps, `avatar_asset_id` | Existing auth router expects legacy users |
| Projects | `user_id`, `sub_name`, `sort_order`, unique `(user_id, slug)` | `owner_user_id`, visibility/capability fields, global unique `slug` | New `/api/app` routes require v1 columns |
| Characters | `ocs` table with profile/media JSON | `characters` plus `project_character_links` | Body and project-scoped fields split |
| Media | `oc_media` | `assets` plus `asset_links` | R2 metadata generalized |
| Relationships | `oc_relationships` pair table | polymorphic `relationships` plus `relationship_layouts` | Entity graph is generalized |
| Worldview | `worldview_entries` with inline `linked_oc_ids` | `world_entries` plus `entity_links` | Link source of truth moved |
| Public pages | none | `public_pages`, `public_page_versions` | new builder/renderer split |
| Collaboration | none | `project_members`, `character_applications`, `content_submissions` | new role/review model |
| Account tools | legacy commissions 501 only | `wishlist_items`, `commissions` | account-level tools become explicit tables |

Critical deployment warning:

- Because the v1 migration uses `CREATE TABLE IF NOT EXISTS`, applying it over a database that already has legacy `users` or `projects` will not reshape those tables.
- The migration may appear successful while `/api/app/projects` fails because `owner_user_id` does not exist.

---

## 9. Migration Strategy Decision

Recommendation: clean v1 DB reset.

Use one of these approaches for the next stage:

1. Create a new D1 database for CharacterHub v1 and bind it as `DB` only in local/staging after review.
2. Or reset local/staging D1 state and apply only `api/migrations/0001_characterhub_v1.sql`.

Do not use the current v1 draft as a forward migration against existing remote D1.

Why not forward migration now:

- It would need to rebuild `users` and `projects`, not merely add tables.
- It would need to backfill `ocs -> characters`, `ocs.project_id -> project_character_links`, `worldview_entries -> world_entries`, and inline links -> `entity_links`.
- It would need to preserve existing auth and OAuth data while the new `users` draft currently omits legacy password/OAuth-compatible fields.
- It would need a one-time slug strategy because old project slugs are unique per user, while v1 project slugs are global.

When forward migration becomes worth doing:

- After API contract v1 is stable.
- After auth/session model is finalized.
- After a real remote D1 export confirms there is data worth preserving.
- After we decide whether `POST /characters` remains compound or gets split.

---

## 10. Required Follow-Up Before Frontend Connection

1. Decide whether `POST /api/app/characters` stays compound or becomes character-body-only.
2. Decide whether `POST /api/app/characters` should keep accepting project-scoped fields or move project-scoped creation fully to ProjectCharacterLink/Application endpoints.
3. Consolidate migration location and scripts; avoid mixing `src/db/migrations` with wrangler `migrations`.
4. Reconcile auth schema before using login against a clean v1 DB.
5. Add tests for role-based permission edge cases and D1 batch rollback behavior.
