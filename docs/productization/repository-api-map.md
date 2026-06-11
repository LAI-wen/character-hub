# Repository API Map

Status: draft. Maps current frontend repositories to proposed API and D1 surfaces.

---

## ProjectRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listProjects()` | `GET /api/app/projects` | `projects`, `project_members` | `authenticated` | Excludes account-level tools |
| `getProject(projectId)` | `GET /api/app/projects/:projectId` | `projects`, `project_members` | `project:view` | Returns `viewerRole`/stats separately from project row |
| `createProject(input)` | `POST /api/app/projects` | `projects`, `project_members`, `public_pages` | `authenticated` | Preset becomes default field values, not permanent type |
| `updateProject(projectId, patch)` | `PATCH /api/app/projects/:projectId` | `projects`, `public_pages` | `project:update`, `project:manage_settings`, `project:publish` depending on fields | Capability changes affect navigation |

---

## CharacterRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listCharacters()` | `GET /api/app/characters` | `characters`, optional `project_character_links` | `authenticated`; `project:view` when scoped | Account-level global library when no `projectId` |
| `getCharacter(characterId)` | `GET /api/app/characters/:characterId` | `characters`, optional `project_character_links` | owner or visible project context | Character body and project link returned separately |
| `createCharacter(input)` | `POST /api/app/characters` | `characters`, optional `project_character_links` or `character_applications` | `character:create`; optional project permission | Passing `projectId` must respect join policy |
| `updateCharacter(characterId, patch)` | `PATCH /api/app/characters/:characterId` | `characters` | `character:update` owner only | Never updates faction/projectRole/status/fieldValues |
| `listProjectCharacters(projectId)` | `GET /api/app/projects/:projectId/characters` | `project_character_links`, `characters` | `project:view` | Returns roster rows, not raw character bodies only |
| `linkCharacterToProject(projectId, input)` | `POST /api/app/projects/:projectId/characters` | `project_character_links`, `characters` | `project_character:create` | Request uses `characterId`; response uses ProjectCharacterLink |
| `getProjectCharacterLink(projectId, linkId)` | `GET /api/app/projects/:projectId/characters/:linkId` | `project_character_links`, `characters` | `project:view` | `linkId` is ProjectCharacterLink id, not Character id |
| `updateProjectCharacterLink(projectId, linkId, patch)` | `PATCH /api/app/projects/:projectId/characters/:linkId` | `project_character_links` | `project_character:update` | Only updates project-scoped fields |
| `removeProjectCharacterLink(projectId, linkId)` | `DELETE /api/app/projects/:projectId/characters/:linkId` | `project_character_links` | `project_character:update` | Soft remove through `removed_at` |

---

## WorldviewRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listWorldEntries(projectId)` | `GET /api/app/projects/:projectId/world-entries` | `world_entries`, `entity_links` | `project:view` | Summary cache allowed; `entity_links` is source of truth |
| `createWorldEntry(projectId, input)` | `POST /api/app/projects/:projectId/world-entries` | `world_entries`, `entity_links` | `world:create` | Related characters/entries become `entity_links` |
| `updateWorldEntry(projectId, entryId, patch)` | `PATCH /api/app/projects/:projectId/world-entries/:entryId` | `world_entries`, `entity_links` | `world:update` | Parent cycle validation required |

---

## StoryRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listStories(projectId)` | `GET /api/app/projects/:projectId/stories` | `stories`, optionally `story_chapters` | `project:view` | Current UI reads story with chapters |
| `createStory(projectId, input)` | `POST /api/app/projects/:projectId/stories` | `stories` | `story:create` | Chapters/events have separate future methods |
| `updateStory(projectId, storyId, patch)` | `PATCH /api/app/projects/:projectId/stories/:storyId` | `stories` | `story:update` | Does not update chapters unless a chapter endpoint is added |

---

## GalleryRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listGalleryItems(projectId)` | `GET /api/app/projects/:projectId/assets` | `assets`, `asset_links` | `project:view` | Filters by links/visibility |
| `createGalleryItem(projectId, input)` | `POST /api/app/projects/:projectId/assets` | `assets`, `asset_links` | `asset:create` | Metadata-first; R2 upload flow is separate |
| `updateGalleryItem(projectId, assetId, patch)` | `PATCH /api/app/projects/:projectId/assets/:assetId` | `assets`, `asset_links` | `asset:update` | Updates metadata and link roles |

---

## PublicPageRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `getPublicPage(projectId)` | `GET /api/app/projects/:projectId/public-page` | `public_pages`, `public_page_versions`, `projects` | `public_page:update` or project readonly preview | Builder payload only |
| `getDraft(projectId)` | `GET /api/app/projects/:projectId/public-page` | `public_pages` | `public_page:update` | Reads draft JSON |
| `savePublicPageDraft(projectId, payload)` | `PUT /api/app/projects/:projectId/public-page/draft` | `public_pages` | `public_page:update` | Blocks remain draft JSON in v1 |
| `publishPublicPage(projectId, note)` | `POST /api/app/projects/:projectId/public-page/publish` | `public_pages`, `public_page_versions` | `public_page:publish` | Creates visitor-safe published JSON |
| Public renderer adapter | `GET /api/public/projects/:slug` | `public_pages`, `public_page_versions`, public-safe joins | public/unlisted access | Must not return builder/editor payload |

