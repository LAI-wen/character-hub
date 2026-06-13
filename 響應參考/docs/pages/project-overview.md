# 企劃總覽 Project Overview

## 1. Route
`/app/projects/:projectId`

## 2. Scope
Project

## 3. 主要使用者
Owner / Host / Cohost / Participant

## 4. 頁面目標
企劃的首頁：摘要統計、最近活動、各模組快捷入口。

## 5. Query
- `ProjectRepository.getProject(projectId)` → `{ project, viewerRole, stats }`
- `ProjectRepository.sidebar(projectId)`（capability + role 推導導覽）

## 6. Mutation
- 編輯企劃：`updateProject(projectId, patch)`（capability 變更需 manage_settings；可能改變導覽）

## 7. UI 結構
- ContextHeader(scope=project) / 統計卡 / 最近活動 / 模組捷徑

## 8. 狀態
Loading / Empty(新企劃) / Error / Forbidden(非成員=403, 不偽裝 404)

## 9. Responsive
Desktop 多欄 / Mobile 單欄

## 10. Accessibility
捷徑可 Tab、對比達標、reduced-motion

## 11. Data Gaps
- 部分快捷操作仍是 Demo UI
- stats 為 Derived，需後端確認計算口徑

## 12. QA Tasks
- 不同 capability 組合導覽正確（見 smoke-test 3–5）
- 非成員回 403
