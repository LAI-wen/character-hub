# CharacterHub 前端可操控資料盤點

版本：v0.1  
依據：`oc-tools-new/` 設計稿、目前 `app/` 前端骨架、產品化文件。  
目的：補齊「前端到底能讀取、建立、修改、刪除哪些資料」這一層規格，作為後續 D1 schema、API contract、權限矩陣與前端重構的共同對照。

---

## 0. 使用原則

這份文件不是最終 DB schema，而是 **UI Data Contract**：從前端畫面出發，列出每個模組需要讀寫的資料。

正式實作時請遵守：

1. 前端顯示的統計數字、完成度、最近更新等多數是衍生資料，不應由前端直接寫入。
2. 角色本體可以不屬於任何企劃。
3. 角色加入企劃時建立 `ProjectCharacterLink`，企劃限定欄位不可寫回全域 `Character`。
4. 公開頁 Builder 與訪客 Public Renderer 使用不同 payload。
5. 共創審核中的「角色申請」與「作品投稿」要拆成不同資料流。
6. `localStorage` 只能用於 demo 或非核心偏好，不能作為正式資料來源。

---

## 1. 資料分類

| 類別 | 說明 | 範例 | 儲存建議 |
|---|---|---|---|
| 正式持久資料 | 使用者創作內容與協作資料 | 角色、企劃、世界觀、故事、圖片 metadata、投稿、公開頁區塊 | D1 / R2 |
| 衍生資料 | 後端或前端根據正式資料計算 | 角色數、世界觀數、待審核數、完成度、最近更新 | API response / query result |
| 使用者偏好 | UI 偏好，不影響內容本身 | sidebar 收合、section collapse、顯示密度、最近企劃 | User Preferences；demo 可 localStorage |
| 暫時 UI 狀態 | 當下畫面狀態 | modal 開關、lightbox、hover、目前 tab、搜尋輸入 | React state / URL state |
| 草稿／發布資料 | 同一內容的工作版與公開版 | Public Page draft blocks / published blocks | D1 versioning |

---

## 2. 模組資料盤點

### 2.1 Account Workspace／工作台

來源頁面：`workspace.html`、目前 `app/screens/account-home.js`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 顯示帳號層總覽、最近更新、快捷新增、所有企劃摘要、未整理資料 |
| 讀取資料 | `UserProfile`、`ProjectSummary[]`、`RecentActivity[]`、`AccountCharacterSummary[]`、`WishlistSummary[]`、`NotificationSummary[]` |
| 可寫資料 | 無直接內容編輯；可觸發建立企劃、建立角色、快速靈感 |
| 衍生資料 | 企劃數、角色總數、待處理項目、最近活動 |
| 暫時狀態 | 快速新增 menu、dashboard filter、project switcher open |
| 權限 | 登入使用者本人 |
| 注意 | 不應被目前選取 project 綁死；這是帳號層頁面 |

---

### 2.2 Global Character Library／我的角色

來源頁面：`dashboard.html`、目前 `app/screens/account-characters.js`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 查看使用者擁有的全部角色，包含未加入企劃的角色 |
| 讀取資料 | `CharacterSummary[]`、角色所屬企劃摘要、分享狀態、完成度、最近更新 |
| 可寫資料 | 建立角色、刪除/封存角色、複製角色、修改全域分享狀態、套用角色模板 |
| 不可直接寫 | 企劃內陣營、企劃職位、名冊狀態，這些屬於 `ProjectCharacterLink` |
| 搜尋範圍 | 使用者擁有或有權查看的全域角色 |
| 主要 UI 狀態 | 依企劃分組、搜尋、模板選擇 modal |
| 權限 | 角色 owner 可編輯；參與企劃的主持人不能直接編輯角色本體 |

建議欄位：

```ts
Character {
  id
  ownerId
  name
  handle
  nickname
  avatarAssetId
  summary
  tags
  visibility
  generalProfile
  artistProfile
  writerProfile
  createdAt
  updatedAt
  archivedAt
}
```

---

### 2.3 Project／企劃

來源頁面：`workspace.html`、`portal.html`、`settings.html`、目前 project overview skeleton