---

## CollaborationRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listCharacterApplications(projectId)` | `GET /api/app/projects/:projectId/applications/characters` | `character_applications` | `application:review` or own applicant view | Character applications are separate from content submissions |
| `listReviewItems(projectId)` | `GET /api/app/projects/:projectId/review-items` | `character_applications`, `content_submissions` | review permissions | Read model only; storage stays split |
| `submitCharacterApplication(projectId, input)` | `POST /api/app/projects/:projectId/applications/characters` | `character_applications` | `application:create` | Can reference existing `character_id` or `draft_character_json` |
| `reviewCharacterApplication(projectId, applicationId, status, message)` | `POST /api/app/projects/:projectId/applications/characters/:applicationId/review` | `character_applications`, `characters`, `project_character_links` | `application:review` | Approved creates/updates ProjectCharacterLink |
| `submitContentSubmission(projectId, input)` | `POST /api/app/projects/:projectId/submissions/content` | `content_submissions`, optional `assets` | `content_submission:create` | Never enters roster |
| `reviewContentSubmission(projectId, submissionId, status, message)` | `POST /api/app/projects/:projectId/submissions/content/:submissionId/review` | `content_submissions`, destination table | `content_submission:review` | Approved must set `destination_type` and `destination_id` |

---

## CommissionRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listWishlistItems()` | `GET /api/app/wishlist` | `wishlist_items` | `authenticated` | Account-level tool |
| `createWishlistItem(input)` | `POST /api/app/wishlist` | `wishlist_items` | `authenticated` | Optional project/character refs do not make it project-owned |
| `updateWishlistItem(itemId, patch)` | `PATCH /api/app/wishlist/:itemId` | `wishlist_items` | owner / `wishlist:update` | Owner-only |
| `convertWishlistToCommission(itemId, input)` | `POST /api/app/wishlist/:itemId/convert-to-commission` | `wishlist_items`, `commissions` | owner / `commission:create` | Sets `converted_commission_id` and `source_wishlist_id` |
| `listCommissions()` | `GET /api/app/commissions` | `commissions` | `authenticated` | Account-level tool |

---

## RelationshipRepository

| Repository method | API endpoint | DB table(s) | Permission check | Notes |
|---|---|---|---|---|
| `listRelationships(projectId)` | `GET /api/app/projects/:projectId/relationships` | `relationships` | `project:view` | Returns project graph edges/details |
| `createRelationship(projectId, payload)` | `POST /api/app/projects/:projectId/relationships` | `relationships` | `relationship:create` | Source/target refs are polymorphic and app-validated; layout is updated by separate repository call |
| `updateRelationship(projectId, relationshipId, patch)` | `PATCH /api/app/projects/:projectId/relationships/:relationshipId` | `relationships` | `relationship:update` | Details/timeline JSON temporary |
| `deleteRelationship(projectId, relationshipId)` | `DELETE /api/app/projects/:projectId/relationships/:relationshipId` | `relationships` | `relationship:delete` | v1 uses soft delete via `deleted_at`; layout cleanup can be a later maintenance pass |
| `getRelationshipLayout(projectId)` | `GET /api/app/projects/:projectId/relationship-layout` | `relationship_layouts` | `project:view` | Project-scoped layout in v1 |
| `updateRelationshipLayout(projectId, patch)` | `PUT` / `PATCH /api/app/projects/:projectId/relationship-layout` | `relationship_layouts` | `relationship:layout` | Stores project-scoped `layout_json`; selected/hover/focus remain UI-only |

---

## Cross-Cutting Guardrails

| Rule | Enforced in |
|---|---|
| Character body and ProjectCharacterLink are separate | `characters`, `project_character_links`; character endpoints vs project link/application endpoints |
| Public Builder and Public Renderer payloads are separate | `/api/app/projects/:id/public-page` vs `/api/public/projects/:slug` |
| CharacterApplication and ContentSubmission are separate | `character_applications`, `content_submissions` |
| Approved ContentSubmission records destination | `content_submissions.destination_type`, `content_submissions.destination_id` |
| WorldEntry relations use EntityLink as source of truth | `entity_links` |
| RelationshipLayout is project scope in v1 | `relationship_layouts(scope = "project")` |
| Public Page Blocks use JSON in v1 | `public_pages.draft_json`, `public_page_versions.payload_json` |
| Account tools are not project modules | `wishlist_items`, `commissions` owner-based with optional project refs |
