# 工作台 Account Home

## 1. Route
`/app` (`#/app`)

## 2. Scope
Account

## 3. 主要使用者
Owner（帳號擁有者本人）

## 4. 頁面目標
讓使用者一眼看到自己的全部企劃、最近瀏覽與待辦，並快速進入任一企劃或工具。

## 5. Query
- `ProjectRepository.listProjects()` → `GET /api/app/projects` → `{ projects, nextCursor }`
- 衍生統計（角色數/待審）為 Derived data，由 `getProject().stats` 計算，不可寫回。

## 6. Mutation
- 建立企劃：`ProjectRepository.createProject(input)` → `POST /api/app/projects` → `{ project, membership }`
  - 權限：`authenticated`；成功 → toast + 導向新企劃總覽；失敗 → CONFLICT(slug 重複) 顯示欄位錯誤。

## 7. UI 結構
- Header：ContextHeader(scope=account, page=工作台)
- 主內容：企劃網格（EntityCard）、最近瀏覽列、待辦摘要
- Actions：＋ 建立企劃（一個 primary）

## 8. 狀態
- Loading：LoadingSkeleton(cards)
- Empty：「你還沒有任何企劃。建立第一個來放角色與世界觀。」[建立企劃]
- Error：ErrorState + 重試
- Forbidden：N/A（帳號本人）
- Saving / Saved：建立企劃時 runMutation 控制

## 9. Responsive
Desktop 多欄網格／Tablet 兩欄／Mobile 單欄 + 底部導覽

## 10. Accessibility
卡片可 Tab、focus ring、⌘K 搜尋、reduced-motion

## 11. Data Gaps
- API write missing：createProject 仍為 mock（session-scoped）
- Persistence missing：重新整理後新建企劃不保留（需 localStorage/ API 落地）

## 12. QA Tasks
- 建立企劃後出現在網格、可進入
- slug 重複回 CONFLICT
- 空狀態文案正確