| 項目 | 內容 |
|---|---|
| 頁面目的 | 作為可組合的創作空間，可私人、公開、共創或公開招募 |
| 讀取資料 | `ProjectDetail`、capabilities、viewer permission、stats、recent activity |
| 可寫資料 | 名稱、簡介、封面、代表色、visibility、portalEnabled、joinPolicy、enabledFeatures、slug、封存 |
| 不可直接寫 | ownerId、memberCount、characterCount、audit 欄位 |
| 衍生資料 | 角色數、世界觀數、待審核數、最近更新 |
| 權限 | owner/host/cohost 可依權限修改；member/visitor 只讀 |

建議欄位：

```ts
Project {
  id
  ownerId
  name
  slug
  description
  coverAssetId
  themeColor
  visibility: "private" | "unlisted" | "public"
  collaborationMode: "solo" | "collaborative"
  portalEnabled
  joinPolicy: "closed" | "invite" | "application" | "open"
  submissionsEnabled
  enabledFeatures
  createdAt
  updatedAt
  archivedAt
}
```

---

### 2.4 ProjectCharacterLink／企劃角色版本

來源頁面：`roster.html`、`editor.html` 企劃欄位、`submissions.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 表示某個角色在某個企劃中的版本與名冊狀態 |
| 讀取資料 | 全域角色摘要 + 企劃限定欄位 + 名冊狀態 + faction |
| 可寫資料 | faction、projectRole、企劃限定背景、模板欄位值、企劃可見性、名冊狀態 |
| 不可直接寫 | 角色本體的全域外觀與核心設定，除非目前使用者是角色 owner |
| 關鍵規則 | 同一角色可加入多個企劃，每個企劃有自己的 project-specific data |
| 權限 | 角色 owner 可填自己的企劃資料；host 可審核與設定名冊欄位；不能任意改角色本體 |

建議欄位：

```ts
ProjectCharacterLink {
  id
  projectId
  characterId
  submittedBy
  status: "draft" | "pending" | "needs_changes" | "approved" | "rejected" | "removed"
  factionId
  projectRole
  visibility
  templateVersionId
  fieldValues
  submittedAt
  reviewedAt
  reviewedBy
  reviewMessage
}
```

---

### 2.5 Character Editor／角色編輯器

來源頁面：`editor.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 編輯角色本體與部分企劃限定資料；提供即時預覽 |
| 讀取資料 | `CharacterDetail`、`ProjectCharacterLink?`、`CharacterTemplate?`、`Asset[]` |
| 可寫 Character | 基本資料、一般設定、圖設定、文設定、標籤、代表圖、分享模式 |
| 可寫 Project Link | 陣營、企劃限定背景、企劃限定能力、模板欄位值 |
| UI 狀態 | 編輯/預覽模式、tab、儲存狀態、相簿 lightbox、標記模式 |
| 正式注意 | 不得使用單一 localStorage key 儲存所有角色；需依 characterId/projectCharacterLinkId 分開 |

資料拆分：

```txt
角色本體欄位 → Character
企劃限定欄位 → ProjectCharacterLink
相簿圖片 → Asset + AssetLink
標記座標 → AssetAnnotation
分享設定 → CharacterShareConfig
```

---

### 2.6 Worldview／世界觀

來源頁面：`worldview.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 建立與管理世界觀條目，支援 parent/children、關聯角色、條目關聯 |
| 讀取資料 | `WorldEntry[]`、`CharacterSummary[]`、關聯資料、圖片 |
| 可寫資料 | title、type、parentId、summary、content、sortOrder、visibility、relatedCharacters、relatedEntries |
| 衍生資料 | 子項數、關聯數、麵包屑、類型統計 |
| UI 狀態 | 搜尋 query、類型 filter、目前選中 entry、detail editing state |
| 權限 | host/cohost/有編輯權成員；visitor 只讀公開條目 |

建議欄位：

```ts
WorldEntry {
  id
  projectId
  type
  title
  summary
  content
  parentId
  sortOrder
  visibility
  createdBy
  updatedAt
}
```

---

### 2.7 Story／故事與時間軸

來源頁面：`story.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 管理章節、事件、時間軸與故事進度 |
| 讀取資料 | `Story[]`、`StoryChapter[]`、`StoryEvent[]`、關聯角色/世界觀 |
| 可寫資料 | story title、chapter title、chapter order、event timeLabel、event summary、related entities、status |
| 衍生資料 | 章節數、事件數、完成進度、時間軸排序 |
| UI 狀態 | 章節檢視/時間軸檢視、選中事件、filter |
| 權限 | 企劃內容編輯者可寫；一般訪客只讀公開故事 |

