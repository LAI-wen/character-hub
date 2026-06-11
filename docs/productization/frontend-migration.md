# CharacterHub Frontend Migration Draft

Status: draft.

## Strategy

Use `oc-tools-new` as a visual and interaction design source. Do not preserve its runtime architecture. The production frontend should be a typed app with routes, components, services, and state boundaries.

The biggest structural issue is not missing pages. It is that the draft applies one fixed project workspace and management flow to every project. The formal frontend must separate account-level tools, single-project workspace, public renderers, and management modules.

## First Skeleton Milestone

Implemented in `app/` as a static ES module skeleton. This milestone intentionally does not migrate the large editor or connect to the backend. It validates four scopes can coexist:

- Account-level character library, including characters with no project.
- Personal private project without public/collaboration management.
- Solo public showcase with public page tools but no participant/submission workflow.
- Collaborative project with roster, applications, submissions, participants, and permissions.

Run `node app/smoke-test.js` to verify the first-pass scope rules.

Stage record: `docs/productization/frontend-skeleton-stage-record.md`.

## Recommended Architecture

```txt
src/
  routes/
  components/
  services/api/
  services/search/
  services/assets/
  state/
  domain/
```

## Shared Modules To Extract

- App shell and project navigation
- Dynamic sidebar generated from project capabilities plus user permissions
- Command palette
- Search result cards
- Recent/favorite service
- Character card and filters
- Character editor tabs
- Gallery manager
- Marker board
- Privacy/share panel
- Project template field editor
- Worldview list/detail/editor
- Relationship graph/detail/editor
- Submission review cards
- Member/permission table

## Migration Order

1. Define project capabilities and the three project creation presets.
2. Create typed shell and dynamic sidebar from project capabilities plus user permissions.
3. Split account workspace from single-project workspace.
4. Add real character and project-character routes with `characterId` and `projectId`.
5. Build API client with mocked adapter and production adapter.
6. Migrate character list and roster around `Character` plus `ProjectCharacterLink`.
7. Split editor into character core sections and project-specific field sections.
8. Split character internal detail, public share page, and commission brief routes.
9. Split public project builder from public project renderer.
10. Split character applications from content submissions.
11. Split account settings, project settings, and character share settings.
12. Migrate worldview, relationships, gallery, story, commissions, login, and account-level tools.

## Route Boundaries

```txt
/app
/app/characters
/app/characters/:characterId
/app/characters/:characterId/edit

/app/projects/:projectId
/app/projects/:projectId/characters
/app/projects/:projectId/characters/:characterId
/app/projects/:projectId/roster
/app/projects/:projectId/worldview
/app/projects/:projectId/stories
/app/projects/:projectId/gallery
/app/projects/:projectId/relationships
/app/projects/:projectId/public-page
/app/projects/:projectId/settings

/app/projects/:projectId/manage/template
/app/projects/:projectId/manage/applications
/app/projects/:projectId/manage/submissions
/app/projects/:projectId/manage/participants
/app/projects/:projectId/manage/permissions

/p/:slug
/c/:shareToken
/commission/:shareToken
```

The Builder routes may include preview modes. Renderer routes must not include owner/editor controls or private workspace payloads.

## Code Patterns To Avoid

- Page-level inline scripts as long-term production code.
- Direct `innerHTML` with user-supplied content.
- Runtime authority from `localStorage`.
- Downloading all private workspace data for client-side search.
- Token storage in localStorage/sessionStorage.
- Fixed project navigation that shows template, roster, submissions, and participants for projects that do not enable those capabilities.
- Route links without entity IDs, such as `character.html` and `editor.html`, because they cause every character to share one hardcoded page.
