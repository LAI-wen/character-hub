# 建議目錄結構

**Date:** 2026-06-11

---

## 頂層（Monorepo）

```
oc-tools/
├── apps/
│   └── web/                 ← 正式 React 前端（本文重點）
├── api/                     ← Hono Worker（現有，逐步重構）
├── packages/
│   ├── contracts/           ← Zod schemas（前後端共用）
│   └── ui/                  ← 共用 React 元件
├── v3/                      ← Design prototype（唯讀）
├── _archive/                ← 封存舊版本
├── docs/
│   ├── architecture/        ← 本系列文件
│   ├── analysis/
│   └── reports/
└── README.md
```

---

## apps/web/

```
apps/web/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── package.json
│
├── public/
│   └── favicon.ico
│
└── src/
    ├── main.tsx             ← 啟動點，掛 providers
    ├── App.tsx              ← Router + QueryClient + Auth provider
    │
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts        ← typed fetch wrapper（no axios）
    │   │   ├── errors.ts        ← AppApiError + error code map
    │   │   └── index.ts
    │   ├── auth/
    │   │   ├── context.tsx      ← AuthContext（viewer, login, logout）
    │   │   └── hooks.ts         ← useAuth, useViewer
    │   ├── query/
    │   │   └── client.ts        ← QueryClient 設定（retry, staleTime）
    │   └── utils/
    │       ├── cn.ts            ← className merge
    │       └── format.ts        ← date, number formatters
    │
    ├── routes/
    │   ├── index.tsx            ← createBrowserRouter（全部 routes）
    │   ├── guards/
    │   │   ├── AuthGuard.tsx    ← 未登入 → /login
    │   │   └── ScopeGuard.tsx   ← 無 projectId → fallback
    │   └── layouts/
    │       ├── AppLayout.tsx    ← sidebar + topbar shell
    │       ├── ProjectLayout.tsx← project context provider + nav
    │       └── PublicLayout.tsx ← 公開頁 layout（無 sidebar）
    │
    ├── features/
    │   │
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   └── hooks.ts
    │   │
    │   ├── account/
    │   │   ├── WorkspacePage.tsx         ← 工作台
    │   │   ├── MyCharactersPage.tsx      ← 我的角色
    │   │   ├── MyProjectsPage.tsx        ← 我的企劃
    │   │   └── hooks.ts
    │   │
    │   ├── characters/
    │   │   ├── CharacterDetailPage.tsx
    │   │   ├── CharacterEditorPage.tsx
    │   │   ├── components/
    │   │   │   ├── CharacterCard.tsx
    │   │   │   └── CharacterForm.tsx
    │   │   ├── hooks.ts                  ← useCharacter, useUpdateCharacter
    │   │   └── api.ts                    ← typed API calls
    │   │
    │   ├── projects/
    │   │   ├── ProjectOverviewPage.tsx
    │   │   ├── ProjectSettingsPage.tsx
    │   │   ├── components/
    │   │   │   └── ProjectCard.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   │
    │   ├── project-characters/
    │   │   ├── RosterPage.tsx
    │   │   ├── ProjectCharacterDetailPage.tsx
    │   │   ├── ProjectCharacterEditorPage.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   │
    │   ├── worldview/
    │   │   ├── WorldviewPage.tsx
    │   │   ├── WorldEntryDetailPage.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   │
    │   ├── relationships/
    │   │   ├── RelationshipsPage.tsx
    │   │   ├── components/
    │   │   │   ├── RelationshipMap.tsx
    │   │   │   └── RelationshipCard.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   │
    │   ├── story/              ← Batch 2+
    │   ├── gallery/            ← Batch 2+
    │   ├── public-page/        ← Batch 3+
    │   ├── applications/       ← Batch 3+
    │   └── submissions/        ← Batch 3+
    │
    ├── components/
    │   ├── ResourceStateBoundary.tsx   ← loading/empty/error/forbidden/archived
    │   ├── PermissionGate.tsx          ← action-level UI gate
    │   ├── ErrorBoundary.tsx
    │   └── Toaster.tsx
    │
    └── styles/
        ├── tokens.css               ← 從 v3/assets/ds.css 搬入
        └── global.css
```

---

## packages/contracts/

```
packages/contracts/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── common.ts            ← 共用 types（Visibility, Role, Direction...）
    ├── errors.ts            ← ApiErrorCode enum + ErrorResponse schema
    ├── project.ts           ← ProjectSchema, CreateProjectSchema...
    ├── character.ts
    ├── project-character-link.ts
    ├── world-entry.ts
    ├── relationship.ts
    ├── relationship-layout.ts
    ├── story.ts             ← 預留
    ├── asset.ts             ← 預留
    └── public-page.ts       ← 預留
```

---

## packages/ui/

```
packages/ui/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── Button.tsx
    ├── Input.tsx
    ├── Textarea.tsx
    ├── Select.tsx
    ├── Badge.tsx            ← pill/chip
    ├── Avatar.tsx
    ├── Card.tsx
    ├── Modal.tsx
    ├── Drawer.tsx
    ├── Toast.tsx
    ├── Spinner.tsx
    └── tokens.css           ← 與 apps/web 共用 token source
```

---

## api/（漸進重構方向）

```
api/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── middleware/
│   ├── auth/
│   ├── app/
│   │   ├── auth.ts          ← 現有（保留）
│   │   ├── db.ts            ← 現有（保留）
│   │   ├── http.ts          ← 現有（保留）
│   │   ├── router.ts        ← 現有（逐步拆檔）
│   │   ├── projects.ts      ← 未來從 router.ts 拆出
│   │   ├── characters.ts    ← 未來拆出
│   │   ├── relationships.ts ← 未來拆出
│   │   └── world-entries.ts ← 未來拆出
│   └── demo/
├── migrations/
├── seeds/
└── test/
```

---

## 工具鏈設定

| 工具 | 設定位置 |
|------|---------|
| Vite | `apps/web/vite.config.ts` |
| TypeScript | `tsconfig.json` per package |
| ESLint | root `eslint.config.js` |
| Prettier | root `.prettierrc` |
| Package manager | pnpm workspaces（建議）或 npm workspaces |

Monorepo 管理工具：先不上 Turborepo，等 packages 超過 3 個再評估。