---

### 2.8 Gallery / Asset／圖庫與素材

來源頁面：`gallery.html`、`portal.html`、`character.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 聚合圖片與素材，支援關聯角色、世界觀、故事與委託 |
| 讀取資料 | `Asset[]`、`AssetLink[]`、thumbnail URLs、作者/來源 metadata |
| 可寫 Metadata | title、assetType、authorName、sourceUrl、notes、visibility、isCover、sortOrder |
| 可寫 File | 透過 R2 upload flow 上傳或刪除檔案 |
| UI 狀態 | lightbox open、目前圖片 index、filter、layout view |
| 權限 | uploader/owner/host 可管理；visitor 只看公開素材 |

建議拆分：

```txt
R2：實際檔案
D1 Asset：metadata
D1 AssetLink：關聯到 Character / Project / WorldEntry / Story / Commission
```

---

### 2.9 Relationships／關係圖

來源頁面：`relationships.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 視覺化角色、組織、地點、事件之間的關係 |
| 讀取資料 | `Relationship[]`、`RelationshipNode[]`、`RelationshipGroup[]`、layout positions |
| 可寫資料 | sourceRef、targetRef、relationshipType、label、description、direction、groupId、visibility |
| 可選寫入 | node position、canvas zoom、group ring；需決定是全企劃共用或個人偏好 |
| UI 狀態 | selected relationship、hover node、active chip、map filter |
| 權限 | 企劃內容編輯者可寫；visitor 只讀公開關係 |

建議：

```txt
Relationship：關係本身
RelationshipLayout：畫布座標與呈現，可視情況分 project-shared 或 user-specific
```

---

### 2.10 Inspiration Inbox／靈感匣

來源頁面：`workspace.html` inbox view

| 項目 | 內容 |
|---|---|
| 頁面目的 | 低門檻保存未整理想法，之後轉為正式內容 |
| 讀取資料 | `Idea[]` |
| 可寫資料 | content、kind、tags、projectId?、attachments、status |
| 操作 | 新增、標記、封存、轉為角色/世界觀/故事/Wishlist |
| 轉換規則 | 轉換後建立正式資料，並保留 sourceIdeaId |
| 權限 | 建立者本人；企劃共用 inbox 需另定權限 |

---

### 2.11 Public Page Builder／公開頁編輯器

來源頁面：`portal.html`、目前 `app/screens/public-page` demo

| 項目 | 內容 |
|---|---|
| 頁面目的 | 主持人/owner 編排公開企劃頁草稿並發布 |
| 讀取資料 | `PublicPageDraft`、`PublicPagePublishedVersion`、project stats、可插入資料來源 |
| 可寫資料 | blocks、block order、block content、theme、slug、visibility、submit settings |
| UI 狀態 | builder edit mode、selected block、submit modal、preview mode |
| 權限 | owner/host/cohost；visitor 不可接收 builder payload |
| 重要拆分 | Builder route 與 Renderer route 必須分離 |

---

### 2.12 Public Renderer／訪客公開頁

來源頁面：`portal.html` visitor view、目前 `#/p/:slug`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 對外展示已發布的企劃內容，不包含 owner/editor controls |
| 讀取資料 | `PublicProjectPayload`，只含發布後且 visitor-safe 的欄位 |
| 可寫資料 | 無；如有加入/投稿表單，走 application/submission endpoint |
| 不可包含 | draft blocks、private fields、viewer role switch、host notes、internal IDs 不必要資訊 |
| 快取 | 可 cache；但需考慮 visibility 與 unlisted token |

---

### 2.13 Collaboration／共創管理

來源頁面：`template-builder.html`、`roster.html`、`submissions.html`、`participants.html`

#### 角色卡模板

