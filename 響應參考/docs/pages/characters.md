# 我的角色 / 企劃角色 Characters

## 1. Route
- Account：`/app/characters`、`/app/characters/:characterId`
- Project：`/app/projects/:projectId/characters`、`.../characters/:linkId`

## 2. Scope
Account（全域角色庫）＋ Project（企劃角色名冊）

## 3. 主要使用者
Owner / Host / Cohost / Participant

## 4. 頁面目標
管理帳號層角色本體，以及角色在特定企劃中的版本（陣營/職位/審核狀態）。

## 5. Query
- 帳號庫：`CharacterRepository.listCharacters()` → `GET /api/app/characters` → `{ characters, nextCursor }`
- 企劃名冊：`CharacterRepository.listProjectCharacters(projectId)` → `GET /api/app/projects/:projectId/characters` → `{ roster:[{projectLink,character}], nextCursor }`
- 單一連結：`getProjectCharacterLink(projectId, linkId)`（:linkId 是 ProjectCharacterLink id，非 characterId）

## 6. Mutation
- 更新角色本體：`updateCharacter(characterId, patch)`（owner only，永不寫入企劃欄位）
- 加入企劃：`linkCharacterToProject(projectId, {characterId,...})`（權限 project_character:create；CONFLICT 若已連結）
- 更新企劃連結：`updateProjectCharacterLink(projectId, linkId, patch)`（永不寫入本體）
- 移除：`removeProjectCharacterLink(projectId, linkId)`（soft delete status='removed'）

## 7. UI 結構
- Header / ContextHeader / Toolbar（篩選 status）
- 主內容：角色網格；點選 → DetailPanel
- Actions：＋ 新角色（一個 primary）

## 8. 狀態
Loading skeleton / Empty（「這個企劃還沒有角色，從你的角色庫加入。」）/ Error / Forbidden(非成員)/ Saving / Saved / Delete confirm

## 9. Responsive
Desktop master-detail / Tablet 收合 detail / Mobile 全頁卡片 + bottom sheet

## 10. Accessibility
網格鍵盤巡覽、DetailPanel focus trap、Esc 關閉

## 11. Data Gaps
- HARD RULE：Character body 與 ProjectCharacterLink 必須分離（已在 repository 強制）
- API write missing：mutation 為 mock session-scoped
- 完整角色 Editor 尚未產品化

## 12. QA Tasks
- 同一角色在兩個企劃可有不同連結
- updateCharacter 不影響 link 欄位，反之亦然
- 移除為 soft delete，名冊不再顯示
