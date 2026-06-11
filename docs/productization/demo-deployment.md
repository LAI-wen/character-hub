# Static Demo Deployment

Status: ready for first Cloudflare Pages demo deployment. Local static-output QA passed on 2026-06-08.

## Deployment Target

Deploy the static frontend only:

```txt
Output directory: app
Build command: npm --prefix app run check
Root directory: repository root
```

The demo does not require backend services yet. Keep `api/` out of the deployment path until the frontend route responsibilities and D1 schema are stable.

## Demo Entry Points

Primary demo route:

```txt
/index.html#/app/projects/open-collab
```

Useful route checks:

```txt
/index.html#/app
/index.html#/login
/index.html#/signup
/index.html#/app/characters
/index.html#/app/tools/commissions
/index.html#/app/tools/wishlist
/index.html#/app/tools/height
/index.html#/app/projects/public-portfolio
/index.html#/app/projects/private-collab
/index.html#/app/projects/open-collab/public-page
/index.html#/app/projects/open-collab/relationships
/index.html#/p/tokoyo-open
```

## Files Added For Deployment

```txt
app/_headers
app/_redirects
app/assets/ds.css
app/README.md
```

`app/assets/ds.css` is copied from `oc-tools-new/assets/ds.css` so the Cloudflare Pages output can be only `app/`.

## Pre-Deploy Check

Run:

```bash
npm --prefix app run check
```

Then run the visual QA checklist:

```txt
docs/productization/demo-qa-checklist.md
```

Latest local static-output QA:

```txt
URL: http://127.0.0.1:4179/index.html#/app/projects/open-collab
Result: nonblank render, sidebar present, main title present, local stylesheet loaded, zero console errors.
```

## Current Scope

This is a frontend demo. It verifies:

- oc-new style migration direction;
- sidebar IA;
- account-level tools;
- project capability menus;
- Worker demo-data bootstrap with mock fallback;
- email login/register UI wired to the existing auth API shape;
- public builder versus public renderer split;
- basic local interactions.

It intentionally does not finalize:

- real auth;
- final session architecture;
- persistence;
- D1 schema;
- R2 asset upload;
- production search;
- editor autosave.

## API Connection

The frontend defaults to:

```txt
/api/v1
```

For a static Pages deployment with a separate Worker, either configure a Pages rewrite/proxy for `/api/v1/*` or open the demo with:

```txt
?api=https://YOUR-WORKER.workers.dev/api/v1
```

Current read bridge:

```txt
GET /api/v1/demo/bootstrap
GET /api/v1/demo/projects
GET /api/v1/demo/projects/:id
GET /api/v1/demo/projects/:id/navigation
GET /api/v1/demo/characters
GET /api/v1/demo/projects/:id/characters
GET /api/v1/demo/public-projects/:slug
```

This bridge mirrors the current frontend adapter. It is intentionally not the final D1 schema.
