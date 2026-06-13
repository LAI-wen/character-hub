# 稽核：apps/web/src/features/ (頁面)
> 所有功能頁面

---

## 資料夾用途

按功能域組織的頁面元件。每個子資料夾對應一個主要功能區域。

## 功能域結構

```
features/
├── account/          ← 用戶自己的角色/企劃/設定
├── auth/             ← 登入、OAuth callback
├── charEdit/         ← 角色編輯（3個 tab）
├── project/          ← 企劃內頁（20+ 頁面）
│   └── templateBuilder/ ← TemplateBuilder 子元件
├── public/           ← 公開頁（角色/企劃）
├── characters/       ← （目前空資料夾）
├── project-characters/ ← （目前空資料夾）
├── projects/         ← （目前空資料夾）
├── relationships/    ← （目前空資料夾）
└── worldview/        ← （目前空資料夾）
```

注意：`characters/`、`project-characters/`、`projects/`、`relationships/`、`worldview/` 是空的資料夾。實際頁面都在 `account/` 或 `project/` 下。

---

## 主要頁面逐一說明

### features/account/

| 頁面 | 狀態 | 主要問題 |
|------|------|---------|
| `AccountSettingsPage.tsx` (1180 行) | ⚠️ | 5/6 panel 無儲存功能；Storage panel 假資料 |
| `CharacterDetailPage.tsx` (842 行) | ⚠️ | 讀 `gp.template` 而非 `gp.templates`；7 個 tab 全 inline |
| `CharacterEditPage.tsx` | ✅ | 正常，6 個 `as never` cast 需修 |
| `CharacterNewPage.tsx` | ✅ | 正常，`charColor` 重複定義 |
| `CommissionsPage.tsx` (774 行) | ❌ | 整個功能是 demo data |
| `GlobalGalleryPage.tsx` | ✅ | 正常 |
| `HeightComparePage.tsx` | ✅ | 正常 |
| `MyCharactersPage.tsx` | ✅ | 正常，`timeAgo` 重複 |
| `MyProjectsPage.tsx` | ✅ | 正常 |
| `PublicPagesPage.tsx` | ✅ | 正常 |
| `WorkspacePage.tsx` | ⚠️ | 三個統計數字全部硬編碼為 `"—"` |

---

### AccountSettingsPage.tsx 詳細問題

**[P-01] 儲存按鈕只在 profile tab 出現**

```ts
{sec === "profile" && <div className="settings-save-bar">...</div>}
```

其他 5 個 tab 有完整的 UI（開關、輸入框）但沒有 save 按鈕，也沒有任何 mutation call。

**[P-02] Storage Panel 假資料**

```ts
const TRASH = [
  { name:"角色備份_2024.json", size:"2.4 MB" },
  { name:"暫存圖片_0923.png", size:"840 KB" }
]
```

這些假「暫存檔案」永遠顯示，不來自任何 API，也沒有任何操作（清除、下載）實際執行。

**[P-03] `localStorage.clear()` 按鈕**

line 157：清除整個 localStorage，包括語言設定、最近瀏覽，沒有二次確認。

---

### CharacterDetailPage.tsx 詳細問題

**[P-04] `gp.template` vs `gp.templates` 讀錯欄位**

```ts
// line 693:
template = (gp.template as ...) ?? buildDefaultTemplate(canvasChar)
// store 儲存的是 gp.templates（array）+ publicTplId
```

此頁面永遠顯示 `buildDefaultTemplate` 的結果，用戶在 TemplateBuilder 設定的企劃模板完全無效。

**[P-05] 7 個 Tab 元件定義為 closure**

每個 tab 在頁面函式 body 內定義，每次父元件 state 改變都會 unmount/remount tab，可能造成 tab 內部表單的輸入狀態丟失。

---

### CommissionsPage.tsx 詳細問題

**[P-06] 整頁是 Demo，無任何後端連接**

```ts
const DEMO_COMMS = [{ ... commissionerName: "Luna Hartwell" ... }];
queryFn: () => Promise.resolve({ commissions: DEMO_COMMS }),
staleTime: Infinity,
```

看板（Kanban board）的拖拉功能完整實作，但操作的都是記憶體中的假資料，重整後消失。

**[P-07] `<style>` 標籤注入 JSX**

```tsx
<style>{`@media (max-width: 980px) { .cm-board { grid-template-columns: 1fr !important; } }`}</style>
```

應改用 CSS module 或全域 stylesheet。

---

### features/auth/

**[P-08] OAuthCallbackPage.tsx：無用的 sessionStorage.setItem**

```ts
sessionStorage.setItem("access_token", token);
// 此 token 在整個 codebase 中從未被讀取
```

孤懸的 token 若遭 XSS 攻擊，可被讀取。

**[P-09] OAuthCallbackPage.tsx：token 缺失時仍 redirect**

若 URL 中沒有 `token` param，`sessionStorage.setItem("access_token", undefined)` 之後仍直接 redirect 到 `/workspace`，不顯示任何錯誤。

---

### features/charEdit/

