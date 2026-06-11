# Batch 1 詳細實作計畫

**Date:** 2026-06-11

---

## 範圍

Batch 1 = Foundation（腳手架）+ Auth + Character + Project + Roster + Worldview + Relationships

完成後：使用者可以登入，管理自己的角色和企劃，並使用關係圖。這覆蓋了 `_archive/app/` 所有已實作的 API 功能。

---

## 步驟順序

### Phase 0-A — Monorepo 腳手架

```
目標：pnpm install 成功，apps/web 跑起來，packages/contracts import 可用

1. 設定 pnpm-workspace.yaml
   packages:
     - 'apps/*'
     - 'packages/*'

2. 建立 packages/contracts/
   - package.json（@oc-tools/contracts）
   - tsconfig.json
   - src/index.ts（空）
   - src/common.ts（Visibility, ProjectRole, etc.）
   - src/errors.ts

3. 建立 apps/web/
   npm create vite@latest web -- --template react-ts
   安裝依賴：
   - @tanstack/react-query@^5
   - react-router-dom@^6
   - react-hook-form
   - @hookform/resolvers
   - zod
   - @oc-tools/contracts（workspace:*）

4. 設定 tsconfig（strict: true, paths: @oc-tools/contracts）
5. 設定 vite.config.ts（proxy /api/* → localhost:8787）
6. 建立 packages/ui/ 基礎（Button, Input, Spinner, Toast, Badge）
   從 v3/assets/ds.css 搬入 tokens.css
```

**驗收：** `pnpm dev`（apps/web）可看到空白 React app。

---

### Phase 1-A — Auth

```
API 工作（api/）：
1. 完善 api/src/auth/router.ts
   - POST /api/v1/auth/login → Set-Cookie: session（HttpOnly, Secure, SameSite=Strict）
   - POST /api/v1/auth/logout → 清 cookie
   - GET  /api/v1/auth/me → 回傳 viewer
   - GET  /api/v1/auth/csrf → 回傳 csrfToken

2. api/src/app/auth.ts
   - getSessionUser(c): 從 cookie 讀 session（取代 X-Demo-User-Id）
   - 保留 requirePermission() 不動

前端工作（apps/web）：
3. lib/api/client.ts（完整版）
   - credentials: 'include'
   - CSRF token 附加
   - AppApiError

4. lib/auth/context.tsx
   - AuthContext（viewer, isLoading）
   - useAuth hook

5. features/auth/LoginPage.tsx
   - email + password form（RHF + Zod）
   - submit → POST /api/v1/auth/login
   - 成功 → redirect to /workspace 或 redirect param

6. routes/guards/AuthGuard.tsx（完整）
7. routes/layouts/AppLayout.tsx（sidebar shell 從 v3/assets/shell.js 參考）
8. routes/layouts/ProjectLayout.tsx（ProjectContext）
9. routes/layouts/PublicLayout.tsx

10. components/ResourceStateBoundary.tsx
    - state: "loading" | "empty" | "error" | "forbidden" | "archived" | "not-found"
    從 v3/assets/components.js 的 ResourceState 參考

11. components/PermissionGate.tsx
    - <PermissionGate action="create_relationship">...</>
    從 v3/assets/shell.js 的 can() 參考 action 名稱
```

**驗收：** 可登入，AuthGuard 攔截未登入，看到 AppLayout shell。

---

### Phase 1-B — Contracts（完整 Batch 1 範圍）

```
packages/contracts/src/ 加入：
- project.ts
- character.ts
- project-character-link.ts
- world-entry.ts
- relationship.ts
- relationship-layout.ts

每個檔案：XxxSchema, Xxx, CreateXxx, PatchXxx, XxxResponse, XxxListResponse
```

---

### Phase 1-C — Character

```
contracts: character.ts ✓（Phase 1-B）

features/characters/api.ts
  - list(): GET /api/app/characters
  - get(id): GET /api/app/characters/:id
  - create(body): POST /api/app/characters
  - patch(id, body): PATCH /api/app/characters/:id

features/characters/hooks.ts
  - useCharacters()
  - useCharacter(id)
  - useCreateCharacter()
  - useUpdateCharacter(id)

features/account/MyCharactersPage.tsx
  - list + search（client-side filter）
  - link to /characters/:id

features/characters/CharacterDetailPage.tsx
  - 顯示角色資訊
  - edit button → /characters/:id/edit

features/characters/CharacterEditorPage.tsx
  - create / edit form（RHF + Zod）
  - submit → create 或 patch
```

