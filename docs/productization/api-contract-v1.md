# CharacterHub API Contract v1

Status: draft. Do not implement backend routes from this file until reviewed.  
Scope: frontend repository contract for the current `app/` skeleton.  
Base paths:

- Workspace API: `/api/app`
- Public renderer API: `/api/public`

---

## Conventions

### Auth

Formal implementation should use same-origin HttpOnly cookie sessions. Demo token flows are not part of this v1 contract.

### Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "fields": {
      "name": "Required"
    }
  }
}
```

Common errors for all authenticated endpoints:

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Request body shape or enum value is invalid |
| 401 | `UNAUTHENTICATED` | No valid session |
| 403 | `FORBIDDEN` | User lacks required permission |
| 404 | `NOT_FOUND` | Entity does not exist or is not visible to this user |
| 409 | `CONFLICT` | Slug, duplicate link, stale version, or invalid state transition |
| 422 | `UNPROCESSABLE_ENTITY` | Request is syntactically valid but violates domain rules |

### Permission Vocabulary

| Permission | Description |
|---|---|
| `authenticated` | Any logged-in user |
| `project:view` | Can view the project workspace |
| `project:update` | Can edit project name, description, cover, theme |
| `project:manage_settings` | Can edit capabilities, visibility, join policy |
| `project:publish` | Can publish or unpublish public page |
| `character:create` | Can create own account-level character |
| `character:update` | Can update own character body |
| `project_character:create` | Can link or submit a character into a project |
| `project_character:update` | Can update ProjectCharacterLink fields |
| `application:create` | Can submit a character application |
| `application:review` | Can approve/reject/request changes |
| `world:create` / `world:update` | Can create/update world entries and links |
| `story:create` / `story:update` | Can create/update stories, chapters, events |
| `asset:create` / `asset:update` | Can create/update asset metadata and links |
| `public_page:update` / `public_page:publish` | Can edit/publish builder draft |
| `relationship:create` / `relationship:update` / `relationship:delete` / `relationship:layout` | Can manage relationship graph |
| `wishlist:update` / `commission:create` / `commission:update` | Can manage account-level tools |

---

## ProjectRepository

### List Projects

| Field | Value |
|---|---|
| Repository | `ProjectRepository.listProjects()` |
| Endpoint | `GET /api/app/projects` |
| Auth | Required |
| Permission | `authenticated` |
| Request | Query: `includeArchived?`, `q?`, `cursor?`, `limit?` |
| Response | `{ "projects": ProjectSummary[], "nextCursor": string | null }` |
| Errors | `401`, `400` for invalid pagination |

`ProjectSummary` excludes account-level tools. Account-level tools such as Wishlist, Commission, and Height Compare are not projects.

### Get Project

| Field | Value |
|---|---|
| Repository | `ProjectRepository.getProject(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId` |
| Auth | Required |
| Permission | `project:view` |
| Request | None |
| Response | `{ "project": ProjectDetail, "viewerRole": ProjectRole, "stats": ProjectStats }` |
| Errors | `401`, `403`, `404` |

### Create Project

| Field | Value |
|---|---|
| Repository | `ProjectRepository.createProject(input)` |
| Endpoint | `POST /api/app/projects` |
| Auth | Required |
| Permission | `authenticated` |
| Request | `{ name, preset, slug?, description?, color?, visibility?, collaborationMode?, portalEnabled?, joinPolicy?, submissionsEnabled?, enabledFeatures? }` |
| Response | `{ "project": ProjectDetail, "membership": ProjectMember }` |
| Errors | `400`, `401`, `409` for duplicate slug |

Presets are creation defaults only. Do not persist project as a single rigid type like `public_project` or `collab_project`.

### Update Project

| Field | Value |
|---|---|
| Repository | `ProjectRepository.updateProject(projectId, patch)` |
| Endpoint | `PATCH /api/app/projects/:projectId` |
| Auth | Required |
| Permission | `project:update`; `project:manage_settings` for capabilities; `project:publish` for visibility/public page availability |
| Request | `{ name?, slug?, description?, coverAssetId?, color?, visibility?, collaborationMode?, portalEnabled?, joinPolicy?, submissionsEnabled?, enabledFeatures? }` |
| Response | `{ "project": ProjectDetail, "navigation": ProjectNavigationPayload }` |
| Errors | `400`, `401`, `403`, `404`, `409` for duplicate slug or invalid capability combination |

Changing capabilities can affect sidebar navigation. Backend should return updated navigation payload or enough project fields to recompute it.

---

## CharacterRepository

### List Characters

| Field | Value |
|---|---|
| Repository | `CharacterRepository.listCharacters()` |
| Endpoint | `GET /api/app/characters` |
| Auth | Required |
| Permission | `authenticated` |
| Request | Query: `projectId?`, `visibility?`, `q?`, `cursor?`, `limit?` |
| Response | `{ "characters": CharacterSummary[], "nextCursor": string | null }` |
| Errors | `400`, `401`, `403` if `projectId` is not visible |

Without `projectId`, this is the account-level global character library. With `projectId`, it returns project-scoped summaries joined through `project_character_links`.

### Get Character

| Field | Value |
|---|---|
| Repository | `CharacterRepository.getCharacter(characterId)` |
| Endpoint | `GET /api/app/characters/:characterId` |
| Auth | Required |
| Permission | Character owner or project visibility through a linked project |
| Request | Query: `projectId?` |
| Response | `{ "character": CharacterDetail, "projectLink": ProjectCharacterLink | null }` |
| Errors | `401`, `403`, `404` |

Character body and ProjectCharacterLink must remain separate. `projectLink` fields are returned only when a project context is requested and visible.

### Create Character

| Field | Value |
|---|---|
| Repository | `CharacterRepository.createCharacter(input)` |
| Endpoint | `POST /api/app/characters` |
| Auth | Required |
| Permission | `character:create`; if `projectId` is present also `project_character:create` or `application:create` depending on project join policy |
| Request | `{ name, slug?, romaji?, nickname?, species?, summary?, visibility?, tags?, avatarAssetId?, projectId?, projectRole?, factionId?, fieldValues? }` |
| Response | `{ "character": CharacterDetail, "projectLink": ProjectCharacterLink | null, "application": CharacterApplication | null }` |
| Errors | `400`, `401`, `403`, `404`, `409` for duplicate slug |

If `projectId` is passed:

- Backend Skeleton v1 treats `/api/app` as workspace-only. Non-members must not use this endpoint for public application flows.
- Workspace members with `project_character:create` may create a separate ProjectCharacterLink. Project-scoped fields still must not be merged into the Character body.
- Public application flows should use `/api/public` plus `CollaborationRepository.submitCharacterApplication()` once implemented.

### Update Character

| Field | Value |
|---|---|
| Repository | `CharacterRepository.updateCharacter(characterId, patch)` |
| Endpoint | `PATCH /api/app/characters/:characterId` |
| Auth | Required |
| Permission | `character:update`; character owner only |
| Request | `{ name?, slug?, romaji?, nickname?, species?, summary?, visibility?, tags?, avatarAssetId?, generalProfile?, artistProfile?, writerProfile? }` |
| Response | `{ "character": CharacterDetail }` |
| Errors | `400`, `401`, `403`, `404`, `409` |

This endpoint never updates project-specific fields such as faction, roster status, project role, template field values, or review status.

---

## ProjectCharacterLink / Project Roster

These endpoints use the ProjectCharacterLink id as `:linkId`. Do not treat `:linkId` as `characterId`.

### List Project Characters

| Field | Value |
|---|---|
| Repository | `CharacterRepository.listProjectCharacters(projectId)` or roster adapter |
| Endpoint | `GET /api/app/projects/:projectId/characters` |
| Auth | Required |
| Permission | `project:view` |
| Request | Query: `status?`, `cursor?`, `limit?` |
| Response | `{ "roster": Array<{ "projectLink": ProjectCharacterLink, "character": CharacterSummary }>, "nextCursor": string | null }` |
| Errors | `401`, `403`, `404` |

### Link Character To Project

| Field | Value |
|---|---|
| Repository | `CharacterRepository.linkCharacterToProject(projectId, input)` |
| Endpoint | `POST /api/app/projects/:projectId/characters` |
| Auth | Required |
| Permission | `project_character:create` |
| Request | `{ characterId, status?, factionId?, factionLabel?, projectRole?, visibility?, templateVersionId?, fieldValues? }` |
| Response | `{ "projectLink": ProjectCharacterLink, "character": CharacterSummary }` |
| Errors | `400`, `401`, `403`, `404`, `409` |

### Get Project Character Link

| Field | Value |
|---|---|
| Repository | `CharacterRepository.getProjectCharacterLink(projectId, linkId)` |
| Endpoint | `GET /api/app/projects/:projectId/characters/:linkId` |
| Auth | Required |
| Permission | `project:view` |
| Request | None |
| Response | `{ "projectLink": ProjectCharacterLink, "character": CharacterSummary }` |
| Errors | `401`, `403`, `404` |

### Update Project Character Link

| Field | Value |
|---|---|
| Repository | `CharacterRepository.updateProjectCharacterLink(projectId, linkId, patch)` |
| Endpoint | `PATCH /api/app/projects/:projectId/characters/:linkId` |
| Auth | Required |
| Permission | `project_character:update` |
| Request | `{ status?, factionId?, factionLabel?, projectRole?, visibility?, templateVersionId?, fieldValues?, reviewMessage? }` |
| Response | `{ "projectLink": ProjectCharacterLink }` |
| Errors | `400`, `401`, `403`, `404`, `409` |

This endpoint never updates Character body fields.

### Remove Project Character Link

| Field | Value |
|---|---|
| Repository | `CharacterRepository.removeProjectCharacterLink(projectId, linkId)` |
| Endpoint | `DELETE /api/app/projects/:projectId/characters/:linkId` |
| Auth | Required |
| Permission | `project_character:update` |
| Request | None |
| Response | `{ "deleted": true, "projectLinkId": string }` |
| Errors | `401`, `403`, `404` |

Removal is soft-delete via `removed_at` and `status = "removed"` in v1.

---

## WorldviewRepository

### List World Entries

| Field | Value |
|---|---|
| Repository | `WorldviewRepository.listWorldEntries(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/world-entries` |
| Auth | Required |
| Permission | `project:view` |
| Request | Query: `type?`, `parentId?`, `q?`, `visibility?`, `cursor?`, `limit?` |
| Response | `{ "entries": WorldEntrySummary[], "entityLinks": EntityLink[], "nextCursor": string | null }` |
| Errors | `400`, `401`, `403`, `404` |

`relatedCharacters` and `relatedEntries` may be returned as summary cache for cards, but the source of truth is `entity_links`.

### Create World Entry

| Field | Value |
|---|---|
| Repository | `WorldviewRepository.createWorldEntry(projectId, input)` |
| Endpoint | `POST /api/app/projects/:projectId/world-entries` |
| Auth | Required |
| Permission | `world:create` |
| Request | `{ type, title, summary?, content?, parentId?, sortOrder?, visibility?, relatedCharacterIds?, relatedEntryIds? }` |
| Response | `{ "entry": WorldEntryDetail, "entityLinks": EntityLink[] }` |
| Errors | `400`, `401`, `403`, `404`, `422` for parent cycle |

### Update World Entry

| Field | Value |
|---|---|
| Repository | `WorldviewRepository.updateWorldEntry(projectId, entryId, patch)` |
| Endpoint | `PATCH /api/app/projects/:projectId/world-entries/:entryId` |
| Auth | Required |
| Permission | `world:update` |
| Request | `{ type?, title?, summary?, content?, parentId?, sortOrder?, visibility?, relatedCharacterIds?, relatedEntryIds? }` |
| Response | `{ "entry": WorldEntryDetail, "entityLinks": EntityLink[] }` |
| Errors | `400`, `401`, `403`, `404`, `422` |

Related IDs are translated into `entity_links`. Do not persist relationship source of truth as inline arrays only.

---

## StoryRepository

### List Stories

| Field | Value |
|---|---|
| Repository | `StoryRepository.listStories(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/stories` |
| Auth | Required |
| Permission | `project:view` |
| Request | Query: `status?`, `visibility?`, `cursor?`, `limit?` |
| Response | `{ "stories": StorySummary[], "nextCursor": string | null }` |
| Errors | `400`, `401`, `403`, `404` |

### Create Story

| Field | Value |
|---|---|
| Repository | `StoryRepository.createStory(projectId, input)` |
| Endpoint | `POST /api/app/projects/:projectId/stories` |
| Auth | Required |
| Permission | `story:create` |
| Request | `{ title, description?, status?, visibility? }` |
| Response | `{ "story": StoryDetail }` |
| Errors | `400`, `401`, `403`, `404` |

### Update Story

| Field | Value |
|---|---|
| Repository | `StoryRepository.updateStory(projectId, storyId, patch)` |
| Endpoint | `PATCH /api/app/projects/:projectId/stories/:storyId` |
| Auth | Required |
| Permission | `story:update` |
| Request | `{ title?, description?, status?, visibility? }` |
| Response | `{ "story": StoryDetail }` |
| Errors | `400`, `401`, `403`, `404` |

Chapter and event endpoints are part of the schema but not yet represented by current frontend repository methods:

- `POST /api/app/projects/:projectId/stories/:storyId/chapters`
- `PATCH /api/app/projects/:projectId/stories/:storyId/chapters/:chapterId`
- `POST /api/app/projects/:projectId/story-events`
- `PATCH /api/app/projects/:projectId/story-events/:eventId`

---

## GalleryRepository

### List Gallery Items

| Field | Value |
|---|---|
| Repository | `GalleryRepository.listGalleryItems(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/assets` |
| Auth | Required |
| Permission | `project:view` |
| Request | Query: `assetType?`, `characterId?`, `visibility?`, `cursor?`, `limit?` |
| Response | `{ "assets": AssetSummary[], "assetLinks": AssetLink[], "nextCursor": string | null }` |
| Errors | `400`, `401`, `403`, `404` |

### Create Gallery Item Metadata

| Field | Value |
|---|---|
| Repository | `GalleryRepository.createGalleryItem(projectId, input)` |
| Endpoint | `POST /api/app/projects/:projectId/assets` |
| Auth | Required |
| Permission | `asset:create` |
| Request | `{ title, assetType?, originalName?, mimeType?, sizeBytes?, width?, height?, visibility?, authorName?, sourceUrl?, links? }` |
| Response | `{ "asset": AssetDetail, "assetLinks": AssetLink[] }` |
| Errors | `400`, `401`, `403`, `404`, `422` for invalid file metadata |

Formal file upload should use upload/finalize endpoints. This endpoint is metadata-first for the current repository contract and demo skeleton.

### Update Gallery Item

| Field | Value |
|---|---|
| Repository | `GalleryRepository.updateGalleryItem(projectId, assetId, patch)` |
| Endpoint | `PATCH /api/app/projects/:projectId/assets/:assetId` |
| Auth | Required |
| Permission | `asset:update` |
| Request | `{ title?, assetType?, visibility?, authorName?, sourceUrl?, notes?, links? }` |
| Response | `{ "asset": AssetDetail, "assetLinks": AssetLink[] }` |
| Errors | `400`, `401`, `403`, `404` |

---

## PublicPageRepository

### Get Builder Payload

| Field | Value |
|---|---|
| Repository | `PublicPageRepository.getPublicPage(projectId)` / `getDraft(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/public-page` |
| Auth | Required |
| Permission | `public_page:update` or `project:view` for readonly preview |
| Request | None |
| Response | `{ "project": ProjectDetail, "publicPage": PublicPageBuilderPayload }` |
| Errors | `401`, `403`, `404` |

Builder payload may include draft blocks, settings, edit metadata, and owner/host controls. It must never be used as the public renderer payload.

### Save Public Page Draft

| Field | Value |
|---|---|
| Repository | `PublicPageRepository.savePublicPageDraft(projectId, payload)` |
| Endpoint | `PUT /api/app/projects/:projectId/public-page/draft` |
| Auth | Required |
| Permission | `public_page:update` |
| Request | `{ blocks, theme?, settings? }` |
| Response | `{ "draft": PublicPageDraft, "updatedAt": string }` |
| Errors | `400`, `401`, `403`, `404`, `409` for stale draft version |

Public page blocks are stored as draft JSON in v1. Do not create a block table yet.

### Publish Public Page

| Field | Value |
|---|---|
| Repository | `PublicPageRepository.publishPublicPage(projectId, note?)` |
| Endpoint | `POST /api/app/projects/:projectId/public-page/publish` |
| Auth | Required |
| Permission | `public_page:publish` |
| Request | `{ note? }` |
| Response | `{ "version": PublicPageVersion, "publicPage": PublicPageStatus }` |
| Errors | `400`, `401`, `403`, `404`, `422` if project visibility/capabilities disallow public page |

### Public Renderer

| Field | Value |
|---|---|
| Repository | Public renderer adapter, not builder repository |
| Endpoint | `GET /api/public/projects/:slug` |
| Auth | Optional; no workspace role data returned |
| Permission | Public visibility or valid unlisted token if later added |
| Request | None |
| Response | `{ "project": PublicProjectPayload, "version": PublicPagePublishedPayload }` |
| Errors | `404` for private/unpublished, `410` for unpublished after previous publish |

Public renderer payload must exclude `viewerRole`, draft blocks, review controls, member management data, private fields, and unpublished entries.

---

## CollaborationRepository

### List Character Applications

| Field | Value |
|---|---|
| Repository | `CollaborationRepository.listCharacterApplications(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/applications/characters` |
| Auth | Required |
| Permission | `application:review` for all; applicant can view own applications |
| Request | Query: `status?`, `cursor?`, `limit?` |
| Response | `{ "applications": CharacterApplication[], "nextCursor": string | null }` |
| Errors | `400`, `401`, `403`, `404` |

### List Review Items

| Field | Value |
|---|---|
| Repository | `CollaborationRepository.listReviewItems(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/review-items` |
| Auth | Required |
| Permission | `application:review` and/or `content_submission:review` |
| Request | Query: `status?`, `types?`, `cursor?`, `limit?` |
| Response | `{ "items": ReviewItem[], "nextCursor": string | null }` |
| Errors | `400`, `401`, `403`, `404` |

This is a read model that combines `character_applications` and `content_submissions`. It does not merge their storage or approval behavior.

### Submit Character Application

| Field | Value |
|---|---|
| Repository | `CollaborationRepository.submitCharacterApplication(projectId, input)` |
| Endpoint | `POST /api/app/projects/:projectId/applications/characters` |
| Auth | Required for members; optional visitor flow can be added later with anti-abuse controls |
| Permission | `application:create` |
| Request | `{ characterId?, draftCharacter?, fieldValues?, message }` |
| Response | `{ "application": CharacterApplication }` |
| Errors | `400`, `401`, `403`, `404`, `409` duplicate pending application |

### Review Character Application

| Field | Value |
|---|---|
| Repository | `CollaborationRepository.reviewCharacterApplication(projectId, applicationId, status, reviewMessage?)` |
| Endpoint | `POST /api/app/projects/:projectId/applications/characters/:applicationId/review` |
| Auth | Required |
| Permission | `application:review` |
| Request | `{ status: "approved" | "rejected" | "needs_changes", reviewMessage?, factionId?, projectRole?, fieldValues? }` |
| Response | `{ "application": CharacterApplication, "projectLink": ProjectCharacterLink | null }` |
| Errors | `400`, `401`, `403`, `404`, `409` invalid state transition |

Approving creates or updates `project_character_links`. It does not overwrite the global character body except when creating a brand-new draft character from the application.

### Submit Content Submission

| Field | Value |
|---|---|
| Repository | `CollaborationRepository.submitContentSubmission(projectId, input)` |
| Endpoint | `POST /api/app/projects/:projectId/submissions/content` |
| Auth | Required for members; visitor submission requires future anti-abuse controls |
| Permission | `content_submission:create` |
| Request | `{ type: "image" | "text", title, message?, assetId?, textContent?, relatedCharacterIds? }` |
| Response | `{ "submission": ContentSubmission }` |
| Errors | `400`, `401`, `403`, `404`, `422` |

### Review Content Submission

| Field | Value |
|---|---|
| Repository | `CollaborationRepository.reviewContentSubmission(projectId, submissionId, status, reviewMessage?)` |
| Endpoint | `POST /api/app/projects/:projectId/submissions/content/:submissionId/review` |
| Auth | Required |
| Permission | `content_submission:review` |
| Request | `{ status: "approved" | "rejected" | "needs_changes", reviewMessage?, destinationType?, destinationId? }` |
| Response | `{ "submission": ContentSubmission }` |
| Errors | `400`, `401`, `403`, `404`, `409`, `422` |

Approved content submissions must store `destinationType` and `destinationId`:

- image -> `destinationType: "gallery"` / `destinationId: assetId`
- text -> `destinationType: "story"` or `"publication"` / `destinationId`

---

## CommissionRepository

### List Wishlist Items

| Field | Value |
|---|---|
| Repository | `CommissionRepository.listWishlistItems()` |
| Endpoint | `GET /api/app/wishlist` |
| Auth | Required |
| Permission | `authenticated` |
| Request | Query: `status?`, `cursor?`, `limit?` |
| Response | `{ "items": WishlistItem[], "nextCursor": string | null }` |
| Errors | `400`, `401` |

Wishlist is account-level, not project-owned. It may optionally reference projects or characters, but it should not be forced into every project.

### Create Wishlist Item

| Field | Value |
|---|---|
| Repository | `CommissionRepository.createWishlistItem(input)` |
| Endpoint | `POST /api/app/wishlist` |
| Auth | Required |
| Permission | `authenticated` |
| Request | `{ title, description?, type?, priority?, budget?, projectId?, characterIds? }` |
| Response | `{ "item": WishlistItem }` |
| Errors | `400`, `401`, `403` if referenced project/character is not visible |

### Update Wishlist Item

| Field | Value |
|---|---|
| Repository | `CommissionRepository.updateWishlistItem(itemId, patch)` |
| Endpoint | `PATCH /api/app/wishlist/:itemId` |
| Auth | Required |
| Permission | `wishlist:update`; owner only |
| Request | `{ title?, description?, type?, priority?, budget?, status?, projectId?, characterIds? }` |
| Response | `{ "item": WishlistItem }` |
| Errors | `400`, `401`, `403`, `404` |

### Convert Wishlist To Commission

| Field | Value |
|---|---|
| Repository | `CommissionRepository.convertWishlistToCommission(itemId, input?)` |
| Endpoint | `POST /api/app/wishlist/:itemId/convert-to-commission` |
| Auth | Required |
| Permission | `commission:create`; wishlist owner only |
| Request | `{ creatorName?, price?, deadline?, status?, notes? }` |
| Response | `{ "wishlistItem": WishlistItem, "commission": Commission }` |
| Errors | `400`, `401`, `403`, `404`, `409` if already converted |

### List Commissions

| Field | Value |
|---|---|
| Repository | `CommissionRepository.listCommissions()` |
| Endpoint | `GET /api/app/commissions` |
| Auth | Required |
| Permission | `authenticated` |
| Request | Query: `status?`, `characterId?`, `cursor?`, `limit?` |
| Response | `{ "commissions": Commission[], "nextCursor": string | null }` |
| Errors | `400`, `401` |

---

## RelationshipRepository

### List Relationships

| Field | Value |
|---|---|
| Repository | `RelationshipRepository.listRelationships(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/relationships` |
| Auth | Required |
| Permission | `project:view` |
| Request | Query: reserved for `visibility?`, `entityType?`, `entityId?` in later slices |
| Response | `{ "relationships": Relationship[], "nextCursor": null }` |
| Errors | `400`, `401`, `403`, `404` |

### Create Relationship

| Field | Value |
|---|---|
| Repository | `RelationshipRepository.createRelationship(projectId, payload)` |
| Endpoint | `POST /api/app/projects/:projectId/relationships` |
| Auth | Required |
| Permission | `relationship:create` |
| Request | `{ sourceRef, targetRef, type, label, description?, direction?, groupId?, visibility?, album?, timeline?, sortOrder? }` |
| Response | `{ "relationship": Relationship }` |
| Errors | `400`, `401`, `403`, `404`, `422` invalid refs |

### Update Relationship

| Field | Value |
|---|---|
| Repository | `RelationshipRepository.updateRelationship(projectId, relationshipId, patch)` |
| Endpoint | `PATCH /api/app/projects/:projectId/relationships/:relationshipId` |
| Auth | Required |
| Permission | `relationship:update` |
| Request | `{ sourceRef?, targetRef?, type?, label?, description?, direction?, groupId?, visibility?, album?, timeline?, sortOrder? }` |
| Response | `{ "relationship": Relationship }` |
| Errors | `400`, `401`, `403`, `404`, `422` |

### Delete Relationship

| Field | Value |
|---|---|
| Repository | `RelationshipRepository.deleteRelationship(projectId, relationshipId)` |
| Endpoint | `DELETE /api/app/projects/:projectId/relationships/:relationshipId` |
| Auth | Required |
| Permission | `relationship:delete` |
| Request | None |
| Response | `{ "deleted": true, "relationshipId": string }` |
| Errors | `401`, `403`, `404` |
| Delete mode | Soft delete via `relationships.deleted_at` |

### Get Relationship Layout

| Field | Value |
|---|---|
| Repository | `RelationshipRepository.getRelationshipLayout(projectId)` |
| Endpoint | `GET /api/app/projects/:projectId/relationship-layout` |
| Auth | Required |
| Permission | `project:view` |
| Request | None |
| Response | `{ "layout": RelationshipLayout }` |
| Errors | `401`, `403`, `404` |

### Update Relationship Layout

| Field | Value |
|---|---|
| Repository | `RelationshipRepository.updateRelationshipLayout(projectId, patch)` |
| Endpoint | `PUT` or `PATCH /api/app/projects/:projectId/relationship-layout` |
| Auth | Required |
| Permission | `relationship:layout` |
| Request | `{ nodes?, labels?, paths?, groups? }` |
| Response | `{ "layout": RelationshipLayout }` |
| Errors | `400`, `401`, `403`, `404`, `413` |

`Relationship` response includes formal fields (`sourceRef`, `targetRef`, `type`, `label`, `description`, `direction`, `visibility`) and demo UI compatibility fields (`title`, `desc`, `chip`, `nodes`, `avatars`). The compatibility fields should not become source-of-truth database columns.

`RelationshipLayout` v1 is project-scoped. Do not store it as user-specific preference in v1. UI-only state such as selected relationship, hover, lightbox, and current focus is not persisted in v1. Layout JSON is capped at 50KB in the Worker skeleton.
