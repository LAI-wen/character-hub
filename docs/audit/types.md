# 稽核：packages/contracts/src/ + 型別系統整體
> 共用型別合約 + 跨系統型別一致性

---

## 資料夾用途

`packages/contracts/src/` 是前後端的共用型別合約。理論上，這裡定義的 Zod schema 應同時被 `apps/web` 和 `api/` 使用，確保 API 請求/回應的型別一致性。

---

## 型別系統全貌

目前存在**三套平行的型別系統**，相互沒有強制一致性：

| 位置 | 型別格式 | Zod 版本 | 誰在用 |
|------|---------|---------|--------|
| `packages/contracts/src/` | camelCase，完整 schemas | Zod 4 | `apps/web` |
| `api/src/types.ts` | snake_case，舊版 OC schema | 無 Zod | 舊版 routers |
| `api/src/app/router.ts`（inline）| camelCase + snake_case 混用，Row types | Zod 3 | 新版 app router |
| `apps/web/src/store/useCharacterStore.tsx` | camelCase，local definitions | 無 Zod | 前端 store |

**核心問題：** API 實際接受和回傳的 enum 值，與 `packages/contracts` 定義的不同。

---

## contracts/ 主要檔案分析

### `character.ts`

**[T-01] 🔴 `ownerUserId` 是必填，但 API 實際上不回傳**

```ts
ownerUserId: z.string(),        // required
ownerId: z.string().optional(), // optional
```

API demo data 只有 `ownerId`。任何對真實 API 回應執行 `CharacterSchema.parse()` 都會因為 `ownerUserId` 缺失而失敗。

**如果不修：** 開發者開始用 `parse()` 進行嚴格驗證時，立即 crash。目前 `parse()` 可能沒有被使用，讓這個問題隱藏起來。

---

### `relationship.ts` + `common.ts`

**[T-02] 🔴 `direction` enum 有兩個不相容的定義**

| 位置 | 值 |
|------|---|
| `common.ts` `RelationshipDirectionSchema` | `undirected`, `a_to_b`, `b_to_a`, `bidirectional` |
| `relationship.ts` `RelationshipSchema.direction` | `undirected`, `forward`, `both`, `none` |

`RelationshipDirectionSchema` 在 `common.ts` 中定義但**從未被任何其他 schema 引用**——它是一個廢棄的 export。`relationship.ts` 使用的是 inline enum `z.enum(["undirected", "forward", "both", "none"])`。

但 `api/src/app/router.ts` 的 `createRelationshipSchema` 使用的是 `z.enum(["undirected", "one-way", "two-way", "many"])`——又是第三組值。

**如果不修：** 前端用戶選擇了 direction，儲存到 DB 的值與 contracts 定義不符，讀回時 parse 失敗或靜默剝除。

---

### `world-entry.ts`

**[T-03] 🟠 `content` 和 `body` 並存**

```ts
content: z.string().nullable().optional(),
body: z.string().nullable().optional(),
```

`CreateWorldEntrySchema` 只有 `content`。看起來是重構時把 `body` 改名為 `content` 但沒有從讀取 schema 移除 `body`。

**如果不修：** 新開發者不知道應該用 `content` 還是 `body`，兩個欄位都可能被寫入。

---

### `story.ts`

**[T-04] 🟡 `Story.visibility` 是 `z.string()`，而非 `VisibilitySchema`**

```ts
// StorySchema:
visibility: z.string(),  // 太寬鬆

// CreateStoryEventSchema:
visibility: z.enum(["private", "unlisted", "public"]),  // 正確，有驗證
```

Create path 有型別安全，read path 沒有。

---

### `project.ts`

**[T-05] 🔴 `workspaceKind` 和 `color` 欄位缺失**

API demo data 每個 project 都有 `workspaceKind` 和 `color`。前端的 sidebar 顏色和企劃類型顯示依賴這兩個欄位。但 `ProjectSchema` 中沒有定義這兩個欄位。

