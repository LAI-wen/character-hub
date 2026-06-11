# CharacterHub Productization Page Inventory

Status: draft, updated from the first scan of `oc-tools-new` and `oc_frontend_scan_report.md`.

## Scope

`oc-tools-new` is treated as a product design artifact, not production frontend code. Each page below is scanned for product purpose, data reads/writes, permissions, API impact, schema impact, security risks, performance risks, and migration direction.

The upstream scan report covered 20 HTML pages plus `data.js`, `shell.js`, `app.js`, and shared CSS. It found roughly 244 KB inline JavaScript, 213 KB inline CSS, 142 `innerHTML` uses, 43 `localStorage` uses, and 176 inline `onclick` uses. These are acceptable in a design draft but not as production architecture.

## Cross-Cutting IA Corrections

- Project is a capability-composed creative space, not a fixed "public/collab" type.
- Public display and multi-user management are separate capabilities.
- Sidebar items must be generated from project capabilities plus user permissions.
- Account-level workspace and single-project workspace must be separate route scopes.
- Character links must include `characterId`; editor routes must not use one global localStorage key.
- Project-specific character data must belong to `ProjectCharacterLink`.
- Public renderers and internal builders must be separate routes and API payloads.
- Character applications and content submissions can share UI, but must use separate lifecycle models.

## Global Assets

### `oc-tools-new/assets/data.js`

- Page purpose: Shared mock source for projects and typed entity identity.
- User roles: All frontend pages consume it; no role gating in the design file.
- Read data: `projects`, `entities`, type labels, project/entity lookup helpers.
- Write operations: None.
- Search/filter/sort: Provides helpers for project/type filtering only.
- API draft: `GET /projects`, `GET /entities`, `GET /projects/:id/entities`.
- Schema impact: Keep domain tables specific, but expose a read-only `EntityRef` projection for search, mentions, hover cards, relationship maps, and recent activity.
- Security risks: If copied directly to runtime, private data would be globally downloadable.
- Performance risks: Frontend-wide full-data scans will not scale.
- Migration: Replace with a typed data adapter: mock adapter for design/dev, API adapter for production.
- Keep/change/remove: Keep the `EntityRef` concept; remove global mock data as runtime authority.

### `oc-tools-new/assets/shell.js`

- Page purpose: Inject app shell, project switcher, navigation, command palette, recent/favorites, and hover cards.
- User roles: Authenticated workspace users; public pages should not receive private shell data.
- Read data: Current project, project stats, character/worldview/story search index, recent/favorites from localStorage.
- Write operations: Current project, recent visits, favorites.
- Search/filter/sort: Client command palette across current project; no pagination.
- API draft: `GET /navigation`, `GET /search`, `GET /recent`, `POST /recent`, `GET/PUT /favorites`.
- Schema impact: `recent_activity`, `user_favorites`, searchable entity projection.
- Security risks: Search must not include private/host-only data; current `innerHTML` rendering would be unsafe with user data.
- Performance risks: Rebuilding command palette and hover cards from full client data will grow poorly.
- Migration: Split into shell layout, navigation service, search service, recent/favorite service, hover-card component.
- Keep/change/remove: Keep command palette behavior; move search and visibility enforcement server-side.

### Root `assets/api.js`

- Page purpose: Old API client for the previous static frontend.
- User roles: Authenticated users for workspace operations.
- Read data: Auth token from `sessionStorage`; calls auth, users, projects, OCs.
- Write operations: login/register/logout, project and OC CRUD, user settings.
- API draft: Existing paths are useful but incomplete for new product.
- Schema impact: No new schema, but exposes old backend contract.
- Security risks: Access token in `sessionStorage`; XSS can steal it. Formal plan should move to HttpOnly same-origin cookie sessions.
- Performance risks: Ad hoc client methods and no caching or request cancellation.
- Migration: Replace with typed API client/service layer.
- Keep/change/remove: Keep endpoint naming references where still valid; remove sessionStorage token pattern.

## Core Workspace Pages

### `oc-tools-new/pages/workspace.html`

