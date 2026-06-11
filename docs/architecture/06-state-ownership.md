# State Ownership Map

**Date:** 2026-06-11

---

## 原則

> 每一塊狀態有且僅有一個擁有者。

| 狀態類型 | 擁有者 | 原因 |
|---------|--------|------|
| **Server state**（API 資料）| TanStack Query | 快取、失效、背景更新 |
| **URL state**（scope, ID）| React Router URL | 可分享、刷新後恢復 |
| **Session state**（當前 viewer）| AuthContext（React Context）| 跨頁共用；登出即清空 |
| **UI local state**（表單、modal open）| useState / useReducer in component | 不需要跨元件共用 |
| **Form state**（input values, dirty, errors）| React Hook Form | 不進 global store |
| **Persistent user pref**（sidebar collapse）| localStorage 僅限 UI pref | 不影響業務邏輯 |

**不存在的東西：**  
- ~~全域 mutable data store~~（原 `data-store.js` 的角色）  
- ~~sessionStorage token~~（改 HttpOnly cookie）  
- ~~localStorage scope~~（改 URL params）

---

## 完整狀態地圖

```
┌─────────────────────────────────────────────────────────────────┐
│  URL (React Router)                                             │
│  /p/:projectId/roster/:linkId/edit                              │
│                                                                 │
│  params.projectId ──────────┐                                   │
│  params.linkId ─────────────┤                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TanStack Query Cache (server state)                            │
│                                                                 │
│  queryKey: ["project", projectId]      → project, role          │
│  queryKey: ["project-characters", pid] → links[]               │
│  queryKey: ["project-character", pid, linkId] → link            │
│  queryKey: ["characters", userId]      → characters[]           │
│  queryKey: ["world-entries", pid]      → entries[]             │
│  queryKey: ["relationships", pid]      → rels[], layout         │
│  queryKey: ["viewer"]                  → me                     │
│                                                                 │
│  staleTime: 30s（預設）                                          │
│  gcTime:    5min（預設）                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AuthContext (React Context)                                    │
│                                                                 │
│  viewer: { id, email, displayName }                             │
│  isLoading: boolean                                             │
│  login(credentials) → void                                      │
│  logout() → void                                                │
│                                                                 │
│  ※ 不存 token；token 在 HttpOnly cookie，對 JS 不可見           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ProjectContext (React Context，ProjectLayout 提供）             │
│                                                                 │
│  project: Project                                               │
│  role: ProjectRole（owner / host / cohost / member / viewer）   │
│  enabledFeatures: Feature[]                                     │
│                                                                 │
│  ※ 從 TanStack Query 派生，不另存狀態                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Component local state (useState)                               │
│                                                                 │
│  - Modal open/close                                             │
│  - Drawer open/close                                            │
│  - Search input value（before debounce submit）                  │
│  - Expanded / collapsed accordion                               │
│  - Optimistic UI（在 mutation onMutate 中管理）                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  React Hook Form（form state）                                   │
│                                                                 │
│  - input values                                                 │
│  - touched / dirty                                              │
│  - validation errors（Zod resolver）                             │
│  - submit status                                                │
│                                                                 │
│  ※ 表單 submit 呼叫 TanStack Mutation；成功後 reset form          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  localStorage（限 UI preference）                                │
│                                                                 │
│  - sidebar collapsed (boolean)                                  │
│  - theme preference（未來）                                      │
│                                                                 │
│  ※ 不存任何業務資料、不存 token、不存 projectId                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## TanStack Query Key 規範

### 命名規則

```ts
// 列表
["projects"]                      // viewer 所有 projects
["characters", userId]            // viewer 所有 characters
["project-characters", projectId] // project 下所有 links
["world-entries", projectId]
["relationships", projectId]

// 單一資源
["project", projectId]
["character", characterId]
["project-character", projectId, linkId]
["world-entry", projectId, entryId]
["relationship", projectId, relId]
["relationship-layout", projectId]

// 身分
["viewer"]
```

### invalidation 模式

```ts
// 建立 relationship 後
queryClient.invalidateQueries({ queryKey: ["relationships", projectId] })

// 更新 project 設定後
queryClient.invalidateQueries({ queryKey: ["project", projectId] })
// 不需要 invalidate projects list（設定變更不影響 list 資料）

// 刪除 project-character link 後
queryClient.invalidateQueries({ queryKey: ["project-characters", projectId] })
// 如果 relationship 頁依賴此 link，也要 invalidate relationships
queryClient.invalidateQueries({ queryKey: ["relationships", projectId] })
```

---

## Mutation 流程

```
Component calls useMutation hook
    ↓
onMutate: optimistic update（選擇性）
    ↓
API call（fetch to Hono Worker）
    ↓
onSuccess: queryClient.invalidateQueries(...)
    ↓
TanStack Query 自動 refetch → UI 更新
    ↓
onError: rollback optimistic update + show toast
```

---

## 與 `data-store.js` 的對比

| `data-store.js`（舊）| TanStack Query（新）|
|--------------------|-------------------|
| `updateDataState(mutator)` clone-mutate | `queryClient.setQueryData()` + invalidate |
| `persistState()` → localStorage | 不需要；瀏覽器刷新後從 API 取 |
| 全域可讀取任何資料 | 只有使用 `useQuery(key)` 的元件收到對應資料 |
| N+1 load on init | 按需 fetch；stale-while-revalidate |
| 無型別 | 所有 query data 有 Zod 驗證型別 |
