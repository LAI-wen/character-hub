# CharacterHub Frontend ↔ Backend Field Map

版本：v0.1  
目的：把 UI 欄位對應到 Domain 欄位、D1 欄位與 API request/response，避免前端畫面與後端資料模型各自發展。

---

## 0. 對照規則

| 標記 | 意義 |
|---|---|
| UI Field | 前端畫面上的欄位或控制項 |
| Domain Field | TypeScript / domain object 欄位 |
| D1 Field | DB table.column 草案 |
| API | 建議讀寫 endpoint |
| Scope | account / project / project-character / public |
| Writable | 前端是否可修改 |

---

## 1. User / Account

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 顯示名稱 | `UserProfile.displayName` | `user_profiles.display_name` | `PATCH /api/app/me/profile` | account | ✅ | 不等同 login email |
| 帳號 ID / handle | `UserProfile.handle` | `user_profiles.handle` | `PATCH /api/app/me/profile` | account | ✅ | 需唯一性檢查 |
| 個人簡介 | `UserProfile.bio` | `user_profiles.bio` | `PATCH /api/app/me/profile` | account | ✅ | 需長度限制 |
| 頭像 | `UserProfile.avatarAssetId` | `user_profiles.avatar_asset_id` | `PATCH /api/app/me/profile` | account | ✅ | Asset 必須 owner 可用 |
| 外觀主題 | `UserPreferences.theme` | `user_preferences.theme` | `PATCH /api/app/me/preferences` | account | ✅ | demo 可 localStorage |
| Sidebar 收合 | `UserPreferences.sidebarCollapsed` | `user_preferences.sidebar_collapsed` | `PATCH /api/app/me/preferences` | account | ✅ | 可延後同步 |
| Section collapse | `UserPreferences.sidebarSections` | `user_preferences.sidebar_sections_json` | `PATCH /api/app/me/preferences` | account | ✅ | JSON |

---

## 2. Project

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 企劃名稱 | `Project.name` | `projects.name` | `PATCH /api/app/projects/:projectId` | project | ✅ | 必填 |
| 企劃網址 Slug | `Project.slug` | `projects.slug` | `PATCH /api/app/projects/:projectId/public-page/slug` | project/public | ✅ | 需唯一性 |
| 企劃簡介 | `Project.description` | `projects.description` | `PATCH /api/app/projects/:projectId` | project | ✅ | 可 markdown/rich text 草案 |
| 封面圖 | `Project.coverAssetId` | `projects.cover_asset_id` | `PATCH /api/app/projects/:projectId` | project | ✅ | AssetLink 可選 |
| 代表色 | `Project.themeColor` | `projects.theme_color` | `PATCH /api/app/projects/:projectId` | project | ✅ | 驗證 hex |
| 可見性 | `Project.visibility` | `projects.visibility` | `PATCH /api/app/projects/:projectId/visibility` | project/public | ✅ | private/unlisted/public |
| 協作模式 | `Project.collaborationMode` | `projects.collaboration_mode` | `PATCH /api/app/projects/:projectId/capabilities` | project | ✅ | solo/collaborative |
| 公開頁啟用 | `Project.portalEnabled` | `projects.portal_enabled` | `PATCH /api/app/projects/:projectId/capabilities` | project/public | ✅ | 決定 sidebar PUBLIC |
| 加入方式 | `Project.joinPolicy` | `projects.join_policy` | `PATCH /api/app/projects/:projectId/capabilities` | project | ✅ | closed/invite/application/open |
| 作品投稿 | `Project.submissionsEnabled` | `projects.submissions_enabled` | `PATCH /api/app/projects/:projectId/capabilities` | project | ✅ | 決定 content submission |
| 啟用模組 | `Project.enabledFeatures` | `project_features.feature_key` | `PUT /api/app/projects/:projectId/features` | project | ✅ | 建議獨立表 |
| 角色數 | `ProjectStats.characterCount` | derived | `GET /api/app/projects/:id` | project | ❌ | 後端查詢 |
| 待審核數 | `ProjectStats.pendingReviewCount` | derived | `GET /api/app/projects/:id/navigation` | project | ❌ | 後端查詢 |

