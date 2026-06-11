# CharacterHub Mutation Matrix

版本：v0.1  
目的：列出前端按鈕、表單、互動最後應該建立、修改、刪除或發布哪些資料，並對齊權限與 API 草案。

---

## 0. Mutation 命名規則

建議前端與 API 都使用明確動詞：

```txt
create / update / delete / archive / restore
link / unlink
submit / review / approve / reject / requestChanges
publish / unpublish
requestUpload / finalizeUpload
```

不要用過於模糊的：

```txt
saveData
updateThing
approveSubmission
```

因為不同 submission 通過後的落點不同。

---

## 1. Project Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 建立企劃 | `createProject` | Project | 登入使用者 | authenticated | `POST /api/app/projects` | name、preset、visibility、capabilities | 建立 owner membership |
| 企劃設定 | `updateProject` | Project | owner/host | `project:update` | `PATCH /api/app/projects/:projectId` | name、description、coverAssetId、themeColor | activity event |
| 功能模組 | `updateProjectCapabilities` | Project | owner/host | `project:manage_settings` | `PATCH /api/app/projects/:projectId/capabilities` | portalEnabled、collaborationMode、enabledFeatures | 影響 sidebar/navigation |
| 發布設定 | `updateProjectVisibility` | Project | owner/host | `project:publish` | `PATCH /api/app/projects/:projectId/visibility` | private/unlisted/public、joinPolicy | 可能更新 public availability |
| 企劃設定 | `archiveProject` | Project | owner | `project:delete` | `POST /api/app/projects/:projectId/archive` | reason? | 隱藏於一般列表 |
| 回收站 | `restoreProject` | Project | owner | `project:delete` | `POST /api/app/projects/:projectId/restore` | none | 恢復可見 |
| 危險區 | `deleteProject` | Project | owner | `project:delete` | `DELETE /api/app/projects/:projectId` | confirm token/name | 軟刪優先；真刪需延遲 |

---

## 2. Character Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 我的角色 / 快速新增 | `createCharacter` | Character | 登入使用者 | authenticated | `POST /api/app/characters` | templateId?、name、projectId? | 若帶 projectId 可接續建立 link |
| 角色編輯器 | `updateCharacter` | Character | owner | `character:update` | `PATCH /api/app/characters/:characterId` | generalProfile、artistProfile、writerProfile、tags | update activity |
| 角色設定 | `updateCharacterVisibility` | CharacterShareConfig | owner | `character:publish` | `PATCH /api/app/characters/:id/share` | visibility、enabledSections、shareToken? | 影響 `/c/:slug` |
| 我的角色 | `duplicateCharacter` | Character | owner | `character:create` | `POST /api/app/characters/:id/duplicate` | targetProjectId?、copyAssets? | 產生新 Character |
| 我的角色 | `archiveCharacter` | Character | owner | `character:delete` | `POST /api/app/characters/:id/archive` | none | 不刪 ProjectCharacterLink，改為 archived 狀態 |
| 回收站 | `deleteCharacter` | Character | owner | `character:delete` | `DELETE /api/app/characters/:id` | confirm | 若仍有 approved links 需阻擋或提示 |

---

