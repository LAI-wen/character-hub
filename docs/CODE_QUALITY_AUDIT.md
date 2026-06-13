# 程式碼品質稽核報告
> 稽核日期：2026-06-13 | 範圍：apps/web/src + api/src

---

## 一、架構設計

### Q-01 API 雙軌並存：新舊 Router 共用同一 Worker

**嚴重度：🔴 高**

`api/src/index.ts` 同時掛載了操作不同 D1 schema 的兩組 router：

| Router 路徑 | 檔案 | 操作的 tables |
|------------|------|--------------|
| `/api/v1/ocs` | `src/ocs/router.ts` | `ocs`, `worldview_entries`（舊 schema）|
| `/api/v1/projects` | `src/projects/router.ts` | `projects`（舊 schema）|
| `/api/app/*` | `src/app/router.ts`（2765 行）| `characters`, `world_entries`（新 schema）|

同一 Worker 的 `/api/v1/*` 和 `/api/app/*` 操作**不同的 D1 table 集合**。目前無法確認生產資料庫持有哪份 schema。舊版 router 是死碼（apps/web 使用 `/api/app/*`），但繼續存在且被掛載。

**如果不修：** 開發者不確定哪個 API 是 canonical，修改舊版 router 不會影響前端，容易造成誤解。

---

### Q-02 `app/router.ts` 是 2765 行的單一大檔案

**嚴重度：🟠 中高**

`api/src/app/router.ts` 包含所有功能域的路由：characters、projects、world_entries、relationships、story、gallery、timeline、media、search、account、public page 等，全部混在一個檔案中。

Row type 定義（`CharacterRow`、`ProjectRow`、`WorldEntryRow` 等）、helper 函式（`mapCharacter`、`mapProject` 等）、Zod schema（`createCharacterSchema`、`updateProjectSchema` 等）都 inline 定義在同一個檔案內。

**如果不修：** 當兩個人同時修改不同功能時，git conflict 難以解決。找一個 endpoint 需要搜尋 2700+ 行。

---

### Q-03 前端缺少共用 UI 基礎元件

**嚴重度：🟠 中高**

下列 UI pattern 在整個 `apps/web/src/features/` 中各自重複實作，無共用元件：

| Pattern | 重複次數 | 應提取為 |
|---------|----------|---------|
| Loading 狀態 `<p>載入中⋯</p>` | 15+ 次 | `<LoadingSpinner />` |
| Empty 狀態 `<p style={{ color: "var(--text-faint)" }}>...</p>` | 15+ 次 | `<EmptyState />` |
| Modal overlay `<div className="modal-overlay"><div className="modal">` | 6+ 次 | `<Modal />` |
| timeAgo / fmtDate 函式 | 4 次 | `lib/utils/formatDate.ts` |
| SVG icon `dangerouslySetInnerHTML` | 6 次 | 使用 `Icon.tsx` |

**如果不修：** Loading 文字在不同頁面不一致（中文/英文混用），改樣式要改 15 個地方。

---

## 二、元件拆分

### Q-04 三個「上帝元件」超過 800 行

**嚴重度：🟠 中高**

| 檔案 | 行數 | 主要問題 |
|------|------|---------|
| `TemplateCanvas.tsx` | 1283 行 | 重新宣告所有型別、`BlockEl` 當函式呼叫非 JSX |
| `AccountSettingsPage.tsx` | 1180 行 | 6 個 panel 全部 inline |
| `CharacterDetailPage.tsx` | 842 行 | 7 個 tab 全部 inline 為 closure |
| `TemplateBuilderPage.tsx` | 802 行 | 27 個 block mutation 函式 |
| `RelationshipsPage.tsx` | 803 行 | charColor 重複定義、drag 狀態設計問題 |
| `CommissionsPage.tsx` | 774 行 | 整個功能是 demo data |

---

### Q-05 `TemplateCanvas.tsx`：`BlockEl` 當函式呼叫，非 JSX

**嚴重度：🟠 中高**

**檔案：** `apps/web/src/components/TemplateCanvas.tsx`，line 1154

```tsx
{BlockEl({ b, nested })}  // 函式呼叫
// 應改為：
<BlockEl b={b} nested={nested} />  // JSX 元件
```

