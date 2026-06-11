# 現有前端盤點

**Date:** 2026-06-11

---

## app/ — 現有 Vanilla JS SPA

### 架構概覽

```
app/
├── index.html
├── main.js            ← 啟動點（initDataSource, hashchange）
├── router.js          ← hash-based SPA router + sidebar renderer
├── render.js          ← DOM builder（el, clear, pill, panel）
├── domain.js          ← 靜態常數（FEATURES, ROLE_LABELS, hasFeature）
├── navigation.js      ← account-level nav items
├── mock-data.js       ← 靜態 mock seed（projects, characters, links）
├── feedback.js        ← showToast
├── smoke-test.js      ← 節點語法 check
├── adapters/
│   ├── data-store.js  ← 全域 in-memory state + localStorage 持久化
│   ├── mock-adapter.js← 讀 data-store（read-only, no repository pattern）
│   └── api-client.js  ← HTTP client（fetch wrapper, token 管理）
├── repositories/
│   ├── index.js                     ← Proxy 切換 mock ↔ API
│   ├── relationship-repository.js   ← Mock RelationshipRepository
│   ├── api-relationship-repository.js← API RelationshipRepository
│   ├── character-repository.js
│   ├── api-character-repository.js
│   ├── worldview-repository.js
│   ├── api-worldview-repository.js
│   ├── project-repository.js
│   ├── api-project-repository.js
│   ├── api-repository-utils.js      ← normalizers, apiCache, bodyForX
│   ├── repository-utils.js          ← clone, makeId, mutateState, readState
│   ├── story-repository.js          ← mock only
│   ├── gallery-repository.js        ← mock only
│   ├── collaboration-repository.js  ← mock only
│   ├── commission-repository.js     ← mock only
│   └── public-page-repository.js    ← mock only
└── screens/
    ├── auth.js                      ← Login, callback
    ├── account-home.js              ← 工作台
    ├── account-characters.js        ← 我的角色
    ├── project-overview.js          ← 企劃總覽
    ├── project-characters.js        ← 企劃角色
    ├── project-manage.js            ← 企劃設定
    ├── public-project.js            ← 公開企劃頁
    └── demo-pages.js                ← 其餘所有功能（placeholder + 部分互動）
```

### 已實作 API 串接

| Repository | Mock | API |
|-----------|------|-----|
| ProjectRepository | ✅ | ✅ |
| CharacterRepository | ✅ | ✅ |
| WorldviewRepository | ✅ | ✅ |
| RelationshipRepository | ✅ | ✅ |
| StoryRepository | ✅ mock only | ❌ |
| GalleryRepository | ✅ mock only | ❌ |
| CollaborationRepository | ✅ mock only | ❌ |
| CommissionRepository | ✅ mock only | ❌ |
| PublicPageRepository | ✅ mock only | ❌ |

### 問題清單

| 類別 | 問題 |
|------|------|
| **安全** | `access_token` 存 sessionStorage（XSS 可竊取），正式應改 HttpOnly cookie |
| **安全** | `router.js:81` 有 `svg.innerHTML = ICONS[name]`，目前內容來自靜態常數無 XSS，但模式危險 |
| **狀態** | `data-store.js` 是全域可變 singleton，mutation 透過 `updateDataState` clone-mutate，沒有 invalidation 機制 |
| **狀態** | API mode 下初始化時 N+1 requests（每個 project 分別 load relationships + layout）|
| **Scope** | `activeProjectId` 從 `localStorage` 讀取，Scope 不由 Route 決定 |
| **Scope** | project permission 依賴 `viewer.projectRoles[id]`，client-side only |
| **型別** | 全部 vanilla JS，沒有型別安全 |
| **架構** | `demo-pages.js` 單檔 2000+ 行，所有未完成頁面混在同一檔 |
| **架構** | `render.js` 的 `el()` 是自製 JSX，維護成本高，沒有 React reconciler |
| **架構** | API response 沒有 schema 驗證，欄位名稱依賴 `normalizeX` 函式 |
| **重複** | `api-repository-utils.js` 的 normalizers 與 API `mapX` 函式重複邏輯 |

---

## v3/ — Design Prototype

```
v3/
├── index.html            ← 設計總覽 showroom
├── pages/                ← 各功能頁（24 個 HTML 檔）
├── assets/
│   ├── data.js           ← window.OCData（1482 行 mock 資料 + API）
│   ├── shell.js          ← 側欄注入（394 行）
│   ├── app.js            ← 全域工具（toast, Lightbox, swatch copy）
│   ├── components.js     ← 共用 UI（modal, drawer, ResourceState...）
│   ├── ds.css            ← Design token（300 行）
│   ├── shell.css         ← Sidebar layout
│   └── *.css             ← 各頁 CSS
└── docs/
    └── oc-reference.md
```

### OCData / OCDemo 評估

**OCData** (`window.OCData`) 包含：
- `projects[]`, `entities[]`, `relationships[]`, `stories[]`, `assets[]` 等完整 mock 資料
- `resolveScope(fileName, search)` — filename-based scope resolver
- `can(cap)`, `canAction(action)`, `getRole(pid)` — client-side 權限矩陣
- `setCurrent(pid)` — 全域 currentProject

