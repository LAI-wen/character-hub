# 安全性稽核報告
> 稽核日期：2026-06-13 | 範圍：api/src + apps/web/src

---

## 風險等級說明

| 等級 | 說明 |
|------|------|
| 🔴 Critical | 可被直接利用，資料外洩或帳號接管 |
| 🟠 High | 有條件可被利用，需特定情境 |
| 🟡 Medium | 不良實踐，在特定條件下成為漏洞 |
| 🟢 Low | 輕微違反最佳實踐，風險低 |

---

## 一、後端 API 安全問題

---

### [S-01] 🔴 `/api/media/*` — R2 媒體代理完全無認證

**檔案：** `api/src/index.ts`，lines 31–40  
**分類：** 未授權資源存取

```ts
app.get('/api/media/*', async (c) => {
  const key = c.req.path.slice('/api/media/'.length);
  const obj = await c.env.BUCKET.get(key);
  // 無任何 auth 檢查
```

所有 R2 物件都可以透過猜測 key（格式為 `avatars/{character.id}/{uuid}.jpg`）直接存取，完全不需要認證。私有角色的圖片仍可被任何人取得。

**為什麼是問題：** 角色設計圖和委託說明圖在角色被設為「私人」後，理應只有擁有者可看到。但這個 endpoint 讓任何人只要知道 key 就能存取。

**如果不修：** 用戶設為 private 的角色圖片實際上等於公開。刪除角色後其 R2 物件仍可被存取。

---

### [S-02] 🔴 `GET /api/app/search` — 必定 Runtime Crash

**檔案：** `api/src/app/router.ts`，line 2513  
**分類：** 程式錯誤 / DoS

```ts
const viewer = c.get('viewer')!;  // 'viewer' key 從未被設定
// c.get('viewer') 永遠是 undefined
```

`Variables` 型別只定義了 `user`，從未設定 `viewer`。任何呼叫此 endpoint 的請求都會 500 crash。

**如果不修：** 搜尋功能永遠無法使用。

---

### [S-03] 🔴 Demo Auth Bypass — APP_ENV 未設定時自動開啟

**檔案：** `api/src/app/auth.ts`，lines 79–84  
**分類：** 認證繞過

```ts
export function isDemoAuthAllowed(c: AppContext) {
  const appEnv = c.env.APP_ENV?.toLowerCase();
  const explicitDemo = c.env.DEMO_AUTH_ENABLED === 'true';
  const hostname = new URL(c.req.url).hostname;
  return explicitDemo || appEnv === 'local' || appEnv === 'demo' || appEnv === 'test' || isLocalHostname(hostname);
}
```

`APP_ENV` 在 `wrangler.toml` 的 `[vars]` 區塊中**未設定**。如果部署時忘記設定，`appEnv` 為 `undefined`，判斷退到 `isLocalHostname(hostname)`。攻擊者可在 Wrangler dev tunnel / preview URL 上傳送 `X-Demo-User-Id: <任意用戶ID>` 以任何人的身分認證。

**如果不修：** 預覽或測試環境中，任何人都可以假冒任何帳號（包括管理員）。

---

### [S-04] 🔴 `DELETE /worldview/:id/rels/:relId` — 跨用戶授權錯誤

**檔案：** `api/src/worldview/router.ts`，lines 114–121  
**分類：** 越權操作

```ts
// 只檢查 entry 是否屬於 user，但不驗證 rel 是否屬於這個 entry
await deleteEntryRel(c.env.DB, c.req.param('relId'));
```

任何已認證用戶，只要擁有**任何一個** worldview entry，就可以刪除**任何其他人**的 worldview rel。

**如果不修：** 惡意用戶可以系統性地刪除其他人的世界觀關聯，造成資料毀損。

---

### [S-05] 🟠 OAuth 帳號自動合併 — 未經用戶確認

**檔案：** `api/src/auth/router.ts`，lines 185–200  
**分類：** 帳號接管

```ts
const byEmail = await getUserByEmail(db, email);
if (byEmail) {
  await createOAuthAccount(db, ...);  // 靜默合併，不詢問用戶
  return { id: byEmail.id, handle: byEmail.username };
}
```

若用戶以 email+密碼注冊，之後用同一 email 的 OAuth 提供者登入，兩個帳號會自動合併，**不會詢問用戶確認**。若攻擊者控制了一個 OAuth 帳號且 email 與目標帳號相同（OAuth provider 的 email 未被驗證），即可接管帳號。

**如果不修：** Email 欺騙攻擊可導致帳號接管。

---

### [S-06] 🟠 OAuth Access Token 在 URL Query Parameter 中傳遞