建議表：

```sql
projects(id, owner_id, name, slug, description, cover_asset_id, theme_color, visibility, collaboration_mode, portal_enabled, join_policy, submissions_enabled, created_at, updated_at, archived_at)
project_features(project_id, feature_key, enabled, sort_order)
```

---

## 3. Character

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 角色名稱 | `Character.name` | `characters.name` | `PATCH /api/app/characters/:characterId` | account | ✅ | 必填 |
| 羅馬字/英文名 | `Character.romaji` | `characters.romaji` | same | account | ✅ | 可選 |
| 暱稱 | `Character.nickname` | `characters.nickname` | same | account | ✅ | 可選 |
| 種族/身份 | `Character.species` | `characters.species` 或 profile JSON | same | account | ✅ | 可結構化或 JSON |
| 一句話介紹 | `Character.summary` | `characters.summary` | same | account | ✅ | 卡片用 |
| 標籤 | `Character.tags` | `character_tags` | `PUT /api/app/characters/:id/tags` | account | ✅ | 多對多較佳 |
| 代表圖 | `Character.avatarAssetId` | `characters.avatar_asset_id` | `PATCH /api/app/characters/:id` | account | ✅ | Asset owner check |
| 一般設定 | `Character.generalProfile` | `character_profiles.general_json` | `PATCH /api/app/characters/:id/profiles/general` | account | ✅ | JSON 初期可行 |
| 圖設定 | `Character.artistProfile` | `character_profiles.artist_json` | `PATCH /api/app/characters/:id/profiles/artist` | account | ✅ | 色票/禁忌/服裝 |
| 文設定 | `Character.writerProfile` | `character_profiles.writer_json` | `PATCH /api/app/characters/:id/profiles/writer` | account | ✅ | 語氣/背景/關係 |
| 全域可見性 | `Character.visibility` | `characters.visibility` | `PATCH /api/app/characters/:id/share` | public | ✅ | private/unlisted/public |
| 完成度 | `CharacterCompleteness` | derived | `GET /api/app/characters/:id` | account | ❌ | 後端/前端計算皆可，但不持久化 |

建議表：

```sql
characters(id, owner_id, name, romaji, nickname, species, summary, avatar_asset_id, visibility, created_at, updated_at, archived_at)
character_profiles(character_id, general_json, artist_json, writer_json)
character_tags(character_id, tag)
```

---

## 4. ProjectCharacterLink

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 企劃角色狀態 | `ProjectCharacterLink.status` | `project_character_links.status` | `PATCH /api/app/projects/:projectId/characters/:linkId` | project-character | ✅ Host/Owner | approved/pending 等 |
| 陣營 | `ProjectCharacterLink.factionId` | `project_character_links.faction_id` | same | project-character | ✅ | 可為 null |
| 企劃職位 | `ProjectCharacterLink.projectRole` | `project_character_links.project_role` | same | project-character | ✅ | 使用者可填/host 可調 |
| 企劃限定可見性 | `ProjectCharacterLink.visibility` | `project_character_links.visibility` | same | project-character | ✅ | 企劃內/公開 |
| 模板版本 | `ProjectCharacterLink.templateVersionId` | `project_character_links.template_version_id` | same | project-character | ✅ 系統/host | 用於欄位值解析 |
| 自訂欄位值 | `ProjectCharacterLink.fieldValues` | `project_field_values.value_json` | `PUT /api/app/projects/:projectId/characters/:linkId/field-values` | project-character | ✅ | 必須掛 link，不掛 project |
| 審核留言 | `ProjectCharacterLink.reviewMessage` | `project_character_links.review_message` | review endpoints | project-character | ✅ Host | 或存在 application 表 |

