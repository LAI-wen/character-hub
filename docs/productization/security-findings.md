# CharacterHub Security Findings

Status: draft.

## Findings From Current Design And Backend

### Design Draft Risk Baseline

The full frontend scan report found approximately 142 `innerHTML` uses, 43 `localStorage` uses, and 176 inline `onclick` uses across the design draft. These are acceptable as prototype shortcuts, but they make the draft unsafe to wire directly to production data.

### S1: CORS Origin Reflection

Current `api/src/middleware/cors.ts` reflects any incoming `Origin` and allows credentials. Production must restrict allowed origins or move to same-origin Worker static assets plus API.

### S1: Browser Storage Tokens

Root `assets/api.js` stores access tokens in `sessionStorage`. Production should use HttpOnly, Secure, SameSite cookies and server-side session validation.

### S1: Client-Side Visibility Is Not Authorization

The design uses local project data and local filters for private/public concepts. Production APIs must enforce visibility, membership, ownership, and host-only fields server-side.

Public project `role` or preview switches may exist only inside authenticated Builder previews. Public Renderer routes must receive a visitor-safe payload from the server, not hide private controls client-side.

### S1: Private Search Leakage Risk

Command palette and page searches currently rely on frontend data. Production search must filter by permissions before matching and return summaries only.

### S2: DOM XSS Risk

Many pages use `innerHTML` to render text that will become user-controlled. Production frontend should use component rendering with escaped text, or strict sanitization for intentional rich text.

### S2: Asset Upload Risk

Current media route uploads through Worker and returns a hardcoded public URL. Production should use validated upload intents, direct R2 upload, finalize API, MIME/size/dimension checks, quota checks, and private asset access rules.

### S2: IDOR Risk

Existing routes are owner-only and do not yet model project membership. New project-scoped endpoints must verify resource membership, not just accept IDs.

All routes using `projectId`, `characterId`, `projectCharacterLinkId`, `assetId`, or share tokens need explicit ownership, membership, visibility, or token validation.

### S2: Host-Only Field Leakage

Template fields include `vis: host`. API responses must omit host-only values unless current user has host permission.

### S3: Auditability Missing

Role changes, invite regeneration, approval/rejection, privacy changes, and share-link regeneration should write audit logs.

## Required Security Baseline

- Same-origin cookies or strict allowlist CORS.
- Rate limiting for auth, invite joins, public submissions, and password attempts.
- Turnstile for public submission and high-risk auth flows.
- Prepared statements with `bind()`.
- Server-generated share tokens and revocation.
- No permanent public URL for private assets.
- CSP and security headers for the frontend.
- Separate internal workspace API payloads from public renderer payloads.
- Validate project capability gates server-side before exposing template, roster, application, submission, participant, or public-page management APIs.
