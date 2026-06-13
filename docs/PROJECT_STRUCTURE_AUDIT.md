# 專案結構稽核報告
> 稽核日期：2026-06-13 | 版本：monorepo cbf51aa

---

## 一、整體結構鳥瞰

```
oc-tools/                            ← Git repo 根目錄
├── apps/
│   └── web/                         ← ✅ 主 React 應用 (Vite + React + TypeScript)
├── packages/
│   └── contracts/                   ← ✅ 前後端共用型別 (Zod 4)
├── api/                             ← ✅ Cloudflare Workers API (Hono + D1)
├── OCTOOL 角色展示工具/              ← ⚠️ 舊版獨立工具（含空格中文目錄名）
│   └── octool-react/                ← React 單機版編輯器（localStorage 儲存）
├── v3/                              ← ⚠️ 17MB 設計原型，不應在 Git 中
├── _archive/                        ← 🔴 54MB 舊版歸檔，不應在 Git 中
├── docs/                            ← ✅ 文件目錄
├── .playwright-mcp/                 ← 🔴 200+ 執行期日誌/截圖，未被 .gitignore
├── package.json                     ← 根 workspace（但 api/ 不在 workspace 內）
├── package-lock.json                ← 根 workspace lock
├── README.md                        ← 🔴 描述的是舊版架構，內容已過時
├── logo.png (1.4MB)                 ← 大圖直接放 repo 根目錄
├── login-page.png (27KB)            ← 同上
└── template-editor-check.png (27KB) ← 同上
```

---

## 二、各資料夾詳細說明

### `apps/web/` — 主 Web 應用

| 子目錄 | 用途 |
|--------|------|
| `src/App.tsx` | 路由入口，Provider 組裝 |
| `src/components/` | 全域共用元件（Modal、Canvas、Icon 等） |
| `src/features/` | 按功能域分組的頁面與子元件 |
| `src/lib/` | API client、Auth context、工具函式 |
| `src/routes/` | React Router 路由定義、Guard、Layout |
| `src/store/` | Zustand 全域狀態（角色編輯） |
| `src/styles/` | Global CSS tokens、component 樣式 |
| `src/data/` | 靜態資料（表單模板、色板預設） |
| `src/locales/` | i18n 翻譯（zh-TW / en / ja） |

**與其他目錄的關係：**
- 依賴 `packages/contracts/` 取得型別（Zod 4 schemas）
- 呼叫 `api/` 的 REST endpoints（`/api/app/*`, `/api/v1/*`）
- 從 `OCTOOL 角色展示工具/octool-react/` 移植了大量元件（但未完全合併）

---

### `api/` — Cloudflare Workers 後端

| 子目錄 | 用途 |
|--------|------|
| `src/index.ts` | Worker 入口，掛載所有 router |
| `src/app/` | 新版應用 router（2765 行）、auth、db、http 工具 |
| `src/auth/` | JWT 簽發/驗證、OAuth、密碼處理 |
| `src/db/` | 舊版 D1 queries（`ocs`, `worldview_entries` 等） |
| `src/middleware/` | CORS、認證中介層 |
| `src/ocs/` | 舊版 OC router（針對舊 schema） |
| `src/projects/` | 舊版 projects router |
| `src/worldview/` | 舊版 worldview router |
| `src/relationships/` | 舊版 relationships router |
| `src/media/` | R2 媒體代理（**無認證！**） |
| `src/demo/` | Demo 靜態資料（無認證） |
| `src/users/` | 用戶設定 router |
| `migrations/` | 新版 D1 schema migrations |
| `src/db/migrations/` | 舊版 D1 schema |
| `seeds/` | 開發用種子資料 |
| `test/` | Vitest 測試 |

**最大結構問題：新舊兩套 API 並存**

`src/index.ts` 同時掛載了：
- `/api/v1/*` → 舊版 routers（操作 `ocs`、`worldview_entries` 等舊 tables）
- `/api/app/*` → 新版 `app/router.ts`（操作 `characters`、`world_entries` 等新 tables）
- `/api/public/*` → 也在 `app/router.ts` 內

這兩套 router 操作**完全不同的資料庫 schema**，目前無法確認生產環境實際使用哪份 schema。

**與其他目錄的關係：**
- **未使用** `packages/contracts/`（Zod v3 vs v4 版本衝突，且未加入 workspace）
- 被 `apps/web/src/lib/api/` 呼叫

---

### `packages/contracts/` — 共用型別合約

| 檔案 | 用途 |
|------|------|
| `src/character.ts` | Character Zod schema + Request/Response 型別 |
| `src/project.ts` | Project schema |
| `src/relationship.ts` | Relationship schema（direction enum 與 API 不一致！） |
| `src/story.ts` | Story + StoryEvent schema |
| `src/world-entry.ts` | WorldEntry schema（含多餘 `body` 欄位） |
| `src/asset.ts` | Asset schema |
| `src/auth.ts` | Auth schema |
| `src/common.ts` | VisibilitySchema、RelationshipDirectionSchema（未被使用） |
| `src/errors.ts` | Error 型別 |
| `src/project-character-link.ts` | 角色加入企劃連結 schema |
| `src/relationship-layout.ts` | 關係圖佈局 schema |
| `src/index.ts` | 全部重新匯出 |

**與其他目錄的關係：**
- `apps/web/` 使用（Zod 4）
- `api/` **未使用**（Zod 3，獨立安裝）
- 這是雙方 API 合約的「應有」位置，但實際上只有前端在用

---

### `OCTOOL 角色展示工具/octool-react/` — 舊版獨立工具

原始的單機 OC 展示卡編輯器，以 localStorage 儲存資料。

