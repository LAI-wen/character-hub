# 稽核：apps/web/src/components/
> 全域共用元件資料夾

---

## 資料夾用途

存放跨功能域共用的 React 元件，包含 Modal、畫布、UI 工具元件。

## 主要檔案說明

| 檔案 | 用途 | 行數 |
|------|------|------|
| `TemplateCanvas.tsx` | OC 展示畫布，渲染模板 Block | 1283 |
| `AnnotationModal.tsx` | 圖片標記框編輯器 | ~150 |
| `AssetPickerModal.tsx` | 圖庫選圖 Modal | ~200 |
| `AvatarCropperModal.tsx` | 頭像裁切 Modal | ~180 |
| `CharBackupModal.tsx` | 角色備份匯入/匯出 | ~200 |
| `CharHoverCard.tsx` | 角色懸停預覽卡 | ~100 |
| `CommandPalette.tsx` | 全域命令搜尋 | ~250 |
| `ConfirmModal.tsx` | 通用確認 Dialog | ~60 |
| `ContextHeader.tsx` | 上下文頁首（麵包屑）| ~80 |
| `EyedropperModal.tsx` | 顏色吸取 Modal | ~120 |
| `Icon.tsx` | SVG Icon 包裝 | ~30 |
| `PageHeader.tsx` | 頁面標題列 | ~60 |
| `TemplateCanvas.tsx` | （見下方詳細分析）| 1283 |

---

## 目前問題

### 🔴 [C-01] TemplateCanvas.tsx 重新宣告所有 Domain Types

**行數：** lines 5–93

```ts
// TemplateCanvas.tsx 內直接定義：
export type FieldType = "text" | "longtext" | ...
export interface Album { id: string; ... }
export interface Block { ... }
export type CanvasCharacter = Character  // 與 store 的 Character alias
export type CanvasBlock = Block          // 同上
```

這些型別在 `useCharacterStore.tsx` 也有定義。兩者透過 `CanvasCharacter = Character` alias 連接，但如果兩個定義分歧，TypeScript 不保證 alias 仍然正確——它只是型別別名，不是 structural 驗證。

**為什麼是問題：** 修改 `useCharacterStore.tsx` 中的型別不會自動反映在 `TemplateCanvas.tsx` 的 inline 定義上。  
**如果不修：** 型別定義漂移，兩個檔案描述同一概念但形狀不同。

---

### 🔴 [C-02] TemplateCanvas.tsx：BlockEl 當函式呼叫，不是 JSX

**行數：** line 1154

```tsx
{BlockEl({ b, nested })}  // 函式呼叫，繞過 React reconciler
// 應為：
<BlockEl b={b} nested={nested} />
```

函式呼叫模式無法享有 React key、memoization、fiber tree 追蹤。每次父元件 re-render 都完全重建所有 block，對含多個 block 的展示頁造成效能問題。

---

### 🟠 [C-03] TemplateCanvas.tsx：過大，應拆分子模組

1283 行的單一檔案包含：
- 所有 domain type 定義
- Font loader 邏輯
- CSS animation 注入（`AnimateCss`）
- Album block 渲染（`AlbumImages`）
- Marker/Annotation 渲染（`MarkerInner`）
- 欄位渲染（`fieldEl`，15 case switch）
- 完整 block 渲染（`BlockEl`）
- 整個畫布組裝（`TemplateCanvas`）

建議拆分為：`AlbumBlock.tsx`、`MarkerLayer.tsx`、`FieldRenderer.tsx`、`BlockWrapper.tsx`、`FontLoader.ts`。

---

### 🟠 [C-04] TemplateCanvas.tsx 與 OCTOOL 版本是獨立的兩個 copy

`OCTOOL 角色展示工具/octool-react/src/components/TemplateCanvas.tsx`（1139 行）  
`apps/web/src/components/TemplateCanvas.tsx`（1283 行）

兩個版本獨立維護，apps/web 版本比 OCTOOL 版多 144 行，已開始分叉。

---

### 🟡 [C-05] CharBackupModal.tsx：`prompt()` 和 `alert()` 的 UX

**行數：** lines 24, 64

```ts
const name = prompt("請輸入備份名稱");
alert("匯入成功！");
```

原生 browser dialog 無法客製化，阻塞 UI，無法用 Cypress/Playwright 可靠測試。

---

### 🟡 [C-06] CharBackupModal.tsx：匯入 JSON 未驗證

```ts
const c = obj as Character;  // 無 Zod 驗證
const t = t as FormTemplate; // 同上
```

惡意或格式錯誤的 JSON 會以原樣注入到 store，可能造成下游 crash 或 XSS。

---

### 🟡 [C-07] Icon.tsx 存在但許多地方不使用它

`AppLayout.tsx`、`AccountSettingsPage.tsx`、`OverviewPage.tsx`、`StoryPage.tsx`、`GalleryPage.tsx`、`TimelinePage.tsx` 各自定義了 `SvgIcon` / `Ic` / ICONS 字典，使用 `dangerouslySetInnerHTML`，而非引用 `Icon.tsx`。

---

## 高風險檔案

- `TemplateCanvas.tsx` — 最高風險。型別重複、函式呼叫模式、過大
- `CharBackupModal.tsx` — 未驗證的 JSON import，安全風險

## 建議重構方向

1. 建立 `src/types/index.ts`，把所有 domain types 移出元件檔案
2. 拆分 `TemplateCanvas.tsx` 為 5–6 個子模組
3. 統一使用 `Icon.tsx`，刪除各頁的 ICONS 字典
4. `CharBackupModal.tsx` 的 import 加 Zod parse 驗證
5. 建立 `<EmptyState />`、`<LoadingSpinner />`、`<Modal />` 共用元件

## 優先級

| 項目 | 優先度 |
|------|--------|
| 建立共用型別檔案 | P1 |
| 修復 BlockEl JSX 呼叫 | P1 |
| TemplateCanvas 拆分 | P2 |
| CharBackupModal 驗證 | P2 |
| Icon 統一使用 | P3 |