- Page purpose: Home for all projects and project-scoped overview, inbox, and wishlist.
- User roles: Authenticated user; project owner/host for project creation and management; members for project-scoped views.
- Read data: projects, stats, recent activity, inbox ideas, wishlist items.
- Write operations: create project, create idea, upgrade idea to character/worldview/event/wishlist, create wishlist item, convert wishlist to commission.
- Page states: Loading, empty projects, empty inbox, empty wishlist, forbidden project, error.
- Search/filter/sort: No global search inside page; project switch and view tabs.
- API draft: `GET/POST /projects`, `GET /projects/:id/summary`, `GET/POST /projects/:id/ideas`, `PATCH /ideas/:id/upgrade`, `GET/POST /projects/:id/wishlist`.
- Schema impact: `project_stats` view or computed summary, `activity_events`, `ideas`, `wishlist_items`.
- Security risks: Project data must be membership-scoped; idea upgrade must verify write permission.
- Performance risks: Project summaries should be precomputed or indexed, not N+1 aggregate queries.
- Migration: Route as `/workspace`, `/projects/:projectId`, `/projects/:projectId/inbox`, `/projects/:projectId/wishlist`.
- Keep/change/remove: Keep project home/inbox/wishlist product concept; remove local mutable mock arrays.

### `oc-tools-new/pages/dashboard.html`

- Page purpose: Character dashboard with privacy filters, grouping, search, and new-character template entry.
- User roles: Character owner, project member, project host; public users should not see private dashboard.
- Read data: characters, project grouping, visibility state, commission status summary, completion score.
- Write operations: create character, copy share link, change privacy, navigate edit.
- Page states: Loading, empty characters, no search results, forbidden, error.
- Search/filter/sort: Search name/romaji/species/privacy/project/meta; filter by visibility; group by project; sort by recent edit.
- API draft: `GET /characters?projectId=&visibility=&q=&sort=&cursor=`, `POST /characters`, `PATCH /characters/:id/visibility`.
- Schema impact: Character visibility, project links, completion fields, updated indexes on owner/project/visibility/updated_at.
- Security risks: Dashboard must not leak private characters to non-owners; share links must be generated server-side.
- Performance risks: Client-side search over all characters should become paginated backend search.
- Migration: Route `/characters`; components: CharacterCard, CharacterFilters, TemplatePicker.
- Keep/change/remove: Keep template picker and card states; replace hardcoded `OCS`.
- Scope correction: Split `/app/characters` for all owned characters from `/app/projects/:projectId/characters` for one project. The draft mixes these scopes while the shell already points at one selected project.

### `oc-tools-new/pages/roster.html`

- Page purpose: Project character roster showing approved and pending linked characters by faction.
- User roles: Project members can view approved roster; hosts can view pending and manage links.
- Read data: project characters, per-project role/faction/status/tags, owner identity.
- Write operations: None in page mock, but product implies approving and changing project link metadata.
- Page states: Loading, empty faction, pending, forbidden.
- Search/filter/sort: Filter by faction; card/list view.
- API draft: `GET /projects/:id/characters`, `PATCH /project-character-links/:id`, `GET /projects/:id/factions`.
- Schema impact: `project_character_links` with `character_id`, `project_id`, `status`, `faction`, `role`, `tags`, `owner_user_id`.
- Security risks: Host-only pending data must be hidden from regular members.
- Performance risks: Roster should join minimal character identity only, not full character payloads.
- Migration: Route `/projects/:id/roster`; components: RosterCard, FactionFilter.
- Keep/change/remove: Keep ownership separation concept; remove static `LINK`.

## Character Pages

### `oc-tools-new/pages/editor.html`

