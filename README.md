# CharacterHub / OC Tools

CharacterHub is being productized from a polished static frontend prototype into a production-ready OC/character workspace.

Current status: frontend productization planning plus a static frontend skeleton. Backend work exists under `api/`, but the current product decision is to finish frontend scope, routes, and UI/UX migration before changing the backend data model.

## What To Look At First

```txt
README.md                                      This file.
docs/productization/README.md                  Collaboration and productization index.
docs/productization/frontend-skeleton-stage-record.md
                                                Current accepted frontend skeleton state.
docs/productization/frontend-migration.md      Frontend migration strategy and route boundaries.
docs/productization/demo-deployment.md         Static demo deployment settings.
docs/productization/domain-model.md            Draft product domain model.
oc-tools-new/                                  Current visual design source of truth.
app/                                           Current static ES module frontend skeleton.
api/                                           Existing Cloudflare Workers API draft.
```

## Current Frontend Direction

Use `oc-tools-new` as the visual and interaction design source. The current `app/` skeleton should preserve that design language while fixing product structure:

- Account-level data can exist outside any project.
- Projects are composable creative spaces, not one fixed workflow.
- Public display and collaboration management are independent capabilities.
- Sidebar keeps the `oc-tools-new` pattern: current project dropdown plus one current project menu.
- Do not expand every project into a giant sidebar tree.
- Do not expose engineering terms such as `ProjectCharacterLink` in user-facing UI.

## Local Frontend Preview

The current frontend skeleton is static and does not need a bundler.

```bash
python3 -m http.server 4180
```

Open:

```txt
http://127.0.0.1:4180/app/index.html#/app/projects/open-collab
```

The deployable demo target is `app/`. It can also be served directly from that folder:

```bash
npm --prefix app run serve
```

Open:

```txt
http://127.0.0.1:4180/index.html#/app/projects/open-collab
```

Useful routes:

```txt
/app/index.html#/app
/app/index.html#/login
/app/index.html#/app/characters
/app/index.html#/app/projects/public-portfolio
/app/index.html#/app/projects/private-collab
/app/index.html#/app/projects/open-collab
/app/index.html#/p/tokoyo-open
```

## Frontend Checks

```bash
node app/smoke-test.js
npm --prefix app run check
node --check app/router.js
node --check app/render.js
node --check app/main.js
node --check app/screens/project-overview.js
```

The smoke test verifies the current first-pass product rules:

- Characters can exist without a project.
- The project switcher excludes account-level private character storage.
- Personal projects do not show collaboration management.
- Public showcase projects include public page tools but no participant workflow.
- Collaborative projects collapse applications/submissions into review center.
- Public renderer payload does not include private management role data.

## Demo API Bridge

The frontend attempts to hydrate from the Worker before falling back to bundled mock data:

```txt
GET /api/v1/demo/bootstrap
```

When testing a separate Worker, open the app with:

```txt
/app/index.html?api=http://127.0.0.1:8787/api/v1#/app/projects/open-collab
```

Login/register UI lives at:

```txt
/app/index.html#/login
/app/index.html#/signup
```

## Backend Draft

The API draft lives in `api/` and targets Cloudflare Workers with Hono, D1, and R2.

```bash
cd api
npm install
npm test
npm run dev
```

Important: the backend should not be treated as final until the frontend migration confirms the domain model.

## Static Demo Deployment

Recommended first demo deployment: Cloudflare Pages serving the static `app/` folder.

```txt
Build command: npm --prefix app run check
Build output directory: app
Root directory: repository root
Demo route: /index.html#/app/projects/open-collab
```

See:

```txt
app/README.md
docs/productization/demo-deployment.md
```

## Design Source

`oc-tools-new/` is the current design reference. When migrating UI into `app/`, prefer copying the actual visual structure, spacing, typography, and interaction tone from the relevant `oc-tools-new/pages/*.html` file instead of inventing a new layout.

Current migration priority:

1. Project overview / workspace.
2. Account-level character dashboard.
3. Project character list and roster.
4. Worldview master-detail.
5. Public page builder versus public renderer.

## Do Not Commit

The source zip and local generated/cache files should stay out of git:

```txt
*.zip
node_modules/
.wrangler/
dist/
.env
.dev.vars
*.local
```

## Collaboration Notes

Before changing product structure, read:

```txt
docs/productization/frontend-skeleton-stage-record.md
docs/productization/domain-model.md
docs/productization/frontend-migration.md
```

Before changing UI, compare with the matching file under:

```txt
oc-tools-new/pages/
oc-tools-new/assets/
```

Before changing backend schema or APIs, update the draft docs first:

```txt
docs/productization/schema-draft.md
docs/productization/api-contract-draft.md
docs/productization/permission-matrix.md
```
