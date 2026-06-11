# API Mode QA + Integration Fix

Status: checked in API Mode QA + Integration Fix on 2026-06-09; Relationship API Vertical Slice added on 2026-06-09.
Scope: the API-backed data chain currently wired through API mode: Project / Character / ProjectCharacterLink / Worldview / Relationship / RelationshipLayout.

## How To Start API Mode

Open the static app with an explicit API base and data source flag:

```txt
/app/index.html?data=api&appApi=http://127.0.0.1:8787/api#/app
```

If both the app host and `appApi` base are local (`localhost`, `127.0.0.1`, or `::1`), demo auth headers are attached automatically. If either side is non-local, demo headers are not sent unless you explicitly opt into a demo environment with a flag such as `demo=1` or `env=demo`.

The app shell now shows an `API MODE` badge, the current `appApi` base, and a `切回 Mock` button.

## Roundtrip Result

Local-only API mode roundtrip succeeded on the v1 D1 schema.

Rendered QA environment:

- App: `http://127.0.0.1:4179/index.html?data=api&appApi=http://127.0.0.1:8787/api#/app`
- API: `http://127.0.0.1:8787/api`
- Browser check: API badge, base display, project creation, project character roster, world-entry create/update/delete, refresh persistence, and switch back to Mock.

Verified flow:

1. Create a project in API mode.
2. Refresh the page and confirm the project still exists.
3. Create a character in that project.
4. Confirm the project character list shows the new character.
5. Create a world entry.
6. Refresh the page and confirm the world entry still exists.
7. Switch back to Mock and confirm the mock home remains on seeded demo data, not the API-created project.

Additional browser checks:

- API badge and current `appApi` base rendered in the app shell.
- `切回 Mock` removed `data=api` / `source=api`, returned to `#/app`, removed the API banner, and showed seeded mock projects.
- World-entry create, update, and delete rerendered the page immediately without console errors.

## Fixed In This Pass

- `切回 Mock` now removes `data=api` / `source=api` from the URL, sets `ch:data-source=mock`, and reloads into `#/app`.
- API demo headers are only attached in local or explicit demo environments.
- Automatic demo headers now require both the app host and the `appApi` base to be local, preventing accidental demo headers from being sent to a remote API URL.
- API mode now shows the current base URL and an explicit return-to-mock action.
- World-entry display lookup now resolves related character names and related world-entry titles from cached records.
- World-entry create / update / delete now rerender the full page immediately after the local cache changes.
- API error payloads are formatted as `code · message · fields` instead of showing only a raw message.
- Removed the local `?v=2` module cache-busting import from `demo-pages.js`; the app now uses normal ESM imports again.

## Error Path Checks

Observed locally against the Worker:

- Duplicate project slug returns `409 CONFLICT` with `Project slug already exists`.
- Empty character name returns `400 VALIDATION_ERROR` with field-level validation details for `name`.
- A bad API base or a closed port surfaces as a network / timeout style failure from the client.
- Bad API base UI checks show `NETWORK_ERROR` toast for Project create, Character create, WorldEntry create, and WorldEntry update. No relevant console errors were emitted during those UI checks.

Not reproduced in this local-only environment:

- Non-local demo-header rejection. The current Worker dev run is local/demo-allowed, so the `DEMO_AUTH_DISABLED` path needs a non-local host or remote-style test target.
- Non-local demo-header rejection. The current Worker dev run is local/demo-allowed. Code-level guard is present: remote `appApi` bases do not receive demo headers unless `demo=1` / `env=demo` is set.

## Local D1 Preconditions

Before QA, prepare the local Worker database and seed data:

1. Apply the v1 local migration draft from `api/migrations/0001_characterhub_v1.sql`.
2. Seed the local demo account from `api/seeds/local-demo.sql`.
3. Start the Worker on `127.0.0.1:8787`.

Recommended local commands:

```bash
npx wrangler d1 execute oc-tools-db --local --file=api/migrations/0001_characterhub_v1.sql
npx wrangler d1 execute oc-tools-db --local --file=api/seeds/local-demo.sql
npm --prefix api run dev
```

Do not use `npm --prefix api run db:migrate` for this v1 app API check. That script still points at the legacy `api/src/db/migrations/0001_init.sql` path and is not the CharacterHub v1 schema.

