# Frontend Skeleton Stage Record

Status: accepted for next-stage planning.

Date: 2026-06-08.

## Scope Completed

This stage built the first formal frontend skeleton in `app/`. It is intentionally not the full production frontend and does not connect to the backend. Its purpose is to validate information architecture, route boundaries, and project capability-driven navigation before migrating the large `oc-tools-new` pages.

## Implemented Files

```txt
app/index.html
app/main.js
app/router.js
app/styles.css
app/domain.js
app/mock-data.js
app/adapters/mock-adapter.js
app/screens/account-home.js
app/screens/account-characters.js
app/screens/project-overview.js
app/screens/project-characters.js
app/screens/project-manage.js
app/screens/public-project.js
app/smoke-test.js
```

## Current Architecture

- Static ES module app under `app/`.
- Hash router for account, project, and public renderer routes.
- Mock adapter with formal domain shapes.
- `Character` can exist without a project.
- Project-scoped character lists use project links.
- Project switcher excludes account-level private character storage.
- Sidebar is generated from project capabilities plus viewer role.

## Accepted Sidebar IA

```txt
CharacterHub
OC workspace

[scope-aware search]
[+ 新增]

ACCOUNT
工作台
我的角色

TOOLS
委託中心
Wishlist
身高比較

CURRENT PROJECT
[project switcher]

CONTENT
企劃總覽
角色
世界觀
故事
圖庫
關係圖
靈感

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

## UX Decisions Locked For Now

- Keep the `oc-tools-new` sidebar pattern: current project dropdown plus one project menu.
- Do not use a multi-project folder tree.
- `公開預覽` and `發布設定` live inside the public page.
- `加入申請` and `作品投稿` are collapsed into `審核中心`.
- `權限` does not own a sidebar entry; it belongs inside participants or project settings.
- `委託中心`, `Wishlist`, and `身高比較` are separate account-level tools.
- Sidebar section collapse state is remembered.
- Sidebar collapsed/expanded drawer state is remembered.
- Sidebar scroll position is preserved across route changes.
- Account/tool pages keep the current project menu visible.

## Validation

Commands run:

```bash
node app/smoke-test.js
node --check app/router.js
node --check app/render.js
node --check app/main.js
curl -I http://127.0.0.1:4180/app/index.html
```

Result:

```txt
frontend skeleton smoke test passed
HTTP 200 for app/index.html
```

## Known UX Risks

- The skeleton content pages still feel less like `oc-tools-new` because the actual dashboard, roster, gallery, and worldbuilding layouts have not been migrated yet.
- The sidebar now has more behavior than the original design: scope-aware search, quick create, section collapse, and drawer collapse.
- Mobile/drawer behavior needs a dedicated visual QA pass after core pages are migrated.
- Search is only a placeholder; real command palette and scoped search are not implemented yet.
- Section collapse is currently localStorage-based and should later be moved into user preferences.

## Recommended Next Stage

Move from skeleton IA to visual/product migration:

1. Migrate the `oc-tools-new/pages/workspace.html` project overview visual language into the `app/` project overview screen.
2. Replace skeleton project overview cards with oc-new style quick create, recent updates, and stat tiles.
3. Migrate account-level `我的角色` toward the oc-new dashboard card layout while preserving the global-vs-project distinction.
4. Keep API/backend work paused until the migrated pages confirm the domain model.
5. After visual migration, start defining the production frontend component boundaries.

## Next Stage Progress

Started 2026-06-08.

- Migrated `app/screens/project-overview.js` from skeleton explanation cards to the `oc-tools-new/pages/workspace.html` style structure.
- Project overview now uses an oc-new-like hero, quick create row, recent updates list, and stat tiles.
- The implementation keeps the current mock adapter and project capability rules instead of restoring the old fixed demo data.
- Sidebar and backend boundaries remain unchanged.

Additional migration pass completed 2026-06-08:

- Added `oc-tools-new/pages/portal.html`-style public page Builder at `#/app/projects/:id/public-page`.
- Updated `#/p/:slug` public Renderer to use the same visitor-facing display language while keeping management controls out of the renderer.
- Added local demo interactions for public page edit mode, submit modal, worldview detail selection, gallery lightbox, review card resolution, height comparison toggles, and relationship detail selection.
- Kept these interactions frontend-only; backend contracts remain paused.

Validation added in this pass:

```bash
node --check app/screens/demo-pages.js
node --check app/router.js
node --check app/screens/public-project.js
node app/smoke-test.js
curl -I http://127.0.0.1:4180/app/index.html
```

Rendered browser QA passed for:

```txt
public page edit mode
public page submit modal
worldview detail switch
gallery lightbox
height comparison toggle
relationship detail switch
```