建議表：

```sql
project_character_links(id, project_id, character_id, submitted_by, status, faction_id, project_role, visibility, template_version_id, submitted_at, reviewed_at, reviewed_by, review_message)
project_field_values(id, project_character_link_id, field_id, value_json, updated_at)
```

---

## 5. WorldEntry

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 條目名稱 | `WorldEntry.title` | `world_entries.title` | `PATCH /api/app/projects/:projectId/world-entries/:entryId` | project | ✅ |
| 類型 | `WorldEntry.type` | `world_entries.type` | same | project | ✅ | nation/place/org/event/item |
| 上層條目 | `WorldEntry.parentId` | `world_entries.parent_id` | `PATCH /api/app/projects/:projectId/world-entries/:entryId/parent` | project | ✅ | 防循環 |
| 摘要 | `WorldEntry.summary` | `world_entries.summary` | update | project | ✅ |
| 正文設定 | `WorldEntry.content` | `world_entries.content` | update | project | ✅ | 可 markdown |
| 排序 | `WorldEntry.sortOrder` | `world_entries.sort_order` | order endpoint | project | ✅ |
| 可見性 | `WorldEntry.visibility` | `world_entries.visibility` | update | project/public | ✅ |
| 關聯角色 | `EntityLink` | `entity_links` | link endpoint | project | ✅ | source world → character |
| 關聯條目 | `EntityLink` | `entity_links` | link endpoint | project | ✅ | type + relation |

建議表：

```sql
world_entries(id, project_id, type, title, summary, content, parent_id, sort_order, visibility, created_by, created_at, updated_at, archived_at)
entity_links(id, project_id, source_type, source_id, target_type, target_id, relation_type, label, sort_order)
```

---

## 6. Story / Timeline

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 故事名稱 | `Story.title` | `stories.title` | `PATCH /api/app/projects/:projectId/stories/:storyId` | project | ✅ |
| 故事狀態 | `Story.status` | `stories.status` | same | project | ✅ | draft/active/archived |
| 章節名稱 | `StoryChapter.title` | `story_chapters.title` | chapter endpoint | project | ✅ |
| 章節摘要 | `StoryChapter.summary` | `story_chapters.summary` | chapter endpoint | project | ✅ |
| 章節排序 | `StoryChapter.sortOrder` | `story_chapters.sort_order` | order endpoint | project | ✅ |
| 事件名稱 | `StoryEvent.title` | `story_events.title` | event endpoint | project | ✅ |
| 模糊時間 | `StoryEvent.timeLabel` | `story_events.time_label` | event endpoint | project | ✅ | 例如百年前 |
| 排序時間 | `StoryEvent.sortKey` | `story_events.sort_key` | event endpoint | project | ✅ | 可選，用於排序 |
| 關聯 Entity | `EntityLink` | `entity_links` | link endpoint | project | ✅ | 角色、地點、事件 |

建議表：

```sql
stories(id, project_id, title, description, status, visibility, created_at, updated_at)
story_chapters(id, story_id, title, summary, content, sort_order, status)
story_events(id, project_id, story_id, title, summary, time_label, sort_key, visibility)
```

---

## 7. Asset / Gallery

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 檔案 | `Asset.r2Key` | `assets.r2_key` | upload/finalize | asset | ✅ via upload | 不由前端任意指定最終 key |
| 檔名 | `Asset.originalName` | `assets.original_name` | finalize | asset | ✅ |
| MIME | `Asset.mimeType` | `assets.mime_type` | finalize | asset | ❌/validated | 後端驗證 |
| 大小 | `Asset.sizeBytes` | `assets.size_bytes` | finalize | asset | ❌/validated | 後端驗證 |
| 標題 | `Asset.title` | `assets.title` | `PATCH /api/app/assets/:assetId` | asset | ✅ |
| 類型 | `Asset.assetType` | `assets.asset_type` | update | asset | ✅ | portrait/reference/map/comic |
| 作者 | `Asset.authorName` | `assets.author_name` | update | asset | ✅ |
| 來源 | `Asset.sourceUrl` | `assets.source_url` | update | asset | ✅ |
| 可見性 | `Asset.visibility` | `assets.visibility` | update | asset | ✅ |
| 關聯目標 | `AssetLink.targetType/targetId` | `asset_links` | link/unlink | asset/project | ✅ |
| 封面標記 | `AssetLink.role` | `asset_links.role` | set-cover | asset/project | ✅ | cover/reference/gallery |

