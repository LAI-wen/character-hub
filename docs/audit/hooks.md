# 稽核：Hooks / Routes / Layouts
> src/routes/, src/lib/auth/context.tsx, 及 hooks 使用模式

---

## 說明

`apps/web/src/` 目前沒有獨立的 `hooks/` 資料夾。Hook 邏輯分散在：
- `src/lib/auth/context.tsx`（auth hook）
- `src/store/useCharacterStore.tsx`（store hook）
- `src/lib/query/client.ts`（TanStack Query client）
- 各頁面的 inline `useQuery`/`useMutation` 呼叫

本文件也涵蓋 `src/routes/` 的 Guards 和 Layouts。

---

## Routes 結構

```
src/routes/
├── index.tsx          ← 所有路由定義
├── guards/
│   ├── AuthGuard.tsx  ← 需要登入的路由保護
│   └── ScopeGuard.tsx ← 需要企劃成員資格的路由保護
└── layouts/
    ├── AppLayout.tsx  ← 主 app shell（344 行）
    ├── ProjectLayout.tsx ← 企劃 context layout
    └── PublicLayout.tsx  ← 公開頁 layout
```

---

## 主要問題

### 🔴 [H-01] `ProjectLayout.tsx`：viewerRole 預設為 `"owner"`

**檔案：** `apps/web/src/routes/layouts/ProjectLayout.tsx`，line 51

```ts
const role: ProjectRole = (data.viewerRole as ProjectRole) ?? "owner"
```

當 API 回傳 `viewerRole: null`（非成員查看公開企劃），前端授予 `"owner"` 等級的 context。

**為什麼是問題：** 所有讀取 `ProjectContext.role` 的 UI 判斷都可能顯示不該顯示的操作入口（設定、刪除、審核申請等）。

**如果不修：** 非成員可能看到應該只有成員才能看到的管理功能入口（即使 API 有二次防護，UI 仍誤導用戶）。

---

### 🟠 [H-02] `AuthGuard.tsx`：載入時回傳 `null`（空白閃爍）

```tsx
if (loading) return null;
```

用戶在 auth 狀態確認之前看到空白頁面，沒有 loading skeleton 或 spinner。SPA 啟動時的空白閃爍是不良的感知效能體驗。

**建議：** `return <div className="page-loading"><LoadingSpinner /></div>`

---

### 🟠 [H-03] `AppLayout.tsx`（344 行）職責過多

`AppLayout.tsx` 同時承擔：
1. App shell 布局（sidebar + content area）
2. 導航資料管理（企劃清單 fetch）
3. Icon 渲染（重複定義 ICONS 字典）
4. 企劃切換器邏輯
5. Command Palette 觸發
6. Mobile menu 控制（isMenuOpen state）
7. Quick-add 下拉選單

其中 **ICONS 字典與 `CommandPalette.tsx` 完全重複**：

```ts
// AppLayout.tsx:
const ICONS: Record<string, string> = { "home": "...", "char": "...", ... }
// CommandPalette.tsx:
const ICONS: Record<string, string> = { "home": "...", "char": "...", ... }
```

---

### 🟠 [H-04] `AppLayout.tsx`：使用 `<a>` 而非 React Router `<Link>`

```tsx
<a href="/workspace">...</a>  // lines 169, 296
```

原生 `<a>` 造成完整頁面重新載入，TanStack Query cache 全部清空，用戶需要等所有資料重新 fetch。

---

### 🟡 [H-05] `ScopeGuard.tsx`：企劃成員資格驗證實作（需確認）

不確定 `ScopeGuard` 是否確實做了後端驗證，或者只是讀取前端 context。若只是前端 guard，任何知道企劃 URL 的人理論上可以直接瀏覽受保護頁面。

**建議確認：** ScopeGuard 是否呼叫 API 確認成員資格，或只是讀取 ProjectContext？

---

### 🟡 [H-06] `ProjectLayout.tsx`：`projectId === undefined` 時的 fallback 不清楚

```tsx
return <ScopeGuard projectId={undefined}><div /></ScopeGuard>
```

當 URL 解析失敗時，用戶看到空白 div，沒有任何錯誤說明或 redirect。

---

## TanStack Query 使用模式分析

### 值得保留的設計

大多數頁面遵循標準的三態模式：

```tsx
const { data, isLoading, error } = useQuery(...)
if (isLoading) return <p>載入中⋯</p>
if (error) return <p>載入失敗</p>
return <MainContent data={data} />
```

這個模式是正確的，且在大多數功能頁面中一致存在。

### 問題：Mutation 缺少 `onError`

多個頁面的 useMutation 有 `onSuccess` 但沒有 `onError`：

| 頁面 | 無 onError 的 mutation |
|------|----------------------|
| `MyCharactersPage.tsx` | deleteMutation |
| `MyProjectsPage.tsx` | deleteMutation |
| `WorldviewPage.tsx` | reparentMutation, reorderMutation |
| `StoryPage.tsx` | reorderMutation |

---

### 問題：Auth 不在 Query cache

```tsx
// lib/auth/context.tsx:
useEffect(() => {
  fetch("/api/v1/auth/me")...
}, []);
```

理想做法：

```tsx
const { data: user } = useQuery({
  queryKey: ['me'],
  queryFn: () => apiClient<User>('/api/v1/auth/me'),
  staleTime: 5 * 60 * 1000,
});
```

---

## 路由保護架構評估

```
routes/index.tsx
├── PublicLayout（/p/*）         ← 公開頁，無 auth
├── AuthGuard > AppLayout（/*）  ← 需登入
│   ├── /workspace               ← 工作區
│   ├── /characters/*            ← 角色管理
│   └── ScopeGuard（/project/*） ← 需企劃成員
└── /auth/*                      ← 登入/回調
```

架構是合理的。問題：
1. AuthGuard 的載入狀態（null flash）
2. ProjectLayout 的 role 預設值
3. ScopeGuard 的實作細節待確認

---

## 高風險部分

| 風險 | 位置 | 影響 |
|------|------|------|
| viewerRole 預設 owner | `ProjectLayout.tsx:51` | 非成員看到管理入口 |
| AuthGuard null 閃爍 | `AuthGuard.tsx` | UX 不良 |
| `<a>` 而非 `<Link>` | `AppLayout.tsx:169,296` | 完整頁面重載，cache 清空 |
| mutation 無 onError | 多個頁面 | 操作失敗無反饋 |

## 建議重構方向

1. `ProjectLayout.tsx`：修正 `viewerRole` 預設值（改為 `"viewer"` 或 `null`）
2. `AuthGuard.tsx`：loading 時顯示 spinner 而非 null
3. `AppLayout.tsx`：`<a>` 改 `<Link>`；ICONS 字典抽到共用 `lib/utils/icons.ts`
4. 各頁 mutation 補上 `onError` handler
5. `lib/auth/context.tsx` 改用 TanStack Query

## 優先級

P1：viewerRole 預設值（安全/UX）  
P2：mutation onError 補全（可靠性）  
P2：`<a>` 改 `<Link>`（效能/UX）  
P3：AppLayout 職責拆分（可維護性）
