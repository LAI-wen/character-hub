# Frontend Scope Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first formal frontend skeleton that validates account-level data, solo private projects, solo public showcase projects, and collaborative projects can coexist.

**Architecture:** Keep this first pass as a static ES module app under `app/` so it can run without adding a build chain. The skeleton uses a mock adapter with formal domain shapes, a small router, capability-driven navigation, and separate account/project/public layouts. No backend, D1 migration, Cloudflare deployment, or large editor migration in this phase.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript ES modules, existing CharacterHub visual direction.

---

### Task 1: Create Static App Entry

**Files:**
- Create: `app/index.html`
- Create: `app/styles.css`
- Create: `app/main.js`

- [ ] **Step 1: Add the HTML entry**

Create `app/index.html` with one root node and module script:

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CharacterHub App Skeleton</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Huninn&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Serif+TC:wght@600;700;900&family=Shippori+Mincho+B1:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Add app-level CSS**

Create `app/styles.css` with layout, sidebar, card, route, and responsive styles. Keep cards at small radii and avoid importing the whole old design system.

- [ ] **Step 3: Add app bootstrap**

Create `app/main.js` that imports the router and renders on load/hash changes.

- [ ] **Step 4: Verify static entry**

Run: `curl -I file:///Users/wen/Documents/Development/active-projects/oc-tools/app/index.html`

Expected: local file exists. If curl cannot read `file://`, verify with `test -f app/index.html`.

### Task 2: Define Formal Mock Domain

**Files:**
- Create: `app/domain.js`
- Create: `app/mock-data.js`

- [ ] **Step 1: Define capability constants and helpers**

Create `app/domain.js` with project presets, feature keys, and helper functions:

```js
export const FEATURES = {
  characters: "characters",
  worldview: "worldview",
  story: "story",
  gallery: "gallery",
  relationships: "relationships",
  inbox: "inbox",
  publicPage: "publicPage",
  template: "template",
  roster: "roster",
  applications: "applications",
  submissions: "submissions",
  participants: "participants",
  permissions: "permissions",
};

export function hasFeature(project, feature) {
  return Boolean(project.enabledFeatures.includes(feature));
}

export function isCollaborative(project) {
  return project.collaborationMode === "collaborative";
}
```

- [ ] **Step 2: Add four validation scenarios**

Create `app/mock-data.js` with:

```js
projects: [
  private personal organization,
  solo public showcase,
  private collaborative project,
  public collaborative recruitment project
]
characters: include at least one character with no project
projectCharacterLinks: link some characters into projects
```

- [ ] **Step 3: Verify project and orphan character data**

Run a browser console or local module check to verify one character has no `ProjectCharacterLink`, and each scenario has different capabilities.

### Task 3: Build Mock Adapter

**Files:**
- Create: `app/adapters/mock-adapter.js`

- [ ] **Step 1: Add read methods**

Create methods:

```js
getViewer()
listProjects()
getProject(projectId)
listAccountCharacters()
listProjectCharacters(projectId)
getProjectNavigation(projectId)
getPublicProject(slug)
```

- [ ] **Step 2: Keep scope boundaries strict**

`listAccountCharacters()` returns all viewer-owned characters, including characters with no project. `listProjectCharacters(projectId)` returns only characters linked by `ProjectCharacterLink`.

- [ ] **Step 3: Verify adapter behavior**

Use a small module import check or browser console:

```js
adapter.listAccountCharacters().some(character => character.projectIds.length === 0)
adapter.listProjectCharacters("personal-archive").every(character => character.projectIds.includes("personal-archive"))
```

Expected: both expressions are `true`.

### Task 4: Build Router And Layouts

**Files:**
- Create: `app/router.js`
- Create: `app/render.js`

- [ ] **Step 1: Add hash router**

Support:

```txt
#/app
#/app/characters
#/app/projects/:projectId
#/app/projects/:projectId/characters
#/app/projects/:projectId/manage
#/p/:slug
```

- [ ] **Step 2: Add safe rendering helpers**

Use DOM node creation helpers instead of `innerHTML` for user-visible data.

- [ ] **Step 3: Add layout selection**

Use account layout for `/app` and `/app/characters`, project layout for `/app/projects/...`, and public layout for `/p/:slug`.

### Task 5: Build Dynamic Sidebar

**Files:**
- Create: `app/navigation.js`

- [ ] **Step 1: Generate account nav**

Always show:

```txt
總覽
我的角色
委託
Wishlist
身高比較
帳號設定
```

- [ ] **Step 2: Generate project nav**

Always show project overview and enabled content modules. Show public-page tools only when `portalEnabled` is true. Show co-creation management only when the project is collaborative and the current viewer has host/cohost/owner permissions.

- [ ] **Step 3: Verify four sidebars**

Confirm:

```txt
personal organization: no public page, no roster, no submissions, no participants
public showcase: public page tools, no roster/submission/member management
private collaborative: roster/template/applications/participants, no public renderer unless portal enabled
public collaborative: public page plus management tools
```

### Task 6: Build Scope Validation Screens

**Files:**
- Create: `app/screens/account-home.js`
- Create: `app/screens/account-characters.js`
- Create: `app/screens/project-overview.js`
- Create: `app/screens/project-characters.js`
- Create: `app/screens/project-manage.js`
- Create: `app/screens/public-project.js`

- [ ] **Step 1: Account home**

Show all projects and scenario labels.

- [ ] **Step 2: Account characters**

Show all viewer-owned characters, including the character with no project.

- [ ] **Step 3: Project overview**

Show project capabilities and enabled features.

- [ ] **Step 4: Project characters**

Show only linked characters and their `ProjectCharacterLink` status/faction/project role.

- [ ] **Step 5: Project manage**

Show enabled management modules and disabled modules with reason text.

- [ ] **Step 6: Public project**

Show only public-safe project data from `getPublicProject(slug)`.

### Task 7: Add Smoke Verification

**Files:**
- Create: `app/smoke-test.js`

- [ ] **Step 1: Add assertions**

Assert:

```js
account characters include orphan character
personal project nav excludes public/collab tools
public showcase nav includes public page but excludes participants
collaborative project nav includes roster/applications/participants
public renderer excludes management labels
```

- [ ] **Step 2: Run smoke test**

Run: `node app/smoke-test.js`

Expected: `frontend skeleton smoke test passed`

### Task 8: Update Documentation

**Files:**
- Modify: `docs/productization/frontend-migration.md`

- [ ] **Step 1: Add skeleton status**

Add a short section linking the implemented `app/` skeleton and documenting that the first milestone validates coexistence of global data, personal projects, public showcase, and collaborative projects.

- [ ] **Step 2: Verify changed files**

Run: `git status --short`

Expected: only `app/`, `docs/`, and existing user-owned untracked/design files are changed.

---

## Self-Review

- Spec coverage: Covers route skeleton, mock adapter, dynamic shell, four scenario validation, account-level characters without project membership, public/internal separation.
- Known non-goals: No backend, no D1 migration, no Cloudflare deployment, no large editor migration, no worldbuilding editor migration.
- Placeholder scan: No `TBD` or unspecified implementation task remains.