建議表：

```sql
assets(id, owner_id, r2_key, original_name, mime_type, size_bytes, width, height, title, asset_type, author_name, source_url, visibility, created_at, deleted_at)
asset_links(id, asset_id, project_id, target_type, target_id, role, sort_order)
```

---

## 8. Relationship

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 來源節點 | `Relationship.sourceRef` | `relationships.source_type/source_id` | create/update | project | ✅ |
| 目標節點 | `Relationship.targetRef` | `relationships.target_type/target_id` | create/update | project | ✅ |
| 關係類型 | `Relationship.type` | `relationships.type` | update | project | ✅ |
| 標籤 | `Relationship.label` | `relationships.label` | update | project | ✅ |
| 描述 | `Relationship.description` | `relationships.description` | update | project | ✅ |
| 方向 | `Relationship.direction` | `relationships.direction` | update | project | ✅ | one-way/two-way |
| 群組 | `Relationship.groupId` | `relationships.group_id` | update | project | ✅ |
| 節點位置 | `RelationshipLayout.positions` | `relationship_layouts.layout_json` | layout endpoint | project/user | ✅ | 需決定 scope |

建議表：

```sql
relationships(id, project_id, source_type, source_id, target_type, target_id, type, label, description, direction, group_id, visibility, created_at, updated_at)
relationship_groups(id, project_id, name, color, sort_order)
relationship_layouts(id, project_id, owner_user_id, layout_json, updated_at)
```

---

## 9. Idea / Inspiration

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 靈感內容 | `Idea.content` | `ideas.content` | `PATCH /api/app/ideas/:ideaId` | account/project | ✅ |
| 類型 | `Idea.kind` | `ideas.kind` | update | account/project | ✅ | text/image/link/color |
| 企劃 | `Idea.projectId` | `ideas.project_id` | update | account/project | ✅ | 可 null |
| 標籤 | `Idea.tags` | `idea_tags` | update | account/project | ✅ |
| 狀態 | `Idea.status` | `ideas.status` | update/archive | account/project | ✅ | inbox/converted/archived |
| 轉換目標 | `IdeaConversion.target` | `ideas.converted_to_type/id` | convert endpoint | account/project | ✅ system | 建立正式資料後回填 |

---

## 10. Public Page

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 區塊列表 | `PublicPageDraft.blocks` | `public_page_drafts.blocks_json` | `PUT /api/app/projects/:projectId/public-page/draft` | project/public | ✅ |
| 區塊排序 | `PublicPageBlock.sortOrder` | JSON 或 `public_page_blocks.sort_order` | order endpoint | project/public | ✅ |
| 區塊內容 | `PublicPageBlock.content` | JSON 或 `public_page_blocks.content_json` | update block | project/public | ✅ |
| 主題 | `PublicPageDraft.theme` | `public_page_drafts.theme_json` | save draft | project/public | ✅ |
| Slug | `PublicPage.slug` | `public_pages.slug` | update slug | public | ✅ |
| 發布版本 | `PublicPageVersion.payload` | `public_page_versions.payload_json` | publish | public | ❌ direct | 後端從 draft 產生 |
| 發布狀態 | `PublicPage.publishedAt` | `public_pages.published_at` | publish/unpublish | public | ✅ action | action，不直接 patch |

建議表：

