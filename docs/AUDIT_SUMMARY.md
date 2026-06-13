# 深度稽核總結報告
> 稽核日期：2026-06-13 | 稽核範圍：整個 oc-tools monorepo

---

## 一、整體評分

| 維度 | 評分 | 說明 |
|------|------|------|
| 架構設計 | 6/10 | monorepo 方向正確，但 API 雙軌並存、contracts 未接入 API |
| 程式碼品質 | 5/10 | 核心功能有效，但重複定義、大檔案、型別 as any 普遍 |
| 安全性 | 4/10 | 4 個 Critical 問題，其中 2 個可被直接利用 |
| 產品完整度 | 5/10 | 核心角色編輯流暢，但多個功能域是 placeholder |
| 可維護性 | 4/10 | 型別散落三處、無共用 UI 元件、README 描述舊架構 |
| 測試覆蓋 | 3/10 | 測試目錄存在但覆蓋率不明，核心 store 無測試 |

**整體：5/10** — 產品骨架紮實，核心創作流程可用，但有嚴重的安全漏洞、大量的 placeholder UI 被當作可用功能呈現給用戶，以及型別系統三分散的技術債。

---

## 二、最大 20 個問題

| 排名 | 嚴重度 | 問題 | 位置 |
|------|--------|------|------|
| 1 | 🔴 Critical | R2 媒體代理無認證，所有用戶圖片公開可存取 | `api/src/index.ts:31` |
| 2 | 🔴 Critical | 搜尋 endpoint 必定 Runtime Crash（`viewer` undefined）| `api/src/app/router.ts:2513` |
| 3 | 🔴 Critical | Demo Auth Bypass（APP_ENV 未設定時自動開啟）| `api/src/app/auth.ts:79` |
| 4 | 🔴 Critical | Worldview rel 越權刪除（任何用戶可刪除他人的 rel）| `api/src/worldview/router.ts:114` |
| 5 | 🔴 高 | `scheduleSave` 儲存失敗靜默吞噬，用戶完全不知道 | `useCharacterStore.tsx` |
| 6 | 🔴 高 | `CharacterDetailPage` 讀 `gp.template` 而非 `gp.templates`，企劃模板永久無效 | `account/CharacterDetailPage.tsx:693` |
| 7 | 🔴 高 | `AccountSettingsPage` 的 5 個 Panel 無儲存功能但 UI 看起來很完整 | `AccountSettingsPage.tsx` |
| 8 | 🔴 高 | `CommissionsPage` 整個功能是假資料，「+ 新委託」無功能 | `CommissionsPage.tsx` |
| 9 | 🟠 高 | OAuth 帳號自動合併未經用戶確認（帳號接管風險）| `api/src/auth/router.ts:185` |
| 10 | 🟠 高 | Access Token 在 URL Query Parameter（Server log 洩漏）| `api/src/auth/router.ts:262` |
| 11 | 🟠 高 | API contracts 與 app/router 的 enum 值完全不同（direction, features）| `packages/contracts/` vs `app/router.ts` |
| 12 | 🟠 高 | N+1 查詢：`GET /projects/:id/characters`（50 角色 = 51 次 D1 查詢）| `app/router.ts:1410` |
| 13 | 🟠 高 | Domain types 在 3 個地方重複定義，`src/types/index.ts` 不存在 | `useCharacterStore.tsx`, `TemplateCanvas.tsx` 等 |
| 14 | 🟠 高 | `AlbumsEditor.tsx`：`annotations.length` 在舊資料 crash | `charEdit/AlbumsEditor.tsx:88` |
| 15 | 🟠 高 | `ProjectLayout.tsx`：`viewerRole ?? "owner"` 授予非成員 owner 權限 | `ProjectLayout.tsx:51` |
| 16 | 🟡 中 | CSRF Token 發出但從未被任何 route 驗證（防護形同虛設）| `auth/router.ts:148` |
| 17 | 🟡 中 | `TemplateCanvas.tsx` 中 `BlockEl` 當函式呼叫而非 JSX | `TemplateCanvas.tsx:1154` |
| 18 | 🟡 中 | `RelationshipsPage` 的 drag state 在 useState，每個 mousemove 都 re-render | `RelationshipsPage.tsx` |
| 19 | 🟡 中 | `_archive/`（54MB）和 `v3/`（17MB）不應在 Git 中 | repo 根目錄 |
| 20 | 🟡 中 | README.md 描述的是舊版架構（`app/`、`oc-tools-new/`、Python server）| `/README.md` |

---

## 三、最值得保留的設計