**檔案：** `api/src/auth/router.ts`，lines 253–263  
**分類：** Token 洩漏

```ts
return c.redirect(`${base}/auth/callback?token=${encodeURIComponent(accessToken)}`);
```

Access token 作為 URL query parameter 傳遞，會出現在：
- 前端 server 的 access log 中
- 若 callback 頁面載入外部資源，會在 Referer header 中洩漏
- 瀏覽器歷史記錄

**如果不修：** 任何 server-side log 都會靜默收集有效的 access token（24小時TTL）。

---

### [S-07] 🟠 密碼比對非恆定時間 (Timing Attack)

**檔案：** `api/src/auth/password.ts`，lines 27–29  
**分類：** 側信道攻擊

```ts
return newHashHex === hashHex;  // 字串比較短路，非恆定時間
```

應使用 `crypto.subtle.timingSafeEqual` 或以 `Uint8Array` 進行恆定時間比較。

**如果不修：** 理論上可透過網路時序分析洩漏密碼 hash 的位元組。

---

### [S-08] 🟠 CSRF Token 發出但**從未驗證**

**檔案：** `api/src/auth/router.ts`，lines 148–152  
**分類：** CSRF 防護形同虛設

```ts
const csrfToken = crypto.randomUUID();
await c.env.KV.put(`csrf:${csrfToken}`, match[1].slice(-16), { expirationTtl: 3600 });
// 搜遍全 codebase：沒有任何 route 讀取 X-CSRF-Token 進行驗證
```

**如果不修：** CSRF 防護是 security theatre——token 存在但從未執行任何保護。

---

### [S-09] 🟡 `btoa()` 用於可能含非 ASCII 字元的 JWT Payload

**檔案：** `api/src/auth/jwt.ts`，lines 25–28  
**分類：** Runtime Error

```ts
function encodeObj(obj: object): string {
  return btoa(JSON.stringify(obj))  // btoa 只支援 Latin-1
```

如果 username 含非 ASCII 字元（雖然 handle 格式是 `^[a-z0-9-]+$`，但若未來放寬或 display_name 被加入 payload），`btoa` 會拋出 `InvalidCharacterError`，導致登入失敗。

---

### [S-10] 🟡 舊版 `/api/v1/*` Router 無 `onError` 處理器

**檔案：** `api/src/ocs/router.ts`、`src/worldview/router.ts` 等  
**分類：** 資訊洩漏

舊版 router 未設定 `onError`。任何未捕獲異常會產生 Hono 預設的 text/plain 500 回應，可能包含 stack trace。

---

### [S-11] 🟡 R2 物件更換頭像時舊物件未刪除

**檔案：** `api/src/app/router.ts`，lines 1296–1319  
**分類：** 儲存洩漏 / 隱私

更換頭像時不刪除舊的 R2 物件。舊物件的 URL 若被快取或分享，仍可持續存取。

---

### [S-12] 🟡 CORS 在 local/demo 模式下允許任何 localhost origin

**檔案：** `api/src/middleware/cors.ts`，lines 27–34  
**分類：** 開發環境 CORS 過度寬鬆

`http://localhost:31337`（開發者機器上的任意 port）都可發出認證請求，意味開發者機器上的任何惡意程式都可向 dev API 發送請求。

---

## 二、前端安全問題

---

### [S-13] 🟡 `dangerouslySetInnerHTML` 使用 SVG 字串

**檔案：** `apps/web/src/routes/layouts/AppLayout.tsx`，line 79；`AccountSettingsPage.tsx`，line 46；`OverviewPage.tsx`，`StoryPage.tsx`，`GalleryPage.tsx`，`TimelinePage.tsx`

```tsx
<div dangerouslySetInnerHTML={{ __html: ICONS[k] ?? "" }} />
```

目前 `ICONS` 是程式碼內的靜態常數，不含用戶輸入，**現在不是問題**。但這個 pattern 一旦被正規化，任何開發者在 `ICONS` 中加入用戶控制的值就會造成 XSS。正確做法是使用 `Icon.tsx` 元件。

---

### [S-14] 🟡 `OAuthCallbackPage.tsx`：access_token 存入 sessionStorage 但從未被讀取

**檔案：** `apps/web/src/features/auth/OAuthCallbackPage.tsx`，line 9

```ts
sessionStorage.setItem("access_token", token);
```

此 token 在整個 codebase 中從未被讀取。Token 在 sessionStorage 中孤懸，可被同源的任何 XSS 攻擊讀取。

**如果不修：** 若未來有 XSS 漏洞，攻擊者可取得此 token 冒充用戶。應移除此行。