## 3. Project Character Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 企劃角色頁 | `linkCharacterToProject` | ProjectCharacterLink | owner/host | `project_character:create` | `POST /api/app/projects/:projectId/characters` | characterId、initialFields | 建立 link；狀態依 join policy |
| 企劃角色編輯 | `updateProjectCharacter` | ProjectCharacterLink | character owner / host | `project_character:update` | `PATCH /api/app/projects/:projectId/characters/:linkId` | factionId、projectRole、fieldValues、visibility | update roster |
| 參與者申請 | `submitCharacterApplication` | CharacterApplication | member/visitor | `application:create` | `POST /api/app/projects/:projectId/applications/characters` | characterId 或 draftCharacter、fieldValues、message | 進入 pending |
| 審核中心 | `approveCharacterApplication` | CharacterApplication + Link | host/cohost | `application:review` | `POST /api/app/projects/:projectId/applications/:id/approve` | reviewMessage?、factionId? | 建立/更新 ProjectCharacterLink |
| 審核中心 | `requestCharacterChanges` | CharacterApplication | host/cohost | `application:review` | `POST /api/app/projects/:projectId/applications/:id/request-changes` | message、fieldKeys? | 狀態變 needs_changes |
| 審核中心 | `rejectCharacterApplication` | CharacterApplication | host/cohost | `application:review` | `POST /api/app/projects/:projectId/applications/:id/reject` | message | 狀態變 rejected |
| 名冊 | `removeCharacterFromProject` | ProjectCharacterLink | host/owner | `project_character:remove` | `DELETE /api/app/projects/:projectId/characters/:linkId` | reason? | 名冊移除；不刪 Character |
| 我的申請 | `leaveProject` | ProjectCharacterLink | character owner | `project_character:leave` | `POST /api/app/projects/:projectId/characters/:linkId/leave` | reason? | 狀態 removed/left |

---

## 4. Character Template Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 角色卡模板 | `createTemplate` | CharacterTemplate | owner/host | `template:manage` | `POST /api/app/projects/:projectId/templates` | name、description | 建立 draft version |
| 角色卡模板 | `addTemplateField` | TemplateField | owner/host | `template:manage` | `POST /api/app/projects/:projectId/templates/:templateId/fields` | label、type、required、visibility、options | 更新模板草稿 |
| 角色卡模板 | `updateTemplateField` | TemplateField | owner/host | `template:manage` | `PATCH /api/app/projects/:projectId/templates/:templateId/fields/:fieldId` | field config | 可能影響未提交草稿 |
| 角色卡模板 | `reorderTemplateFields` | TemplateField[] | owner/host | `template:manage` | `PUT /api/app/projects/:projectId/templates/:templateId/fields/order` | ordered field ids | 更新 sortOrder |
| 角色卡模板 | `publishTemplateVersion` | CharacterTemplateVersion | owner/host | `template:manage` | `POST /api/app/projects/:projectId/templates/:templateId/publish` | version note | 新申請使用新版本 |
| 角色卡模板 | `archiveTemplateField` | TemplateField | owner/host | `template:manage` | `POST /api/app/projects/:projectId/templates/:templateId/fields/:fieldId/archive` | none | 舊值保留，新表單隱藏 |

---

## 5. Worldview Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 世界觀 | `createWorldEntry` | WorldEntry | editor | `world:create` | `POST /api/app/projects/:projectId/world-entries` | type、title、parentId、content | 新增條目 |
| 世界觀 detail | `updateWorldEntry` | WorldEntry | editor | `world:update` | `PATCH /api/app/projects/:projectId/world-entries/:entryId` | title、type、summary、content、visibility | 更新 detail/card |
| 世界觀 parent | `moveWorldEntry` | WorldEntry | editor | `world:update` | `PATCH /api/app/projects/:projectId/world-entries/:entryId/parent` | parentId、sortOrder? | 重算麵包屑 |
| 世界觀列表 | `reorderWorldEntries` | WorldEntry[] | editor | `world:update` | `PUT /api/app/projects/:projectId/world-entries/order` | parentId、ordered ids | 更新排序 |
| 世界觀關聯 | `linkWorldEntry` | EntityLink | editor | `world:update` | `POST /api/app/projects/:projectId/world-entries/:entryId/links` | targetType、targetId、relationType | 建立雙向或單向關聯 |
| 世界觀關聯 | `unlinkWorldEntry` | EntityLink | editor | `world:update` | `DELETE /api/app/projects/:projectId/world-entries/:entryId/links/:linkId` | none | 移除關聯 |
| 世界觀 | `archiveWorldEntry` | WorldEntry | editor | `world:delete` | `POST /api/app/projects/:projectId/world-entries/:entryId/archive` | none | 子項處理需定義 |