函式呼叫繞過了 React 的協調機制——沒有 fiber node、沒有 key、沒有 memoization，每次父元件 re-render 都強制重建。對於複雜的展示畫布，這會造成不必要的效能損耗。

---

### Q-06 頁面內的 Tab 元件 inline 定義為 closure

**嚴重度：🟡 中**

`CharacterDetailPage.tsx` 在頁面元件函式內定義了 7 個 tab 元件（`OverviewTab`、`GalleryTab`、`ImageSettingsTab` 等），並在 closure 中直接讀取父元件 state。

**問題：** 每次父元件 re-render，tab 元件的 reference 都改變，React 認為它是新元件，造成不必要的 unmount/remount。如果 tab 內有輸入框，用戶輸入中途父元件 re-render 可能導致輸入框失焦。

---

## 三、狀態管理

### Q-07 `useCharacterStore.tsx`：儲存失敗靜默吞噬

**嚴重度：🔴 高**

**檔案：** `apps/web/src/store/useCharacterStore.tsx`

```ts
} catch (e) {
  // 沒有 setError 或任何用戶反饋
} finally {
  setSaving(false);
}
```

`scheduleSave` 的 catch block 完全沒有處理。用戶繼續編輯，但資料沒有儲存，完全不知道。

**如果不修：** 用戶在網路不穩時可能失去數小時的編輯內容，沒有任何警示。

---

### Q-08 `AccountSettingsPage.tsx`：五個 Panel 完全沒有後端連接

**嚴重度：🔴 高**（產品完整性問題，同時也是程式碼品質問題）

Commission、Privacy、Notifications、ProjectDefaults、Storage 這 5 個 panel 的所有互動都只更新 `useState`，沒有任何 API mutation。儲存按鈕只在 `sec === "profile"` 時出現。

Storage panel 包含**硬編碼的假檔案資料**（lines 76–79）：
```ts
[{name:"角色備份_2024.json",...},{name:"暫存圖片_0923.png",...}]
```

**如果不修：** 用戶以為設定了委託資訊，但重整頁面後全部消失，造成混淆。

---

### Q-09 Auth Context 未使用 TanStack Query

**嚴重度：🟡 中**

**檔案：** `apps/web/src/lib/auth/context.tsx`

```ts
const [user, setUser] = useState(null);
useEffect(() => {
  fetch("/api/v1/auth/me").then(...)
}, []);
```

整個 app 其他地方都用 TanStack Query 管理 server state，唯獨 auth 用手動 `useState + useEffect`。這表示：
- Auth 資料沒有 staleTime / caching
- 沒有自動 retry
- Session 過期時沒有 invalidation 路徑

---

### Q-10 `RelationshipsPage.tsx`：拖拉位置用 `useState` 造成每個 mousemove 都 re-render

**嚴重度：🟡 中**

**檔案：** `apps/web/src/features/project/RelationshipsPage.tsx`

```ts
const [localPositions, setLocalPositions] = useState(null);
// mousemove handler:
setLocalPositions(prev => ({ ...prev, [id]: { x, y } }));
```

20 個節點的關係圖在拖拉時每個 `mousemove` 事件都觸發 React re-render。應使用 `useRef` 儲存拖拉中的位置，只在 `mouseup` 時 flush 到 state。

---

### Q-11 `StoryPage.tsx`：章節排序只在前端優化，無 API

**嚴重度：🟡 中**

```ts
// 直接操作 Query Cache，不呼叫 API
qc.setQueryData([...], /* 重排序後的資料 */);
// 備註: "// Fire optimistic reorder (best-effort, no API for reorder currently)"
```

章節排序在頁面重整或 invalidation 後會回到原始順序。

---

## 四、型別設計

### Q-12 無 `src/types/index.ts` — 型別散落在多處

**嚴重度：🔴 高**（違反 CLAUDE.md 規則）

CLAUDE.md 要求「所有共用型別定義在 `src/types/index.ts`」，但此檔案**不存在**。Domain type 分散在：

