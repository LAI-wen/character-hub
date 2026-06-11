# 保留 / 重寫 / 封存清單

**Date:** 2026-06-11

---

## 圖例

| 標記 | 意義 |
|------|------|
| ✅ 保留 | 直接移進新架構，幾乎不改 |
| 🔄 重寫 | 概念保留但實作重來（通常是型別化 / React 化）|
| 📦 封存 | 搬進 `_archive/`，不再修改 |
| 👁 參考 | 不直接帶入，但作為 UI 規格或資料結構參考 |
| ❌ 廢棄 | 已在 `_archive/`，功能由新架構完全取代 |

---

## _archive/app/

| 檔案 | 決定 | 理由 / 正式替代 |
|------|------|----------------|
| `adapters/api-client.js` | 🔄 重寫 | → `apps/web/src/lib/api/client.ts`；token 從 sessionStorage 移除，改 HttpOnly cookie |
| `adapters/data-store.js` | ❌ 廢棄 | TanStack Query 全面取代；LocalStorage 持久化不再需要 |
| `adapters/mock-adapter.js` | ❌ 廢棄 | 測試 fixture 改用 MSW；dev 資料用 seed D1 |
| `repositories/index.js`（Proxy 切換）| ❌ 廢棄 | mock/API toggle 在 MSW handler 層做 |
| `repositories/relationship-repository.js` | 👁 參考 | 欄位名稱 + normalizer 邏輯作為 contracts 參考 |
| `repositories/api-relationship-repository.js` | 👁 參考 | `apiCache` 模式已被 TanStack Query `invalidateQueries` 取代 |
| `repositories/api-repository-utils.js` | 👁 參考 | `normalizeRelationship` 欄位對應表寫進 contracts schema |
| `repositories/character-repository.js` | 👁 參考 | — |
| `repositories/worldview-repository.js` | 👁 參考 | — |
| `repositories/*-repository.js`（其餘 mock only）| ❌ 廢棄 | 功能未實作，Batch 2+ 從零開始 |
| `router.js` | ❌ 廢棄 | React Router v6 取代；hash router + localStorage scope 廢除 |
| `render.js`（el, clear, pill, panel）| ❌ 廢棄 | React + CSS Modules 取代 |
| `domain.js` | 🔄 重寫 | `FEATURES` 常數 → `packages/contracts/src/common.ts` |
| `navigation.js` | 🔄 重寫 | 靜態 nav config → `features/*/routes.ts` + `routes/layouts/` |
| `mock-data.js` | 📦 封存 | seed data 結構參考；正式 seed 在 `api/seeds/` |
| `feedback.js`（showToast）| ❌ 廢棄 | → `packages/ui/Toast.tsx` + React context |
| `smoke-test.js` | ❌ 廢棄 | Vitest 取代 |
| `screens/auth.js` | 🔄 重寫 | → `features/auth/LoginPage.tsx` |
| `screens/account-home.js` | 🔄 重寫 | → `features/account/WorkspacePage.tsx` |
| `screens/account-characters.js` | 🔄 重寫 | → `features/account/MyCharactersPage.tsx` |
| `screens/project-overview.js` | 🔄 重寫 | → `features/projects/ProjectOverviewPage.tsx` |
| `screens/project-characters.js` | 🔄 重寫 | → `features/project-characters/RosterPage.tsx` |
| `screens/project-manage.js` | 🔄 重寫 | → `features/projects/ProjectSettingsPage.tsx` |
| `screens/public-project.js` | 🔄 重寫（Batch 3）| → `features/public-page/` |
| `screens/demo-pages.js` | ❌ 廢棄 | 2000 行 placeholder，各頁面個別實作 |
| `main.js` | ❌ 廢棄 | `apps/web/src/main.tsx` 取代 |
| `index.html` | ❌ 廢棄 | `apps/web/index.html` 取代 |

---

## v3/

| 檔案 | 決定 | 理由 |
|------|------|------|
| `assets/ds.css` | ✅ 保留（移植）| Design token 完整，直接複製進 `apps/web/src/styles/tokens.css` |
| `assets/shell.css` | 👁 參考 | Sidebar layout → CSS Modules + `AppLayout.tsx` |
| `assets/shell.js` | 👁 參考 | Sidebar nav 邏輯 → `routes/layouts/ProjectLayout.tsx`；`can()` → PermissionGate |
| `assets/data.js`（OCData）| 👁 參考 | `ACTION_GRANTS` → 驗證 `auth.ts` 權限矩陣；mock 資料作 Vitest fixture |
| `assets/data.js`（OCDemo）| ❌ 廢棄 | sessionStorage mock mutation 不進正式前端 |
| `assets/app.js` | 👁 參考 | toast + lightbox → React 元件實作時參考 API |
| `assets/components.js` | 👁 參考 | ResourceState, Modal, Drawer 邏輯 → `components/` React 版 |
| `pages/*.html` | 👁 UI 規格 | 作為視覺 spec；React 頁面實作時比對 |
| `docs/oc-reference.md` | ✅ 保留 | 產品邏輯文件，移進 `docs/` |
| `assets/*.css`（頁面 CSS）| 👁 參考 | 各 feature 的 CSS Module 參考 |

---

## api/

| 檔案 | 決定 | 理由 |
|------|------|------|
| `src/app/auth.ts` | ✅ 保留 | 權限矩陣完整；Batch 1 開始即使用 |
| `src/app/db.ts` | ✅ 保留 | D1 query helpers |
| `src/app/http.ts` | ✅ 保留 | response helpers |
| `src/app/router.ts` | ✅ 保留（漸進拆）| 1590 行；Batch 2+ 逐步拆成 per-feature 檔案；不改端點 |
| `src/auth/router.ts` | ✅ 保留 | 登入流程（完善後使用）|
| `src/middleware/cors.ts` | ✅ 保留 | CORS 設定 |
| `src/demo/` | 📦 封存（Batch 1 後）| Demo auth 移除後無用；暫時保留給 local dev |
| `src/index.ts` | ✅ 保留 | Worker entry |
| `src/types.ts` | 🔄 重寫（漸進）| 部分 types 移進 `packages/contracts`；Worker-specific types 留原位 |
| `migrations/` | ✅ 保留 | D1 schema 正確；新功能再加 migration |
| `seeds/` | ✅ 保留 | D1 seed data |
| `wrangler.toml` | ✅ 保留 | Cloudflare 設定 |
| `test/` | ✅ 保留（擴充）| API integration test；Batch 1 補充 |

---

## 新建（apps/web 核心）

| 檔案 | 批次 |
|------|------|
| `apps/web/` 全部架構（詳見 03-directory-structure）| Batch 1 |
| `packages/contracts/` 核心 schemas | Batch 1 |
| `packages/ui/` 基礎元件 | Batch 1（從 v3 搬移）|
| `packages/contracts/` story / asset schemas | Batch 2 |
| `features/story/` | Batch 2 |
| `features/gallery/` | Batch 2 |
| `features/public-page/` | Batch 3 |
| `features/applications/` | Batch 3 |
| `features/submissions/` | Batch 3 |