| 子目錄 | 用途 |
|--------|------|
| `src/App.tsx` | 三視圖：form / design / help |
| `src/components/TemplateCanvas.tsx` | 展示畫布（1139 行，與 apps/web 版重複）|
| `src/data/blocks.ts` | Block 定義、FormTemplate 型別 |
| `src/data/demo.ts` | Demo 角色資料（含作者個人 handle） |
| `src/features/design/` | BlockInspector |
| `src/features/form/` | 表單面板 |
| `src/features/help/` | 說明頁面（**尚未移植到 apps/web**） |
| `src/features/modals/` | Modal 元件 |
| `src/store/useOctool.tsx` | 全域狀態（localStorage I/O） |

**與其他目錄的關係：**
- 已被 `apps/web/` 部分移植，但仍保留完整 codebase
- 不在根 workspace 內（獨立 `package-lock.json`）
- 沒有棄用計劃文件

---

### `v3/` — 設計原型（應移出 Git）

前一代 HTML 設計稿 + QA 報告。包含 `index.html`、`pages/`（26 個 HTML 頁面）、`assets/`、截圖，以及 `handoff.html`、`slice*-report.html` 等分析文件。總大小約 17MB。

**問題：** 這是設計工作產物，不是程式碼，不應永久存在 Git 歷史中。

---

### `_archive/` — 舊版歸檔（應移出 Git）

包含 v1（靜態 HTML 工具）、v2（`oc-tools-new/`）、`app/`（Capacitor 行動 App 原型）、`misc/` 等。總大小約 54MB。

**問題：** 佔用 clone 空間，含有舊版資料可能暴露早期設計決策。

---

### `docs/` — 文件

| 子目錄 | 用途 |
|--------|------|
| `analysis/` | 市場分析、競品比較文件 |
| `architecture/` | 系統架構文件 |
| `productization/` | 產品化計劃 |
| `reports/` | 部署/進度報告 |
| `superpowers/` | AI 協作計劃與 spec |

目前文件品質偏向策略層面，缺少：開發環境安裝說明、API 端點文件、資料 schema 說明。

---

## 三、命名混亂與責任不清

### 問題 1：中文含空格的目錄名 (`OCTOOL 角色展示工具`)

**路徑：** `/OCTOOL 角色展示工具/`

空格 + 中文在 shell glob 中需要引號，部分 CI 工具（尤其 Linux 上）的路徑處理不一致。任何迭代檔案路徑的腳本都需特殊處理。

**如果不修：** CI 偶發失敗，shell 腳本需要特殊引號，新協作者困惑。

### 問題 2：`.playwright-mcp/` 未被 .gitignore

**路徑：** `/.playwright-mcp/`（200+ 日誌檔和截圖）

這是 Playwright MCP session 的執行期產物，不是 source code。截圖可能含有尚未發布的 UI 設計。

**如果不修：** 每次開發 session 都累積數十個新檔案到版本控制。

### 問題 3：三個 package-lock.json

- `/package-lock.json`（根 workspace）
- `/api/package-lock.json`（api 獨立）
- `/OCTOOL 角色展示工具/octool-react/package-lock.json`（OCTOOL 獨立）

`npm ci` 在根目錄只安裝前兩個 workspace 的依賴，不涵蓋 `api/` 和 OCTOOL。

**如果不修：** 新開發者 `npm install` 後執行 `npm run dev:api` 會報錯，因為 api 依賴未安裝。

### 問題 4：`api/` 不在根 workspace

根 `package.json` 的 `workspaces: ["apps/*", "packages/*"]` 沒有包含 `api/`。

- `api/` 的 zod 版本是 v3，contracts 是 v4——不相容且彼此無法感知對方
- 根目錄的 `npm run typecheck` 不涵蓋 api

**如果不修：** 型別合約漂移永遠不會在 CI 中被發現。

### 問題 5：README 描述的是完全不同的架構

README 提及 `oc-tools-new/`、`app/`（Capacitor）、`python3 -m http.server 4180` 開發命令——全部是舊版架構的內容。

**如果不修：** 任何新協作者照 README 做都會完全失敗。

---

## 四、可以考慮合併或拆分的地方

### 應合併：
- `OCTOOL 角色展示工具/octool-react/src/components/TemplateCanvas.tsx` → 與 `apps/web/src/components/TemplateCanvas.tsx` 合併，建立單一來源
- `OCTOOL 角色展示工具/octool-react/src/data/blocks.ts` → 與 `apps/web/src/features/project/templateBuilder/blocks.ts` 合併
- OCTOOL 的 FormTemplate 型別 → 移入 `packages/contracts/`

### 應拆分：
- `api/src/app/router.ts`（2765 行）→ 按功能域拆成多個 router 檔案
- `apps/web/src/features/account/AccountSettingsPage.tsx`（1180 行）→ 每個 panel 一個檔案

### 應移出 Git：
- `_archive/`（54MB）→ 打包另存或移到獨立分支
- `v3/`（17MB）→ 同上
- `.playwright-mcp/`（200+ 檔案）→ 加入 `.gitignore`

### 應加入 .gitignore：
```
.playwright-mcp/
*.zip
编輯和模板.zip
響應參考.zip
```

---

## 五、建議的理想結構

```
oc-tools/
├── apps/
│   └── web/          ← 唯一主 SPA
├── packages/
│   └── contracts/    ← 前後端共用型別（升級到同一 Zod 版本）
├── api/              ← 移入 workspace OR 保持獨立但加文件說明
├── docs/             ← 文件（含本 audit）
├── .gitignore        ← 加入 .playwright-mcp/ 等
├── README.md         ← 重寫，說明現況
└── package.json      ← 考慮是否把 api/ 加入 workspace
```

舊版 OCTOOL 應明確標記為「已移植/已棄用」並移至獨立 archive 分支，或在 README 標示「僅作參考，不再維護」。
