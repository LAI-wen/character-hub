# 關係圖 Relationships

## 1. Route
`/app/projects/:projectId/relationships`

## 2. Scope
Project

## 3. 主要使用者
Owner / Host / Cohost（寫）；Participant（讀）

## 4. 頁面目標
以畫布呈現實體之間的正式關係，並維護關係內容與畫布配置。

## 5. Query
- `RelationshipRepository.listRelationships(projectId)` → `{ relationships, nextCursor }`（含 resolved source/target）
- `RelationshipRepository.getRelationshipLayout(projectId)` → `{ layout }`（project scope）

## 6. Mutation
- `createRelationship / updateRelationship / deleteRelationship`（soft delete）
- `updateRelationshipLayout(projectId, {nodes,labels,paths,groups})`
  - **永不**儲存 selected/hover/lightbox/focus（UI-only，§7）

## 7. UI 結構
- ContextHeader / 畫布(node 拖曳) / 關係卡 DetailPanel / Toolbar
- Actions：＋ 新關係

## 8. 狀態
Loading / Empty(無關係) / Error / Forbidden / Saving(布局) / Saved / Delete confirm

## 9. Responsive
Desktop 畫布 / Mobile 清單檢視（畫布唯讀縮放）

## 10. Accessibility
node 可鍵盤聚焦、關係清單為無障礙替代、reduced-motion

## 11. Data Gaps
- Browser 完整 QA、layout 清理需補
- Relationship 的 demo 相容欄位(title/desc/chip)不可成為 DB 欄位

## 12. QA Tasks
- 新增關係立即出現於畫布與清單
- 拖曳 node 後 layout 持久（roundtrip）
- 重新整理後 UI 選取狀態不持久（正確）