1. **`packages/contracts/` 的架構方向** — 以 Zod schema 作為前後端共用型別合約，方向完全正確，只需修正 enum 值並讓 API 也使用它
2. **`apps/web/src/lib/api/client.ts`** — 乾淨的 fetch wrapper，統一 auth header 和 error handling，值得保留
3. **功能域分組的 features/ 結構** — `account/`、`project/`、`charEdit/`、`public/` 的分組邏輯清晰
4. **TanStack Query 的三態模式** — 大多數頁面正確實作了 pending/error/success 三態，值得繼續維持
5. **`TemplateBuilder` 的狀態設計** — 所有模板狀態本地管理並向下傳遞 imperative handles，對 WYSIWYG 編輯器是正確選擇
6. **`ScopeGuard` + `AuthGuard` 的 route protection 架構** — 概念上正確，分層清晰
7. **CLAUDE.md 中制定的規則** — IDB/atomic write/temp file 的工程規範有價值，只是目前程式碼執行不一致
8. **`api/src/app/router.ts` 中的 Zod validation** — 幾乎所有 create/update endpoint 都有 Zod 驗證，是好的習慣
9. **`FormTemplate` 的設計概念** — 模板儲存/載入/匯出的概念對創作工具很重要，值得完成（改為 API 儲存）
10. **i18n 的三語系設定** — zh-TW/en/ja 的架構是對的，執行覆蓋率需要提升

---

## 四、最該先修的 10 個地方

（按「影響大 + 難度低」排序）

### 可以今天修

1. **`api/src/index.ts:31` — 加認證到 `/api/media/*`**  
   在媒體代理前加 `requireAuth` middleware，5 行程式碼，消除 Critical 安全漏洞。

2. **`api/src/worldview/router.ts:114` — 修 rel 刪除授權**  
   加一行：`WHERE id = ? AND entry_id = ?`，防止越權刪除。

3. **`apps/web/src/features/account/CharacterDetailPage.tsx:693` — 修 `gp.template` → `gp.templates`**  
   一行修改，讓企劃限定模板設定生效。這是功能性 Bug，用戶操作後沒有預期效果。

4. **`apps/web/src/features/charEdit/AlbumsEditor.tsx:88` — 加 `?? []` 或在 store normalize**  
   一行防禦，防止舊資料格式造成 crash。

5. **`apps/web/src/routes/layouts/ProjectLayout.tsx:51` — 修 `viewerRole` 預設值**  
   `?? "owner"` 改為 `?? "viewer"`（或 `null`），防止前端授予非成員過高權限。

### 本週修

6. **`wrangler.toml` — 設定 `APP_ENV` 環境變數**  
   在 production 部署設定中明確指定 `APP_ENV = "production"`，關閉 Demo Auth Bypass。

7. **`api/src/app/router.ts:2513` — 修 search crash**  
   把 `c.get('viewer')` 改為 `c.get('user')`（正確的 key），搜尋功能立即可用。

8. **`apps/web/src/store/useCharacterStore.tsx` — 儲存失敗加 error state**  
   catch block 加入 `setSaveError(true)` + 對應的 UI 提示，讓用戶知道存取失敗。

9. **`.gitignore` — 加入 `.playwright-mcp/`、`*.zip`**  
   三行 .gitignore，阻止 200+ 個執行期日誌/截圖繼續進入版本控制。

10. **`apps/web/src/features/project/ParticipantsPage.tsx` — 修 save 按鈕**  
    「儲存權限」按鈕目前觸發 `reset`（還原），改為呼叫正確的 mutation。

---

## 五、建議重構順序

### 第一輪（安全性 + 功能性 Bug）

目標：修掉會讓用戶受傷或被攻擊的問題。

1. 媒體代理加認證（S-01）
2. Worldview rel 越權刪除（S-04）
3. 搜尋 crash（S-02）
4. APP_ENV 環境變數（S-03）
5. CharacterDetailPage 模板讀取（Q-14）
6. AlbumsEditor annotations crash（Q-20）
7. ProjectLayout viewerRole 預設值（H-01）

### 第二輪（型別系統整合）

目標：建立單一事實來源，減少未來的型別漂移。

1. 建立 `src/types/index.ts`，移入所有 domain types
2. 修正 contracts/character.ts（ownerUserId）
3. 統一 direction enum（contracts + API）
4. 補充 contracts/project.ts（workspaceKind, color）
5. 考慮讓 API 加入 workspace 並升級 Zod

### 第三輪（功能完整性）

目標：讓 UI 中可見的功能都有對應的後端支撐。

1. AccountSettingsPage 各 panel 加後端 mutation
2. `/api/app/search` 完整實作
3. `PATCH /stories/:storyId` endpoint
4. 公開頁面 blocks 更新 endpoint
5. FormTemplate 遷移到 API 儲存
6. CommissionsPage 接真實 API 或加醒目的 "coming soon" 標示

### 第四輪（程式碼品質）

目標：提升可維護性，降低未來開發的阻力。

