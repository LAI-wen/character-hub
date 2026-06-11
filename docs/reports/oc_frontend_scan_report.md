# CharacterHub / OC Project Workspace 前端掃描報告

掃描來源：`ＯＣ (2).zip`  
掃描範圍：20 個 HTML 頁面、`data.js`、`shell.js`、`app.js`、共用 CSS，以及目前的 mock/localStorage 資料流。

## 1. 結論摘要

這版前端已經足以作為高擬真產品設計稿，但不應直接串接正式後端。最大的問題不是畫面，而是目前把下列概念混成同一個「Project」：

1. 個人整理用資料夾
2. 個人公開展示企劃
3. 多人共創企劃
4. 委託角色收藏集

它們不應被做成互斥的單一類型，而應拆成數個可組合能力：

- `collaborationMode`: `solo | collaborative`
- `visibility`: `private | unlisted | public`
- `portalEnabled`: 是否建立公開企劃頁
- `joinPolicy`: `closed | invite | application | open`
- `submissionsEnabled`: 是否接受投稿
- `enabledFeatures`: story / gallery / relations / wishlist / commissions 等模組

UX 可以提供三個起手預設，但底層保存為能力設定：

- 個人整理：solo + private + 無公開頁 + 無成員管理
- 公開展示：solo + public/unlisted + 有公開頁 + 無成員管理
- 多人共創：collaborative + 可選 visibility + 成員／模板／審核／名冊

如此才能支援「公開但不共創」以及「私人但多人共創」，避免把公開與管理錯誤綁在一起。

---

## 2. 目前檔案與技術狀態

- 20 個 HTML 頁面
- 約 244 KB inline JavaScript
- 約 213 KB inline CSS
- 142 次 `innerHTML`
- 43 次 `localStorage`
- 176 個 `onclick` 使用點
- 最大頁面：
  - `editor.html`：1168 行
  - `character.html`：984 行
  - `relationships.html`：732 行
  - `settings.html`：633 行
- 所有頁面目前皆無正式 API 呼叫，資料主要來自 hardcoded mock 與 localStorage。
- HTML 與 inline JS 基本語法檢查通過，未發現重複 ID 或失效的本地檔案引用。

### 正式化前端建議

保留 UI 與互動設計，但改為元件化 App：

- routes
- components
- features
- API client
- query/cache layer
- auth/session layer
- permission guards
- schema validation

`shell.js` 不應繼續同時負責導覽、搜尋、收藏、最近瀏覽、hover card、企劃切換與假資料索引。

---

## 3. 企劃能力模型與側邊欄

### 目前問題

`assets/shell.js:46–63` 把以下功能固定顯示在所有企劃：

- 公開頁
- 角色卡模板
- 角色名冊
- 投稿審核
- 參與者

因此「星海計畫」這種個人草稿企劃，以及「委託角色集」這種收藏集，也會被當成多人共創企劃。

### 建議側邊欄生成方式

導覽必須由以下三件事共同決定：

1. 企劃啟用的功能
2. 目前使用者權限
3. 內容是否存在或處於設定階段

#### 所有企劃都可有

- 總覽
- 角色
- 世界觀（可停用）
- 靈感匣
- 企劃設定

#### 啟用對應模組才顯示

- 故事
- 圖庫
- 關係圖
- 身高比較
- Wishlist
- 委託

#### 開啟公開頁才顯示

- 公開頁設計
- 發布設定
- 公開預覽

#### 開啟共創才顯示

- 角色卡模板
- 角色名冊
- 投稿／加入申請
- 參與者
- 權限

### 建議企劃建立流程

1. 輸入名稱與封面
2. 選擇起手方式：個人整理／公開展示／多人共創
3. 選擇功能模組
4. 設定可見度
5. 共創時再設定加入方式與審核

預設只影響起始值，之後可自由開關能力，不要鎖死企劃類型。

---

## 4. IA 與 Route 重整

### 全域工作台

- `/app`：所有企劃與最近工作
- `/app/characters`：我的全部角色，可跨企劃篩選
- `/app/inbox`：跨企劃靈感入口（可選）
- `/app/commissions`：個人委託總覽（建議為全域工具）
- `/app/settings`：帳號與全域偏好

### 企劃工作台

- `/app/projects/:projectId`
- `/app/projects/:projectId/characters`
- `/app/projects/:projectId/world`
- `/app/projects/:projectId/story`
- `/app/projects/:projectId/gallery`
- `/app/projects/:projectId/relations`
- `/app/projects/:projectId/settings`

### 共創管理（能力開啟時）

- `/app/projects/:projectId/template`
- `/app/projects/:projectId/roster`
- `/app/projects/:projectId/applications`
- `/app/projects/:projectId/submissions`
- `/app/projects/:projectId/members`

