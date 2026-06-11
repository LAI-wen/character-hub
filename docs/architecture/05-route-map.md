# Route Map

**Date:** 2026-06-11

---

## 路由結構圖

```
/                          → redirect → /workspace
/login                     → LoginPage（PublicLayout）

/workspace                 → WorkspacePage（AppLayout, AuthGuard）
/characters                → MyCharactersPage
/characters/:charId        → CharacterDetailPage（owner only）
/characters/:charId/edit   → CharacterEditorPage

/projects                  → MyProjectsPage

/p/:projectId/             → ProjectLayout（ScopeGuard）
  overview                 → ProjectOverviewPage
  roster                   → RosterPage
  roster/:linkId           → ProjectCharacterDetailPage
  roster/:linkId/edit      → ProjectCharacterEditorPage
  worldview                → WorldviewPage
  worldview/:entryId       → WorldEntryDetailPage
  relationships            → RelationshipsPage
  story                    → StoryPage（Batch 2）
  gallery                  → GalleryPage（Batch 2）
  settings                 → ProjectSettingsPage

/page/:slug                → PublicProjectPage（PublicLayout, Batch 3）

* (not found)              → 404 Page
```

---

## React Router v6 定義（概念 schema）

```tsx
// routes/index.tsx
const router = createBrowserRouter([
  {
    path: "/login",
    element: <PublicLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: "/",
    element: <AuthGuard><AppLayout /></AuthGuard>,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, loader: () => redirect("/workspace") },

      // Account-level
      { path: "workspace",   element: <WorkspacePage /> },
      { path: "characters",  element: <MyCharactersPage /> },
      { path: "characters/:charId",      element: <CharacterDetailPage /> },
      { path: "characters/:charId/edit", element: <CharacterEditorPage /> },
      { path: "projects",    element: <MyProjectsPage /> },

      // Project-scoped
      {
        path: "p/:projectId",
        element: <ScopeGuard><ProjectLayout /></ScopeGuard>,
        errorElement: <ProjectErrorBoundary />,
        children: [
          { index: true, loader: () => redirect("overview") },
          { path: "overview",                   element: <ProjectOverviewPage /> },
          { path: "roster",                     element: <RosterPage /> },
          { path: "roster/:linkId",             element: <ProjectCharacterDetailPage /> },
          { path: "roster/:linkId/edit",        element: <ProjectCharacterEditorPage /> },
          { path: "worldview",                  element: <WorldviewPage /> },
          { path: "worldview/:entryId",         element: <WorldEntryDetailPage /> },
          { path: "relationships",              element: <RelationshipsPage /> },
          { path: "story",                      element: <StoryPage /> },
          { path: "gallery",                    element: <GalleryPage /> },
          { path: "settings",                   element: <ProjectSettingsPage /> },
        ],
      },
    ],
  },

  // Public pages
  {
    path: "/page/:slug",
    element: <PublicLayout />,
    children: [{ index: true, element: <PublicProjectPage /> }],
  },

  { path: "*", element: <NotFoundPage /> },
]);
```

---

## Scope 傳遞機制

```
URL: /p/abc123/roster

↓ React Router
  params.projectId = "abc123"

↓ ProjectLayout
  const { projectId } = useParams()
  const { data: project } = useProject(projectId)
  → provides ProjectContext (project, role, enabledFeatures)

↓ ScopeGuard
  if (!project) → <ResourceStateBoundary state="loading" />
  if (project.archived) → <ResourceStateBoundary state="archived" />

↓ RosterPage（消費 ProjectContext）
  const { project } = useProjectContext()
```

**原則：** scope 永遠來自 URL params，不來自 localStorage / sessionStorage。

---

## Guard 邏輯

### AuthGuard

```tsx
// 未登入 → /login?redirect=<current>
const { viewer } = useAuth()
if (!viewer) return <Navigate to={`/login?redirect=${location.pathname}`} />
```

### ScopeGuard

```tsx
const { projectId } = useParams()
const { data: project, status } = useProject(projectId)

if (status === "pending") return <LoadingScreen />
if (status === "error")   return <NotFoundPage />
// 再往下渲染 ProjectLayout
```

---

## URL 設計原則

| 原則 | 說明 |
|------|------|
| **永遠 path-based** | 不用 hash routing（`#`）；History API |
| **project scope 在 path** | `/p/:projectId/` 明確；不從 localStorage 讀 |
| **public pages 分離** | `/page/:slug` 不在 `/p/` 下，無需登入 |
| **深度連結可分享** | 所有 URL 刷新後可恢復狀態（資料從 API 取，非 in-memory）|
| **edit 在 nested path** | `/roster/:linkId/edit` 而非 modal-only，支援直接連結 |

---

## 現有 `app/` hash routes → 新路由對照

| 舊 hash | 新 path |
|---------|---------|
| `#/` | `/workspace` |
| `#/my-characters` | `/characters` |
| `#/p/{id}/overview` | `/p/{id}/overview` |
| `#/p/{id}/characters` | `/p/{id}/roster` |
| `#/p/{id}/worldview` | `/p/{id}/worldview` |
| `#/p/{id}/relationships` | `/p/{id}/relationships` |
| `#/p/{id}/settings` | `/p/{id}/settings` |
| `#/login` | `/login` |
