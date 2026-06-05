# CharacterHub 後端設計 spec

**日期：** 2026-06-05  
**範疇：** 多用戶 OC 資訊整理平台後端 + Cloudflare 部署  
**不含：** 委託流程（保留擴充路由，未來整合 COMMISSION-WEB）

---

## 1. 架構總覽

```
瀏覽器
  └── Cloudflare Pages（靜態前端）
        └── fetch → Cloudflare Workers（Hono.js API）
                      ├── D1（SQLite）— 用戶、OC、世界觀資料
                      ├── R2（Blob）  — 圖片檔案
                      └── KV          — JWT 黑名單
```

**技術選型：**
- Runtime: Cloudflare Workers
- Framework: Hono.js（輕量，Workers 原生支援）
- Database: Cloudflare D1（serverless SQLite）
- Storage: Cloudflare R2 + 外部 URL 兩者相容
- Session: JWT（httpOnly Cookie 存 refresh token）+ KV 黑名單

---

## 2. 資料庫 Schema（D1）

### 2.1 users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,      -- URL 用，只允許 a-z0-9-
  display_name TEXT,
  password_hash TEXT,                 -- NULL 表示純 OAuth 用戶
  avatar_url TEXT,
  bio TEXT,
  accent_color TEXT DEFAULT '#2E6F6A',
  social_links TEXT DEFAULT '[]',     -- JSON: [{platform, url}]
  notification_prefs TEXT DEFAULT '{}',-- JSON: {new_message:{email,discord},...}
  created_at INTEGER NOT NULL
);
```

### 2.2 oauth_accounts

```sql
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,             -- 'google' | 'github'
  provider_id TEXT NOT NULL,
  UNIQUE(provider, provider_id)
);
```

### 2.3 projects（故事世界 / 系列）

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                 -- URL 用，per-user 唯一
  name TEXT NOT NULL,                 -- 常夜物語
  sub_name TEXT,                      -- Tokoyo Tale
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);
```

### 2.4 ocs（Original Characters）

```sql
CREATE TABLE ocs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,                 -- per-user 唯一
  name TEXT NOT NULL,                 -- 宵霧
  rom TEXT,                           -- YOIGIRI
  species TEXT,                       -- 妖狐
  tagline TEXT,
  card_color TEXT DEFAULT '#8FA3B0',  -- 儀表板卡片用色
  display_mode TEXT DEFAULT 'full',   -- 'full' | 'avatar'
  avatar_url TEXT,
  cover_image_url TEXT,
  profile_fields TEXT DEFAULT '[]',   -- JSON: [{k, v}] 彈性欄位
  swatches TEXT DEFAULT '[]',         -- JSON: [{nm, rom, hex, note, grp}]
  checklist TEXT DEFAULT '[]',        -- JSON: [{type:'must'|'avoid', t, en?}]
  license TEXT DEFAULT '[]',          -- JSON: [{t, e, v:'allow'|'deny'}]
  markers TEXT DEFAULT '[]',          -- JSON: [{type:'point'|'rect', x, y, w?, h?, label}]
  visibility TEXT DEFAULT 'public',   -- 'public'|'unlisted'|'password'|'private'
  password_hash TEXT,                 -- password 模式才有值
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);
```

### 2.5 oc_media（圖庫）