```sql
public_pages(id, project_id, slug, status, published_version_id, created_at, updated_at, published_at)
public_page_drafts(id, project_id, blocks_json, theme_json, settings_json, updated_by, updated_at)
public_page_versions(id, project_id, version_number, payload_json, published_by, published_at)
```

---

## 11. Application / Submission

### Character Application

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 申請角色 | `CharacterApplication.characterId` | `character_applications.character_id` | submit | project | ✅ applicant |
| 企劃欄位值 | `CharacterApplication.fieldValues` | `character_application_values` | submit/update | project | ✅ applicant |
| 申請訊息 | `CharacterApplication.message` | `character_applications.message` | submit | project | ✅ applicant |
| 狀態 | `CharacterApplication.status` | `character_applications.status` | review endpoint | project | ✅ host action |
| 審核回覆 | `CharacterApplication.reviewMessage` | `character_applications.review_message` | review endpoint | project | ✅ host |

### Content Submission

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 作品類型 | `ContentSubmission.type` | `content_submissions.type` | submit | project | ✅ |
| Asset | `ContentSubmission.assetId` | `content_submissions.asset_id` | submit | project | ✅ |
| 文字內容 | `ContentSubmission.textContent` | `content_submissions.text_content` | submit | project | ✅ |
| 相關角色 | `ContentSubmission.relatedCharacterIds` | `content_submission_links` | submit | project | ✅ |
| 狀態 | `ContentSubmission.status` | `content_submissions.status` | review | project | ✅ host action |
| 通過目標 | `ContentSubmission.destination` | `content_submissions.destination_json` | approve | project | ✅ host | Gallery / Story |

---

## 12. Participant / Permission

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 成員 | `ProjectMember.userId` | `project_members.user_id` | member endpoints | project | ❌ direct | 由 invite/accept 建立 |
| 角色 | `ProjectMember.role` | `project_members.role` | update role | project | ✅ owner/host | owner/host/cohost/member |
| 權限覆寫 | `ProjectMember.permissions` | `project_member_permissions` | update role/permissions | project | ✅ owner | 可後期再做 |
| 邀請連結 | `ProjectInvite.token` | `project_invites.token_hash` | invite endpoints | project | ✅ host | token 只顯示一次 |
| 封鎖 | `ProjectBan.userId` | `project_bans.user_id` | ban endpoint | project | ✅ host |

建議表：

```sql
project_members(id, project_id, user_id, role, status, joined_at, removed_at)
project_invites(id, project_id, created_by, token_hash, role, expires_at, max_uses, uses)
project_bans(id, project_id, user_id, reason, created_by, created_at)
```

---

## 13. Wishlist / Commission

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| Wishlist 標題 | `WishlistItem.title` | `wishlist_items.title` | wishlist endpoint | account | ✅ |
| Wishlist 類型 | `WishlistItem.type` | `wishlist_items.type` | update | account | ✅ |
| 預算 | `WishlistItem.budget` | `wishlist_items.budget` | update | account | ✅ |
| 優先度 | `WishlistItem.priority` | `wishlist_items.priority` | update | account | ✅ |
| 相關角色 | `WishlistItem.characterIds` | `wishlist_item_links` | update | account | ✅ |
| 狀態 | `WishlistItem.status` | `wishlist_items.status` | update/convert | account | ✅ |
| 委託對象 | `Commission.creatorName` | `commissions.creator_name` | commission endpoint | account | ✅ |
| 價格 | `Commission.price` | `commissions.price` | update | account | ✅ |
| 付款狀態 | `Commission.paymentStatus` | `commissions.payment_status` | update | account | ✅ |
| 截止日 | `Commission.deadline` | `commissions.deadline` | update | account | ✅ |
| 交付作品 | `Commission.deliverableAssetIds` | `commission_assets` | complete/link | account | ✅ |
| 來源 Wishlist | `Commission.sourceWishlistId` | `commissions.source_wishlist_id` | convert | account | ❌ direct | convert action 填入 |