| 檔案 | 定義的型別 |
|------|-----------|
| `useCharacterStore.tsx` | Character, Template, Design, Block, Section, Album... |
| `TemplateCanvas.tsx` | 同上（重複定義，加了 Canvas 前綴 alias） |
| `CharacterDetailPage.tsx` | GpField, GpSection, GpSwatch |
| `AnnotationModal.tsx` | Annotation（第三個定義）|

**如果不修：** 同一概念有 2–3 個不同型別定義，修改其中一個不會影響其他兩個，造成 runtime mismatch。

---

### Q-13 `contracts/` 與 API router 的 enum 值完全不一致

**嚴重度：🔴 高**

| 欄位 | contracts 的值 | api/app/router.ts 的值 |
|------|---------------|----------------------|
| relationship direction | `undirected, a_to_b, b_to_a, bidirectional` | `undirected, one-way, two-way, many` |
| project features | `worldview, relationships, story, gallery, commissions, public_page` | `characters, worldview, story, gallery, relationships, inbox, publicPage, template, roster, applications, submissions, participants, permissions` |

這意味著前端的 Zod parse 若以 contracts 驗證 API 回傳值，會**靜默剝除**所有不符的欄位，或直接 parse 失敗。

**如果不修：** 前端使用的 enum 值與 DB 儲存的值不同，資料可能無法正確 round-trip。

---

### Q-14 `CharacterDetailPage.tsx` 讀取 `gp.template`（singular），但 store 存的是 `gp.templates`（plural）

**嚴重度：🟠 中高**

```ts
// CharacterDetailPage.tsx line 693:
template = (gp.template as ...) ?? buildDefaultTemplate(canvasChar)
// 但 store 儲存的是 gp.templates（array）和 gp.publicTplId
```

Detail page 永遠讀不到用戶選擇的模板，永遠 fallback 到 `buildDefaultTemplate`。

---

### Q-15 多處使用 `as any` 和 `as never`

**嚴重度：🟡 中**

| 檔案 | 問題 |
|------|------|
| `CharacterDetailPage.tsx` L142-143, L778-779 | `template: any`, `design: any`, 然後 cast `as any` 傳給 TemplateCanvas |
| `CharacterEditPage.tsx` L73, L74, L97, L98, L106, L108 | 6 處 `as never` |
| `DesignPage.tsx` L136-171 | 多處 `as never` for context objects |
| `StoryPage.tsx` L281, L296 | `(res as any).story?.id` |

型別系統在這些地方形同虛設，編譯器無法在這些路徑上進行型別安全保護。

---

## 五、重複程式碼

### Q-16 `charColor` 函式定義了 4 次

**嚴重度：🟡 中**

| 位置 | 差異 |
|------|------|
| `src/lib/charColor.ts` | 正規來源，10 色調 |
| `OverviewPage.tsx:30` | 與正規版相同 |
| `RelationshipsPage.tsx:21` | 不同的 10 色調！ |
| `CharacterNewPage.tsx:18` | 與正規版相同 |

`RelationshipsPage.tsx` 的版本使用**不同的顏色集**，表示關係圖中的角色顏色與其他頁面不一致。

---

### Q-17 `TYPE_LABELS` / `TYPE_COLORS` 定義了 3 次

**嚴重度：🟡 中**

WorldEntry 類型的標籤和顏色在 `WorldviewPage.tsx`、`PublicProjectPage.tsx`、`OverviewPage.tsx` 中各自定義一次，值略有不同。

---

### Q-18 `uid()` 函式定義了 2 次且格式不同

**嚴重度：🟡 中**

| 位置 | 格式 |
|------|------|
| `CharBackupModal.tsx:5` | `Math.random().toString(36).slice(2, 9)` |
| `templateBuilder/blocks.ts:8` | `p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)` |

兩種格式產生不同形狀的 ID，若用戶在兩個系統間交換資料可能造成 ID 衝突。

---

## 六、錯誤處理

### Q-19 Delete Mutation 無 `onError` 處理

**嚴重度：🟡 中**

`MyCharactersPage.tsx`、`MyProjectsPage.tsx`、`WorldviewPage.tsx` 的刪除/重排 mutation 都有 `onSuccess` 但缺少 `onError`。刪除失敗時 UI 不顯示任何反饋，但 optimistic update 已移除了資料。

---

### Q-20 `AlbumsEditor.tsx`：`im.annotations.length` 在舊資料上會 crash

