# 公開頁 Public Page  —  狀態：MOCK_BACKED / Renderer DESIGN_ONLY

## 1. Route
- Builder：`/app/projects/:projectId/manage/public-page`
- Renderer：`/p/:projectSlug`（不同 route，§2.4）

## 2. Scope
Project（Builder）＋ Public（Renderer）

## 3. 主要使用者
Owner / Host（public_page:update / publish）；Renderer = Visitor

## 4. 頁面目標
編輯公開頁草稿、發布版本；訪客看到裁切後的公開內容。

## 5. Query
- Builder：`PublicPageRepository.getDraft(projectId)` → `{ project, publicPage }`（**尚未接 API**）
- Renderer：`GET /api/public/projects/:slug`（公開 payload，**禁用** workspace payload）
- 目前以 `publicAdapter.publicView(projectId)` 產生 sanitized payload（已過濾 visibility != public 與管理欄位）。

## 6. Mutation
- `savePublicPageDraft(projectId, {blocks,theme,settings})`
- `publishPublicPage(projectId, note?)` → 產生 immutable PublicPageVersion

## 7. UI 結構
Builder：區塊編輯 + 預覽；Renderer：唯讀公開頁

## 8. 狀態
Loading / Empty / Error / Forbidden / Saving(draft) / Published

## 9. Responsive
Builder Desktop-first；Renderer 全裝置

## 10. Accessibility
Renderer 語意標記、對比達標

## 11. Data Gaps
- PUBLIC-SAFETY（P0）：Builder payload 絕不可外洩到 Renderer（已用 sanitizer + smoke-test 6 防護）
- API：Draft/Publish/Renderer API 尚未接
- Renderer 仍 DESIGN_ONLY

## 12. QA Tasks
- smoke-test 6：公開檢視不含 inviteCode/hostNotes/collabMode、不含待審角色
- 只有 visibility=public 的世界觀條目進入 publicView
