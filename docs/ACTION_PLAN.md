# CharacterHub 行動清單
> 從稽核報告（2026-06-13）+ 測試報告（2026-06-13）整合  
> 依「影響大 × 改動小」排序，由上往下處理

---

## 換電腦後第一步

```bash
git clone https://github.com/LAI-wen/OCTOOLS.git
cd OCTOOLS
npm install               # apps/web + packages/contracts
npm install --prefix api  # API 依賴（api/ 不在 workspace）
npm run dev:web           # 前端開發伺服器
```

---

## 第一輪：可以今天修（1 行 ～ 10 行）

這些都是邊界清楚、風險低的修改，每個預估 10–30 分鐘。

### 🔴 安全性（Critical）

- [ ] **S-01：`/api/media/*` 加認證**  
  `api/src/index.ts:31` — 在媒體代理前加 `requireAuth` middleware。注意：確認公開頁面的角色圖片是否需要不認證就能存取，若需要則改為「有 token 就驗證、無 token 就只允許公開角色的圖片」。

- [ ] **S-02：搜尋 endpoint crash 修正**  
  `api/src/app/router.ts:2513` — `c.get('viewer')` 改為 `c.get('user')`（正確的 Variables key）。

- [ ] **S-04：Worldview rel 越權刪除**  
  `api/src/worldview/router.ts:114` — delete rel 前加一行查詢確認 `rel.entry_id === params.id`。

- [ ] **環境變數：設定 APP_ENV**  
  `api/wrangler.toml` — 在 `[vars]` 區塊加上 `APP_ENV = "production"`，關閉 Demo Auth Bypass（S-03）。

### 🔴 功能性 Bug

- [ ] **B1：沒有模板時「加入積木」禁用**  
  `apps/web/src/features/project/TemplateBuilderPage.tsx` — 當 `templates.length === 0` 時，積木面板顯示「請先建立模板」的 empty state，或禁用積木按鈕。（來自測試報告）

- [ ] **B2：公開 slug 空白時提示**  
  當角色 / 企劃設為公開但 slug 為空或是 fallback 亂碼時，在編輯頁或公開頁設定處提示補填。（來自測試報告）

- [ ] **CharacterDetailPage 模板讀取錯誤**  
  `apps/web/src/features/account/CharacterDetailPage.tsx:693` — `gp.template` 改為 `gp.templates`，讓企劃限定模板設定生效。

- [ ] **AlbumsEditor annotations crash**  
  `apps/web/src/features/charEdit/AlbumsEditor.tsx:88` — `im.annotations.length` 改為 `(im.annotations ?? []).length`，或在 store 的 getCharacter 時 normalize。

### 🟠 前端明顯 Bug

- [ ] **ProjectLayout viewerRole 預設值**  
  `apps/web/src/routes/layouts/ProjectLayout.tsx:51` — `?? "owner"` 改為 `?? "viewer"`，非成員不應預設 owner 權限。

- [ ] **ParticipantsPage「儲存權限」按鈕**  
  目前綁到 `reset`（還原），應改為呼叫正確的 mutation。

- [ ] **AppLayout `<a>` 改 `<Link>`**  
  `apps/web/src/routes/layouts/AppLayout.tsx:169, 296` — 兩處原生 `<a href>` 改成 React Router `<Link to>`。

- [ ] **OAuthCallbackPage 孤懸 token**  
  `apps/web/src/features/auth/OAuthCallbackPage.tsx:9` — 移除 `sessionStorage.setItem("access_token", token)`，此 token 從未被讀取。

---

## 第二輪：本週處理（影響功能，但改動較大）

### 儲存可靠性

- [ ] **useCharacterStore 儲存失敗要告知用戶**  
  `apps/web/src/store/useCharacterStore.tsx` — `scheduleSave` 的 catch block 加入 error state + 顯示 toast / banner 通知。

- [ ] **Auth context 改用 TanStack Query**  
  `apps/web/src/lib/auth/context.tsx` — 把手動 `useEffect + fetch` 替換成 `useQuery(['me'], ...)`，統一 cache 和 retry 行為。

### 一致性

- [ ] **統一「限連結」隱私用詞**  
  `apps/web/src/locales/zh-TW.json` 及相關元件 — 「限連結 / 不公開連結」統一成一個詞，補上「公開 — 任何人可見」說明。（來自測試報告）

