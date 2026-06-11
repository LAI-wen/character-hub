# 風險與回滾方式

**Date:** 2026-06-11

---

## 已識別風險

### R1 — 並行版本混亂

**描述：** `_archive/app/` 和 `apps/web/` 並存期間，有人（或 Claude）不小心修改了封存版本的功能，或者 API 端點改動破壞了 `_archive/app/` 的行為，但 `apps/web/` 尚未完成取代。

**機率：** 中  
**影響：** 中（局部功能失效）

**緩解：**
- `_archive/` 目錄唯讀原則：進入後只讀，不做 bug fix
- API 端點維持向後相容，不改 response 結構
- `_archive/app/` 的問題不修，引導用戶等 `apps/web`

**回滾：**  
恢復 `_archive/app/` 使用只需把 web server 指向原 HTML 檔，無需任何 build。

---

### R2 — Cookie Auth 阻斷本地開發

**描述：** 改成 HttpOnly cookie 後，`vite dev`（port 5173）呼叫 `wrangler dev`（port 8787）會有跨域 cookie 問題，因為 SameSite=Strict 不會跨 origin 帶 cookie。

**機率：** 高  
**影響：** 高（本地開發中斷）

**緩解（必須在 1-A 實作時一並解決）：**
- `vite.config.ts` 加 proxy：`/api/* → http://localhost:8787`，讓 browser 認為是 same-origin
- OR：dev 環境改用 `SameSite=Lax` + `Secure=false`（只在 `NODE_ENV !== 'production'`）
- Wrangler 設 `[dev] local_protocol = "http"` 允許 http cookie

---

### R3 — Contracts package 與 API 欄位不同步

**描述：** `packages/contracts` 的 schema 和 `api/src/app/router.ts` 的 response 欄位名稱不一致（如 API 回 `entityA_id`，但 contracts 定義 `entityAId`）。前端靜默拿到 `undefined`。

**機率：** 高（現有 API 有 camelCase/snake_case 混用）  
**影響：** 中（資料顯示空白）

**緩解：**
- 在 `features/*/api.ts` 中做一次性 Zod parse（`XxxSchema.parse(res)`），parse error 會在 dev 立即暴露
- API integration test 中驗證 response 欄位名稱
- Batch 1 開始前做一次欄位名稱對照（API response → contracts schema）

---

### R4 — 關係圖 UI 複雜度超預期

**描述：** `RelationshipsPage` 的關係圖（canvas/SVG drag & drop）是 Batch 1 中最複雜的 UI 元件，可能遠超其他頁面的工作量。

**機率：** 中  
**影響：** 中（延遲 Batch 1 完成，但不影響其他功能）

**緩解：**
- 先出「列表模式」（無圖，只有卡片），讓其他功能先進 Batch 1
- 圖視覺化作為 Batch 1 的最後一個功能，如果超時可後移 Batch 1.5

---

### R5 — Demo Auth 移除後 local seed 流程中斷

**描述：** 現在 local dev 依賴 `X-Demo-User-Id` header 繞過 auth。移除後，如果 login flow 尚未完整，本地 API 全部 401。

**機率：** 高（在 Auth 實作完成前）  
**影響：** 高（無法本地測試其他功能）

**緩解：**
- 按照 12-batch1-plan 的順序：**先完成 1-A Auth，確認登入可用後再移除 Demo Auth**
- 不在 Auth 完成前移除 demo 分支
- 本地 dev seed 流程：建立 test user seed + migration，確保 login 可用

---

### R6 — v3 prototype 被修改（設計資產流失）

**描述：** 開發過程中誤改 `v3/` 下的 HTML/CSS，破壞了作為 UI 規格的可信度。

**機率：** 低  
**影響：** 中（UI 規格不可信）

**緩解：**
- `v3/` 目錄加 `.gitattributes` 或 README 說明「唯讀 UI 規格」
- 任何 `v3/` 的改動需要明確 commit message 說明意圖

---

### R7 — Batch 2 依賴 Design Web Phase 1.1 延遲

**描述：** Batch 2（Story / Gallery）需要 v3 的對應頁面確認設計，如果 Design Web 沒進展，Batch 2 的 UI 規格不存在。

**機率：** 中  
**影響：** 低（Batch 1 不受影響）

**緩解：**
- Batch 1 完全不依賴 story / gallery，可先完成
- Batch 2 等 Design Web Phase 1.1 確認後才開始

---

## 回滾策略

### 任何 Batch 出問題

`apps/web` 和 `_archive/app/` 並存的設計本身就是回滾方案：

```
生產環境出問題 → 把 static hosting 指回 _archive/app/index.html
                → API 端點沒變，app/ 可繼續使用（除了移除 Demo auth 後）
```

### Cookie Auth 出問題

Demo auth 的移除是不可逆的（已封存），但 login/session 有問題時：
1. 先確認 wrangler session store 是否正常（KV / D1）
2. 確認 CORS + cookie 設定
3. 最壞情況：暫時在 `api/src/app/auth.ts` 加一個 dev-only bypass flag（環境變數控制）

### Contracts 欄位不一致

```
運行時 Zod parse 會拋 error → AppApiError → ResourceStateBoundary 顯示 error state
→ 定位到哪個欄位 parse 失敗 → 修 contracts 或 API mapper
```

不是 silent failure，可快速定位。

---

## 決策回顧（如果架構文件需要更新）

本系列文件（01–13）在 Batch 1 開始前作為確認基準。

如果實作中發現架構假設錯誤，更新對應文件並在 git commit message 說明：

```
docs: update 07-api-client-boundary - remove CSRF GET exemption

CSRF token 原設計 GET 不需要，但 /api/v1/auth/csrf 本身也需要保護
→ 改為所有 requests 帶 CSRF token
```

---

## 優先度排序

| 風險 | 優先處理 |
|------|---------|
| R2 Cookie 跨域（本地開發）| **必須在 1-A 前解決** |
| R5 Demo Auth 移除時序 | **嚴格按 1-A 完成後才移除** |
| R3 Contracts 欄位不一致 | Batch 1 開始前做一次欄位對照 |
| R4 關係圖複雜度 | 列表模式先出，圖後加 |
| R1 並行版本混亂 | 紀律問題，`_archive/` 唯讀 |
| R6 v3 被改 | 低優先，加 README 說明 |
| R7 Design Web 延遲 | 不影響 Batch 1 |