### 公開頁

- `/p/:projectSlug`：公開企劃頁
- `/@:handle/:characterSlug`：公開角色頁

### 角色內部頁

- `/app/characters/:characterId`
- `/app/characters/:characterId/edit`
- `/app/projects/:projectId/characters/:characterId`：顯示角色的企劃版本

目前大量使用 `?project=` 且角色頁未帶 `characterId`，正式版必須改掉。

---

## 5. 頁面逐頁掃描

### `workspace.html`

**保留：** 所有企劃、企劃總覽、快捷新增、靈感匣、Wishlist 的產品概念。  
**問題：**

- 自己實作了一份 Sidebar，與 `shell.js` 重複，兩套導覽會持續漂移。
- 「所有企劃」與「單一企劃總覽」混在同一檔案與 query view。
- 每個企劃總覽固定出現「公開企劃頁」與「投稿審核」。
- 靈感與 Wishlist 資料只存在此頁的記憶體，切頁即失去新增內容。

**建議：** 拆成 Workspace Home、Project Overview、Inbox、Wishlist 四個 route；共用同一 App Shell。

### `dashboard.html`

**保留：** 角色卡、完成度、搜尋、可見度篩選、模板起手。  
**問題：**

- 已位於單一企劃 Shell，卻仍顯示並分組所有企劃，Scope 自相矛盾。
- 自己又定義另一套 Project IDs：`tokoyo/day/draft`，與 canonical `tokoyo/hoshi/school/commset` 不一致。
- 所有角色卡都連到 `character.html`，沒有角色 ID。
- 編輯按鈕都連到同一個 `editor.html`。
- 模板選項目前只顯示 toast，沒有真的改變初始欄位。

**建議：**

- 全域角色頁與企劃角色頁分開。
- 所有卡片路由必須帶 `characterId`。
- 模板實際建立 Character Draft，而非只傳 query 名稱。

### `character.html`

**保留：** 一般／圖設定／文設定的分眾呈現、色票、必畫／禁畫、授權、圖庫、關聯。  
**問題：**

- 同時扮演工作台角色詳情、公開分享頁、委託 Brief，責任過多。
- 套用 Workspace Shell 後仍帶公開頁 footer，內外頁語意混合。
- 整頁硬編單一角色「宵霧」。
- 從 `ch:character` 讀取全站唯一快照，沒有 `characterId`。
- 角色關聯連結未帶 ID。

**建議：** 拆成 Internal Character Detail、Public Character Renderer、Commission Brief Renderer，三者共用資料與視覺 section 元件。

### `editor.html`

**保留：** 雙欄即時預覽、分段設定、圖／文／一般資料、公開設定、企劃欄位。  
**重大問題：**

- 1168 行單檔，UI、狀態、序列化、預覽與企劃模板全部耦合。
- `ch:character` 是全站唯一 key；編輯不同角色會互相覆蓋。
- `ch:projvals:${projectId}` 沒有 characterId；同一企劃的所有角色會共用同一份企劃限定欄位。
- Preview URL 沒有 characterId / projectId。
- 儲存與發布都只是寫同一份 localStorage snapshot。
- 企劃資料分頁永遠存在，即使角色沒有加入企劃或企劃不是共創模式。

**正式 Key 概念：**

- Character Draft：characterId
- Project Character Link：projectId + characterId
- Project Field Values：projectCharacterLinkId + templateVersion

### `worldview.html`

**保留：** Master-detail、類型、父子層級、搜尋、關聯角色與子項。這是目前最接近正式產品的頁面之一。  
**問題：**

- Entity、parent、relation 仍分散於頁面常數。
- 世界觀 Event 與 Story Timeline Event 的邊界未定義。
- 角色連結未帶角色 ID。
- 搜尋在前端掃全部資料，正式版需先套權限再搜尋。

**建議模型：** Lore Entry 與 Event 可分表，透過 EntityRef 共用關聯，不要把全部欄位塞進萬用 Entity JSON。

### `relationships.html`

**保留：** 不對稱關係、群組、角色／世界觀節點、詳情卡、Scope 篩選。  
**問題：**

- 關係資料、畫布節點位置與顯示群組混在同一頁。
- 正式版要拆：Relation Data、Graph View、Node Position/Layout。
- 大型圖需 lazy rendering / viewport culling，不可每次重畫全部 DOM/SVG。

### `story.html`

**保留：** 篇章與時間軸雙檢視、模糊年代。  
**問題：**

- 目前只有閱讀展示，沒有新增／編輯流程。
- 時間軸說會自動串接世界觀事件，但實際仍是另一份 mock。
- Chapter、Story Event、Lore Event、Timeline Entry 尚未分清。