---

## 14. Character Share / Public Character

| UI Field | Domain Field | D1 Field | API | Scope | Writable | 備註 |
|---|---|---|---|---|---:|---|
| 分享模式 | `CharacterShareConfig.enabledViews` | `character_share_configs.enabled_views_json` | `PATCH /api/app/characters/:id/share` | public | ✅ owner | public/artist/writer/full |
| 分享 token/slug | `CharacterShareConfig.slug` | `character_share_configs.slug` | share endpoint | public | ✅ owner | 唯一性 |
| 顯示欄位 | `CharacterShareConfig.sections` | `character_share_configs.sections_json` | share endpoint | public | ✅ owner | 防止公開私人資料 |
| 密碼 | `CharacterShareConfig.passwordHash` | `character_share_configs.password_hash` | share endpoint | public | ✅ owner | 前端不存明文 |
| 發布版本 | `CharacterPublicPayload` | generated/version table | publish endpoint | public | ❌ direct | Renderer 只讀裁切版 |

---

## 15. Demo-only / UI-only 狀態

以下不需要第一版後端持久化，除非產品決定要保存：

| UI 狀態 | 建議 |
|---|---|
| Lightbox 開關與目前 index | UI state |
| Hover Card 開關 | UI state |
| Filter chip active | URL query 或 UI state |
| Relationship selected card | UI state；可用 URL anchor |
| Height compare selected rows | UI state；若保存則做 SavedView |
| Builder selected block | UI state |
| Search input draft | UI state；提交後進 query |
| Toast queue | UI state |

---

## 16. 建議 API Payload 分層

同一個 Project 不應只用一種 response。

```txt
ProjectSummary
ProjectDetail
ProjectNavigationPayload
ProjectSettingsPayload
PublicProjectPayload
```

同一個 Character 也應拆：

```txt
CharacterSummary
CharacterDetail
ProjectCharacterDetail
PublicCharacterPayload
CommissionBriefPayload
```

原因：

- Summary 給列表用，避免 payload 太大。
- Detail 給工作台用，包含可編輯草稿。
- Public Payload 給訪客，必須裁切私人欄位。
- ProjectCharacterDetail 額外包含企劃限定資料。

---

## 17. 最需要先對齊的欄位

P0 欄位：

1. `Character` vs `ProjectCharacterLink` 欄位邊界。
2. `Project.visibility` vs `portalEnabled` vs `collaborationMode`。
3. `PublicPageDraft` vs `PublicPageVersion`。
4. `CharacterApplication` vs `ContentSubmission`。
5. `Asset` vs `AssetLink`。
6. `WorldEntry.parentId` 與 `EntityLink`。
7. Sidebar/navigation 需要的 `ProjectNavigationPayload`。

---

## 18. ProjectNavigationPayload 草案

此 payload 專門給 Sidebar 與 Header 使用，不等同完整 ProjectDetail。

```ts
ProjectNavigationPayload {
  project: {
    id
    name
    slug
    themeColor
    visibility
    collaborationMode
    portalEnabled
    joinPolicy
  }
  viewer: {
    role
    permissions: string[]
  }
  features: {
    content: string[]
    publicPage: boolean
    collaboration: string[]
    tools: string[]
  }
  counts: {
    pendingReview?: number
    unreadAnnouncements?: number
  }
}
```

這能避免 Sidebar 自己推導權限，也能避免公開頁收到不必要管理資訊。

---

## 19. 下一步

1. 由此文件回頭檢查目前 `api-contract-draft.md` 缺哪些 endpoint。
2. 根據 P0 欄位先寫 migration v2 草案。
3. 將前端 mock adapter 拆成 query/mutation repositories。
4. 將目前 local-only demo 互動標記為：
   - `ui-only`
   - `needs-persistence`
   - `needs-api`
   - `needs-security-review`
