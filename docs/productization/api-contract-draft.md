# CharacterHub API Contract Draft

Status: draft. No implementation yet.

## Authentication

- Prefer same-origin HttpOnly cookie sessions in the formal architecture.
- Avoid storing access tokens in localStorage/sessionStorage.
- Every mutating endpoint must verify the current server-side user and role.

Current demo bridge:

```http
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET /api/v1/auth/google
GET /api/v1/auth/github
GET /api/v1/auth/google/callback
GET /api/v1/auth/github/callback
```

OAuth callbacks now redirect to:

```txt
/index.html#/auth/callback?token=...
```

This is acceptable for the demo bridge only. The production target should move toward server-side HttpOnly session handling.

## Temporary Demo Bridge

The current frontend can hydrate from read-only demo endpoints before the final D1 schema is implemented:

```http
GET /api/v1/demo/bootstrap
GET /api/v1/demo/viewer
GET /api/v1/demo/projects
GET /api/v1/demo/projects/:projectId
GET /api/v1/demo/projects/:projectId/navigation
GET /api/v1/demo/characters
GET /api/v1/demo/projects/:projectId/characters
GET /api/v1/demo/public-projects/:slug
```

These endpoints intentionally return the same shape as the frontend adapter. They should be removed or replaced once `Character`, `Project`, and `ProjectCharacterLink` are backed by D1.

## Workspace

```http
GET /api/v1/projects
POST /api/v1/projects
GET /api/v1/projects/:projectId/summary
GET /api/v1/projects/:projectId/activity
GET /api/v1/projects/:projectId/capabilities
PATCH /api/v1/projects/:projectId/capabilities
```

Project creation should accept a preset plus explicit overrides. Presets are not permanent project types.

```http
POST /api/v1/projects
{
  "name": "...",
  "preset": "personal_organization" | "public_showcase" | "collaborative_project",
  "visibility": "private" | "unlisted" | "public",
  "enabledFeatures": ["worldview", "story", "gallery", "relationships"]
}
```

## Membership And Invites

```http
GET /api/v1/projects/:projectId/members
PATCH /api/v1/project-memberships/:membershipId
DELETE /api/v1/project-memberships/:membershipId
POST /api/v1/projects/:projectId/invites/regenerate
POST /api/v1/project-invites/:token/join
```

## Characters

```http
GET /api/v1/characters?projectId=&visibility=&q=&sort=&cursor=&limit=
POST /api/v1/characters
GET /api/v1/characters/:characterId
PATCH /api/v1/characters/:characterId
PATCH /api/v1/characters/:characterId/visibility
```

`GET /api/v1/characters` without `projectId` is the account-level character library. With `projectId`, it returns only characters visible in that project context.

## Public Character Access

```http
GET /api/v1/public/characters/:username/:slug
GET /api/v1/public/share/:shareToken
POST /api/v1/public/share/:shareToken/password
GET /api/v1/public/commissions/:shareToken
```

Internal detail, public renderer, and commission brief are separate API surfaces even if they share components.

## Project Character Links

```http
GET /api/v1/projects/:projectId/characters
GET /api/v1/projects/:projectId/characters/:characterId
POST /api/v1/projects/:projectId/character-links
GET /api/v1/project-character-links/:linkId
PATCH /api/v1/project-character-links/:linkId
DELETE /api/v1/project-character-links/:linkId
GET /api/v1/project-character-links/:linkId/field-values
PATCH /api/v1/project-character-links/:linkId/field-values
```

Project-specific field values must be addressed through `projectCharacterLinkId`, not only `projectId` or `characterId`.

## Character Applications

```http
GET /api/v1/projects/:projectId/applications?status=&cursor=&limit=
POST /api/v1/projects/:projectId/applications
GET /api/v1/character-applications/:applicationId
PATCH /api/v1/character-applications/:applicationId/status
```

Approval creates or updates a `project_character_link`.

## Templates

```http
GET /api/v1/projects/:projectId/character-template
PUT /api/v1/projects/:projectId/character-template
POST /api/v1/projects/:projectId/template-fields
PATCH /api/v1/template-fields/:fieldId
DELETE /api/v1/template-fields/:fieldId
```

## Worldview

```http
GET /api/v1/worldview?projectId=&type=&q=&cursor=&limit=
POST /api/v1/worldview
GET /api/v1/worldview/:entryId
PATCH /api/v1/worldview/:entryId
DELETE /api/v1/worldview/:entryId
POST /api/v1/worldview/:entryId/character-links
DELETE /api/v1/worldview/:entryId/character-links/:characterId
POST /api/v1/worldview/:entryId/relations
DELETE /api/v1/worldview/:entryId/relations/:relationId
```

## Relationship Graph

```http
GET /api/v1/projects/:projectId/relationship-graph
PUT /api/v1/projects/:projectId/relationship-layout
POST /api/v1/relationships
PATCH /api/v1/relationships/:relationshipId
DELETE /api/v1/relationships/:relationshipId
POST /api/v1/relationship-groups
PATCH /api/v1/relationship-groups/:groupId
DELETE /api/v1/relationship-groups/:groupId
```

## Assets

```http
POST /api/v1/assets/upload-intents
POST /api/v1/assets/finalize
GET /api/v1/assets/:assetId
PATCH /api/v1/assets/:assetId
DELETE /api/v1/assets/:assetId
POST /api/v1/asset-links
DELETE /api/v1/asset-links/:linkId
```

## Content Submissions

```http
GET /api/v1/projects/:projectId/submissions?status=&type=&cursor=&limit=
POST /api/v1/projects/:projectId/submissions
GET /api/v1/content-submissions/:submissionId
PATCH /api/v1/content-submissions/:submissionId/status
```

Approval action depends on submission type: image submissions link assets to gallery; text submissions create or link story/publication records.

## Public Project Pages

```http
GET /api/v1/projects/:projectId/public-page
PUT /api/v1/projects/:projectId/public-page
GET /api/v1/projects/:projectId/public-preview?role=
GET /api/v1/public/projects/:slug
```

Builder and preview endpoints are authenticated workspace APIs. The public renderer endpoint returns only visitor-safe data.

## Search

```http
GET /api/v1/search?q=&projectId=&types=&cursor=&limit=
GET /api/v1/public/search?q=&types=&cursor=&limit=
```

Private and public search should remain separate to prevent accidental private data leakage.