**嚴重度：🟠 中高**

**檔案：** `apps/web/src/features/charEdit/AlbumsEditor.tsx`，line 88

```ts
im.annotations.length  // 若 annotations 為 undefined 會拋出 TypeError
```

CLAUDE.md 規則：欄位正規化應在 `getX()` 時進行，不應在 render code 進行防禦性 guard。但此處既沒有 `?? []`，也沒有在 `getCharacter()` 時正規化，會直接 crash。

---

### Q-21 `AuthGuard.tsx`：載入時回傳 `null`（空白頁面閃爍）

**嚴重度：🟡 低中**

```ts
if (loading) return null;
```

用戶在 auth 狀態確認前看到空白頁面，沒有 loading indicator。

---

### Q-22 `importCharFile`：直接 cast，沒有驗證

**嚴重度：🟠 中高**

```ts
const c = obj as Character;
```

用戶匯入的備份 JSON 若格式錯誤，整個 store 會以損壞的資料繼續運作，且沒有任何警告。

---

## 七、效能問題

### Q-23 N+1 查詢：`GET /projects/:projectId/characters`

**嚴重度：🟠 中高**

**檔案：** `api/src/app/router.ts`，lines 1398–1414

```ts
const links = await all(...);
const roster = await Promise.all(links.map(async (link) => {
  const character = await getCharacterRow(db, link.character_id); // N 次 D1 查詢
}));
```

50 個角色的企劃 = 1 + 50 次 D1 查詢。應改用 JOIN。

---

### Q-24 N+1 查詢：`validateWorldEntryRefs`

**嚴重度：🟡 中**

**檔案：** `api/src/app/router.ts`，lines 815–831

```ts
for (const characterId of params.relatedCharacterIds) {
  const link = await getProjectLinkForCharacter(...); // 逐一查詢
}
```

應改用一次 `WHERE id IN (...)` 查詢。

---

### Q-25 Relationship Layout 每次 Drag 事件都觸發 JSON 序列化

**嚴重度：🟡 中**（關聯 Q-10）

前端每個 `mousemove` 觸發 re-render，若同時前端 auto-save，`updateLayout` mutation 會序列化完整的 layout JSON。對含 200 個節點的佈局，每次拖拉停止都觸發 50KB 的 JSON parse + re-serialize。

---

## 八、API 設計問題

### Q-26 缺少 `PATCH /stories/:storyId` Endpoint

**嚴重度：🟠 中高**

故事可以建立、刪除，但無法修改標題/簡介/可見性/狀態。對應 StoryPage.tsx 的「故事設定編輯功能即將推出」。

---

### Q-27 多個 List Endpoint 缺少分頁

**嚴重度：🟡 中**

以下 endpoint 回傳無上限的結果集（`nextCursor: null` 是寫死的 placeholder）：

- `GET /projects/:projectId/characters`
- `GET /projects/:projectId/stories`
- `GET /projects/:projectId/story-events`
- `GET /projects/:projectId/submissions/content`
- `GET /assets`

---

## 九、可讀性 / 可維護性

### Q-28 `AppLayout.tsx` 含 `ICONS` 字典，與 `CommandPalette.tsx` 重複

**嚴重度：🟡 中**

兩個元件各自定義了 SVG path 字串的 `ICONS` 字典，使用 `dangerouslySetInnerHTML` 渲染。`Icon.tsx` 元件已存在但未被這些地方使用。

---

### Q-29 `CommissionsPage.tsx`：CSS 透過 `<style>` 標籤 inline 注入

**嚴重度：🟡 低中**

```tsx
<style>{`@media (max-width: 980px) { .cm-board { grid-template-columns: 1fr !important; } }`}</style>
```

在 JSX 中 inline `<style>` 標籤會在每次 re-render 時觸發 CSS reparse。`!important` 升高了 specificity，與全域 CSS 互相競爭。

---

### Q-30 `AppLayout.tsx`：使用 `<a href>` 而非 `<Link>`

**嚴重度：🟡 低中**

Lines 169, 296：原生 `<a>` 標籤造成完整頁面重新載入，清空 TanStack Query cache，用戶體驗出現明顯載入閃爍。
