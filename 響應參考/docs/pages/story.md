# 故事 Story  —  狀態：MOCK_BACKED

## 1. Route
`/app/projects/:projectId/story`

## 2. Scope
Project

## 3. 主要使用者
Owner / Host / Cohost（story:create/update）

## 4. 頁面目標
管理故事、章節與時間線事件。

## 5. Query
- `StoryRepository.listStories(projectId)` → `GET /api/app/projects/:projectId/stories`（**尚未接 API**）

## 6. Mutation
- `createStory / updateStory`；Chapter/StoryEvent 端點在 schema 內但前端方法尚未建立。

## 7. UI 結構
ContextHeader / 故事清單 / 章節編輯 / 事件時間線

## 8. 狀態
Loading / Empty / Error / Forbidden / Saving / Saved

## 9. Responsive
Desktop 雙欄 / Mobile 單欄

## 10. Accessibility
章節列表鍵盤巡覽

## 11. Data Gaps
- DATA-01 / API-READ / API-WRITE：Story/Chapter/Event API 尚未接
- story_events 關聯應走 EntityLink，不可 inline JSON

## 12. QA Tasks
- 待 API 接上後補：建立故事 → 章節 → 事件 roundtrip