---

### Phase 1-D — Projects

```
features/projects/api.ts
  - list(): GET /api/app/projects
  - get(id): GET /api/app/projects/:id
  - create(body): POST /api/app/projects
  - patch(id, body): PATCH /api/app/projects/:id

features/projects/hooks.ts
  - useProjects()
  - useProject(id)（ProjectContext 使用）
  - useCreateProject()
  - useUpdateProject(id)

features/account/WorkspacePage.tsx
  - my projects list
  - create project button

features/account/MyProjectsPage.tsx

features/projects/ProjectOverviewPage.tsx
  - project meta + members + enabled features

features/projects/ProjectSettingsPage.tsx
  - edit name, description, visibility
  - toggle enabledFeatures
```

---

### Phase 1-E — Roster

```
features/project-characters/api.ts
  - list(pid)
  - get(pid, linkId)
  - create(pid, body)
  - patch(pid, linkId, body)
  - remove(pid, linkId)

features/project-characters/hooks.ts

features/project-characters/RosterPage.tsx
  - 列表 + 搜尋
  - 新增角色連結（選擇已有角色）

features/project-characters/ProjectCharacterDetailPage.tsx
features/project-characters/ProjectCharacterEditorPage.tsx
```

---

### Phase 1-F — Worldview

```
features/worldview/api.ts（list, get, create, patch, remove）
features/worldview/hooks.ts
features/worldview/WorldviewPage.tsx
features/worldview/WorldEntryDetailPage.tsx
  - create / edit / archive / delete（PermissionGate）
```

---

### Phase 1-G — Relationships

```
features/relationships/api.ts（list, get, create, patch, remove, getLayout, patchLayout）
features/relationships/hooks.ts

features/relationships/RelationshipsPage.tsx
  - 關係列表（依 v3/pages/relationships.html 視覺）
  - 新增 / 編輯 / 刪除（PermissionGate）
  - layout 位置保存（drag 後 patchLayout）
  - RelationshipMap 元件（canvas / SVG 圖）
```

---

### Phase 1-H — 收尾

```
1. 移除 Demo Auth（api/src/demo/ 封存）
2. security headers middleware（CSP, X-Frame-Options）
3. Security checklist（09-security-baseline）逐項確認
4. API integration tests for Batch 1 endpoints
5. 關鍵 E2E 測試（登入 → 建角色 → 建企劃 → 新增關係）
6. `_archive/app/` 對應 screen 標記廢棄
```

---

## 依賴圖（什麼之前要完成什麼）

```
腳手架（0-A）
    │
    ├── Contracts（1-B）
    │       │
    │       ├── Auth（1-A）←── 必須最先
    │       │       │
    │       │       └── Character（1-C）
    │       │       └── Projects（1-D）
    │       │               │
    │       │               ├── Roster（1-E）
    │       │               ├── Worldview（1-F）
    │       │               └── Relationships（1-G）
    │       │                           │
    │       └──────────────────── 收尾（1-H）
```

---

## 估計工作量（參考）

| Phase | 工作量 |
|-------|--------|
| 0-A 腳手架 | 1–2 天 |
| 1-A Auth | 1–2 天 |
| 1-B Contracts | 半天 |
| 1-C Character | 1 天 |
| 1-D Projects | 1 天 |
| 1-E Roster | 1 天 |
| 1-F Worldview | 半天 |
| 1-G Relationships | 1–2 天（關係圖 UI 複雜）|
| 1-H 收尾 | 半天 |
| **合計** | **~8–10 天** |

---

## 完成標準

- [ ] 可用 email/password 登入，session 為 HttpOnly cookie
- [ ] 工作台顯示真實資料（API，不是 OCData）
- [ ] 可建立角色、企劃、世界觀詞條
- [ ] 關係圖可新增 / 編輯 / 刪除，位置可保存
- [ ] PermissionGate 依 role 正確顯示 / 隱藏操作
- [ ] sessionStorage 中沒有任何 token
- [ ] Demo auth 已移除（api/src/demo/ 封存）
- [ ] 所有端點有 integration test
- [ ] E2E smoke test pass