- Page purpose: Full character editor, including profile, gallery, palette, markers, checklist, license, privacy, project fields, and commissions.
- User roles: Character owner; project host for host-only project fields; possibly collaborator with delegated edit rights.
- Read data: character profile, media, markers, project template, project field values, commissions.
- Write operations: update character, upload media, set main image, create/update markers, update checklist/license/privacy, create/update/delete commissions, update project field values.
- Page states: Loading, autosaving, draft, validation error, forbidden, upload pending, upload failed.
- Search/filter/sort: Gallery categories; no large search.
- Image needs: Avatar, main image, gallery images, marker images, commission reference images.
- API draft: `GET/PATCH /characters/:id`, `GET/POST /characters/:id/assets`, `PATCH /assets/:id`, `GET/PATCH /characters/:id/project-values`, `GET/POST /characters/:id/commissions`, `PATCH/DELETE /commissions/:id`.
- Schema impact: Split large JSON blobs into `character_profiles`, `character_swatches`, `character_checklist_items`, `character_license_items`, `assets`, `asset_links`, `image_markers`, `commissions`, `commission_refs`, `commission_ref_markers`, `project_field_values`.
- Security risks: XSS from all user text, unauthorized edits, private media leaks, password sharing secrets, host-only field leakage, unsafe direct Worker uploads.
- Performance risks: The editor is too large as one runtime chunk; autosave must debounce and patch small sections.
- Migration: Split into tabs/components/services: CharacterProfileForm, GalleryManager, MarkerBoard, LicenseEditor, PrivacyPanel, CommissionEditor, ProjectFieldsForm.
- Keep/change/remove: Keep UX concepts; remove localStorage snapshot as persistence.
- Formal data correction: `ch:character` and `ch:projvals:${projectId}` are invalid persistence shapes. Drafts and saves must be keyed by `characterId` and `projectCharacterLinkId`.

### `oc-tools-new/pages/character.html`

- Page purpose: Public or shared character page with general, artist, writer, and commission modes.
- User roles: Visitor, link holder, artist/writer recipient, owner/editor.
- Read data: character public profile, visibility gate, media, palette, checklist, license, relationships, worldview links, commissions.
- Write operations: Share copy and print only; no data writes.
- Page states: Loading, forbidden, password required, not found, private, commission not found.
- Search/filter/sort: Album category tabs; mode switch.
- Image needs: Public media and inherited commission reference media.
- API draft: `GET /public/characters/:slugOrShareKey`, `POST /public/characters/:id/password`, `GET /public/commissions/:shareKey`.
- Schema impact: `share_links`, `character_visibility`, `commissions.share_token`, link-scoped access.
- Security risks: Must not render private or host-only fields; unlisted/password URLs need revocation; commission links should expose only selected inherited fields.
- Performance risks: Public page should request summary payload by mode instead of full editor payload.
- Migration: Route `/@:username/:characterSlug`, `/c/:shareKey`, `/commission/:shareKey`.
- Keep/change/remove: Keep mode-specific sharing; remove dependency on editor localStorage.
- Responsibility split: Internal character detail, public character renderer, and commission brief renderer can reuse components but should not share one route or payload.

## World And Relationships

### `oc-tools-new/pages/worldview.html`

- Page purpose: Worldbuilding codex with typed entries, hierarchy, linked characters, entry relations, gallery, search, and inline editing.
- User roles: Project members can view; hosts/cohosts can edit; public view depends on project/entry visibility.
- Read data: worldview entries, types, parent hierarchy, linked characters, entry relations, gallery.
- Write operations: create entry, edit entry, set parent, link/unlink characters, create/delete entry relations.
- Page states: Loading, empty, no search results, draft, forbidden, error.
- Search/filter/sort: Search name/en/blurb/setting/type/linked character; filter by type and project scope.
- API draft: `GET /worldview?projectId=&type=&q=&cursor=`, `POST /worldview`, `PATCH /worldview/:id`, `POST/DELETE /worldview/:id/links/characters`, `POST/DELETE /worldview/:id/relations`.
- Schema impact: Add `parent_id`, project-scope many-to-many, normalized links to characters, indexes on project/type/parent/search fields.
- Security risks: Host-only content and private project entries must be hidden; relation targets must be permission-checked.
- Performance risks: Querying all entries for search/hierarchy will not scale; use paginated lists plus detail endpoint.
- Migration: Components: WorldviewList, EntryDetail, EntryEditor, RelationEditor.
- Keep/change/remove: Keep hierarchy and relations; formalize symmetric relation handling.

### `oc-tools-new/pages/relationships.html`