Confirmed local D1 state in this QA pass:

- `projects` includes `owner_user_id`, `visibility`, `collaboration_mode`, `portal_enabled`, and `enabled_features_json`.
- Required v1 tables exist, including `characters`, `project_character_links`, `world_entries`, `entity_links`, `public_pages`, `public_page_versions`, `relationships`, `relationship_layouts`, `wishlist_items`, and `commissions`.
- `demo-user` exists with handle `demo` and display name `Demo User`.

## QA Tasks

Run these checks in order:

```bash
npm --prefix app run check
node app/smoke-test.js
node --check app/router.js
node --check app/render.js
node --check app/main.js
node --check app/screens/demo-pages.js
node --check app/adapters/mock-adapter.js
npm --prefix api test
npm --prefix api exec -- tsc -p tsconfig.json --noEmit
```

Manual route flow to verify in API mode:

1. Open `/app` and confirm the API banner is visible.
2. Create a project.
3. Create a character.
4. Add that character to the project.
5. Create a world entry.
6. Refresh the page and confirm the project, character link, and world entry still exist.
7. Open a project with no API data and confirm the empty state explains that the first project will be written to local D1.
8. Trigger a validation error in project create, character create, and world entry create/update, then confirm the toast shows the API code, message, and fields.

Relationship vertical slice manual flow:

1. Open an API-mode project that already has at least one project character or world entry.
2. Open `#/app/projects/:projectId/relationships`.
3. Click `新增關係 Add relationship`.
4. Confirm the new relationship appears in the legend and right-side card.
5. Click `編輯` in the right-side relationship card and confirm the card title updates.
6. Shift-click one visible node and confirm a toast reports the node position was updated.
7. Refresh the page and confirm the relationship and shifted node position persist.
8. Click `刪除` and confirm the relationship disappears immediately.
9. Refresh again and confirm the deleted relationship does not return.
10. Switch back to Mock and confirm seeded mock relationships are still separate from API-created local D1 data.

Relationship error paths to exercise:

- `GET /api/app/projects/bad-project/relationships` should return `404 NOT_FOUND` or `403 FORBIDDEN` depending on membership visibility.
- Creating with a missing or cross-project `sourceRef` / `targetRef` should return `422 UNPROCESSABLE_ENTITY`.
- Creating with an invalid body should return `400 VALIDATION_ERROR` with field details.
- Updating layout with a non-object `nodes` value should return `400 VALIDATION_ERROR`; oversized JSON should return `413 PAYLOAD_TOO_LARGE`.
- A bad `appApi` base should surface as a readable client error toast, not an unhandled promise.

## Mock / API Switching

- Mock mode is the default state when `data=api` is not present.
- API mode can be entered with `data=api` or `source=api`.
- The app shell button switches back to Mock by writing `ch:data-source=mock`, stripping `data` / `source` from the URL, and reloading into `#/app`.
- The current `appApi` base can be overridden with `appApi=<url>`.

## Known Limits

- Story, Gallery, Collaboration, Wishlist, and Commission remain outside this QA scope.
- Public renderer and broader collaboration flows are still not part of this API-mode pass.
- API mode still depends on the local Worker and local D1 data; it is not a production deployment path.
- Some API responses still differ from the mock store shape, but the current UI now resolves the important display labels for world-entry links.
- Relationship responses include temporary UI compatibility fields (`title`, `desc`, `chip`, `nodes`, `avatars`) alongside the formal contract fields. The formal fields remain the backend source of truth.
- `npm --prefix api exec -- tsc -p tsconfig.json --noEmit` may resolve `tsconfig.json` from the repo root in this local npm setup. Running the equivalent command from `api/` works: `cd api && npm exec -- tsc -p tsconfig.json --noEmit`.

## What This Pass Fixes

- API mode is visible in the shell instead of being implicit.
- Demo auth headers no longer leave the browser unless the host is local or the environment is explicitly marked demo.
- Empty API project lists get a clear local-D1 explanation.
- World-entry related character and related entry links show human-readable labels instead of raw IDs.
- Project, character, and world-entry create/update errors surface as readable toasts.