---

## 6. Story / Timeline Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 故事 | `createStory` | Story | editor | `story:create` | `POST /api/app/projects/:projectId/stories` | title、description | 新故事 |
| 故事 | `updateStory` | Story | editor | `story:update` | `PATCH /api/app/projects/:projectId/stories/:storyId` | title、status | 更新 |
| 章節 | `createChapter` | StoryChapter | editor | `story:update` | `POST /api/app/projects/:projectId/stories/:storyId/chapters` | title、summary、order | 新章節 |
| 章節 | `reorderChapters` | StoryChapter[] | editor | `story:update` | `PUT /api/app/projects/:projectId/stories/:storyId/chapters/order` | ordered ids | 更新章節排序 |
| 時間軸 | `createStoryEvent` | StoryEvent | editor | `story:update` | `POST /api/app/projects/:projectId/story-events` | title、timeLabel、summary、entityRefs | 加入 timeline |
| 事件 | `linkStoryEntity` | EntityLink | editor | `story:update` | `POST /api/app/projects/:projectId/story-events/:eventId/links` | entityType、entityId、role | 關聯角色/地點 |

---

## 7. Asset / Gallery Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 圖庫上傳 | `requestAssetUpload` | UploadSession | uploader | `asset:create` | `POST /api/app/assets/upload-url` | fileName、mime、size、projectId? | 回傳短效 R2 PUT URL |
| 圖庫上傳 | `finalizeAssetUpload` | Asset | uploader | `asset:create` | `POST /api/app/assets/finalize` | uploadId、r2Key、metadata | 建立 Asset |
| 圖片詳情 | `updateAssetMetadata` | Asset | owner/editor | `asset:update` | `PATCH /api/app/assets/:assetId` | title、author、sourceUrl、visibility、type | 更新 metadata |
| 圖片關聯 | `linkAsset` | AssetLink | owner/editor | `asset:update` | `POST /api/app/assets/:assetId/links` | entityType、entityId、role | 出現在角色/世界觀/故事圖庫 |
| 圖片關聯 | `unlinkAsset` | AssetLink | owner/editor | `asset:update` | `DELETE /api/app/assets/:assetId/links/:linkId` | none | 取消關聯 |
| 封面 | `setCoverAsset` | Project/Character/WorldEntry | owner/editor | `*:update` | `POST /api/app/assets/:assetId/set-cover` | targetType、targetId | 更新 coverAssetId |
| 圖庫 | `deleteAsset` | Asset | owner | `asset:delete` | `DELETE /api/app/assets/:assetId` | confirm? | R2 刪除或 soft delete |

---

## 8. Relationship Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 關係圖 | `createRelationship` | Relationship | editor | `relationship:create` | `POST /api/app/projects/:projectId/relationships` | sourceRef、targetRef、type、direction、label | 新關係 |
| 詳情卡 | `updateRelationship` | Relationship | editor | `relationship:update` | `PATCH /api/app/projects/:projectId/relationships/:id` | label、description、type、visibility | 更新 pair card |
| 關係群組 | `createRelationshipGroup` | RelationshipGroup | editor | `relationship:update` | `POST /api/app/projects/:projectId/relationship-groups` | name、color | 新群組 |
| Map layout | `updateRelationshipLayout` | RelationshipLayout | editor/user | `relationship:layout` | `PUT /api/app/projects/:projectId/relationship-layout` | node positions、group rings | 若 user-specific，存 preference |
| 關係圖 | `deleteRelationship` | Relationship | editor | `relationship:delete` | `DELETE /api/app/projects/:projectId/relationships/:id` | none | 移除線與卡片 |

---