- Page purpose: Relationship map across characters and world entities, with pair relationships, groups, map layout, shared albums, and timelines.
- User roles: Project members can view; hosts/owners can edit project-wide maps; character owners may edit their own relationship text depending on policy.
- Read data: graph nodes, node layout, edges, pair details, groups, timelines, shared album links.
- Write operations: create/delete pair, edit relationship labels/descriptions/timeline/directional labels, create/delete groups, edit members.
- Page states: Loading, empty graph, empty project, forbidden, edit validation error.
- Search/filter/sort: Project scope filtering; no text search yet.
- Image needs: Shared album thumbnails linked to relationship/group.
- API draft: `GET /projects/:id/relationship-graph`, `PUT /projects/:id/relationship-layout`, `POST/PATCH/DELETE /relationships/:id`, `POST/PATCH/DELETE /relationship-groups/:id`.
- Schema impact: Generalize relationships to `EntityRef` endpoints, add `relationship_groups`, `relationship_group_members`, `relationship_timeline_items`, `relationship_layout_nodes`, `asset_links`.
- Security risks: IDOR across character/worldview nodes; relationship edits need project membership and possibly character owner consent.
- Performance risks: Large maps need incremental loading and layout persistence; avoid rebuilding whole DOM for small edits.
- Migration: Components: RelationshipGraph, RelationshipDetail, GroupEditor, TimelineEditor.
- Keep/change/remove: Keep graph behavior; replace hardcoded node positions with saved layouts.

## Project Collaboration

### `oc-tools-new/pages/template-builder.html`

- Page purpose: Host-defined project character form template.
- User roles: Owner/host/cohost depending permission; participants view resulting form only.
- Read data: project template fields, characters/worldview for reference field previews.
- Write operations: create/update/delete/reorder fields, set required/public/host-only visibility.
- Page states: Loading, empty template, dirty, saved, forbidden, validation error.
- API draft: `GET/PUT /projects/:id/character-template`, `POST/PATCH/DELETE /template-fields/:id`.
- Schema impact: `character_templates`, `template_fields` with type/options/required/visibility/order.
- Security risks: Host-only fields must never be returned to non-hosts; field definitions require validation.
- Performance risks: Low, but autosave/dirty state should avoid frequent full writes.
- Migration: Components: TemplateFieldList, FieldEditor, ParticipantFormPreview.
- Keep/change/remove: Keep field types and host-only concept.

### `oc-tools-new/pages/submissions.html`

- Page purpose: Review public project submissions for images, text, or character proposals.
- User roles: Hosts/cohosts review; participants submit; members may see approved roster only.
- Read data: submissions by status, submitter identity, notes, assets.
- Write operations: approve, reject, restore to pending.
- Page states: Loading, empty pending, empty approved, empty rejected, forbidden, error.
- API draft: `GET /projects/:id/submissions?status=`, `POST /projects/:id/submissions`, `PATCH /submissions/:id/status`.
- Schema impact: `submissions`, `submission_assets`, `submission_values`, status and reviewer audit columns.
- Security risks: Public submissions need spam controls, Turnstile, rate limits, malware/file checks, reviewer authorization.
- Performance risks: Paginate status lists; avoid loading full assets in review list.
- Migration: Components: SubmissionTabs, SubmissionCard, ReviewActions.
- Keep/change/remove: Keep review card UI; split into character applications and content submissions.
- Formal lifecycle split:
  - Character application approval creates or updates `ProjectCharacterLink`.
  - Image submission approval creates or links `Asset` and gallery placement.
  - Text/story submission approval creates or links `Story`, `StoryChapter`, or publication records.

### `oc-tools-new/pages/participants.html`

- Page purpose: Manage project invite link, members, roles, and permission overview.
- User roles: Owner/host/cohost/member with different capabilities.
- Read data: project members, invite link, role permission matrix.
- Write operations: regenerate invite, change role, remove member.
- Page states: Loading, empty members, forbidden, role-change error.
- API draft: `GET /projects/:id/members`, `PATCH /project-memberships/:id`, `DELETE /project-memberships/:id`, `POST /projects/:id/invites/regenerate`.
- Schema impact: `project_memberships`, `project_invites`, `audit_logs`.
- Security risks: Role escalation, invite leakage, stale invite revocation, owner transfer constraints.
- Performance risks: Low; audit writes should be async/lightweight.
- Migration: Components: MemberList, InvitePanel, PermissionTable.
- Keep/change/remove: Keep roles; formalize exact permissions.

