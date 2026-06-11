# ADR-001 · Frontend Architecture Decision

**Status:** Proposed  
**Date:** 2026-06-11  
**Context:** CharacterHub 需要正式前端，取代 `app/`（vanilla JS SPA）與 `v3/`（靜態 HTML 設計原型）。

---

## 問題

目前沒有可直接投入生產的前端。`app/` 有 API 串接但架構脆弱；`v3/` 有高品質 UI 設計但全是 mock 資料。需要做一個架構決策：用什麼技術棧建立正式前端，如何從現在的狀態漸進遷移過去。

---

## 決策

採用以下技術棧，建立新的 `apps/web`：

| 層級 | 選擇 | 理由 |
|------|------|------|
| UI framework | **React 18** | Ecosystem 最成熟、TanStack 原生支援、TypeScript 型別完整 |
| Build tool | **Vite** | 快、HMR、支援 ES modules、worker 友好 |
| Language | **TypeScript strict** | 強迫 API boundary 有型別、早期發現 field name mismatch |
| Routing | **React Router v6** (Data Router) | 原生 loader/action、nested route、支援 error boundary per route |
| Server state | **TanStack Query v5** | 快取失效、背景更新、mutation → 自動 refetch、deduplication |
| Forms | **React Hook Form + Zod** | Zod schema 與 contracts package 共用 |
| Shared contracts | **packages/contracts** (Zod) | 前後端共用 request/response schema，API boundary 一次定義 |
| Styling | **CSS Modules + v3 design tokens** | v3 的 `ds.css` token 直接搬、不依賴 CSS-in-JS runtime |
| UI components | **packages/ui** | 從 v3 原型提取，TypeScript React 版本 |

---

## 替代方案與否決理由

| 方案 | 否決理由 |
|------|---------|
| 原地升級 `app/` 為 TypeScript | router 與 render 系統需整個重寫；沒有 React → TanStack Query 難用 |
| Next.js | Cloudflare Workers 部署 friction 高；SSR 對這個 app 沒必要；App Router 學習成本 |
| SvelteKit | 生態系統比 React 小；v3 prototype 已是 HTML/JS 沒有 Svelte 資產可用 |
| Vue 3 | 無特殊優勢；Zod + TanStack 支援較差 |
| 直接把 `v3/` 搬成 React | `v3/` 是 prototype，資料層假設（OCData/OCDemo）不能帶進正式 |

---

## Monorepo 結構

```
oc-tools/
├── apps/
│   ├── web/               ← 新正式前端（本 ADR 的目標）
│   └── api/               ← 現有 Hono Worker（原 api/）
├── packages/
│   ├── contracts/         ← Zod schemas（前後端共用）
│   └── ui/                ← 共用 React 元件
├── v3/                    ← Design prototype（唯讀參考，不改）
├── app/                   ← 舊前端（暫時並存，逐步廢棄）
└── docs/
    └── architecture/      ← 本文件所在
```

---

## 漸進遷移原則

1. `apps/web` 與 `app/` **並存**，不做 Big Bang Rewrite。
2. 每個 Batch 完成後，`apps/web` 接管對應功能；`app/` 對應頁面廢棄。
3. `v3/` 永遠只作為 UI/UX 規格，不引入其資料層假設。
4. API 端維持現有 Hono Worker 結構，不動 `api/` 的路由設計。

---

## 不做的事（本 ADR 範圍外）

- 生產環境部署
- SSR / RSC
- Micro-frontend 架構
- GraphQL
- WebSocket 即時協作
- React Native / Mobile
