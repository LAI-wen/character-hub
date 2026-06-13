# Frontend Data Contract Decisions

版本：v0.1  
範圍：目前 `app/` 前端資料操作層與後續 API / D1 設計的銜接決策。  
狀態：前端 skeleton 第一版採用 mock/localStorage，正式後端尚未接入。

---

## 1. RelationshipLayout 第一版存 Project Scope

第一版 `RelationshipLayout` 視為企劃資料：

```ts
RelationshipLayout {
  projectId
  scope: "project"
  nodes
  labels
  paths
  groups
  updatedAt
}
```

理由：

- 關係圖是企劃內容的一部分，不只是某個使用者的觀看偏好。
- 公開頁或共創成員需要看到同一份基準布局。
- 未來若要支援個人視圖，可再加 `UserRelationshipLayoutOverride`，不要一開始混在主資料裡。

---

## 2. ContentSubmission 補 Destination

`ContentSubmission` 通過審核後必須記錄落點：

```ts
ContentSubmission {
  id
  projectId
  type: "image" | "text"
  status
  destinationType: "gallery" | "story" | "publication" | null
  destinationId: string | null
}
```

理由：

- 圖片投稿通過後進 Gallery / Asset。
- 文章投稿通過後進 Story / Publication。
- 審核紀錄需要能回查「這份投稿最後收去哪裡」，不能只留下 approved 狀態。

---

## 3. WorldEntry 關聯正式用 EntityLink

`WorldEntry` 正式關聯角色與其他條目時，使用 `EntityLink`：

```ts
EntityLink {
  projectId
  sourceType: "world_entry"
  sourceId
  targetType: "character" | "world_entry" | "story_event" | "asset"
  targetId
  relationType
  label
  sortOrder
}
```

UI 可以保留 summary cache，例如 `relatedCharacters` / `relatedEntries`，用於卡片快速顯示；但 source of truth 應該是 `EntityLink`。

理由：

- 世界觀、角色、故事事件、圖片之間都會互相關聯。
- 用同一個 link model 比把 id array 分散到各表更容易查詢與維護。

---

## 4. Public Page Block 第一版用 JSON Versioning

Public Page Builder 第一版不拆 `public_page_blocks` table。先用 draft JSON 與 published version JSON：

```ts
PublicPageDraft {
  projectId
  blocksJson
  themeJson
  settingsJson
  updatedAt
}

PublicPageVersion {
  projectId
  versionNumber
  payloadJson
  publishedAt
}
```

理由：

- 目前公開頁 Builder 的主要需求是排序、隱藏、發布版本。
- JSON draft 可以快速保留版面配置，不必過早把 block table 正規化。
- 當公開頁出現多人同時編輯、block 細粒度權限、block 級審計紀錄時，再拆獨立 table。