---

### [S-15] 🟡 `AccountSettingsPage.tsx`：`localStorage.clear()` 清除全部資料

**檔案：** `apps/web/src/features/account/AccountSettingsPage.tsx`，line 157

```tsx
onClick={() => { localStorage.clear(); alert("本地資料已清除") }}
```

清除**所有**同源 localStorage，包含語言偏好、最近瀏覽記錄等，沒有 undo。

---

### [S-16] 🟡 `ProjectLayout.tsx`：`viewerRole` 預設為 `"owner"`

**檔案：** `apps/web/src/routes/layouts/ProjectLayout.tsx`，line 51

```ts
const role: ProjectRole = (data.viewerRole as ProjectRole) ?? "owner"
```

API 若回傳 `null` viewerRole（例如非成員查看公開企劃），前端會授予 owner 等級的 context。下游的 UI 權限判斷若讀取此 context，可能顯示不應看到的操作選項。

---

### [S-17] 🟡 未驗證的 JSON 匯入直接 cast 為 domain type

**檔案：** `apps/web/src/store/useCharacterStore.tsx`；`apps/web/src/components/CharBackupModal.tsx`

```ts
const c = obj as Character;  // 未驗證，直接 cast
```

用戶上傳的 JSON 備份若含惡意資料（如 `avatarUrl: "javascript:..."` 或超長字串），會被直接當成合法角色資料套用到 store，可能造成 XSS 或 store 崩潰。

---

### [S-18] 🟢 Demo 資料含開發者個人 handle

**檔案：** `api/src/demo/data.ts`，line 22

```ts
handle: 'yoi-studio',
```

Demo endpoint 完全無認證，會回傳包含作者個人 handle 和企劃名稱的資料。若此 endpoint 被意外部署到公開環境，這些個人資訊即等於公開。

---

## 三、依嚴重程度彙整

| ID | 嚴重度 | 問題 | 檔案 |
|----|--------|------|------|
| S-01 | 🔴 Critical | R2 媒體代理無認證 | `api/src/index.ts:31` |
| S-02 | 🔴 Critical | 搜尋 endpoint 必定 crash | `api/src/app/router.ts:2513` |
| S-03 | 🔴 Critical | Demo auth bypass | `api/src/app/auth.ts:79` |
| S-04 | 🔴 Critical | Worldview rel 越權刪除 | `api/src/worldview/router.ts:114` |
| S-05 | 🟠 High | OAuth 帳號自動合併 | `api/src/auth/router.ts:185` |
| S-06 | 🟠 High | Token 在 URL 中洩漏 | `api/src/auth/router.ts:262` |
| S-07 | 🟠 High | 密碼比對非恆定時間 | `api/src/auth/password.ts:28` |
| S-08 | 🟠 High | CSRF token 從未驗證 | `api/src/auth/router.ts:148` |
| S-09 | 🟡 Medium | btoa 不支援 Unicode | `api/src/auth/jwt.ts:26` |
| S-10 | 🟡 Medium | 舊版 router 無 error handler | `api/src/ocs/router.ts` 等 |
| S-11 | 🟡 Medium | 舊頭像 R2 物件未刪除 | `api/src/app/router.ts:1312` |
| S-12 | 🟡 Medium | CORS 允許任意 localhost | `api/src/middleware/cors.ts:27` |
| S-13 | 🟡 Medium | dangerouslySetInnerHTML 模式正規化 | `AppLayout.tsx:79` 等 |
| S-14 | 🟡 Medium | 孤懸 sessionStorage token | `OAuthCallbackPage.tsx:9` |
| S-15 | 🟡 Medium | localStorage.clear() 無 undo | `AccountSettingsPage.tsx:157` |
| S-16 | 🟡 Medium | viewerRole 預設 owner | `ProjectLayout.tsx:51` |
| S-17 | 🟡 Medium | JSON import 未驗證 | `useCharacterStore.tsx` |
| S-18 | 🟢 Low | Demo 含個人 handle | `api/src/demo/data.ts:22` |

---

## 四、建議優先修復順序

1. **立即：** S-01（加認證到 media endpoint）、S-04（修 worldview rel 授權）
2. **本週：** S-02（修 search crash）、S-03（在 wrangler.toml 設 APP_ENV）
3. **下週：** S-06（token 改用 fragment 或後端 session），S-08（實作 CSRF 驗證）
4. **本月：** S-05（OAuth 合併加確認步驟）、S-14（移除孤懸 token）、S-16（修 viewerRole 預設值）
5. **技術債：** S-07（恆定時間比對）、S-17（JSON import 加 Zod 驗證）