| 讀取 | `CharacterTemplate`、`TemplateField[]`、version |
| 可寫 | field label、type、required、visibility、options、order、helper text |
| 關鍵 | 模板要 versioning，舊投稿應知道使用哪一版 |

#### 角色名冊

| 讀取 | `ProjectCharacterLink[]` + `CharacterSummary` + faction/group |
| 可寫 | 名冊分組、狀態、排序、featured、faction |
| 不可寫 | 非 owner 的角色本體 |

#### 審核中心

| 讀取 | `CharacterApplication[]`、`ContentSubmission[]` |
| 可寫 | approve、reject、needs_changes、reviewMessage |
| 關鍵 | 角色申請通過後建立/更新 ProjectCharacterLink；作品投稿通過後進 Gallery/Story，不進名冊 |

#### 參與者

| 讀取 | `ProjectMember[]`、invite links、role summary |
| 可寫 | invite、role、remove、ban、transfer ownership? |
| 權限 | owner/host/cohost 分級 |

---

### 2.14 Wishlist / Commission／待委託與委託中心

來源頁面：`workspace.html` wishlist view、`commissions.html`

| 項目 | Wishlist | Commission |
|---|---|---|
| 頁面目的 | 保存想委託的點子 | 管理已開始的委託 |
| 可寫資料 | title、description、type、budget、priority、relatedCharacters、references、status | creatorName、price、paymentStatus、deadline、progress、deliverables、links、notes |
| 轉換 | create Commission with sourceWishlistId | 回存 Asset / Gallery |
| Scope | account-level，可用 project filter | account-level，可關聯 project/character |

---

### 2.15 Height Compare／身高比較

來源頁面：`height-compare.html`

| 項目 | 內容 |
|---|---|
| 頁面目的 | 比較多角色身高，產生分享圖或委託參考 |
| 讀取資料 | `Character.height`、avatar/silhouette、project filter |
| 可寫資料 | 如果保存比較組，則建立 `HeightCompareSet`；否則多為 UI state |
| UI 狀態 | selected characters、unit、export options、row toggles |
| 建議 | MVP 可不持久化，只做 account-level tool；若保存，存為 `SavedView` |

---

### 2.16 Settings／設定

來源頁面：`settings.html`

目前設計中混有帳號設定與企劃設定，正式需拆分。

#### Account Settings

| 可寫 | displayName、handle、avatar、bio、links、theme、accent、notifications、language、data export preferences |
| 不可混入 | 企劃的共創模式、單一企劃公開設定 |

#### Project Settings

| 可寫 | project name、slug、cover、visibility、capabilities、joinPolicy、features、archive/delete |

#### Character Share Settings

| 可寫 | character visibility、share token、allowed sections、artist/writer/public views |

---

### 2.17 Auth / Login

來源頁面：`login.html`、目前 demo auth UI

| 項目 | 內容 |
|---|---|
| 頁面目的 | 登入、註冊、OAuth 入口 |
| 可寫資料 | email、password、handle、remember preference |
| 正式注意 | 不要將 access token 存 localStorage/sessionStorage；正式使用 HttpOnly cookie session |
| UI 狀態 | login/signup toggle、loading、error、OAuth redirect pending |

---

## 3. 前端目前不應直接寫入的資料

| 資料 | 原因 | 建議來源 |
|---|---|---|
| `characterCount` / `worldCount` / `pendingCount` | 衍生資料，避免與真資料不同步 | API 聚合 |
| `ownerId` / `createdBy` | 安全敏感，不可信任前端 | session user |
| `viewerRole` | 不能由 client 自稱 | API permission resolver |
| `publishedPayload` | 需由後端從 draft 產生並裁切 | publish action |
| `R2 key` ownership | 防止越權覆蓋檔案 | upload session / finalize API |
| `auditLog` | 不應前端偽造 | API middleware |

---

## 4. 建議後續工作

1. 以本文件為基礎，補齊 `mutation-matrix.md`。
2. 將每個 UI 操作映射到 API endpoint。
3. 再寫 `frontend-backend-field-map.md`，對應 Domain / D1 / API。
4. 最後才開始 D1 migration 與 Worker route 實作。
