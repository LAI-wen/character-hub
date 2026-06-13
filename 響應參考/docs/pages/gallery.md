# 圖庫 Gallery  —  狀態：MOCK_BACKED

## 1. Route
`/app/projects/:projectId/gallery`

## 2. Scope
Project

## 3. 主要使用者
Owner / Host / Cohost（asset:create/update）

## 4. 頁面目標
管理圖片資產的中繼資料與其與角色/條目/故事的關聯。

## 5. Query
- `GalleryRepository.listGalleryItems(projectId)` → `{ assets, assetLinks, nextCursor }`（**尚未接 API**）

## 6. Mutation
- `createGalleryItem`(metadata-first) / `updateGalleryItem`；R2 upload/finalize 另規劃。

## 7. UI 結構
ContextHeader / 篩選(assetType) / 圖磚網格 / 燈箱 / DetailPanel

## 8. 狀態
Loading(skeleton cards) / Empty / Error / Forbidden / Uploading / Saved

## 9. Responsive
Desktop 多欄 / Mobile 兩欄

## 10. Accessibility
圖磚 alt、燈箱 focus trap + Esc、鍵盤左右切換

## 11. Data Gaps
- PERSISTENCE / API：R2 upload、Asset、AssetLink 尚未接
- 縮圖、visibility 規則待定

## 12. QA Tasks
- 待 R2/Asset API：上傳 → 連結角色 → visibility 裁切
