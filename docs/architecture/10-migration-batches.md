# Migration Batches

**Date:** 2026-06-11

---

## 原則

1. 每個 Batch 是一個可獨立 demo 的垂直切片（feature → API → UI 全部通）
2. Batch N 完成後才開始 Batch N+1
3. `_archive/app/` 對應功能確認被取代後才標記廢棄
4. API 端點不改，只補型別和合約
5. 每個 Batch 結束做一次 security review checkoff

---

## Batch 0 — 腳手架（Foundation）

**目標：** monorepo 可以啟動，空白頁可以渲染，API 連得到

| 工作項目 | 輸出 |
|---------|------|
| 建立 `apps/web/`（Vite + React + TS strict）| 跑起來的空白 React app |
| 建立 `packages/contracts/`（Zod + common）| `@oc-tools/contracts` 可 import |
| 建立 `packages/ui/`（Button, Input 等基礎元件）| v3 tokens 移植 |
| `lib/api/client.ts` 基礎版（fetch wrapper）| `apiClient` 可用 |
| `lib/query/client.ts`（QueryClient 設定）| TanStack Query 掛上 |
| `routes/index.tsx`（createBrowserRouter 骨架）| Router 跑起來 |
| `routes/guards/AuthGuard.tsx`（placeholder）| 可阻擋未登入 |
| pnpm workspace 設定 | `pnpm install` 在 monorepo root 成功 |

**完成標準：** 瀏覽器可開 `localhost:5173`，看到 CharacterHub shell；`/login` 可渲染。

---

## Batch 1 — 核心 Auth + Character + Project

**目標：** 使用者可登入、看到自己的角色和企劃

### 1-A Auth

| 工作 | 說明 |
|------|------|
| `api/src/auth/router.ts` 完善 | login → HttpOnly cookie；logout → 清 cookie；`/api/v1/auth/me` |
| CSRF endpoint `GET /api/v1/auth/csrf` | 回傳 one-time token |
| `AuthContext` + `useAuth` | viewer 狀態；login/logout 函式 |
| `LoginPage.tsx` | email + password 表單；Zod validation |
| `AuthGuard` 完整 | 未登入 redirect；redirect back after login |

### 1-B contracts（Batch 1 範圍）

- `project.ts`
- `character.ts`
- `project-character-link.ts`
- `world-entry.ts`
- `relationship.ts`
- `relationship-layout.ts`
- `errors.ts`

### 1-C Account（帳號層）

| 工作 | 說明 |
|------|------|
| `WorkspacePage.tsx` | 工作台：my projects + recent activity |
| `MyCharactersPage.tsx` | 角色列表；搜尋 |
| `CharacterDetailPage.tsx` | 角色詳情 |
| `CharacterEditorPage.tsx` | 建立 / 編輯角色（RHF + Zod）|

### 1-D Projects

| 工作 | 說明 |
|------|------|
| `ProjectLayout.tsx` | ProjectContext 提供者；ScopeGuard |
| `ProjectOverviewPage.tsx` | 企劃總覽 |
| `ProjectSettingsPage.tsx` | 企劃設定（名稱、說明、visibility）|

### 1-E Roster（企劃角色）

| 工作 | 說明 |
|------|------|
| `RosterPage.tsx` | 企劃角色列表；新增角色連結 |
| `ProjectCharacterDetailPage.tsx` | 企劃角色詳情 |
| `ProjectCharacterEditorPage.tsx` | 編輯企劃角色（displayName, role）|

### 1-F Worldview

| 工作 | 說明 |
|------|------|
| `WorldviewPage.tsx` | 世界觀詞條列表 |
| `WorldEntryDetailPage.tsx` | 詞條詳情 |
| CRUD hooks + api.ts | list / get / create / patch / delete |

### 1-G Relationships

| 工作 | 說明 |
|------|------|
| `RelationshipsPage.tsx` | 關係圖 + 關係列表 |
| CRUD + layout hooks | patch layout（位置保存）|
| PermissionGate | 依 role 顯示 / 隱藏操作按鈕 |

**Batch 1 完成標準：**
- 登入後可看到工作台（真實 API 資料）
- 可建立企劃、新增角色、設定世界觀、管理關係
- sessionStorage token 已移除，改 HttpOnly cookie
- CSRF token 就位

---

## Batch 2 — Story + Gallery（視覺資產）

**前置條件：** Design Web Phase 1.1（v3 story / gallery / asset UI）確認

| 工作 | 說明 |
|------|------|
| Story API 實作（Hono）| `/api/app/projects/:id/stories/**` |
| Gallery / Asset API 實作 | `/api/app/projects/:id/assets/**` |
| `packages/contracts` story.ts / asset.ts | |
| `features/story/` | StoryPage.tsx + CRUD |
| `features/gallery/` | GalleryPage.tsx + asset upload（R2）|
| ColorSwatch, AssetCollection（from v3）| |
| R2 presigned upload URL | `PUT /api/app/projects/:id/assets/upload-url` |

---

## Batch 3 — Public Page + Commissions + Applications

**前置條件：** Batch 2 完成

| 工作 | 說明 |
|------|------|
| Public Page API 實作 | `/api/app/projects/:id/public-page/**` |
| `features/public-page/` | PublicProjectPage.tsx（無需登入）|
| Commission API | `/api/app/commissions/**` |
| `features/applications/` | 申請流程 |
| `features/submissions/` | 作品提交 |

---

## 廢棄時間表

| 目錄 | 廢棄時機 |
|------|---------|
| `_archive/app/screens/auth.js` | Batch 1-A 完成 |
| `_archive/app/screens/account-*.js` | Batch 1-C 完成 |
| `_archive/app/screens/project-*.js` | Batch 1-D/E 完成 |
| `_archive/app/adapters/api-client.js`（sessionStorage token 版）| Batch 1-A 完成 |
| `api/src/demo/`（Demo auth）| Batch 1-A 完成 |
| `_archive/app/screens/demo-pages.js` | Batch 3 完成 |

---

## 並行 API 重構（可在 Batch 1–3 期間穿插）

`api/src/app/router.ts` 1590 行 monolith 拆分（不改端點，只拆檔）：

| 拆出檔案 | 時機 |
|---------|------|
| `api/src/app/projects.ts` | Batch 1 |
| `api/src/app/characters.ts` | Batch 1 |
| `api/src/app/relationships.ts` | Batch 1 |
| `api/src/app/world-entries.ts` | Batch 1 |
| `api/src/app/stories.ts` | Batch 2 |
| `api/src/app/assets.ts` | Batch 2 |
