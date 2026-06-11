# CharacterHub Permission Matrix

Status: draft.

## Roles

| Role | Meaning |
| --- | --- |
| Visitor | Unauthenticated public user |
| Link holder | Visitor with unlisted/password/share-token access |
| User | Authenticated account |
| Character owner | Creator/owner of a character |
| Project member | User accepted into a project |
| Co-host | Project helper with review and edit abilities |
| Host | Project manager |
| Owner | Project owner |
| Admin | Platform operator |

## Project Capability Gates

Roles are not enough. A project route or sidebar item should also check whether the project enables the feature.

| Capability | Required Project Setting |
| --- | --- |
| Public page builder | `portal_enabled = true` |
| Public renderer | `visibility = public/unlisted` and `portal_enabled = true` |
| Template builder | `collaboration_mode = collaborative` and template feature enabled |
| Roster | collaborative roster feature enabled |
| Character applications | `join_policy = application/open` or applications feature enabled |
| Content submissions | `submissions_enabled = true` |
| Participants | `collaboration_mode = collaborative` |
| Account-level commissions/wishlist/height compare | User-owned tool; optional project filter |

## Draft Permissions

| Capability | Visitor | Link holder | Character owner | Member | Co-host | Host | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View public character | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View unlisted character | No | Yes | Yes | If linked | If project-scoped | If project-scoped | If project-scoped |
| View private character | No | No | Yes | No | No | No | No |
| Edit character core | No | No | Yes | No | No | No | No |
| Edit project field values | No | No | Own linked character | Own linked character | Host-only fields | Host-only fields | Host-only fields |
| Manage project template | No | No | No | No | Optional | Yes | Yes |
| Review submissions | No | No | No | No | Yes | Yes | Yes |
| Review character applications | No | No | No | No | Yes | Yes | Yes |
| Review content submissions | No | No | No | No | Yes | Yes | Yes |
| Manage project members | No | No | No | No | No | Yes | Yes |
| Transfer ownership | No | No | No | No | No | No | Yes |
| Edit worldview | Public only | Public only | No by default | No by default | Yes | Yes | Yes |
| Edit relationship graph | Public only | Public only | Own text TBD | No by default | Yes | Yes | Yes |

## Open Questions

- Can a project host edit another user's linked character project-specific fields?
- Should project-specific field edit permission be defined per field, per role, or both?
- Can a character owner opt out of project relationship edits?
- Should public project pages expose member roster by default?
- Are commissions private by default or share-token by default?
- Can the same character join the same project multiple times as separate versions, or should the link be unique and versioned?
- Should public content submissions require login, or can anonymous submissions be allowed with Turnstile and stricter rate limits?
