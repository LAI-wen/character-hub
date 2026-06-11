# Productization Docs Index

Status: active collaboration notes.

This folder records the productization decisions for CharacterHub. Treat these docs as working agreements, not final legal/spec contracts.

## Read In This Order

1. `frontend-skeleton-stage-record.md`
   - Current accepted frontend skeleton state.
   - Sidebar IA, route boundaries, validation commands, and known risks.

2. `frontend-migration.md`
   - Migration strategy from static prototype to production frontend.
   - Route boundaries and code patterns to avoid.

3. `frontend-architecture-recommendation.md`
   - Recommended route architecture, sidebar IA, component structure, adapter boundary, UI/UX rules, backend readiness, performance, and security direction.

4. `domain-model.md`
   - Core product model.
   - Explains why characters can exist without projects and why project-specific character data belongs on project links.

5. `feature-matrix.md`
   - Which capabilities appear for personal, public, private collaborative, and public collaborative projects.

6. `permission-matrix.md`
   - Draft role and permission rules.

7. `schema-draft.md`
   - D1 schema direction.
   - Do not implement as final until frontend route/page migration stabilizes.

8. `api-contract-draft.md`
   - API shape draft for the eventual backend.

9. `security-findings.md`
   - Security concerns found during frontend/backend planning.

10. `demo-deployment.md`
   - Static Cloudflare Pages demo settings and pre-deploy checks.

11. `page-inventory.md`
   - Inventory of the imported prototype pages and their intended production responsibility.

## Current Product Decisions

- `oc-tools-new/` is the visual design source.
- `app/` is the current frontend skeleton and migration target.
- Backend schema/API should wait until frontend page responsibilities are clearer.
- Account-level tools are not project modules by default.
- Characters and content may exist without any project.
- Project navigation is generated from project capabilities plus viewer permissions.
- Public renderers must be separate from owner/editor builders.

## Current Accepted Sidebar Direction

```txt
CharacterHub
OC workspace

[search]
[+ create]

ACCOUNT
工作台
我的角色

TOOLS
委託中心
Wishlist
身高比較

CURRENT PROJECT
[project dropdown]

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

Do not replace this with a sidebar tree where every project expands into its own full menu.

## Current Next Step

Continue migrating visible UI from `oc-tools-new` into `app/` while preserving the corrected product model.

Recommended order:

1. Run the full demo QA checklist route-by-route.
2. Deploy the static `app/` demo through Cloudflare Pages.
3. Continue route-by-route visual checks against `oc-tools-new/pages/*.html`.
4. Keep moving prototype pages into `app/` without changing the backend schema yet.
5. Resume backend/D1 design only after page responsibilities stabilize.

## Validation Commands

```bash
node app/smoke-test.js
npm --prefix app run check
node --check app/router.js
node --check app/render.js
node --check app/main.js
node --check app/screens/project-overview.js
node --check app/screens/demo-pages.js
node --check app/screens/public-project.js
```

For frontend preview:

```bash
python3 -m http.server 4180
```

Then open:

```txt
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab
```
