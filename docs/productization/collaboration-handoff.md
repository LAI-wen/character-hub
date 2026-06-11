# Collaboration Handoff

Date: 2026-06-08.

## Current State

The project is between prototype and production architecture.

There are three important layers:

```txt
oc-tools-new/  Visual design source of truth.
app/           Current frontend skeleton and migration target.
api/           Existing Cloudflare Workers backend draft.
```

The current priority is frontend structure and UI/UX migration. Do not make the backend schema final yet.

## What Was Recently Added

### Frontend skeleton

`app/` now contains a static ES module skeleton with:

- hash routing;
- account workspace routes;
- project workspace routes;
- public renderer route;
- dynamic sidebar from project capabilities and viewer role;
- mock adapter and mock domain data;
- smoke test for core product rules.

### Sidebar decisions

The accepted sidebar direction is:

- keep the `oc-tools-new` current project dropdown pattern;
- project dropdown switches projects only;
- current project menu shows operations for the selected project;
- do not show every project expanded in the sidebar;
- account tools stay outside project modules;
- `公開預覽` and `發布設定` live inside `公開頁`;
- `加入申請` and `作品投稿` are collapsed into `審核中心`;
- section collapse state and sidebar drawer state are remembered.

### Project overview migration

`app/screens/project-overview.js` has started moving from skeleton explanation cards to `oc-tools-new/pages/workspace.html` style:

- hero/breadcrumb;
- quick create row;
- recent updates;
- stats tiles;
- capability-based actions.

### Demo page migration batch 1

The demo frontend now has oc-new-style screens for the routes most likely to be clicked during a demo:

- account home;
- account character library;
- commissions;
- height comparison;
- account settings;
- project overview;
- project characters;
- worldview;
- story;
- gallery;
- relationships;
- roster;
- review center;
- participants;
- character template builder;
- project settings.

These screens intentionally copy the `oc-tools-new` visual language and content density while keeping the corrected `app/` routing, sidebar, and capability model.

This is still a demo migration. The heavy editor, real search, real drag/drop, persistence, and production component boundaries are not final.

Relationship system note:

- `app/screens/demo-pages.js#renderRelationships` was corrected to follow `oc-tools-new/pages/relationships.html`.
- It should keep the oc-new relationship system anatomy: large node map, relationship labels, group ring, relationship chips, pair detail card, shared album, and timeline.
- Do not replace it with a simplified generic graph/card layout.

### Demo page migration batch 2

Completed 2026-06-08:

- `#/app/projects/:id/public-page` now renders an oc-new-style public page Builder instead of a fallback screen.
- `#/p/:slug` now renders a visitor-safe public Renderer with the same visual language and without owner/editor controls.
- Worldview cards update the sticky detail panel.
- Gallery tiles open a local lightbox preview.
- Review center action buttons mark cards as approved/rejected locally.
- Height comparison rows toggle matching figures.
- Relationship map/chips update the selected relationship detail card.
- Sidebar section collapse, drawer collapse, and scroll position remain preserved.

## Run Locally

```bash
python3 -m http.server 4180
```

Open:

```txt
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab
http://127.0.0.1:4180/app/index.html#/login
```

## Test

```bash
node app/smoke-test.js
npm --prefix app run check
npm --prefix api test
npx tsc --noEmit
node --check app/router.js
node --check app/render.js
node --check app/main.js
node --check app/screens/demo-pages.js
node --check app/screens/public-project.js
node --check app/screens/project-overview.js
```

Rendered QA last run:

```txt
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab/public-page
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab/worldview
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab/gallery
http://127.0.0.1:4180/app/index.html#/app/tools/wishlist
http://127.0.0.1:4180/app/index.html#/app/tools/height
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab/relationships
http://127.0.0.1:4180/app/index.html#/login
```

Verified: page loads, no console errors, public page edit mode, submit modal, worldview detail switch, gallery lightbox, wishlist add/convert actions, height toggle, relationship detail switch, and login/signup mode toggle.

Full route smoke QA was also run against account routes, public/private/open project routes, and `#/p/tokoyo-open`; all checked routes rendered their expected title/content and reported zero console errors.

### Static demo deployment prep

Completed 2026-06-08:

- `app/` is now self-contained for Cloudflare Pages output.
- `app/assets/ds.css` is copied from `oc-tools-new/assets/ds.css`.
- `app/styles.css` imports the local design-token copy.
- `app/_headers` and `app/_redirects` were added for Pages.
- `app/package.json` now exposes `npm run check` and `npm run serve`.
- Deployment notes were added in `app/README.md` and `docs/productization/demo-deployment.md`.
- `npm --prefix app run check` passed.
- Browser QA against `http://127.0.0.1:4179/index.html#/app/projects/open-collab` confirmed nonblank render, sidebar, main title, local stylesheet, and zero console errors.

### API bridge and login UI

Completed 2026-06-08:

- `api/src/demo/router.ts` exposes read-only `/api/v1/demo/*` endpoints matching the current frontend adapter.
- `app/adapters/data-store.js` lets the frontend replace bundled mock data with a Worker bootstrap snapshot.
- `app/adapters/api-client.js` loads `/api/v1/demo/bootstrap` and falls back to mock data if the Worker is absent.
- `app/screens/auth.js` adds oc-new-style login/register routes at `#/login` and `#/signup`.
- Email login/register is wired to `/api/v1/auth/login` and `/api/v1/auth/register`.
- Google/GitHub OAuth buttons point to the existing backend auth routes.
- OAuth callbacks now land at `#/auth/callback?token=...`.
- This is a demo bridge, not the final auth/session or D1 data architecture.

## Files To Review Before Collaborating

```txt
README.md
docs/productization/README.md
docs/productization/demo-qa-checklist.md
docs/productization/demo-deployment.md
docs/productization/frontend-architecture-recommendation.md
docs/productization/frontend-skeleton-stage-record.md
docs/productization/frontend-migration.md
docs/productization/domain-model.md
docs/productization/feature-matrix.md
docs/productization/permission-matrix.md
docs/productization/security-findings.md
oc_frontend_scan_report.md
```

## Suggested Commit Contents

Likely include:

```txt
.gitignore
README.md
app/
docs/productization/
docs/superpowers/plans/2026-06-07-frontend-scope-skeleton.md
oc-tools-new/
oc_frontend_scan_report.md
```

Review before including:

```txt
api/wrangler.toml
```

This file was already modified before the latest frontend documentation pass. Confirm whether the change is intentional before committing it.

Do not include:

```txt
*.zip
node_modules/
.wrangler/
dist/
.env
.dev.vars
*.local
```

## Current Next Work

Recommended order:

1. Run `docs/productization/demo-qa-checklist.md` before demo handoff.
2. Do a full route-by-route visual pass against `oc-tools-new/pages/*.html`.
3. Deploy the static `app/` demo through Cloudflare Pages.
4. Continue route-by-route visual QA against `oc-tools-new/pages/*.html`.
5. Only then revisit D1 schema and API contracts.

## Important Product Rules

- Characters can exist without any project.
- A project includes a character through a project-scoped link.
- Project-specific fields, roster status, faction, and template values belong to the project-scoped link.
- Public visibility and collaboration management are separate capabilities.
- Account-level tools such as commissions, wishlist, height comparison, global character library, and global search should not be forced into every project.
- Public renderer routes must not include owner/editor controls or private workspace payloads.
