# 稽核：apps/web/src/lib/ + 工具函式
> API client、Auth context、Utility functions

---

## 資料夾用途

`src/lib/` 存放跨頁面共用的功能層程式碼：API client、auth context、圖片壓縮、顏色工具、工具函式等。

---

## 主要檔案說明

| 檔案 | 用途 | 狀態 |
|------|------|------|
| `lib/api/client.ts` | fetch wrapper，統一 API 呼叫 | ✅ |
| `lib/api/errors.ts` | API error 型別 | ✅ |
| `lib/api/index.ts` | 重新匯出 | ✅ |
| `lib/auth/context.tsx` | 全域 auth state | ⚠️ 未使用 TanStack Query |
| `lib/charColor.ts` | 角色顏色計算 | ⚠️ 被重複定義 4 次 |
| `lib/compressImage.ts` | 圖片壓縮 (canvas) | ✅ |
| `lib/recentlyViewed.ts` | 最近瀏覽（localStorage）| ✅ |
| `lib/query/client.ts` | TanStack Query client | ✅ |
| `lib/utils/cn.ts` | CSS class merging | ✅ |

---

## 目前問題

### 🟠 [U-01] `lib/auth/context.tsx`：手動 fetch，未使用 TanStack Query

```tsx
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/v1/auth/me")
    .then(r => r.json())
    .then(data => setUser(data.user))
    .catch(() => setUser(null))
    .finally(() => setLoading(false));
}, []);
```

整個 app 的所有其他資料請求都用 TanStack Query。唯獨 auth 使用手動 `useState + useEffect`，造成：
- 沒有 staleTime/caching（每次 `AuthProvider` 掛載都 refetch）
- 沒有 retry 邏輯（失敗一次就設 null）
- Session 過期時沒有 invalidation 路徑
- auth state 不在 QueryClient cache 中，無法 invalidate

**如果不修：** 若 session 在使用中過期，用戶看到奇怪行為（頁面還顯示登入狀態，但 API 回 401）。

---

### 🟡 [U-02] `lib/charColor.ts`：正規版本被忽略，各頁自行重定義

```ts
// lib/charColor.ts（正規來源）:
export function charColor(name: string): string {
  const palette = ['#E8A0BF','#B0C4DE',...];
  // 10 色調
}
```

此函式在以下位置被重複定義：

| 位置 | 差異 |
|------|------|
| `OverviewPage.tsx:30` | 相同邏輯，相同顏色 |
| `CharacterNewPage.tsx:18` | 相同邏輯，相同顏色 |
| `RelationshipsPage.tsx:21` | **不同的 10 色調！** |

`RelationshipsPage.tsx` 用的是不同顏色，關係圖中的角色顏色與其他頁面**不一致**。

**如果不修：** 同一個角色在不同頁面顯示不同顏色，破壞視覺一致性。

---

### 🟡 [U-03] `lib/compressImage.ts`：壓縮邏輯與 OCTOOL 版本不同

apps/web 的 `compressImage.ts`：最大 1280px，JPEG 0.85  
OCTOOL 的 `data/upload.ts` 中的 `processFile`：同樣的邏輯但重新實作

目前 apps/web 有一個乾淨的 lib 函式。問題在於 store 中的圖片上傳路徑（`useCharacterStore.tsx`）呼叫了 `compressImage` 再上傳到 R2，但 OCTOOL 則是壓縮後存到 localStorage。兩條路徑最終的圖片格式一致，但實作分散。

---

### 🟡 [U-04] `data/formTemplates.ts`：`uid()` 與 `templateBuilder/blocks.ts` 的 `uid()` 格式不同

**`data/formTemplates.ts`:**
```ts
const uid = () => Math.random().toString(36).slice(2, 9);
// 產生：'k3m9aq1'（7 位，無前綴）
```

**`templateBuilder/blocks.ts`:**
```ts
function uid(p = ''): string {
  return p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}
// 產生：'blk_k3m9aq5z2'（有前綴，有時間戳後綴）
```

兩種 ID 格式混用，若前端備份（FormTemplate 格式）被匯入到含 templateBuilder 生成 block 的環境，ID 形狀不同可能造成混淆或 key collision。

---

### 🟢 [U-05] 缺少 `lib/utils/formatDate.ts`

`timeAgo` 和 `fmtDate` 函式在以下 4 個地方各自定義：
- `MyCharactersPage.tsx`
- `AccountSettingsPage.tsx`  
- `StoryPage.tsx`
- `ParticipantsPage.tsx`

應統一提取到 `lib/utils/formatDate.ts`。

---

### 🟢 [U-06] 缺少 `lib/utils/typeLabels.ts`

WorldEntry 的 `TYPE_LABELS` 和 `TYPE_COLORS` 在以下地方重複定義：
- `WorldviewPage.tsx`（lines 18–27）
- `PublicProjectPage.tsx`（lines 15–24）
- `OverviewPage.tsx`（lines 36–40，只有部分類型）

三個版本有細微差異，應統一提取。

---

## API Client 評估

`lib/api/client.ts` 的 `apiClient` 函式是乾淨的 fetch wrapper：
- 自動附加 `Authorization: Bearer` token
- 統一 error handling
- TypeScript 泛型支援 response type

**值得保留的設計。**

唯一問題：部分頁面（`ApplicationsPage.tsx`）不使用 `apiClient`，而是直接用 `fetch` 手動 `JSON.stringify` body：

```ts
// ApplicationsPage.tsx:
body: JSON.stringify({...}),
// vs 其他頁面使用 apiClient 的 json: 選項
```

---

## 高風險部分

| 風險 | 位置 | 影響 |
|------|------|------|
| Auth context 無 retry | `lib/auth/context.tsx` | Session 過期無感 |
| charColor 不一致 | `RelationshipsPage.tsx` | 關係圖顏色與其他頁面不同 |
| 缺少共用 date utils | 4 個頁面 | 格式不一致，改一個地方不影響其他 |

## 建議重構方向

1. `lib/auth/context.tsx`：改用 TanStack Query（`useQuery(['me'], fetchMe)`）
2. 移除各頁的 `charColor` 重複定義，全部 import 自 `lib/charColor.ts`
3. 建立 `lib/utils/formatDate.ts`（`timeAgo`, `fmtDate`）
4. 建立 `lib/utils/typeLabels.ts`（WorldEntry TYPE_LABELS/TYPE_COLORS）
5. 統一 `uid()` 到一個共用函式

## 優先級

P1：`charColor` 不一致修正（視覺 Bug）  
P2：auth context 改 TanStack Query（可靠性）  
P3：date utils 提取（可維護性）  
P4：typeLabels 提取（可維護性）