**OCDemo** (`window.OCDemo`) 包含：
- sessionStorage 跨頁 Demo 持久化
- `createCharacter()`, `updateCharacter()`, `createProject()` 等 mock mutation

**結論：OCData / OCDemo 的資料完全不能帶進正式前端，但以下有參考價值：**

| OCData 的設計 | 正式對應 |
|-------------|---------|
| `ACTION_GRANTS` per role | `requirePermission()` in auth.ts |
| `resolveScope()` | `RouteContext` + nested route params |
| `enabledFeatures[]` | Project.enabledFeatures 欄位已存在 API |
| `can(cap)` UI gate | `PermissionGate` component |

### v3 頁面完成度（作為 UI 規格的可信度）

| 頁面 | 視覺完成度 | 互動完成度 | 可用性作為 UI 規格 |
|------|----------|----------|----------------|
| dashboard.html | ✅ 高 | ✅ 篩選+搜尋 | ✅ |
| character.html | ✅ 高 | ✅ 完整 | ✅ |
| editor.html | ✅ 高 | ✅ 完整 | ✅ |
| overview.html | ✅ 高 | ✅ | ✅ |
| relationships.html | ✅ 高 | ✅ 互動完整 | ✅ |
| worldview.html | ✅ 高 | ✅ | ✅ |
| story.html | ✅ 高 | ⚠️ 部分 | ✅ |
| workspace.html | ✅ 高 | ✅ | ✅ |
| settings.html | ✅ 高 | ⚠️ | ✅ |
| portal.html | ✅ 高 | ✅ | ✅ |
| roster.html | ✅ 中 | ⚠️ | ✅ 作為 wireframe |
| template-builder.html | ✅ 高 | ⚠️ | ✅ |
| commissions.html | ✅ 中 | ⚠️ | ✅ |

---

## api/ — Hono Worker

### 已實作端點

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET  /api/app/projects
POST /api/app/projects
GET  /api/app/projects/:id
PATCH /api/app/projects/:id

GET  /api/app/characters
POST /api/app/characters
GET  /api/app/characters/:id
PATCH /api/app/characters/:id

GET  /api/app/projects/:id/characters
POST /api/app/projects/:id/characters
GET  /api/app/projects/:id/characters/:linkId
PATCH /api/app/projects/:id/characters/:linkId
DELETE /api/app/projects/:id/characters/:linkId

GET  /api/app/projects/:id/world-entries
POST /api/app/projects/:id/world-entries
GET  /api/app/projects/:id/world-entries/:entryId
PATCH /api/app/projects/:id/world-entries/:entryId
DELETE /api/app/projects/:id/world-entries/:entryId

GET  /api/app/projects/:id/relationships
POST /api/app/projects/:id/relationships
GET  /api/app/projects/:id/relationships/:relId
PATCH /api/app/projects/:id/relationships/:relId
DELETE /api/app/projects/:id/relationships/:relId

GET  /api/app/projects/:id/relationship-layout
PUT|PATCH /api/app/projects/:id/relationship-layout

# 以下回傳 501 Not Implemented：
/api/app/projects/:id/stories/**
/api/app/projects/:id/assets/**
/api/app/projects/:id/public-page/**
/api/app/projects/:id/applications/**
/api/app/projects/:id/submissions/**
/api/app/wishlist/**
/api/app/commissions/**
```

### Auth 現況

- 正式 production auth 尚未完成（`/api/v1/auth` 路由存在但功能未全）
- `api/app/*` 目前使用 Demo Auth（`X-Demo-User-Id` header），只在 local/demo env 有效
- HttpOnly cookie session 預留但未接通

### 已知技術債（api/）

- `router.ts` 單檔 1590 行，所有端點集中在一個 `appApiRouter`
- D1 row types 定義在同一檔案內
- `mapRelationship()` 欄位與 `normalizeRelationship()` 部分重複

---

## 總結：各部分去向

| 目錄/檔案 | 去向 | 理由 |
|----------|------|------|
| `app/render.js` | ❌ 廢棄 | React 取代 |
| `app/router.js` | ❌ 廢棄 | React Router 取代 |
| `app/domain.js` | ⚠️ 部分保留 | FEATURES 常數可移進 contracts |
| `app/adapters/data-store.js` | ❌ 廢棄 | TanStack Query 取代 |
| `app/adapters/api-client.js` | ⚠️ 參考重寫 | typed API client 取代，token 移除 |
| `app/adapters/mock-adapter.js` | ❌ 廢棄 | OCData / fixture 取代 |
| `app/repositories/` | ⚠️ 概念保留 | 改用 typed hooks |
| `app/screens/` | ❌ 廢棄 | React screens 取代 |
| `v3/assets/ds.css` | ✅ 移植 | Design token 原封搬入 `apps/web` |
| `v3/assets/app.js` | ⚠️ 參考 | toast/lightbox 改成 React 元件 |
| `v3/pages/*.html` | ✅ UI 規格 | 作為 React 元件視覺參考，不直接轉檔 |
| `v3/assets/data.js` | ✅ Fixture 參考 | mock 資料結構可作 storybook fixture |
| `api/src/app/router.ts` | ✅ 保留並重構 | 拆檔，不改端點設計 |
| `api/src/app/auth.ts` | ✅ 保留 | 權限矩陣已完整 |
| `api/migrations/` | ✅ 保留 | D1 schema 正確 |
