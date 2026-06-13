# 稽核：apps/web/src/store/
> 全域狀態管理

---

## 資料夾用途

Zustand store，管理角色編輯的全域狀態。目前只有一個 store 檔案，但體積龐大。

## 主要檔案說明

| 檔案 | 行數 | 用途 |
|------|------|------|
| `useCharacterStore.tsx` | ~758 | 角色編輯狀態、localStorage 讀寫、API mutation、確認 dialog |

---

## Store 架構概述

`useCharacterStore` 是一個混合型 store：
- 管理 `ui` 狀態（當前企劃 ID、角色 ID、選中 section 等）
- 管理角色資料（`Character` 物件）
- 管理表單模板（localStorage）
- 排程自動儲存（`scheduleSave`）
- 觸發確認 dialog（`showConfirm`）
- DOM 操作（`document.createElement('input')`）

這個 store 承擔了太多職責。

---

## 目前問題

### 🔴 [ST-01] 儲存失敗靜默吞噬，無用戶反饋

**行數：** scheduleSave catch block

```ts
} catch (e) {
  // ← 完全沒有 setError 或任何反饋
} finally {
  setSaving(false);
}
```

自動存取失敗時（網路錯誤、401、伺服器錯誤），`saving` indicator 消失，用戶以為存成功了。

**為什麼是問題：** 在網路不穩定的環境，用戶可能失去數小時工作，完全不知道。  
**如果不修：** 低信度的資料持久性，用戶體驗不可靠。

---

### 🔴 [ST-02] 所有 Domain Types 定義在 store 而非 `src/types/`

**行數：** lines 1–74

```ts
// 所有這些都在 useCharacterStore.tsx 頂部定義：
export type FieldType = "text" | "longtext" | ...
export interface Album { ... }
export interface Character { ... }
export interface Template { ... }
// 共 15+ 個型別
```

違反 CLAUDE.md 規則（型別應在 `src/types/index.ts`）。這些型別被 `TemplateCanvas.tsx` import，後者又重新宣告了一遍。

---

### 🟠 [ST-03] FormTemplate 儲存在 localStorage，不同步到 API

**行數：** `loadForms()`, `saveForms()`

```ts
export function loadForms(): FormTemplate[] {
  return JSON.parse(localStorage.getItem(FORMS_KEY) ?? "[]");
}
export function saveForms(forms: FormTemplate[]) {
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
}
```

用戶自訂的表單模板只存在當前裝置。多裝置、清除瀏覽器資料後消失。對一個以「創作工具」為定位的產品，這是核心資料流問題。

---

### 🟠 [ST-04] `removeSection`、`removeAlbum`、`removeTemplate` 型別宣告與實作不符

**行數：** `CharacterStore` interface 定義

interface 宣告這些方法是 `() => void`，但 implementation 是 `async` 函式（因為需要呼叫 `showConfirm`）。TypeScript 接受這個（`Promise<void>` 滿足 `void`），但任何試圖 `await` 這些方法的呼叫者需要 cast。

---

### 🟠 [ST-05] `showConfirm` 使用 `createRoot` 動態掛載，沒有清理機制

```ts
const root = createRoot(container);
root.render(<ConfirmModal ... />);
// 沒有 root.unmount() 的呼叫在明顯的位置
```

每次 confirm dialog 都建立一個新的 React root。若短時間內多次呼叫（快速操作），可能同時存在多個 root，累積 DOM 節點。

---

### 🟡 [ST-06] Store 直接操作 DOM（`document.createElement`）

```ts
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.click();
```

DOM 操作在 store 中（不在 React 元件中）違反了 React 的單向資料流原則。在 SSR 環境或測試中這段會 crash。iOS Safari 可能攔截非用戶手勢觸發的 `input.click()`。

---

### 🟡 [ST-07] `alert()` 和 `prompt()` 散落在 store 中

```ts
alert("格式錯誤，請確認檔案內容");  // × 4
prompt("請輸入模板名稱");          // × 1
```

這些阻塞 UI 的原生 dialog 無法用程式測試，無法客製化樣式，在無頭測試環境中會掛起。

---

### 🟡 [ST-08] `curTplId` 命名誤導——它是 callback，不是 state

```ts
const curTplId = useCallback(() => {
  return ui.selectedTplId ?? character.templates?.[0]?.id;
}, [ui.selectedTplId, character.templates]);
```

`curTplId` 讀起來像一個 state 值，但它是一個需要呼叫的函式：`curTplId()`。命名應為 `getCurrentTplId` 或 `getCurTplId`。

---

### 🟡 [ST-09] `importCharFile` 直接 cast 無驗證

```ts
const c = obj as Character;
setCharacter(c);  // 未驗證的物件進入 store
```

如果備份 JSON 格式損壞（部分欄位缺失、型別錯誤），整個 store 進入損壞狀態，後續的 `scheduleSave` 可能把損壞資料寫入 API。

---

## 高風險部分

| 風險 | 位置 | 影響 |
|------|------|------|
| 儲存失敗無反饋 | `scheduleSave` | 資料丟失無感知 |
| 型別散落 | lines 1–74 | 型別漂移，多份定義 |
| JSON import 無驗證 | `importCharFile` | 損壞資料進 store |
| DOM 操作在 store | 圖片上傳 | iOS 相容性問題 |

## 建議重構方向

1. **最優先：** 在 `scheduleSave` 的 catch 加入 error state + UI 提示
2. **短期：** 建立 `src/types/index.ts`，移出所有 type 定義
3. **短期：** `importCharFile` 加 Zod 驗證
4. **中期：** 把 form templates 遷移到 API（`/api/app/form-templates`）
5. **中期：** 把 confirm dialog 改為 context/hook，移出 store
6. **中期：** 圖片上傳邏輯移到 React 元件，用 `<input ref>` 模式

## 優先級

P1：儲存失敗反饋（影響資料可靠性）  
P2：型別重組（影響可維護性）  
P3：importCharFile 驗證（安全性）  
P4：form templates 遷移（功能完整性）