**建議：** Story / Arc / Chapter 為敘事結構；Event 為可被多篇故事引用的事件；Timeline 是 Event 的投影 View。

### `gallery.html`

**保留：** 瀑布流概念、角色與類型篩選、未分類收容區。  
**問題：**

- 圖片只記標題、單一角色與類型。
- 缺少 asset owner、作者、來源、授權、visibility、尺寸、縮圖、多人角色關聯。
- Gallery 應由 Asset + AssetLink 聚合，不是獨立複製圖片資料。

### `height-compare.html`

**保留：** 多角色、比例軸、分享輸出。  
**建議：** 更適合做全域工具，可從某企劃預載角色，但不必強制歸屬單一企劃。使用者可能跨企劃比較自己的角色。

### `commissions.html`

**保留：** 輕量看板、期限提醒、角色關聯。  
**問題：** 委託可能同時涉及多企劃或不屬於任何企劃，不應固定成每個企劃都有一套。  
**建議：** Commission 是帳號層資料，可選擇關聯 Project、Character、Wishlist；企劃側邊欄只顯示該企劃的 Filter View。

### `portal.html`

**保留：** 公開企劃頁區塊、排列、隱藏、角色／世界觀／故事／圖庫、加入 CTA。  
**重大問題：**

- 公開頁、Builder、權限模擬與投稿表單全部在同一 route。
- 「角色切換」只是前端顯示控制，不可作為正式權限。
- 正式訪客頁不應下載擁有者編輯控制或管理資料。
- Public Page 與 Editor Preview 應分開。

**建議：**

- `/app/projects/:id/public-page`：Builder
- `/app/projects/:id/public-preview`：權限預覽
- `/p/:slug`：純公開 Renderer

### `template-builder.html`

**保留：** 自訂欄位類型、必填、公開／主持人可見、即時表單預覽。  
**問題：**

- 只適用共創企劃，不應固定顯示。
- 需要 template version；修改模板不能破壞既有投稿。
- 「僅主持人」仍要由後端控制回傳，不能只在 UI 隱藏。

### `roster.html`

**保留：** ProjectCharacterLink 概念、陣營、角色擁有者、企劃限定標籤。  
**問題：**

- `members()` 同時保留 approved 與 pending，與「通過審核的名冊」定義衝突。
- 角色連結沒有 characterId。
- 公開 Roster 與主持人管理 Roster 應分開，pending 不應出現在公開資料。

### `submissions.html`

**重大概念問題：**

目前把三種完全不同生命週期混在同一張投稿：

- 角色加入申請
- 圖片投稿
- 文章投稿

而且所有 approved 都進到「名冊」，邏輯不成立：

- 角色申請通過 → ProjectCharacterLink / Roster
- 圖片投稿通過 → Asset / Gallery
- 文章投稿通過 → Story Content / Publication

**建議：** 最少分為：

- Character Applications
- Content Submissions

可以共用 Review UI，但 API、資料表、通過後 action 必須不同。

### `participants.html`

**保留：** 邀請連結、角色保有原擁有者、成員角色與權限矩陣。  
**問題：**

- 只適用 collaborative project。
- owner / host / cohost 的職責目前略重疊。
- 權限不可只靠角色名稱；後端應存 role + explicit permissions 或固定 role policy。
- 邀請連結需可撤銷、過期、限制用途與使用次數。

### `settings.html`

**重大 IA 問題：** 帳號設定與企劃設定混在一起。

目前「共創模式」放在全域的「企劃預設」，但共創應是每個 Project 的能力，不是帳號全域開關。

**應拆分：**

- Account Settings：帳號、外觀、通知、資料匯出、語言
- Project Settings：基本資料、模組、可見度、公開頁、加入政策、共創、危險區
- Character Share Settings：角色本身的公開／限連結／私密與分享視角

### `landing.html`

目前仍定位為「角色委託設定頁產生器／整理一次到處委託」，已落後於現在的產品方向。

應改為：

> 以企劃為核心的 OC 整理、展示與共創工作台

並分別展示個人整理、公開展示、多人共創三個情境。

### `login.html`

視覺可保留。正式版需要完整驗證狀態：註冊、登入、忘記密碼、Email 驗證、OAuth 回呼、失敗、Rate Limit、Session 過期。

### `index.html`、`explore/`、`screenshots/`、`uploads/`

均屬設計 showroom／探索／測試資產，不應進正式 production bundle 或公開路由。

---

## 6. 核心資料模型建議

### Project

- id
- ownerId
- name
- slug
- description
- coverAssetId
- collaborationMode
- visibility
- portalEnabled
- joinPolicy
- status
- createdAt / updatedAt