任何透過 `ProjectSchema.parse()` 解析的 project 物件，這兩個欄位都會被靜默剝除。

---

### `common.ts`

**[T-06] 🟡 `dataResponse`/`listResponse` helpers 從未被使用**

```ts
export function dataResponse<T>(schema: T) { return z.object({ data: schema }) }
export function listResponse<T>(schema: T) { return z.object({ data: z.array(schema) }) }
```

所有回應 schema 使用 `{ character: ... }`、`{ projects: ... }` 等自訂 key，而非 `{ data: ... }` 包裝。這兩個 helper 從未被任何 schema 使用。

---

### 分頁 cursor 不一致性

**[T-07] 🟡 各 list response 的 `nextCursor` nullability 不一致**

| Schema | `nextCursor` 型別 |
|--------|-----------------|
| `CharacterListResponse` | `string \| null \| undefined` |
| `ProjectListResponse` | `string \| null`（無 undefined）|
| `WorldEntryListResponse` | `string \| null \| undefined` |

無法寫一個統一型別的分頁 utility，必須各頁特殊處理。

---

## API Router vs Contracts 衝突列表

| 欄位 | contracts 值 | api/app/router.ts 值 |
|------|-------------|---------------------|
| relationship direction | `undirected, forward, both, none` | `undirected, one-way, two-way, many` |
| project features | `worldview, relationships, story, gallery, commissions, public_page` | `characters, worldview, story, gallery, relationships, inbox, publicPage, template, roster, applications, submissions, participants, permissions` |
| visibility | `public, private, unlisted` | 同 contracts（一致）|

---

## packages/contracts 被使用狀況

| 消費者 | 使用情況 |
|--------|---------|
| `apps/web` | ✅ 大量使用（透過 `@oc-tools/contracts`）|
| `api/` | ❌ 完全不用（Zod v3，contracts 用 v4）|
| `packages/contracts` 自己 | Zod 4 schema as source of truth |

---

## 前端 Domain Types 散落位置

| 型別名 | 定義位置 |
|--------|---------|
| `Character`, `Template`, `Design`, `Block`... | `useCharacterStore.tsx`（lines 1–74）|
| `CanvasCharacter`, `CanvasBlock`... | `TemplateCanvas.tsx`（lines 5–93）|
| `GpField`, `GpSection` | `CharacterDetailPage.tsx`（local）|
| `Annotation` | `AnnotationModal.tsx`（第三份定義）|

CLAUDE.md 規則要求所有共用型別在 `src/types/index.ts`，此檔案**不存在**。

---

## 高風險型別問題

| 風險 | 嚴重度 | 影響 |
|------|--------|------|
| `ownerUserId` required but absent | 🔴 | API parse 失敗 |
| direction enum 三套不同值 | 🔴 | 資料儲存/讀取不一致 |
| `workspaceKind`/`color` 缺失 | 🔴 | sidebar 渲染錯誤 |
| API 不使用 contracts | 🔴 | 合約沒有任何約束力 |
| feature flags 不一致 | 🟠 | 功能開關無效 |

## 建議重構方向

1. 建立 `apps/web/src/types/index.ts`，移入 store 中的 domain types
2. 修正 `contracts/character.ts`：移除 `ownerUserId` 或改為 optional
3. 修正 `contracts/relationship.ts`：統一 direction enum
4. 在 `contracts/project.ts` 加入 `workspaceKind` 和 `color`
5. 評估讓 `api/` 使用 contracts package（需要升級 Zod 版本）
6. 移除 `body` 欄位（`world-entry.ts`），統一使用 `content`

## 優先級

P1：direction enum 統一（影響資料 round-trip）  
P1：`ownerUserId` 修正（影響 parse 可用性）  
P2：建立 `src/types/index.ts`（可維護性）  
P2：`workspaceKind`/`color` 加入 schema  
P3：API 升級 Zod 版本並接入 contracts
