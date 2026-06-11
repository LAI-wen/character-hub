# Contracts Package 規格

**Date:** 2026-06-11

---

## 目的

`packages/contracts` 是前後端唯一的共用型別邊界：

- 所有端點的 Request / Response 結構在這裡定義一次
- API Worker 用它驗證 request body、型別 response
- React 前端用它型別 API 函式、Zod resolver
- 消除 `_archive/app/repositories/api-repository-utils.js` 的 normalizer 重複邏輯

---

## 結構規則

每個資源一個檔案。每個檔案導出：

| 導出名 | 說明 |
|--------|------|
| `XxxSchema` | 資源完整 schema（Zod）|
| `Xxx` | 資源 TypeScript 型別（`z.infer<typeof XxxSchema>`）|
| `CreateXxxSchema` | POST body schema |
| `CreateXxxRequest` | POST body 型別 |
| `PatchXxxSchema` | PATCH body schema（所有欄位 optional）|
| `PatchXxxRequest` | PATCH body 型別 |
| `XxxResponseSchema` | API 回傳格式 schema（帶 `data` wrapper）|
| `XxxResponse` | API 回傳型別 |
| `XxxListResponseSchema` | 列表回傳格式 schema |
| `XxxListResponse` | 列表型別 |

---

## common.ts

```ts
// packages/contracts/src/common.ts

import { z } from "zod"

export const VisibilitySchema = z.enum(["public", "private", "unlisted"])
export type Visibility = z.infer<typeof VisibilitySchema>

export const ProjectRoleSchema = z.enum([
  "owner", "host", "cohost", "member", "viewer",
])
export type ProjectRole = z.infer<typeof ProjectRoleSchema>

export const RelationshipDirectionSchema = z.enum([
  "undirected", "a_to_b", "b_to_a", "bidirectional",
])
export type RelationshipDirection = z.infer<typeof RelationshipDirectionSchema>

export const FeatureSchema = z.enum([
  "worldview", "relationships", "story",
  "gallery", "commissions", "public_page",
])
export type Feature = z.infer<typeof FeatureSchema>

// Standard API response wrappers
export function dataResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema })
}
export function listResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: z.array(schema) })
}
```

---

## errors.ts

```ts
// packages/contracts/src/errors.ts

import { z } from "zod"

export const ApiErrorCodeSchema = z.enum([
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "CONFLICT",
  "INTERNAL_ERROR",
])
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    detail: z.string().optional(),
  }),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
```

---

## relationship.ts（完整範例）

```ts
// packages/contracts/src/relationship.ts

import { z } from "zod"
import { RelationshipDirectionSchema } from "./common"
import { dataResponse, listResponse } from "./common"

export const RelationshipSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  entityAId: z.string(),
  entityBId: z.string(),
  direction: RelationshipDirectionSchema,
  label: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isArchived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Relationship = z.infer<typeof RelationshipSchema>

export const CreateRelationshipSchema = z.object({
  entityAId: z.string().min(1),
  entityBId: z.string().min(1),
  direction: RelationshipDirectionSchema.default("undirected"),
  label: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})
export type CreateRelationshipRequest = z.infer<typeof CreateRelationshipSchema>

export const PatchRelationshipSchema = CreateRelationshipSchema.partial()
export type PatchRelationshipRequest = z.infer<typeof PatchRelationshipSchema>

export const RelationshipResponseSchema = dataResponse(RelationshipSchema)
export type RelationshipResponse = z.infer<typeof RelationshipResponseSchema>

export const RelationshipListResponseSchema = listResponse(RelationshipSchema)
export type RelationshipListResponse = z.infer<typeof RelationshipListResponseSchema>
```

---

## relationship-layout.ts

```ts
// packages/contracts/src/relationship-layout.ts

import { z } from "zod"
import { dataResponse } from "./common"

export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const RelationshipLayoutSchema = z.object({
  projectId: z.string(),
  positions: z.record(z.string(), NodePositionSchema),
  updatedAt: z.string().datetime(),
})
export type RelationshipLayout = z.infer<typeof RelationshipLayoutSchema>

export const PatchRelationshipLayoutSchema = z.object({
  positions: z.record(z.string(), NodePositionSchema),
}).strict()
export type PatchRelationshipLayoutRequest = z.infer<typeof PatchRelationshipLayoutSchema>

export const RelationshipLayoutResponseSchema = dataResponse(RelationshipLayoutSchema)
export type RelationshipLayoutResponse = z.infer<typeof RelationshipLayoutResponseSchema>
```

---

## 其他資源（列表）

以下資源在 Batch 1 實作，格式與 relationship.ts 相同：

| 檔案 | 主要欄位 |
|------|---------|
| `project.ts` | id, slug, name, description, visibility, enabledFeatures, isArchived |
| `character.ts` | id, ownerId, name, bio, birthday, pronouns, isArchived |
| `project-character-link.ts` | id, projectId, characterId, displayName, role, isArchived |
| `world-entry.ts` | id, projectId, title, type, content, isArchived |

Batch 2+ 預留：`story.ts`, `asset.ts`, `public-page.ts`

---

## 在 API Worker 中使用

```ts
// api/src/app/router.ts（使用範例）
import { CreateRelationshipSchema } from "@oc-tools/contracts"

// Parse & validate request body
const result = CreateRelationshipSchema.safeParse(await c.req.json())
if (!result.success) {
  return c.json({ error: { code: "VALIDATION_ERROR", message: result.error.message } }, 400)
}
const body = result.data
```

---

## 在 React 中使用

```tsx
// features/relationships/components/RelationshipForm.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreateRelationshipSchema, type CreateRelationshipRequest } from "@oc-tools/contracts"

const form = useForm<CreateRelationshipRequest>({
  resolver: zodResolver(CreateRelationshipSchema),
})
```

---

## Package 設定

```json
// packages/contracts/package.json
{
  "name": "@oc-tools/contracts",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "peerDependencies": {}
}
```

```json
// tsconfig.json（root workspace）
{
  "compilerOptions": {
    "paths": {
      "@oc-tools/contracts": ["./packages/contracts/src/index.ts"]
    }
  }
}
```