### ProjectFeature

- projectId
- featureKey
- enabled
- settings

### Character

- id
- ownerId
- slug
- name
- generalProfile
- artistProfile
- writerProfile
- visibility

### ProjectCharacterLink

- id
- projectId
- characterId
- submittedBy
- membershipStatus
- factionId
- projectRole
- visibility
- templateVersionId

### ProjectTemplate / TemplateField / FieldValue

FieldValue 必須歸屬 `projectCharacterLinkId`，不是只歸屬 project。

### Application

只處理角色加入企劃。

### ContentSubmission

處理圖片、文字或其他作品投稿，需包含 target type 與 approved action。

### Asset / AssetLink

圖片與附件集中存 Asset，再透過 Link 關聯 Character、Project、Lore、Story、Commission。

### Relationship

- sourceEntityType / sourceEntityId
- targetEntityType / targetEntityId
- relationType
- direction
- description
- visibility

### PublicPage / PublicPageBlock

公開頁版面與內容來源分離，不直接把公開資料複製到 portal mock。

---

## 7. 安全與效能觀察

### 高風險

- `app.js` 的 toast 使用 `innerHTML`；未來若帶入使用者名稱或錯誤訊息，會形成 XSS 入口。
- `shell.js` 的 Hover Card 直接用 `innerHTML` 填入角色資料，沒有統一 escape。
- 公開頁的 role switch 只是 client-side 顯示，不是權限。
- 全站搜尋目前會把全部 mock 資料載入前端；正式版可能洩漏 private/unlisted 內容。
- URL query projectId 目前被完全信任；後端實作時必須逐筆授權，防止 IDOR。

### 效能與維護

- 每頁重複載入多組 Google Fonts，且字重過多。
- Shell 與 Workspace 各有一份 sidebar 實作。
- 每頁保留舊 topbar，再由 shell.css 隱藏，正式重構後應移除。
- 互動頁大量重新 `innerHTML` 整區重畫。
- relationship 大圖需要 viewport rendering。
- 圖庫正式上圖後需縮圖、lazy loading、responsive image。

---

## 8. 建議重構順序

### Phase 0：先完成規格，不寫後端

1. 鎖定 Project capabilities
2. 鎖定全域／企劃／公開 routes
3. 分清 Character、ProjectCharacterLink、Application、Submission
4. 分清 Account Settings 與 Project Settings
5. 建立頁面權限矩陣

### Phase 1：建立正式前端骨架

1. App Router + 共用 Shell
2. Project capability-driven navigation
3. Mock Adapter 與 API Adapter 介面
4. Project / Character / Entity stores
5. Internal / Public layout 分離

### Phase 2：先搬核心頁

1. Workspace Home
2. Project Overview
3. Character List
4. Character Detail / Editor
5. Worldview
6. Public Character Page

### Phase 3：共創能力

1. Project Settings
2. Public Page Builder / Renderer
3. Template Versioning
4. Character Applications
5. Roster
6. Members / Permissions
7. Content Submissions

### Phase 4：內容與工具

1. Story / Timeline
2. Gallery / Assets
3. Relationships
4. Search
5. Wishlist / Commissions
6. Height Compare

---

## 9. 實作前必須拍板的決策

1. Project 是否允許完全沒有角色、世界觀或故事？建議允許，模組可開關。
2. Character 是否可以不屬於任何 Project？建議可以。
3. Character 加入同一 Project 是否允許多個版本？需要定義。
4. 公開頁是否必須登入才能投稿？建議角色申請需登入；一般作品投稿視風險決定。
5. 主持人是否能修改參與者的 project-specific fields？建議欄位級授權。
6. 角色退出企劃後，企劃專用資料如何保存？建議 archived link，不直接刪除。
7. 委託與身高工具是全域功能還是企劃模組？建議全域資料、企劃 Filter View。
8. 公開角色的圖／文／一般視角，是不同 URL 還是同 URL query？正式分享建議使用穩定 share token / view preset。

---

## 10. 最優先修改結論

在任何後端與 Cloudflare 部署前，先修改以下產品決策：

1. 將 Project 改為能力組合，而非所有企劃都自帶共創管理。
2. Shell 導覽依 ProjectFeature + UserRole 動態生成。
3. 拆開全域角色庫與企劃角色列表。
4. 角色頁、角色編輯器與所有角色連結加入 characterId。
5. 將 Project Field Values 綁定 projectCharacterLink，而非 project。
6. 拆開角色加入申請與圖／文投稿。
7. 拆開公開 Renderer 與內部 Builder。
8. 拆開 Account Settings 與 Project Settings。

完成以上規劃後，才適合設計正式 schema、API contract 與 Cloudflare 部署架構。