| 頁面 | 狀態 | 主要問題 |
|------|------|---------|
| `FormPage.tsx` | ✅ | `as never` cast |
| `DesignPage.tsx` | ✅ | 多處 `as never` cast for context |
| `AlbumsEditor.tsx` | ⚠️ | `annotations.length` crash on old data |
| `SectionsEditor.tsx` | ⚠️ | `attr`/`object` 欄位無法透過 UI 新增 |
| `IdentityCard.tsx` | ✅ | 正常 |
| `ImagesPaletteCards.tsx` | ✅ | 正常 |
| `FormControls.tsx` | ✅ | 正常 |

**[P-10] AlbumsEditor.tsx：old data crash**

```ts
im.annotations.length  // undefined.length → TypeError
```

應在 store 的 `getCharacter()` 時 normalize：`annotations: im.annotations ?? []`。

---

### features/project/

| 頁面 | 狀態 | 主要問題 |
|------|------|---------|
| `OverviewPage.tsx` | ⚠️ | 關係數永遠顯示 `"—"`；`charColor` 重複 |
| `TemplateBuilderPage.tsx` (802 行) | ✅ | ResizeObserver deps 缺失 |
| `RelationshipsPage.tsx` (803 行) | ⚠️ | drag 效能問題；canvas 不響應縮放 |
| `WorldviewPage.tsx` | ✅ | `TYPE_LABELS` 重複定義 |
| `StoryPage.tsx` | ⚠️ | 設定/側欄是 placeholder；章節排序無 API |
| `RosterPage.tsx` | ✅ | 正常 |
| `GalleryPage.tsx` | ⚠️ | bulk action 按鈕是 no-op |
| `ParticipantsPage.tsx` | ⚠️ | 大部分操作 disabled；permission save 綁錯 |
| `ApplicationsPage.tsx` | ⚠️ | 拒絕用 `prompt()`；`body: JSON.stringify()` 不一致 |
| `SettingsPage.tsx` | ✅ | 正常 |
| `TimelinePage.tsx` | ✅ | 正常 |
| `PublicPagePage.tsx` | ⚠️ | 後端無 blocks 更新 endpoint |
| `InspirationPage.tsx` | ✅ | 正常 |
| `CharacterDetailPage.tsx` (enterprise) | ⚠️ | 與 account 版有重複實作問題 |
| `CharacterEditPage.tsx` (enterprise) | ⚠️ | 與 account 版重複 |

**注意：** `account/CharacterDetailPage.tsx` 和 `project/CharacterDetailPage.tsx` 是兩個不同的角色詳情頁，功能相似但 context 不同（本體 vs 企劃限定）。兩者的責任邊界需要文件說明。

---

**[P-11] OverviewPage.tsx：關係數永遠顯示 `"—"`**

```tsx
<div className="stat-value">—</div>  // 硬編碼，沒有 fetch
```

---

**[P-12] WorkspacePage.tsx：三個統計全部是 `"—"`**

```tsx
<div className="ws-stat-val">—</div>  // × 3
```

---

**[P-13] ParticipantsPage.tsx：「儲存權限」按鈕錯誤**

```tsx
<button onClick={reset}>儲存權限</button>  // reset 是「還原到初始狀態」
```

這個 bug 讓用戶點「儲存」卻觸發「還原」。

---

**[P-14] GalleryPage.tsx：Bulk Action 按鈕是 no-op**

```tsx
<button onClick={() => {}}>設定可見性</button>
<button onClick={() => {}}>補作者</button>
```

---

### features/public/

**[P-15] PublicCharacterPage.tsx：`|` 作為文字換行符**

```ts
const splitLines = (s: string) => s?.split(/[\n|]+/) ?? [];
```

用戶文字中若含 `|`，公開頁面會自動斷行，這是無文件的隱性行為。

---

## 高風險檔案排名

| 排名 | 檔案 | 主要風險 |
|------|------|---------|
| 1 | `AccountSettingsPage.tsx` | 5 個 panel 儲存功能不存在 |
| 2 | `CommissionsPage.tsx` | 整頁假資料，用戶被誤導 |
| 3 | `CharacterDetailPage.tsx` (account) | 讀錯欄位，模板設定永久無效 |
| 4 | `AlbumsEditor.tsx` | Old data crash |
| 5 | `ParticipantsPage.tsx` | 「儲存」按鈕觸發「還原」 |

## 建議重構方向

1. **立即修：** `CharacterDetailPage.tsx` L693 的 `gp.template` → `gp.templates`
2. **立即修：** `AlbumsEditor.tsx` 的 annotations normalize
3. **立即修：** `ParticipantsPage.tsx` 的 save 按鈕
4. **中期：** `AccountSettingsPage.tsx` 各 panel 加後端 mutation
5. **中期：** `CommissionsPage.tsx` 標示為 "coming soon" 或接真實 API

## 優先級

P1：立即可修的 Bug（模板讀錯、crash、save 觸發 reset）  
P2：功能不完整但不 crash（settings panels、gallery bulk actions）  
P3：設計問題（inline tab 元件、狀態管理優化）