1. 共用元件：`<EmptyState />`、`<LoadingSpinner />`、`<Modal />`
2. `charColor` 統一使用 `lib/charColor.ts`
3. 提取 `lib/utils/formatDate.ts`、`lib/utils/typeLabels.ts`
4. `TemplateCanvas.tsx` 拆分子模組
5. `AppLayout.tsx` `<a>` 改 `<Link>`
6. mutation onError 補全
7. 移除 `_archive/` 和 `v3/` 或移至獨立分支

---

## 六、不建議現在動的地方

1. **`api/src/app/router.ts` 大重構** — 2765 行拆分成多個 router 是正確的，但要等安全問題修完、功能穩定後再做，風險太高容易引入新 Bug
2. **`TemplateCanvas.tsx` 完整重構** — 同上，核心渲染邏輯如果改壞，整個展示功能就壞了
3. **將 OCTOOL 完全合併進 apps/web** — 目前 OCTOOL 還有用戶在使用（假設），合併需要謹慎的遷移計劃
4. **切換 API 到使用 packages/contracts** — Zod v3 → v4 是 breaking change，需要仔細評估所有 schema 差異
5. **資料庫 schema 的舊版 router 清理** — 確認生產環境實際使用哪份 schema 之前，不要動任何 table 或刪除舊版 router

---

## 七、可以交給 AI 修改的任務清單

以下任務邊界清楚、風險低，適合直接交給 AI 執行：

### 低風險，立即可做

- [ ] `.gitignore` 加入 `.playwright-mcp/`, `*.zip`
- [ ] `ProjectLayout.tsx:51` 修 `?? "owner"` → `?? "viewer"`
- [ ] `AlbumsEditor.tsx:88` 加 `?? []` 防護
- [ ] `CharacterDetailPage.tsx:693` 修 `gp.template` → `gp.templates`（需同步修改相關讀取邏輯）
- [ ] `ParticipantsPage.tsx` 修「儲存」按鈕目標（需確認正確的 mutation）
- [ ] `AppLayout.tsx:169,296` `<a href>` 改 `<Link to>`
- [ ] `OAuthCallbackPage.tsx` 移除孤懸的 `sessionStorage.setItem("access_token", token)`
- [ ] `RelationshipsPage.tsx` 的 `charColor` 改 import 自 `lib/charColor.ts`（需確認顏色統一）

### 中風險，需要上下文確認

- [ ] `useCharacterStore.tsx` 的 catch block 加 error state + toast
- [ ] `api/src/index.ts` 媒體代理加 `requireAuth`（需確認不影響公開頁面的圖片存取）
- [ ] `api/src/app/router.ts:2513` search crash 修正（`viewer` → `user`）
- [ ] 建立 `src/types/index.ts`，移入 `useCharacterStore.tsx` 的 domain types（影響廣，需逐一確認 import）
- [ ] 建立 `lib/utils/formatDate.ts`，替換各頁的 inline `timeAgo`
- [ ] 建立 `lib/utils/typeLabels.ts`，替換各頁的 inline `TYPE_LABELS`
- [ ] mutation `onError` 補全（多個頁面）

### 需要設計決策再執行

- [ ] `contracts/relationship.ts` direction enum 統一（需確認哪組值是 canonical）
- [ ] `contracts/character.ts` `ownerUserId` 修正（需確認 API 實際欄位名稱）
- [ ] AccountSettingsPage 各 panel 加 mutation（需要對應的 API endpoint）
- [ ] FormTemplate 遷移到 API（需要新增 endpoint）
- [ ] `api/src/auth/router.ts` OAuth callback 改用 fragment 傳 token（影響前後端兩側）

---

## 附錄：所有稽核文件索引

| 文件 | 內容 |
|------|------|
| [PROJECT_STRUCTURE_AUDIT.md](PROJECT_STRUCTURE_AUDIT.md) | 專案結構、資料夾職責、命名問題 |
| [CODE_QUALITY_AUDIT.md](CODE_QUALITY_AUDIT.md) | 程式碼品質、架構、型別、重複、效能 |
| [SECURITY_AUDIT.md](SECURITY_AUDIT.md) | 安全漏洞（Critical/High/Medium/Low）|
| [PRODUCT_UX_AUDIT.md](PRODUCT_UX_AUDIT.md) | 功能完整度、UX 問題、手機版 |
| [audit/components.md](audit/components.md) | components/ 資料夾稽核 |
| [audit/pages.md](audit/pages.md) | features/ 各頁面稽核 |
| [audit/store.md](audit/store.md) | useCharacterStore 稽核 |
| [audit/types.md](audit/types.md) | 型別系統稽核（contracts + inline）|
| [audit/utils.md](audit/utils.md) | lib/ 工具函式稽核 |
| [audit/hooks.md](audit/hooks.md) | hooks / routes / layouts 稽核 |
