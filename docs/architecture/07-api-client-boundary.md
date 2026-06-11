# API Client / Repository 邊界

**Date:** 2026-06-11

---

## 層次圖

```
Component / Page
    │ calls
    ▼
TanStack Query Hook  (features/*/hooks.ts)
    │ calls
    ▼
typed API function   (features/*/api.ts)
    │ calls
    ▼
apiClient            (lib/api/client.ts)
    │ fetch()
    ▼
Hono Worker API      (api/src/app/router.ts)
```

沒有 Repository class，沒有 mock/API proxy 切換。

---

## lib/api/client.ts

### 職責

- `fetch()` wrapper
- 帶上 credentials（`credentials: 'include'`，讓瀏覽器自動附 cookie）
- 讀取 response，處理 HTTP 非 2xx → 拋 `AppApiError`
- CSRF token 傳遞（Batch 1 完善）

### 介面設計

```ts
// lib/api/client.ts

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  params?: Record<string, string>
}

export class AppApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly detail?: string,
  ) {
    super(`API error ${status}: ${code}`)
  }
}

export async function apiClient<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.params)
  const res = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",                   // cookie-based auth
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCsrfToken(),         // Batch 1
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new AppApiError(
      res.status,
      errorBody.code ?? "UNKNOWN_ERROR",
      errorBody.detail,
    )
  }

  return res.json() as Promise<T>
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ""
  const url = new URL(path, base || window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return url.toString()
}
```

### 不做的事

- 不存 token（無 `Authorization: Bearer`）
- 不重試（TanStack Query retry 設定處理）
- 不快取（TanStack Query 負責）
- 不寫入 localStorage / sessionStorage

---

## features/*/api.ts — Typed API Functions

每個 feature 有自己的 `api.ts`，只匯集該 feature 的端點呼叫。

### 範例：relationships/api.ts

```ts
// features/relationships/api.ts
import { apiClient } from "@/lib/api/client"
import type {
  RelationshipListResponse,
  RelationshipResponse,
  CreateRelationshipRequest,
  PatchRelationshipRequest,
  RelationshipLayoutResponse,
  PatchRelationshipLayoutRequest,
} from "@oc-tools/contracts"

export const relationshipsApi = {
  list(projectId: string): Promise<RelationshipListResponse> {
    return apiClient(`/api/app/projects/${projectId}/relationships`)
  },

  get(projectId: string, relId: string): Promise<RelationshipResponse> {
    return apiClient(`/api/app/projects/${projectId}/relationships/${relId}`)
  },

  create(
    projectId: string,
    body: CreateRelationshipRequest,
  ): Promise<RelationshipResponse> {
    return apiClient(`/api/app/projects/${projectId}/relationships`, {
      method: "POST",
      body,
    })
  },

  patch(
    projectId: string,
    relId: string,
    body: PatchRelationshipRequest,
  ): Promise<RelationshipResponse> {
    return apiClient(`/api/app/projects/${projectId}/relationships/${relId}`, {
      method: "PATCH",
      body,
    })
  },

  remove(projectId: string, relId: string): Promise<void> {
    return apiClient(`/api/app/projects/${projectId}/relationships/${relId}`, {
      method: "DELETE",
    })
  },

  getLayout(projectId: string): Promise<RelationshipLayoutResponse> {
    return apiClient(`/api/app/projects/${projectId}/relationship-layout`)
  },

  patchLayout(
    projectId: string,
    body: PatchRelationshipLayoutRequest,
  ): Promise<RelationshipLayoutResponse> {
    return apiClient(
      `/api/app/projects/${projectId}/relationship-layout`,
      { method: "PATCH", body },
    )
  },
}
```

---

## features/*/hooks.ts — TanStack Query Hooks

```ts
// features/relationships/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { relationshipsApi } from "./api"
import type { PatchRelationshipRequest } from "@oc-tools/contracts"

export function useRelationships(projectId: string) {
  return useQuery({
    queryKey: ["relationships", projectId],
    queryFn: () => relationshipsApi.list(projectId),
    enabled: !!projectId,
  })
}

export function useUpdateRelationship(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ relId, body }: { relId: string; body: PatchRelationshipRequest }) =>
      relationshipsApi.patch(projectId, relId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relationships", projectId] })
    },
  })
}

export function useDeleteRelationship(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (relId: string) => relationshipsApi.remove(projectId, relId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relationships", projectId] })
    },
  })
}
```

---

## 與 `_archive/app/` 架構對比

| 舊 | 新 |
|----|-----|
| `api-client.js` + `sessionStorage` token | `apiClient` + `credentials: include` + HttpOnly cookie |
| `Repository` class（mock / api Proxy）| typed function object per feature |
| `data-store.apiCache()` 更新 | `queryClient.invalidateQueries()` |
| `normalizeRelationship()` runtime transform | contracts Zod schema 驗證 + 型別，API 欄位名稱一致 |
| `mock-adapter.js`（讀 data-store）| MSW handler（測試）或 seed D1（開發）|

---

## Mock 策略（開發 / 測試）

| 環境 | 策略 |
|------|------|
| 本地開發 | 啟動 `api/` wrangler dev（D1 local）；`apps/web` 接真 API |
| Unit / component test | MSW 攔截 fetch；fixture 資料從 `v3/assets/data.js` 提取 |
| Storybook | MSW handlers per story |
| E2E | 測試用 seed D1；直接打 worker |

**不在 client 端做 mock/api toggle**（原 `repositories/index.js` 的 Proxy 模式廢止）。