- [ ] **破壞性確認改站內 modal**  
  「清空 / 刪除」目前使用瀏覽器原生 `confirm()`，改用 `ConfirmModal.tsx`。（來自測試報告）

### API 補完

- [ ] **`PATCH /projects/:projectId/stories/:storyId`**  
  故事建立後無法修改標題 / 可見性，需補 endpoint。

- [ ] **公開頁面 blocks 更新 endpoint**  
  `api/src/app/router.ts` — `PATCH /projects/:id/public-page` 目前只更新 status/settings，需補 `draft_json` 更新路徑。

---

## 第三輪：穩定後處理（技術債，不影響當前功能）

### 型別系統整合

- [ ] 建立 `apps/web/src/types/index.ts`，移入 `useCharacterStore.tsx` 的 domain types（Character、Template、Design、Block 等）
- [ ] 修正 `packages/contracts/src/character.ts`：`ownerUserId` required → optional
- [ ] 統一 `packages/contracts/src/relationship.ts` 的 direction enum（與 API router 對齊）
- [ ] 補充 `packages/contracts/src/project.ts`：加入 `workspaceKind`、`color` 欄位

### 程式碼品質

- [ ] 所有 mutation 補上 `onError` handler（`MyCharactersPage`、`WorldviewPage`、`StoryPage` 等）
- [ ] 提取 `lib/utils/formatDate.ts`（`timeAgo`、`fmtDate` 各頁重複定義）
- [ ] 提取 `lib/utils/typeLabels.ts`（WorldEntry `TYPE_LABELS`/`TYPE_COLORS` 三份重複）
- [ ] `charColor` 統一從 `lib/charColor.ts` 引入，刪除各頁重複定義
- [ ] 建立共用 `<EmptyState />`、`<LoadingSpinner />`、`<Modal />` 元件
- [ ] `AuthGuard.tsx`：loading 時顯示 spinner 而非 null

### N+1 查詢優化

- [ ] `GET /projects/:id/characters`：改用 JOIN，消除 N+1（`api/src/app/router.ts:1410`）
- [ ] `validateWorldEntryRefs`：sequential await loop 改成 `WHERE id IN (...)` 批次查詢

---

## 暫時不動的地方

| 原因 | 對應項目 |
|------|---------|
| 改壞風險高，等功能穩定 | `api/src/app/router.ts` 拆分（2765 行）、`TemplateCanvas.tsx` 重構 |
| 需要設計決策 | direction enum 統一（哪組值是 canonical？）、OCTOOL 棄用計劃 |
| 需確認生產 schema | 舊版 `/api/v1/*` router 清理 |
| 需要遷移計劃 | FormTemplate 從 localStorage 遷移到 API |
| 不影響開發 | `OCTOOL 角色展示工具/` 目錄重命名（改 `git mv` 後再做） |

---

## 下一輪測試待補

| 項目 | 條件 |
|------|------|
| 關係新增 | 企劃內先有 2+ 角色 |
| 多人協作審核端（角色申請 / 作品投稿）| 需第二個帳號 |
| 積木拖曳排序 | 手動操作 |
| 企劃：故事 / 時間軸 / 靈感匣 | 可在第二輪開發後測 |
| 載入期 console / network | 預先開監看再重整 |

---

## 測試殘留待清理

- 角色：`ZZ_模板測試_待刪`（含「全部積木」模板）
- 企劃：`ZZ_企劃測試_待刪`

---

## 參考文件

| 文件 | 內容 |
|------|------|
| [AUDIT_SUMMARY.md](AUDIT_SUMMARY.md) | 整體評分、最大 20 問題、建議修復順序 |
| [SECURITY_AUDIT.md](SECURITY_AUDIT.md) | 18 個安全問題（含 Critical 4 個）|
| [CODE_QUALITY_AUDIT.md](CODE_QUALITY_AUDIT.md) | 30 個程式碼品質問題 |
| [PRODUCT_UX_AUDIT.md](PRODUCT_UX_AUDIT.md) | 功能完整度表、23 個 UX 問題 |
| [TEST_REPORT_2026-06-13.md](TEST_REPORT_2026-06-13.md) | 實機測試結果、B1/B2 Bug |
| [audit/](audit/) | 各資料夾逐一稽核 |
