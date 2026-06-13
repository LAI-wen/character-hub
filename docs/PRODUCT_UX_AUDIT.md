# 產品與 UX 程式結構稽核報告
> 稽核日期：2026-06-13 | 從產品目標視角檢視程式碼是否支撐功能

---

## 一、功能完成度全貌

| 功能 | 前端 UI | 後端 API | 資料 Schema | 整體狀態 |
|------|---------|---------|------------|---------|
| 角色基本資料填寫 | ✅ 完成 | ✅ 完成 | ✅ 完成 | **可用** |
| 角色圖片上傳（頭像/主視覺）| ✅ UI 完成 | ✅ R2 上傳 | ✅ | **可用**（舊圖未清除） |
| 角色相簿管理 | ✅ UI 完成 | ✅ 完成 | ✅ | **可用** |
| 區塊化資訊編輯（SectionsEditor）| ✅ 完成 | ✅ 完成 | ✅ | **可用** |
| 拖拉區塊排序 | ✅ UI 完成 | ✅ 完成 | ✅ | **可用** |
| 模板畫布預覽（TemplateCanvas）| ✅ 完成 | ✅ 讀取 | ✅ | **可用** |
| TemplateBuilder（拖拉編排）| ✅ 完成 | ✅ 儲存 | ✅ | **可用** |
| 公開展示頁（角色）| ✅ 前端完成 | ⚠️ 頁面 blocks 無法更新 | ✅ | **部分可用** |
| 公開展示頁（企劃）| ✅ 前端完成 | ⚠️ draft_json 無更新 API | ✅ | **部分可用** |
| 本體資料 vs 企劃限定資料 | ✅ 概念存在 | ⚠️ project-char link 欄位有限 | ✅ | **部分可用** |
| 圖片標記（Annotation）| ✅ 完成 | ✅ 儲存在 char JSON | ✅ | **可用** |
| 關係圖（Relationships）| ✅ 完成 | ✅ 完成 | ✅ | **可用** |
| 世界觀（Worldview）| ✅ 完成 | ✅ 完成 | ✅ | **可用** |
| 故事（Story）| ⚠️ 設定 UI 是 placeholder | ⚠️ 無 PATCH 故事 endpoint | ✅ | **僅建立/閱讀** |
| 委託管理（Commissions）| ⚠️ 全部 demo data | ❌ 501 stub | ✅ Schema 存在 | **完全不可用** |
| 帳號設定 | ⚠️ 5/6 panel 無儲存 | ⚠️ 僅 profile 和密碼 | ✅ | **部分可用** |
| 企劃成員管理（Participants）| ⚠️ 大部分 disabled | ✅ 有部分 | ✅ | **部分可用** |
| 身高比較 | ✅ 完成 | N/A（本地計算）| N/A | **可用** |
| 搜尋 | ❌ 無入口 | ❌ endpoint crash | ✅ Schema 存在 | **完全不可用** |

---

## 二、角色資料填寫

### 整體評估：✅ 核心功能可用

`CharacterEditPage.tsx` → `FormPage.tsx` + `DesignPage.tsx` + `AlbumsEditor.tsx` 的三頁架構是清楚的。`SectionsEditor.tsx` 處理自訂欄位，`FormControls.tsx` 提供欄位 UI 元件。

### 問題

**[PX-01] `attr` 和 `object` field type 無法透過 UI 新增**

`SectionsEditor.tsx` 的「新增欄位」只列出 `text/longtext/tags/check/avoid`。`attr`（屬性組）和 `object`（子物件）型別在 `TemplateCanvas` 有渲染邏輯，但用戶無法透過正常 UI 建立這兩種欄位，只能透過直接編輯 JSON 備份。

**如果不修：** 部分渲染功能永遠用不到。新用戶無法發現進階欄位類型。

---

**[PX-02] 舊角色記錄中 `annotations` 未定義時 AlbumsEditor 會 crash**

```ts
im.annotations.length  // 若 im.annotations === undefined → TypeError
```

CLAUDE.md 規則要求在 `getCharacter()` 正規化，但此處未做。這是一個會在真實用戶資料上觸發的邊界狀態。

---

**[PX-03] FormTemplate 儲存在 localStorage，不跨裝置**

用戶自訂的表單模板只在當前裝置的 localStorage 中。換裝置或清除瀏覽器資料後全部消失。對創作者工具而言，這是高影響問題——用戶花時間建立的模板會無聲消失。

---

## 三、區塊化編輯 / 拖拉排序

### 整體評估：✅ 功能可用，但 TemplateBuilder 有邊界問題

**[PX-04] TemplateBuilderPage.tsx ResizeObserver 未設 dependency array**

```ts
useEffect(() => {
  const ro = new ResizeObserver(...);
  ro.observe(previewRef.current);
  return () => ro.disconnect();
  // 無 [] dependency → 每次 render 都重新 attach/detach
});
```

在頻繁編輯（拖拉 block、改顏色）時，ResizeObserver 持續重建，造成效能問題。

