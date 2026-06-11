# Test Strategy

**Date:** 2026-06-11

---

## 原則

- 測試覆蓋業務邏輯邊界，不是實作細節
- API integration test 打真正的 D1（local wrangler），不 mock DB
- 前端 test 用 MSW 攔截 fetch，不引入 React 測試太深的 DOM 細節
- E2E 只覆蓋關鍵流程，不重複 unit test 的覆蓋範圍

---

## 測試層次

```
┌────────────────────────────────────────────────────────┐
│  E2E（Playwright）                                      │
│  → 關鍵 happy path：登入 → 建角色 → 建企劃 → 加關係     │
│  → 約 5–10 個 scenario                                  │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  Component / Integration（Vitest + React Testing Lib）  │
│  → Feature 元件的互動：表單 submit → mutation 觸發       │
│  → PermissionGate 依 role 顯示 / 隱藏                   │
│  → ResourceStateBoundary 各 state（loading, error...）  │
│  → 用 MSW 攔截 API calls                               │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  Unit（Vitest）                                         │
│  → Contracts Zod schema 驗證邏輯                        │
│  → lib/api/client.ts error mapping                     │
│  → 純函式（formatters, cn, URL builder）               │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  API Integration（Vitest + Miniflare / wrangler test）  │
│  → 每個端點 happy path + 主要 error case               │
│  → Permission boundary（role 不足 → 403）              │
│  → Ownership check（別人的 project → 404）              │
└────────────────────────────────────────────────────────┘
```

---

## 工具選擇

| 層 | 工具 | 理由 |
|----|------|------|
| Unit / Component | **Vitest** | Vite 原生；快；TypeScript |
| React 渲染 | **@testing-library/react** | 接近使用者行為 |
| API Mock | **MSW (Mock Service Worker)** | 攔截真實 fetch；前後端一致 |
| E2E | **Playwright** | Chromium / WebKit；Cloudflare Workers 相容 |
| API Integration | **wrangler dev --test-mode** 或 Miniflare | 打真實 D1 local instance |

---

## Contracts 測試

```ts
// packages/contracts/src/__tests__/relationship.test.ts

import { describe, it, expect } from "vitest"
import { CreateRelationshipSchema } from "../relationship"

describe("CreateRelationshipSchema", () => {
  it("accepts valid payload", () => {
    const result = CreateRelationshipSchema.safeParse({
      entityAId: "char_1",
      entityBId: "char_2",
      direction: "undirected",
    })
    expect(result.success).toBe(true)
  })

  it("rejects same entity for A and B", () => {
    // 若未來加此驗證
  })

  it("rejects invalid color hex", () => {
    const result = CreateRelationshipSchema.safeParse({
      entityAId: "char_1",
      entityBId: "char_2",
      color: "notacolor",
    })
    expect(result.success).toBe(false)
  })
})
```

---

## API Integration 測試

現有 `api/test/app-auth.test.ts` 模式可沿用。新測試放在 `api/test/`。

```ts
// api/test/relationships.test.ts（概念）

describe("Relationship API", () => {
  let projectId: string
  let authCookie: string

  beforeAll(async () => {
    // 登入，取得 cookie
    // 建立測試 project
  })

  it("POST /relationships → creates relationship", async () => {
    const res = await fetch(
      `http://localhost:8787/api/app/projects/${projectId}/relationships`,
      {
        method: "POST",
        headers: { Cookie: authCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ entityAId: "char_a", entityBId: "char_b" }),
      },
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.entityAId).toBe("char_a")
  })

  it("PATCH /relationships/:id → 403 for viewer role", async () => {
    // viewer cookie
    const res = await fetch(...)
    expect(res.status).toBe(403)
  })
})
```

---

## Component 測試

```tsx
// features/relationships/components/__tests__/RelationshipCard.test.tsx

import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { RelationshipCard } from "../RelationshipCard"

describe("RelationshipCard", () => {
  it("shows relationship label", () => {
    render(
      <RelationshipCard
        relationship={{ id: "r1", label: "師徒", direction: "a_to_b", ... }}
      />
    )
    expect(screen.getByText("師徒")).toBeInTheDocument()
  })
})
```

---

## MSW Handlers

```ts
// apps/web/src/test/handlers/relationships.ts

import { http, HttpResponse } from "msw"
import type { RelationshipListResponse } from "@oc-tools/contracts"

export const relationshipHandlers = [
  http.get("/api/app/projects/:projectId/relationships", ({ params }) => {
    return HttpResponse.json<RelationshipListResponse>({
      data: [/* fixture 資料 */],
    })
  }),
]
```

Fixture 資料來源：從 `v3/assets/data.js` 的 `relationships` 陣列提取，轉成 TypeScript。

---

## E2E（Playwright）

```ts
// apps/web/e2e/create-relationship.spec.ts

import { test, expect } from "@playwright/test"

test("create a relationship", async ({ page }) => {
  // 登入
  await page.goto("/login")
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')

  // 進企劃關係頁
  await page.goto("/p/proj_1/relationships")
  await page.click("button:has-text('新增關係')")

  // 填寫表單
  await page.fill('[name=label]', '師徒')
  await page.click("button:has-text('確認')")

  // 驗證
  await expect(page.getByText("師徒")).toBeVisible()
})
```

---

## 覆蓋率目標

| 層 | 目標 |
|----|------|
| contracts（Zod schema）| 90%+ |
| API integration（endpoint 涵蓋率）| 每個端點至少 1 happy path + 1 error |
| Component | 主要 interaction path |
| E2E | 3–5 個關鍵 user journey |

不追 100% coverage，追的是有意義的邊界測試。
