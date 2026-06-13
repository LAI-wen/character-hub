# 世界觀 Worldview

## 1. Route
`/app/projects/:projectId/worldview`

## 2. Scope
Project

## 3. 主要使用者
Owner / Host / Cohost / Participant（讀）；world:create/update（寫）

## 4. 頁面目標
建立與維護國家／組織／家族／地點／種族／事件條目，及其互相牽連與連到角色。

## 5. Query
- `WorldviewRepository.listWorldEntries(projectId, {type?,parentId?,visibility?})`
  → `GET /api/app/projects/:projectId/world-entries` → `{ entries, entityLinks, nextCursor }`
- 卡片的 relatedCharacters 為 summary cache；**source of truth 是 EntityLink**。

## 6. Mutation
- `createWorldEntry(projectId, input)`（422 若 parent 循環）
- `updateWorldEntry(projectId, entryId, patch)`（relatedCharacterIds/relatedEntryIds → 寫入 entity_links）

## 7. UI 結構
- ContextHeader / Toolbar(type 篩選) / 階層樹 + 列表 / DetailPanel(編輯表單)
- Actions：＋ 新增條目

## 8. 狀態
Loading / Empty（「這個企劃還沒有世界觀條目。可以先新增一個地點、組織或事件。」[新增條目]）/ Error / Forbidden / Saving / Saved / Delete confirm

## 9. Responsive
Desktop 樹 + detail / Mobile 列表 + 全頁編輯

## 10. Accessibility
樹可鍵盤展開、aria-expanded、focus ring

## 11. Data Gaps
- 正式編輯表單、拖曳階層未完成
- SHAPE：relatedCharacters 必須顯示 name/avatar，id 僅作 key（已 normalize）
- API write missing：mock session-scoped

## 12. QA Tasks
- 新增條目立即顯示；改名後 summary cache 更新
- 設定循環 parent 回 422
- 關聯角色經 EntityLink 雙向可查
