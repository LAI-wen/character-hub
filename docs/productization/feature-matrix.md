# CharacterHub Productization Feature Matrix

Status: draft.

| Feature | Design Sources | Required Domains | Current Backend Fit | Productization Decision |
| --- | --- | --- | --- | --- |
| Project workspace | `workspace.html`, `shell.js` | Project, membership, stats, activity | Partial `projects` only | Expand to collaborative workspace |
| Project capabilities | `oc_frontend_scan_report.md`, `shell.js`, `settings.html` | Project settings, feature gates | Missing | Treat presets as initial config, not permanent project types |
| Dynamic sidebar | `shell.js`, `oc_frontend_scan_report.md` | Project features, permissions | Missing | Generate from capabilities plus user permissions |
| Project switcher | `shell.js`, `workspace.html` | Project membership, preferences | Missing membership | Server returns available projects |
| Command palette search | `shell.js` | Search, EntityRef, visibility | Missing | Backend search with permission filtering |
| Recent/favorites | `shell.js` | User preference, recent activity | Missing | Store per user, not localStorage only |
| Character dashboard | `dashboard.html` | Character, project link, visibility | Partial `ocs` | Move from owner-only OCs to character + project links |
| Character editor | `editor.html` | Character profile, assets, markers, license, privacy | Partial `ocs` JSON | Split high-risk/high-query data into dedicated tables |
| Public character page | `character.html` | Visibility, share links, public payloads | Partial | Separate public endpoints from private workspace APIs |
| Commission brief | `editor.html`, `character.html` | Commission, references, inherited fields | Stub only | New commission domain |
| Worldview codex | `worldview.html` | Worldview entries, hierarchy, relations | Partial | Add parent and normalized links |
| Relationship graph | `relationships.html` | EntityRef graph, layout, pair/group data | OC pair only | Generalize relationships to character/worldview nodes |
| Character template | `template-builder.html`, `editor.html` | Template fields, project field values | Missing | New template/value domain |
| Roster | `roster.html` | ProjectCharacterLink, factions, approval | Missing | New link table with status and metadata |
| Character applications | `submissions.html`, `roster.html` | Application, ProjectCharacterLink | Missing | Separate from content submissions; approval creates roster link |
| Content submissions | `submissions.html`, `gallery.html`, `story.html` | Submission, Asset, Story/Publication | Missing | Separate lifecycle from roster applications |
| Participants | `participants.html` | Membership, roles, invites | Missing | New membership and invite system |
| Media upload | `editor.html`, `gallery.html` | Assets, R2, asset links | Partial `oc_media` | Replace with general asset service and presigned uploads |
| Public project page | `portal.html` | PublicPage, blocks, safe renderer | Missing | Split builder/preview from public renderer |
| Account settings | `settings.html` | User profile, security, notification, appearance | Partial | Split from project settings |
| Project settings | `settings.html`, `portal.html` | Project features, visibility, join policy | Missing | Per-project capabilities, not account global collaboration mode |
| Account-level tools | `wishlist`, `commissions.html`, `height-compare.html` | User tools, optional project filters | Missing | Do not force every project to own these modules |