## 9. Inspiration / Idea Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 快速新增 | `createIdea` | Idea | user/member | `idea:create` | `POST /api/app/ideas` | content、projectId?、tags、attachments | 新靈感 |
| 靈感匣 | `updateIdea` | Idea | creator | `idea:update` | `PATCH /api/app/ideas/:ideaId` | content、tags、status | 更新 |
| 靈感匣 | `archiveIdea` | Idea | creator | `idea:delete` | `POST /api/app/ideas/:ideaId/archive` | none | 封存 |
| 升級 | `convertIdea` | Idea + Target | creator | target create permission | `POST /api/app/ideas/:ideaId/convert` | targetType、targetScope | 建立 Character/WorldEntry/Story/Wishlist；記 sourceIdeaId |

---

## 10. Public Page Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 公開頁 | `savePublicPageDraft` | PublicPageDraft | owner/host | `public_page:update` | `PUT /api/app/projects/:projectId/public-page/draft` | blocks、theme、settings | 儲存草稿 |
| 公開頁 | `addPublicPageBlock` | PublicPageBlock | owner/host | `public_page:update` | `POST /api/app/projects/:projectId/public-page/blocks` | type、source、content | 新區塊 |
| 公開頁 | `updatePublicPageBlock` | PublicPageBlock | owner/host | `public_page:update` | `PATCH /api/app/projects/:projectId/public-page/blocks/:blockId` | content、style、visibility | 更新 |
| 公開頁 | `movePublicPageBlock` | PublicPageBlock[] | owner/host | `public_page:update` | `PUT /api/app/projects/:projectId/public-page/blocks/order` | ordered ids | 排序 |
| 公開頁 | `publishPublicPage` | PublicPageVersion | owner/host | `public_page:publish` | `POST /api/app/projects/:projectId/public-page/publish` | version note? | 產生 visitor-safe published payload |
| 公開頁 | `unpublishPublicPage` | PublicPage | owner/host | `public_page:publish` | `POST /api/app/projects/:projectId/public-page/unpublish` | none | `/p/:slug` 不再可訪問 |
| 公開頁 | `updatePublicSlug` | Project/PublicPage | owner/host | `public_page:publish` | `PATCH /api/app/projects/:projectId/public-page/slug` | slug | 檢查唯一性 |

---

## 11. Content Submission Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 公開頁/企劃 | `submitContent` | ContentSubmission | member/visitor | `content_submission:create` | `POST /api/app/projects/:projectId/submissions/content` | type、assetId?、storyText?、relatedCharacters、message | 進入 pending |
| 審核中心 | `approveContentSubmission` | ContentSubmission + Asset/Story | host/cohost | `content_submission:review` | `POST /api/app/projects/:projectId/submissions/content/:id/approve` | message?、destination | 圖片進 Gallery；文章進 Story/Publication |
| 審核中心 | `requestContentChanges` | ContentSubmission | host/cohost | `content_submission:review` | `POST /api/app/projects/:projectId/submissions/content/:id/request-changes` | message | needs_changes |
| 審核中心 | `rejectContentSubmission` | ContentSubmission | host/cohost | `content_submission:review` | `POST /api/app/projects/:projectId/submissions/content/:id/reject` | message | rejected |

---

## 12. Participant Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| 參與者 | `createInvite` | ProjectInvite | owner/host | `member:invite` | `POST /api/app/projects/:projectId/invites` | role、expiresAt、maxUses | 產生 invite link |
| 邀請頁 | `acceptInvite` | ProjectMember | invited user | valid invite | `POST /api/app/invites/:token/accept` | none | 加入成員 |
| 參與者 | `updateMemberRole` | ProjectMember | owner/host | `member:update_role` | `PATCH /api/app/projects/:projectId/members/:memberId` | role、permissions | 更新導覽與權限 |
| 參與者 | `removeMember` | ProjectMember | owner/host | `member:remove` | `DELETE /api/app/projects/:projectId/members/:memberId` | reason? | 可能保留角色 link 狀態 |
| 參與者 | `banParticipant` | ProjectBan | owner/host | `member:ban` | `POST /api/app/projects/:projectId/bans` | userId、reason | 阻擋再加入 |