---

**[PX-05] TemplateBuilder 預覽角色使用硬編碼的中文資料**

```ts
const DEMO_CHAR = {
  sections: [{ title: "基本資料", fields: [...] }, { title: "魔法師", ... }]
}
```

使用英文介面（`i18n` 切換到 en）時，模板預覽仍顯示中文欄位名稱。

---

## 四、公開展示頁

### 整體評估：⚠️ UI 存在但後端支撐不完整

**[PX-06] 公開頁面的 blocks/版面無法更新**

`api/src/app/router.ts` 的 `PATCH /projects/:projectId/public-page` 只更新 `status`、`settings_json`、`theme_json`。`draft_json`（頁面 blocks）的更新 endpoint **不存在**。

`public_page_versions` 表格有 schema 但沒有任何 handler。

**如果不修：** 企劃的公開頁面永遠顯示建立時的預設內容，無法自訂。

---

**[PX-07] PublicCharacterPage.tsx TopBar 的 tab 標籤混語（"一般 General"）**

```ts
// line 80:
{ key: "general", label: "一般 General" }
```

i18n 設計是有的（`useTranslation`），但這個 label 是硬編碼的雙語字串，不走 i18n 系統。

---

**[PX-08] PublicCharacterPage.tsx：`splitLines` 用 `|` 作為換行符**

```ts
const splitLines = (s: string) => s?.split(/[\n|]+/) ?? [];
```

`|` 被用作文字欄位中的分隔符，這是一個隱性約定，完全沒有文件說明。用戶在欄位中輸入 `|` 時，公開頁面會自動斷行，造成意外排版。

---

## 五、本體資料 vs 企劃限定資料

### 整體評估：⚠️ 概念正確，但角色 context 資料存取有 Bug

**[PX-09] CharacterDetailPage 讀取 `gp.template` 而非 `gp.templates`**

如 Q-14 所述，detail page 永遠讀到 `undefined`，永遠顯示預設模板，用戶的企劃限定模板設定無效。

`PublicCharacterPage.tsx` 正確讀取了 `gp.templates` 和 `gp.publicTplId`，但 detail page 沒有，造成預覽和實際公開展示不一致。

---

**[PX-10] `attr`/`object` 欄位型別的企劃限定值無 UI 支援**

企劃 context 中的欄位覆蓋（project-specific overrides）在資料結構上支援 JSON blob，但 UI 沒有提供「在這個企劃中覆蓋此欄位的值」的介面。

---

## 六、圖片標記 / 矩形框 (Annotations)

### 整體評估：✅ 功能完整

`AnnotationModal.tsx` 支援拖拉建立矩形框、輸入標記文字、刪除標記。`TemplateCanvas.tsx` 正確渲染 `MarkerLayer`。

### 問題

**[PX-11] 備份匯入時 `annotations` 欄位 cast 無驗證**

匯入的備份 JSON 若 `annotations` 格式不正確（例如缺少 `rect` 欄位），會造成 `AnnotationModal.tsx` render crash。

---

## 七、委託管理 (Commissions)

### 整體評估：❌ 完全是 Demo，無法使用

**[PX-12] 整個委託功能是硬編碼的 Demo Data**

**檔案：** `apps/web/src/features/account/CommissionsPage.tsx`

```ts
const DEMO_COMMS = [/* 7 個假委託，虛構的委託人名 */];
queryFn: () => Promise.resolve({ commissions: DEMO_COMMS }),  // staleTime: Infinity
```

「+ 新委託洽談」按鈕：`onClick={() => {/* coming soon */}}`

**如果不修：** 用戶以為自己在管理真實委託，實際上所有互動都沒有任何效果。

---

**[PX-13] CommissionsPage.tsx：看板欄位展示假委託人名**

DEMO_COMMS 中包含「Luna Hartwell」等完整的假名字作為委託人，且畫面上有金額（`price: "3500"`）和真實感的狀態（"正在進行"）。這是一個高度誤導性的 placeholder，很難讓用戶判斷哪些是真實資料。

---

## 八、帳號設定

### 整體評估：⚠️ 僅 Profile Panel 可用

**[PX-14] 五個 Panel 的設定無法儲存**

| Panel | 狀態 |
|-------|------|
| Profile（名稱、頭像、簡介）| ✅ 有 mutation |
| Commission（委託設定）| ❌ 僅 local state |
| Privacy（隱私設定）| ❌ 僅 local state |
| Notifications（通知設定）| ❌ 僅 local state |
| Project Defaults（企劃預設）| ❌ 僅 local state |
| Storage（儲存空間）| ❌ 假資料 + 假操作 |

**如果不修：** 用戶設定委託狀態（開/關）、調整隱私偏好後，重整頁面全部消失，無法形成產品閉環。

---

## 九、企劃成員管理 / 申請

### 整體評估：⚠️ 架構存在，UI 大部分 disabled

**[PX-15] ParticipantsPage：成員管理操作全部 disabled**