```sql
CREATE TABLE oc_media (
  id TEXT PRIMARY KEY,
  oc_id TEXT NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,             -- '主立繪'|'表情差分'|'服裝設定'|'細節圖'|'委託作品'|'參考'
  url TEXT NOT NULL,                  -- R2 URL 或外部連結
  r2_key TEXT,                        -- 若為 R2 上傳才有，刪除時用
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

### 2.6 oc_relationships（關係圖）

```sql
CREATE TABLE oc_relationships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  oc_a_id TEXT NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  oc_b_id TEXT NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                -- '守護 · 契約'
  description TEXT,                   -- 長文詳述
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(oc_a_id, oc_b_id)
);
```

### 2.7 worldview_entries（世界觀條目）

```sql
CREATE TABLE worldview_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,                 -- 常夜國
  en_name TEXT,                       -- Tokoyo
  type TEXT,                          -- 'nation'|'org'|'family'|'place'|其他
  blurb TEXT,                         -- 一句話簡介
  setting TEXT,                       -- 長文設定
  linked_oc_ids TEXT DEFAULT '[]',    -- JSON: [oc_id, ...]
  gallery_labels TEXT DEFAULT '[]',   -- JSON: [label, ...] 暫時不和 R2 綁
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);
```

### 2.8 Indexes

```sql
CREATE INDEX idx_ocs_user_id ON ocs(user_id);
CREATE INDEX idx_ocs_project_id ON ocs(project_id);
CREATE INDEX idx_oc_media_oc_id ON oc_media(oc_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_worldview_user_id ON worldview_entries(user_id);
CREATE INDEX idx_worldview_project_id ON worldview_entries(project_id);
```

### 2.9 worldview_entry_rels（世界觀條目之間的關係）

```sql
CREATE TABLE worldview_entry_rels (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES worldview_entries(id) ON DELETE CASCADE,
  target_entry_id TEXT NOT NULL REFERENCES worldview_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                 -- '敵對'|'盟友'|'隸屬'|'分支'|'相關'
  UNIQUE(entry_id, target_entry_id)
);
```

### 2.10 KV（不進 D1）

| Key 格式 | Value | TTL |
|---------|-------|-----|
| `blacklist:{jti}` | `"1"` | token 到期時間 |
| `oauth_state:{state}` | `"{redirectUrl}"` | 60 秒 |

---

## 3. API 路由

所有路由前綴：`/api/v1`

### Auth
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| POST | `/auth/register` | ✗ | Email 註冊 |
| POST | `/auth/login` | ✗ | Email 登入 |
| POST | `/auth/logout` | ✓ | 撤銷 token |
| POST | `/auth/refresh` | cookie | 換發 access token |
| GET | `/auth/google` | ✗ | OAuth 起始 |
| GET | `/auth/google/callback` | ✗ | OAuth 回調 |
| GET | `/auth/github` | ✗ | OAuth 起始 |
| GET | `/auth/github/callback` | ✗ | OAuth 回調 |

### Users
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| GET | `/users/me` | ✓ | 自己的完整資料 |
| PATCH | `/users/me` | ✓ | 更新 profile / 設定 |
| GET | `/users/:username` | 部分 | 公開用戶頁 |

### Projects
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| GET | `/projects` | ✓ | 自己的 project 清單 |
| POST | `/projects` | ✓ | 建立 project |
| GET | `/projects/:id` | 部分 | 取得 project |
| PATCH | `/projects/:id` | ✓ owner | 更新 |
| DELETE | `/projects/:id` | ✓ owner | 刪除 |

### OCs
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| GET | `/ocs` | 部分 | 列表（支援 `?user=`、`?project=`、`?q=` 搜尋）|
| POST | `/ocs` | ✓ | 建立 OC |
| GET | `/ocs/:id` | 依 visibility | 取得單一 OC |
| PATCH | `/ocs/:id` | ✓ owner | 更新（支援部分更新）|
| DELETE | `/ocs/:id` | ✓ owner | 刪除 |

**Visibility 存取規則：**
- `public` → 任何人
- `unlisted` → 任何有 URL 的人（不出現在列表）
- `password` → 需在 header 帶 `X-OC-Password`，後端驗 hash
- `private` → 只有 owner

### OC Media
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| GET | `/ocs/:id/media` | 依 OC visibility | 圖庫列表 |
| POST | `/ocs/:id/media` | ✓ owner | 上傳到 R2 或送 external URL |
| PATCH | `/ocs/:id/media/:mid` | ✓ owner | 更新 caption / sort_order |
| DELETE | `/ocs/:id/media/:mid` | ✓ owner | 刪除（R2 檔案一併清除）|

### Relationships
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| GET | `/relationships` | ✓ | 自己的關係圖資料（可 `?project=` 篩選）|
| POST | `/relationships` | ✓ | 建立關係 |
| PATCH | `/relationships/:id` | ✓ owner | 更新 |
| DELETE | `/relationships/:id` | ✓ owner | 刪除 |

### Worldview
| Method | Path | Auth required | 說明 |
|--------|------|--------------|------|
| GET | `/worldview` | ✓ | 自己的條目（可 `?project=` 篩選）|
| POST | `/worldview` | ✓ | 建立條目 |
| GET | `/worldview/:id` | ✓ owner | 取得條目 |
| PATCH | `/worldview/:id` | ✓ owner | 更新 |
| DELETE | `/worldview/:id` | ✓ owner | 刪除 |
| POST | `/worldview/:id/rels` | ✓ owner | 新增條目關係 |
| DELETE | `/worldview/:id/rels/:relId` | ✓ owner | 刪除條目關係 |

### Commissions（stub，未實作）
| Method | Path | 說明 |
|--------|------|------|
| * | `/commissions/*` | 保留路由，回 `501 Not Implemented` |

---

## 4. Auth 流程

### JWT 策略
- **Access token**：15 分鐘，存在 JS memory（不存 localStorage）
- **Refresh token**：30 天，存在 httpOnly Cookie（`Secure; SameSite=Strict`）
- 每個 JWT 有唯一 `jti`，登出時寫入 KV blacklist

### Email 登入
```
POST /auth/login { email, password }
→ 查 users，驗 PBKDF2 hash（Web Crypto API，Workers 原生）
→ 建立 access token + refresh token
→ Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
→ 回傳 { access_token, user }
```

### OAuth 流程
```
GET /auth/google
→ 產生 state（存 KV，TTL 60s）
→ 302 → accounts.google.com/o/oauth2/auth?...

GET /auth/google/callback?code=...&state=...
→ 驗 state（從 KV 取，取後刪）
→ 用 code 換 tokens → 取 user info
→ 查 oauth_accounts：
    有 → 取得對應 user
    沒有但 email 已存在 → 合併（新增 oauth_accounts 記錄）
    沒有 → 建立 users + oauth_accounts
→ 同 Email 登入流程，發 JWT
→ 302 → 前端（帶 access_token 在 fragment 或 query）
```

### Middleware 驗證
```
Authorization: Bearer {access_token}
→ 驗 JWT 簽名
→ 驗未過期
→ 查 KV blacklist（jti 是否存在）
→ 通過 → ctx.set('user', payload)
```

---

## 5. 錯誤格式

所有 API 錯誤統一格式：

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token is expired or invalid"
  }
}
```

常用 error codes：`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION_ERROR`、`CONFLICT`

---

## 6. 檔案結構

```
oc-tools/
  api/
    src/
      index.ts                   ← Hono app 入口、路由掛載
      auth/
        router.ts                ← /auth/* 路由
        jwt.ts                   ← sign / verify / refresh token
        oauth.ts                 ← Google + GitHub flow
        password.ts              ← PBKDF2 hash / verify
      users/
        router.ts                ← /users/* 路由
      projects/
        router.ts                ← /projects/* 路由
      ocs/
        router.ts                ← /ocs/* 路由
        visibility.ts            ← visibility 存取邏輯
      media/
        router.ts                ← /ocs/:id/media/* 路由
        r2.ts                    ← R2 upload / delete helpers
      relationships/
        router.ts
      worldview/
        router.ts
      db/
        migrations/
          0001_init.sql          ← 所有 CREATE TABLE
        queries/
          users.ts
          ocs.ts
          projects.ts
          relationships.ts
          worldview.ts
      middleware/
        auth.ts                  ← JWT 驗證 middleware
        cors.ts
      types.ts                   ← Env bindings、共用型別
    wrangler.toml
    package.json
    tsconfig.json
  docs/
    superpowers/specs/
      2026-06-05-backend-design.md  ← 本文件
  assets/                        ← 現有前端資產
  pages/                         ← 現有 HTML 頁面
  index.html
```

---

## 7. wrangler.toml

```toml
name = "oc-tools-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "oc-tools-db"
database_id = ""    # wrangler d1 create oc-tools-db 後填入

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "oc-tools-media"

[[kv_namespaces]]
binding = "KV"
id = ""             # wrangler kv namespace create oc-tools-kv 後填入

[vars]
FRONTEND_URL = "https://oc-tools.pages.dev"

# Secrets（wrangler secret put 設定，不進 wrangler.toml）：
# JWT_SECRET
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
# GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
```

---

## 8. 部署流程

```bash
# 一次性：建立 Cloudflare 資源
wrangler d1 create oc-tools-db
wrangler r2 bucket create oc-tools-media
wrangler kv namespace create oc-tools-kv
# 填入上面三個指令輸出的 ID 到 wrangler.toml

# 執行 D1 migration
wrangler d1 execute oc-tools-db --file=src/db/migrations/0001_init.sql

# Secrets
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
# ... 其他 secrets

# 部署 API（Workers）
wrangler deploy

# 部署前端（Pages）
wrangler pages deploy . --project-name oc-tools

# 本機開發
wrangler dev              # Workers → localhost:8787
wrangler pages dev .      # Pages  → localhost:8788
```

---

## 9. 未來擴充（不在本 spec 範圍）

- `/commissions/*` 完整實作（整合 COMMISSION-WEB）
- OC 公開探索頁（`GET /explore`，僅列 `public` OC）
- 用戶間收藏功能
- Height compare 資料 API（目前前端純靜態）
