# Cross-Page Connections — Architecture Notes

## 全局原則

系統裡有四條「通用橋樑」表，任何兩個實體都可以透過它們連結：

| 表 | 用途 | 關鍵欄 |
|----|------|--------|
| `entity_links` | 任意實體之間的語意關聯（角色↔世界觀、章節↔角色…） | `source_type / source_id / target_type / target_id / relation_type` |
| `asset_links` | 任意實體的圖片相簿 | `target_type / target_id / role` |
| `relationship_layouts` | 關係圖的節點位置（fractional 0–1） | `project_id / scope / layout_json` |
| `relationships.group_id` → `relationship_groups` | 把關係歸群（圓圈/陣營） | migration 0003 |

---

## 頁面連結地圖

```
RelationshipsPage
  ├── 節點可以是 Character 或 WorldEntry (sourceType/targetType)
  │     → 點 WorldEntry 節點 → WorldviewPage?e=:id
  │     → 點 Character 節點 → focus該角色的關係
  ├── album → asset_links(target_type='relationship', target_id=relId)
  │     → 圖片實際存在 GalleryPage
  └── group album → asset_links(target_type='relationship_group', target_id=groupId)

WorldviewPage
  ├── entry.chars → entity_links(source_type='world_entry', target_type='character')
  ├── entry.rels  → entity_links(source_type='world_entry', target_type='world_entry')
  ├── entry.gallery → asset_links(target_type='world_entry', target_id=entryId)
  └── 「相關關係」badge → RelationshipsPage?focus=:worldEntryId  ← 未來功能

StoryPage
  ├── chapter.chars → entity_links(source_type='story_chapter', target_type='character')
  ├── chapter.world → entity_links(source_type='story_chapter', target_type='world_entry')
  │     → 點 wchip → WorldviewPage?e=:id
  └── chapter.gallery → asset_links(target_type='story_chapter', target_id=chapterId)

RosterPage (character in project)
  └── 深連結到關係圖：RelationshipsPage?focus=:characterId

GalleryPage
  └── 圖片可以 tag 到：character / world_entry / relationship / story_chapter
        via asset_links.target_type + target_id
```

---

## 分開處理 vs 關聯處理

| 功能 | 策略 | 原因 |
|------|------|------|
| Relationship `timeline` | **分開存** — JSON inline on `relationships` | 這是「關係本身的事件」，不是故事章節，不需要跨頁 |
| Relationship `album` | **關聯 Gallery** — `asset_links` join | 相簿圖片同時存在 GalleryPage，可以被其他頁面也 tag 到同一張圖 |
| WorldEntry 在關係圖上的節點 | **關聯 Worldview** — `source_type='world_entry'` | 同一份資料，不複製 |
| StoryChapter 的角色/世界觀標記 | **關聯** — `entity_links` | 故事章節不擁有角色資料，只是「引用」 |
| RelationshipGroup | **分開** — 獨立 `relationship_groups` 表 | 群組有自己的名稱/顏色/描述/timeline，不適合放在 entity_links |
| `src_view` / `tgt_view` | **分開存** — inline on `relationships` | 這是這條關係的文字描述，和其他頁面無關 |

---

## API 缺口（migration 0003 補齊）

### `relationships` 新欄位
```sql
src_view TEXT     -- source 眼中的 target（不對稱視角）
tgt_view TEXT     -- target 眼中的 source
map_style TEXT    -- 'line' | 'arrows'（地圖邊線顯示方式）
```

### 新表 `relationship_groups`
```sql
id, project_id, name, color,
description, member_ids_json,
timeline_json, sort_order,
created_by_user_id, created_at, updated_at
```

### Contracts 已更新（`relationship.ts`）
- `RelationshipSchema` 加入 `srcView`, `tgtView`, `mapStyle`, `timeline`, `albumAssetIds`, `groupId`
- 新增 `RelationshipGroupSchema`, `CreateRelationshipGroupSchema`
- `RelationshipListResponse` 加入 `groups[]`

---

## 待實作的 API 路由

| Method | Path | 說明 |
|--------|------|------|
| `GET`  | `/api/app/projects/:id/relationships` | 已有，需補 groups + album join |
| `POST` | `/api/app/projects/:id/relationships` | 已有，需補新欄位 |
| `PATCH`| `/api/app/projects/:id/relationships/:relId` | 已有，需補新欄位 |
| `GET`  | `/api/app/projects/:id/relationship-groups` | **缺** |
| `POST` | `/api/app/projects/:id/relationship-groups` | **缺** |
| `PATCH`| `/api/app/projects/:id/relationship-groups/:gid` | **缺** |
| `DELETE`| `/api/app/projects/:id/relationship-groups/:gid` | **缺** |

## 待實作的 UI 功能（依優先度）

1. **v2 關係地圖** — entity 節點（世界觀）、group 橢圓、非對稱邊線
2. **Relationship pair-card** — `srcView`/`tgtView` 雙視角卡、album thumbnails、timeline
3. **WorldviewPage** — entry detail 顯示「關聯關係」（哪些關係的節點是這個條目）
4. **RosterPage** — character 列顯示「關係數量」badge，點進去深連結到關係圖
5. **StoryPage** — 章節 entity_links 顯示關聯角色/世界觀 chips
6. **GalleryPage** — 圖片詳情顯示被 tag 到哪些關係/章節/條目