```tsx
<button disabled title="角色管理功能即將推出">變更角色</button>
<button disabled title="邀請功能即將推出">邀請成員</button>
```

「儲存權限」按鈕被綁定到 `reset`（還原），而非 save mutation。

---

**[PX-16] 拒絕申請使用瀏覽器原生 `prompt()` dialog**

**檔案：** `apps/web/src/features/project/ApplicationsPage.tsx`，line 101

```ts
const msg = prompt("拒絕原因（可留空）");
```

原生 `prompt` 是阻塞 UI 的 modal，無法用 CSS 客製化樣式，不支援鍵盤無障礙操作，且會被瀏覽器 popup blocker 攔截。

---

## 十、故事功能 (Story)

### 整體評估：⚠️ 主要互動可用，但設定和側欄是 placeholder

**[PX-17] 故事設定 Modal 無功能**

```tsx
<div className="tl-placeholder">故事設定編輯功能即將推出。</div>
```

故事的標題、可見性、狀態、封面圖都無法修改（只能透過建立時的 API）。

---

**[PX-18] StoryPage 側欄「相關角色」與「世界觀關聯」是 placeholder**

```tsx
<p>相關角色功能即將推出</p>
<p>世界觀關聯功能即將推出</p>
```

三欄 layout 的右側欄完全是空的 placeholder。

---

**[PX-19] StoryPage 的 Timeline Tab 是 placeholder，但 TimelinePage 是完整的**

StoryPage 的 `view === "timeline"` 顯示「時間軸功能即將推出」。但 `/project/:id/timeline` 路由指向獨立的 `TimelinePage.tsx`（功能完整），兩者是不同的 timeline 概念（章節時間軸 vs 故事事件時間軸）——這個區別對用戶而言完全不清楚。

---

## 十一、手機版 / RWD

### 整體評估：🟡 主要功能有基本 RWD，但有幾個明顯問題

**[PX-20] RelationshipsPage：SVG 關係圖不響應視窗縮放**

```ts
useEffect(() => {
  if (offsetWidth > 0) setDims({ W: offsetWidth, H: offsetHeight });
}, []);  // 空 array = 只讀一次
```

在手機版窄視窗載入頁面後，關係圖節點以窄尺寸定位。旋轉裝置或調整視窗大小後，節點位置不重算，部分節點會跑到可見區域外。

---

**[PX-21] PublicCharacterPage.tsx tab pills 在窄螢幕會溢出**

Tab pills（「一般 General」、「委託 Commission」）和麵包屑一起在同一行排列，沒有 overflow 處理。在 320px 螢幕上會超出畫面。

---

**[PX-22] iOS Safari：程式觸發的 file input 可能被封鎖**

`useCharacterStore.tsx` 中的圖片上傳使用 `document.createElement('input')` 動態創建。iOS Safari 要求 file input 必須由直接的用戶手勢觸發（`click` 事件上的同步 DOM 操作）。透過 `Promise` 鏈或 `async/await` 延遲呼叫 `input.click()` 可能被 Safari 攔截。

---

## 十二、i18n 完整度

### 整體評估：🟡 結構存在但覆蓋率不完整

- `zh-TW.json`、`en.json`、`ja.json` 三語系翻譯檔案存在
- 但多個頁面（StoryPage、PublicCharacterPage、CommissionsPage）有硬編碼的中文字串
- `DEMO_CHAR` 常數（TemplateBuilderPage）含硬編碼中文欄位名
- 英文語系下 TemplateBuilder 預覽顯示中文

---

## 十三、Onboarding / 說明文件

### 整體評估：❌ 完全缺失

**[PX-23] OCTOOL 的 HelpPage 未移植到 apps/web**

舊版 OCTOOL 有完整的 Help 頁面（`features/help/`）說明如何使用工具。`apps/web` 沒有任何 onboarding 流程、說明文字、或 empty state 引導。

新用戶第一次進入 `/workspace` 看到的是空白的我的角色頁面，沒有任何指引。

---

## 十四、產品資料一致性總結

| 問題 | 檔案 | 影響 |
|------|------|------|
| 搜尋永遠 500 | `api/src/app/router.ts:2513` | 搜尋功能完全不可用 |
| 委託全是 demo | `CommissionsPage.tsx` | 委託功能不可用 |
| 5 個設定 panel 不儲存 | `AccountSettingsPage.tsx` | 多個設定功能不可用 |
| 公開頁面 blocks 無更新 API | `api/src/app/router.ts` | 公開頁無法自訂 |
| charEdit detail 讀錯欄位 | `CharacterDetailPage.tsx:693` | 企劃模板設定無效 |
| Annotation crash on old data | `AlbumsEditor.tsx:88` | 舊用戶相簿崩潰 |
| 拒絕申請用 prompt() | `ApplicationsPage.tsx:101` | 操作體驗不一致 |
| 故事設定 modal 無功能 | `StoryPage.tsx` | 故事無法修改 |
