# Security Baseline

**Date:** 2026-06-11

---

## 現況問題（來自審計）

| 問題 | 位置 | 嚴重度 |
|------|------|--------|
| `access_token` 存 sessionStorage | `_archive/app/adapters/api-client.js` | ⚠️ 高 |
| `svg.innerHTML = ICONS[name]` | `_archive/app/router.js:81` | ℹ️ 低（控制字串，但模式危險）|
| Demo auth 無保護（`X-Demo-User-Id` header 任何人可偽造）| `api/src/demo/` | ⚠️ 中（只在 demo env）|
| 無 CSRF 保護 | `api/src/middleware/` | ⚠️ 高（cookie session 啟用後）|
| 無 CSP header | `api/src/index.ts` | ℹ️ 中 |
| `activeProjectId` 從 localStorage（用戶可偽造）| `_archive/app/router.js:90` | ℹ️ 低（serverside 有驗證）|

---

## 目標狀態（Batch 1 完成後）

### 1. Token 儲存：HttpOnly Cookie

```
舊：sessionStorage.setItem('access_token', token)
    fetch + Authorization: Bearer ${token}

新：POST /api/v1/auth/login
    ← Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
    所有後續 fetch 帶 credentials: 'include'
    JS 看不到 token
```

**實作工作：**

- `api/src/auth/router.ts`：login 成功 → `setCookie(c, 'session', token, { httpOnly: true, secure: true, sameSite: 'Strict' })`
- `apps/web/lib/api/client.ts`：`credentials: 'include'`（已在架構設計中）
- `api/src/app/auth.ts`：`getSessionUser()` 改從 cookie 讀，而非 `X-Demo-User-Id`

### 2. CSRF 保護

Cookie session 啟用後，需要 CSRF token 防止跨站 state-changing requests。

**方案：Synchronizer Token Pattern（STP）**

```
GET /api/v1/auth/csrf   ← 每次頁面載入取一次
← { csrfToken: "..." }  （存 in-memory，非 localStorage）

每個 POST/PATCH/PUT/DELETE 帶：
X-CSRF-Token: <token>

Worker 驗證：
- cookie session 有效
- X-CSRF-Token 與 session 中紀錄的 CSRF token 相符
```

```ts
// lib/api/client.ts（概念）
let _csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken
  const res = await fetch("/api/v1/auth/csrf", { credentials: "include" })
  const { csrfToken } = await res.json()
  _csrfToken = csrfToken
  return csrfToken
}
```

**僅限 mutating 方法（POST/PATCH/PUT/DELETE）附 CSRF token；GET 不需要。**

### 3. CSP Header

```ts
// api/src/index.ts（或 middleware）
app.use("*", async (c, next) => {
  await next()
  c.header(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",   // CSS-in-JS 暫時允許
      "img-src 'self' data: https://r2.example.com", // R2 圖片
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  )
})
```

### 4. 其他 Security Headers

```ts
c.header("X-Content-Type-Options", "nosniff")
c.header("X-Frame-Options", "DENY")
c.header("Referrer-Policy", "strict-origin-when-cross-origin")
```

### 5. Server-side Ownership 驗證

每個 project-scoped 端點必須通過：

```
1. getSessionUser(c)       → 取得當前 viewer（403 if none）
2. getVisibleProject(id)   → 取得 project（404 if not found）
3. requirePermission(role, action) → 403 if insufficient role
```

**PermissionGate 在 React 是 UI-only，不能作為唯一防線。**

```tsx
// React PermissionGate（UI 層，隱藏 UI 元素）
<PermissionGate action="create_relationship">
  <Button>新增關係</Button>
</PermissionGate>

// API 層（實際防線）
// api/src/app/router.ts
const role = await getProjectRole(c, projectId)
requirePermission(role, "create_relationship")
```

### 6. 移除 Demo Auth

Demo auth（`X-Demo-User-Id` header）在 Batch 1 auth 實作完成後移除。

移除清單：
- `api/src/demo/`（整個目錄封存）
- `api/src/middleware/cors.ts` 中 demo origin 特例
- `api/src/app/auth.ts` 中 `getDemoUser()` 分支

移除前確保：
- 正式 login flow 可用
- `apps/web` 可透過 cookie session 存取所有 app 端點

---

## 安全檢查清單（Batch 1 完成前）

- [ ] `access_token` 不出現在 localStorage / sessionStorage / URL 中
- [ ] 所有 API 請求帶 `credentials: 'include'`
- [ ] Worker login 設 HttpOnly Secure SameSite=Strict cookie
- [ ] POST/PATCH/DELETE 帶 CSRF token，Worker 驗證
- [ ] CSP header 就位
- [ ] 沒有 `innerHTML` 賦值使用者輸入（SVG icon 允許，因為來自靜態常數）
- [ ] 所有 projectId scope 端點驗證 ownership（`getVisibleProject` + `requirePermission`）
- [ ] Demo auth 在 production 環境完全停用

---

## 保留 / 不動

| 機制 | 狀態 | 理由 |
|------|------|------|
| `requirePermission()` in `auth.ts` | ✅ 完整保留 | 權限矩陣已完整，直接用 |
| `getVisibleProject()` | ✅ 保留 | 已有 ownership check |
| `assertRelationshipLayoutShape()` | ✅ 保留 | 防止超大 payload（50KB 限制）|
| D1 schema | ✅ 不動 | 已有 isArchived / visibility 欄位 |
