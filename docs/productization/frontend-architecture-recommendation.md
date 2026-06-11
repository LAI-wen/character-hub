# Frontend Architecture Recommendation

Status: working recommendation.

Date: 2026-06-08.

## Goal

The frontend should preserve the `oc-tools-new` visual design while replacing the prototype structure with production-ready routes, data boundaries, permissions, and component ownership.

The design source of truth is:

```txt
oc-tools-new/pages/*.html
oc-tools-new/assets/ds.css
oc-tools-new/assets/shell.css
```

Do not reinterpret the visual style unless the product owner explicitly approves it. The migration target should copy the typography, spacing, density, sidebar tone, card anatomy, and interaction patterns from `oc-tools-new`.

## Product Model Assumptions

- Characters and content can exist without any project.
- A project is a configurable creative space, not necessarily public and not necessarily collaborative.
- Public display and collaboration management are independent capabilities.
- Project-specific character data belongs to a project-character link, not to the global character record.
- Public renderer routes must never receive owner/editor controls or private workspace data.

Recommended project capability model:

```ts
Project {
  collaborationMode: "solo" | "collaborative"
  visibility: "private" | "unlisted" | "public"
  portalEnabled: boolean
  joinPolicy: "closed" | "invite" | "application" | "open"
  submissionsEnabled: boolean
  enabledFeatures: string[]
}
```

Navigation, page access, and API payloads should derive from:

```txt
project capabilities + viewer permission
```

## Route Architecture

Recommended top-level route split:

```txt
/app
  Account workspace.

/app/characters
  Global character library, including characters that are not in any project.

/app/characters/:characterId
  Internal character detail.

/app/characters/:characterId/edit
  Internal character editor.

/app/projects/:projectId
  Single project workspace overview.

/app/projects/:projectId/characters
  Characters linked to this project only.

/app/projects/:projectId/characters/:characterId
  Project-scoped character detail.

/app/projects/:projectId/worldview
/app/projects/:projectId/story
/app/projects/:projectId/gallery
/app/projects/:projectId/relationships
/app/projects/:projectId/inbox
  Project content modules.

/app/projects/:projectId/public-page
  Authenticated public page Builder.

/app/projects/:projectId/roster
/app/projects/:projectId/review
/app/projects/:projectId/participants
/app/projects/:projectId/template
  Collaboration management modules.

/app/projects/:projectId/settings
  Project settings.

/p/:slug
  Visitor-safe public project Renderer.

/c/:slug
  Visitor-safe public character Renderer.
```

Do not reuse the same route for internal character detail, public character pages, and commission briefs. They can share components, but they should not share the same payload or route.

## Sidebar IA

Keep the `oc-tools-new` current project dropdown pattern.

Recommended sidebar:

```txt
CharacterHub

[Search]
[+ Create]

ACCOUNT
工作台
我的角色

TOOLS
委託中心
Wishlist
身高比較

CURRENT PROJECT
[Project dropdown]

CONTENT
企劃總覽
角色
世界觀
故事
圖庫
靈感
關係圖

PUBLIC PAGE
公開頁

COLLABORATION
角色名冊
審核中心
參與者
角色卡模板

PROJECT
企劃設定
```

Sidebar rules:

- Project dropdown only switches project.
- Current project menu only shows operations for the selected project.
- Do not expand every project into a sidebar tree.
- `公開預覽` and `發布設定` belong inside the public page.
- `加入申請` and `作品投稿` belong inside `審核中心`.
- `權限` belongs inside participants or project settings.
- Sidebar scroll position should persist across route changes.
- Section collapse and drawer collapse should persist as user preferences.

## Recommended Frontend Code Shape

Short-term demo can remain a static ES module app under `app/`.

For production, move toward:

```txt
apps/web/src/
  app/
    router/
    layouts/
    providers/

  shell/
    AppShell
    Sidebar
    ProjectSwitcher
    SearchCommand
    QuickCreate

  features/
    account/
    characters/
    projects/
    worldview/
    story/
    gallery/
    relationships/
    public-page/
    collaboration/
    settings/

  components/
    ui/
    oc/
    forms/
    overlays/

  data/
    adapter.ts
    mock-adapter.ts
    api-adapter.ts
    query-keys.ts

  domain/
    project.ts
    character.ts
    permissions.ts
    capabilities.ts

  styles/
    tokens.css
    oc-new.css
    app.css
```

Recommended production stack:

```txt
Vite + React + TypeScript
```

Reasoning:

- Builder, editor, relationship map, gallery, and review center are stateful.
- Permission-driven UI needs clear component boundaries.
- API-backed loading, error, optimistic state, and caching will be easier to maintain.
- Feature folders can own their screens, local state, and API hooks.

## Adapter Boundary

Keep screens behind an adapter interface so mock data can be replaced by backend calls without rewriting UI:

```ts
interface CharacterHubAdapter {
  listProjects(): ProjectSummary[]
  getProject(projectId: string): ProjectDetail
  listAccountCharacters(): CharacterSummary[]
  getCharacter(characterId: string): CharacterDetail
  listProjectCharacters(projectId: string): ProjectCharacterSummary[]
  getProjectCharacter(projectId: string, characterId: string): ProjectCharacterDetail
  listWorldEntries(projectId: string): WorldEntrySummary[]
  listSubmissions(projectId: string): SubmissionSummary[]
  getPublicProject(slug: string): PublicProjectPayload
}
```

Current demo uses:

```txt
mock-adapter
```

Production should add:

```txt
api-adapter
```

## UI/UX Design Rules

Follow `oc-tools-new` fidelity:

- grey-white workspace background;
- quiet white sidebar;
- cream yellow active states;
- thin borders and soft shadows;
- serif page titles around 34-40px;
- body copy around 14-15px;
- mono labels around 10-11px;
- restrained chips and pills;
- no engineering labels in rendered UI;
- no landing page in place of the actual workspace;
- every clickable control should navigate, open a modal, change local state, or show a clear toast.

Important visual risks to test:

- action bars inside cards must not inherit global button heights;
- text must not be clipped inside chips, cards, sidebar rows, or buttons;
- long sidebar menus must preserve scroll position;
- mobile and narrow viewports must stack columns instead of clipping;
- public renderer pages must not show builder chrome.

## Backend Integration Readiness

Core backend entities:

```txt
User
Project
Character
ProjectCharacterLink
WorldEntry
Story
Asset
Relationship
Submission
Participant
Permission
```

`ProjectCharacterLink` should own:

```txt
projectId
characterId
factionId
projectRole
status
templateVersionId
fieldValues
```

Public payloads should be separate from workspace payloads:

```txt
GET /api/public/projects/:slug
GET /api/app/projects/:projectId/public-page
```

The public endpoint returns only published visitor-safe fields. The app endpoint can include builder blocks, draft state, permissions, and owner/editor controls.

## Performance Recommendations

- Lazy-load large editors and builders.
- Lazy-load relationship graph and gallery lightbox logic.
- Use thumbnail URLs for gallery grids.
- Keep public renderer payloads small and cacheable.
- Paginate or virtualize large character libraries.
- Scope search by account/project and do not ship private full-text indexes to public pages.
- Keep image storage in R2 and serve optimized variants.
- Use route-level loading states that match oc-new visual language.

## Security Recommendations

- Do not trust client-side role switches.
- Enforce permission checks in the API.
- Public pages must not receive private fields and rely on CSS/JS hiding.
- Add Turnstile and rate limiting for public submission flows.
- Validate upload MIME type, size, and ownership before storing assets.
- Separate drafts from published content at the data layer.
- Avoid mixing internal builder payloads with public renderer payloads.

## Recommended Next Steps

1. Finish route-by-route visual migration from `oc-tools-new`.
2. Run screenshot and interaction QA on every demo route before deployment.
3. Extract repeated oc-new primitives into shared components.
4. Define the production adapter contract.
5. Deploy the static demo to Cloudflare Pages.
6. Resume D1 schema and Worker API design after page responsibilities stabilize.