## Additional Pages From Full Scan Report

### `oc-tools-new/pages/story.html`

- Page purpose: Story chapters and timeline-style reading/planning.
- Keep: Chapter view, timeline view, fuzzy date concepts.
- Main issue: Story structure and worldview/event timeline are not separated.
- Migration: Model story/arc/chapter as narrative structure; model events as reusable references projected into timelines.
- Keep/change/remove: Keep design direction; define editing flow before backend implementation.

### `oc-tools-new/pages/gallery.html`

- Page purpose: Project or account gallery with masonry layout, filters, and unclassified images.
- Keep: Unclassified inbox concept, character/type filters.
- Main issue: Images need owner, source, license, visibility, dimensions, thumbnails, and multi-entity links.
- Migration: Derive gallery from `Asset` plus `AssetLink`, not a separate gallery-only image table.
- Keep/change/remove: Keep gallery UX; replace mock image list with asset service.

### `oc-tools-new/pages/height-compare.html`

- Page purpose: Compare character heights and export/share a visual arrangement.
- Keep: Multi-character visual comparison and share/export behavior.
- Main issue: More useful as account-level tool than project-owned module.
- Migration: Route under account tools, with optional project prefilter.
- Keep/change/remove: Keep as global tool; do not force sidebar presence in every project.

### `oc-tools-new/pages/commissions.html`

- Page purpose: Commission board with statuses, due dates, character references, and brief handoff.
- Keep: Kanban-like status and deadline awareness.
- Main issue: Commission can involve multiple projects or no project.
- Migration: Treat `Commission` as account-level data linked optionally to project/character/wishlist.
- Keep/change/remove: Keep as global tool with optional project filtered view.

### `oc-tools-new/pages/portal.html`

- Page purpose: Public project page design, preview, join CTA, and content blocks.
- Main issue: Public renderer, authenticated builder, role preview, and submission form are in one route.
- API draft: `GET/PUT /projects/:id/public-page`, `GET /projects/:id/public-preview`, `GET /public/projects/:slug`.
- Security risks: Visitor page must not download owner controls, private payloads, or client-only permission switches.
- Migration: Split `/app/projects/:id/public-page` builder from `/p/:slug` renderer.
- Keep/change/remove: Keep block/editor concept; formalize safe public payload.

### `oc-tools-new/pages/settings.html`

- Page purpose: Mixed account preferences and project defaults/settings.
- Main issue: Account settings and project settings are conflated. "Collaboration mode" cannot be account-global.
- Migration:
  - `/app/settings` for account/profile/security/notification/appearance/export/language.
  - `/app/projects/:id/settings` for project name, cover, modules, visibility, portal, join policy, collaboration, export, archive/delete.
  - Character share settings belong near character visibility/share routes.
- Keep/change/remove: Keep settings concepts; split route ownership.

### `oc-tools-new/pages/landing.html`

- Page purpose: Marketing entry.
- Main issue: It still frames the product around commission setting generation, which is narrower than the new direction.
- Migration: Reposition around OC organization, public showcase, and collaborative project workspace.
- Keep/change/remove: Rewrite when product model is approved.

### `oc-tools-new/pages/login.html`

- Page purpose: Authentication entry.
- Keep: Visual direction.
- Main issue: Needs real auth states: login, registration, forgot password, email verification, OAuth callback, failure, rate limit, and expired session.
- Migration: Same-origin session flow with server-side session checks.
- Keep/change/remove: Keep visual design only.

### `oc-tools-new/index.html`, `explore/`, `screenshots/`, `uploads/`

- Page purpose: Showroom, exploration, and test assets.
- Migration: Exclude from production bundle/public routes unless explicitly repurposed.
- Keep/change/remove: Keep as design reference only.
