# Demo QA Checklist

Status: required before demo handoff.

Run this checklist before saying the demo is ready to deploy or share.

## Local Preview

```bash
python3 -m http.server 4180
```

Open:

```txt
http://127.0.0.1:4180/app/index.html#/app
```

## Automated Checks

```bash
node app/smoke-test.js
node --check app/router.js
node --check app/render.js
node --check app/main.js
node --check app/screens/account-home.js
node --check app/screens/account-characters.js
node --check app/screens/project-characters.js
node --check app/screens/project-overview.js
node --check app/screens/demo-pages.js
```

Search for leftover skeleton/debug UI:

```bash
rg -n "ProjectCharacterLink|角色 Scope|此頁先作為導覽定位|context-head|enabledFeatures|collaborationMode|publicPage" app/screens app/router.js app/styles.css
```

Engineering terms may exist in data/model files and conditional logic, but they must not appear in rendered UI copy. If this command finds a conditional expression, inspect whether the value is mapped to a human label before rendering.

## Routes To Click

Account routes:

```txt
#/app
#/app/characters
#/app/tools/commissions
#/app/tools/wishlist
#/app/tools/height
#/app/settings
```

Project routes:

```txt
#/app/projects/public-portfolio
#/app/projects/public-portfolio/characters
#/app/projects/public-portfolio/worldview
#/app/projects/public-portfolio/story
#/app/projects/public-portfolio/gallery
#/app/projects/public-portfolio/relationships
#/app/projects/public-portfolio/public-page
#/app/projects/public-portfolio/settings

#/app/projects/private-collab
#/app/projects/private-collab/roster
#/app/projects/private-collab/review
#/app/projects/private-collab/participants
#/app/projects/private-collab/template

#/app/projects/open-collab
#/app/projects/open-collab/characters
#/app/projects/open-collab/worldview
#/app/projects/open-collab/story
#/app/projects/open-collab/gallery
#/app/projects/open-collab/relationships
#/app/projects/open-collab/public-page
#/app/projects/open-collab/roster
#/app/projects/open-collab/review
#/app/projects/open-collab/participants
#/app/projects/open-collab/template
#/app/projects/open-collab/settings
```

Public renderer:

```txt
#/p/tokoyo-open
```

## Visual Criteria

Each route must pass these before handoff:

- No extra skeleton header above the oc-new-style page content.
- No engineering labels in user-facing copy.
- Sidebar follows the oc-new shell: 250px width, 14px/12px padding, 14px nav text, 9px item radius, quiet project dropdown, same grey/white/yellow treatment.
- Sidebar keeps the active project and active section readable.
- Sidebar does not scroll back to top after clicking a lower item.
- Project dropdown only switches projects; it does not expand every project into a tree.
- Cards, buttons, and chips use the oc-new grey/white/yellow visual language.
- Page typography follows oc-new scale: serif page titles around 34-40px, body copy around 14-15px, mono labels around 10-11px.
- Page spacing follows oc-new rhythm: `var(--s10)` top page padding on desktop, `var(--s8)` major section gaps, restrained card padding.
- Text does not overflow chips, cards, or sidebar rows.
- Page width feels correct inside the app shell and does not require horizontal scrolling.
- Hover/action areas do not inherit styles from unrelated components.
- Mobile/narrow viewport stacks major columns instead of clipping.

## Interaction Criteria

Each demo route should have baseline click feedback before handoff:

- Sidebar links navigate and active state updates.
- Project dropdown opens, switches project, and preserves the current page segment when possible.
- Collapsible sidebar sections remember open/closed state.
- Sidebar drawer collapse remembers state.
- Filter chips/tabs visibly switch active state.
- Public page Builder edit mode opens and closes.
- Public page submit modal opens and closes.
- Worldview cards update the detail panel.
- Gallery tiles open and close the preview lightbox.
- Review center approve/reject buttons change card state.
- Height comparison rows toggle their matching figures.
- Relationship map nodes, labels, and chips update the selected relationship detail card.
- Buttons that do not yet perform real data work should still have a clear demo state, toast, modal, or active feedback; they should not feel broken.
- Demo interactions may be local-only and do not need backend persistence yet.

## Known Demo Gaps

These are acceptable only if clearly understood before deployment:

- Some pages are demo-fidelity screens, not full interactive editors.
- Public page Builder and Renderer are present, but block ordering and submit data are still local-only.
- Real search, drag/drop persistence, editor state, and backend integration are not finished.
- Production component boundaries are still draft-level.