---

## 13. Wishlist / Commission Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 | Side Effect |
|---|---|---|---|---|---|---|---|
| Wishlist | `createWishlistItem` | WishlistItem | user | authenticated | `POST /api/app/wishlist` | title、type、budget、projectId?、characterIds | 新願望 |
| Wishlist | `updateWishlistItem` | WishlistItem | owner | `wishlist:update` | `PATCH /api/app/wishlist/:id` | fields | 更新 |
| Wishlist | `convertWishlistToCommission` | Commission | owner | `commission:create` | `POST /api/app/wishlist/:id/convert-to-commission` | creatorName?、deadline? | 建立 commission，保留 sourceWishlistId |
| Commission | `createCommission` | Commission | user | authenticated | `POST /api/app/commissions` | title、creatorName、price、deadline、links | 新委託 |
| Commission | `updateCommission` | Commission | owner | `commission:update` | `PATCH /api/app/commissions/:id` | status、paymentStatus、progress、deliverables | 更新看板 |
| Commission | `completeCommission` | Commission + Asset? | owner | `commission:update` | `POST /api/app/commissions/:id/complete` | assetIds?、finalLinks | 可回存 Gallery |

---

## 14. Settings / Preferences Mutations

| UI 來源 | 操作 | Target | Actor | 權限 | API 草案 | Request 重點 |
|---|---|---|---|---|---|---|
| 帳號設定 | `updateUserProfile` | UserProfile | self | authenticated | `PATCH /api/app/me/profile` | displayName、handle、bio、links、avatarAssetId |
| 外觀設定 | `updateUserPreferences` | UserPreferences | self | authenticated | `PATCH /api/app/me/preferences` | theme、accent、sidebarCollapsed、sectionCollapse |
| 通知設定 | `updateNotificationSettings` | NotificationSettings | self | authenticated | `PATCH /api/app/me/notifications` | email/push/in-app flags |
| 企劃設定 | `updateProjectSettings` | Project | owner/host | `project:update` | `PATCH /api/app/projects/:projectId/settings` | settings payload |
| 角色分享 | `updateCharacterShareSettings` | CharacterShareConfig | character owner | `character:publish` | `PATCH /api/app/characters/:id/share` | visibility、sections、password? |

---

## 15. Auth Mutations

| UI 來源 | 操作 | Target | API 草案 | Request 重點 | 注意 |
|---|---|---|---|---|---|
| Login | `login` | Session | `POST /api/v1/auth/login` | email、password | 正式應使用 HttpOnly cookie session |
| Signup | `register` | User + Session | `POST /api/v1/auth/register` | email、password、handle | 加 Turnstile / rate limit |
| Logout | `logout` | Session | `POST /api/v1/auth/logout` | none | 清除 cookie |
| OAuth | `startOAuth` | OAuth flow | `GET /api/v1/auth/:provider` | provider | callback 不應把 long-lived token 暴露於 hash |

---

## 16. 需要 Unsaved Guard 的操作

以下操作若當前頁面有未儲存資料，必須提示：

| 操作 | 範例 |
|---|---|
| 切換企劃 | 從常夜國切到月蝕密室 |
| 離開角色編輯器 | edit → list |
| 變更公開頁 route | builder → renderer |
| 關閉瀏覽器分頁 | beforeunload |
| 刪除區塊/欄位 | PublicPageBlock、TemplateField |

提示文案：

```txt
尚有未儲存變更。要先儲存再離開嗎？
[儲存並離開] [放棄變更] [取消]
```

---

## 17. 下一步

1. 依此矩陣補 `api-contract-draft.md`。
2. 依 `frontend-backend-field-map.md` 建立 DB 欄位與 API request/response。
3. 將 demo 中 local-only 互動標註成「需後端持久化」或「僅 UI state」。
