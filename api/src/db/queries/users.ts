type UserRow = {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  avatar_asset_id: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
};

type UserWithCredentials = UserRow & { password_hash: string | null };

export type AppUser = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  password_hash: string | null;
  avatar_url: string | null;
};

function mapUser(row: UserRow, passwordHash: string | null = null): AppUser {
  return {
    id: row.id,
    email: row.email,
    username: row.handle,
    display_name: row.display_name,
    password_hash: passwordHash,
    avatar_url: row.avatar_asset_id ?? null,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<AppUser | null> {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  if (!row) return null;
  return mapUser(row);
}

export async function getUserByEmail(db: D1Database, email: string): Promise<AppUser | null> {
  const row = await db
    .prepare(
      `SELECT u.*, uc.password_hash
       FROM users u
       LEFT JOIN user_credentials uc ON uc.user_id = u.id
       WHERE LOWER(u.email) = LOWER(?)`,
    )
    .bind(email)
    .first<UserWithCredentials>();
  if (!row) return null;
  return mapUser(row, row.password_hash ?? null);
}

export async function createUser(
  db: D1Database,
  user: {
    id: string;
    email: string;
    handle: string;
    display_name?: string;
    password_hash?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, email, handle, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(user.id, user.email, user.handle, user.display_name ?? user.handle, now, now)
    .run();

  if (user.password_hash) {
    await db
      .prepare(
        `INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)`,
      )
      .bind(user.id, user.password_hash)
      .run();
  }
}

export async function getOAuthAccount(
  db: D1Database,
  provider: string,
  providerId: string,
): Promise<{ id: string; user_id: string } | null> {
  return db
    .prepare('SELECT id, user_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?')
    .bind(provider, providerId)
    .first<{ id: string; user_id: string }>();
}

export async function getUserByUsername(db: D1Database, handle: string): Promise<AppUser | null> {
  const row = await db.prepare('SELECT * FROM users WHERE handle = ?').bind(handle).first<{ id: string; email: string; handle: string; display_name: string; avatar_asset_id: string | null; bio: string | null; created_at: string; updated_at: string; disabled_at: string | null }>();
  if (!row) return null;
  return { id: row.id, email: row.email, username: row.handle, display_name: row.display_name, password_hash: null, avatar_url: row.avatar_asset_id ?? null };
}

export async function updateUser(
  db: D1Database,
  id: string,
  fields: { display_name?: string; bio?: string; avatar_url?: string | null; social_links?: string; notification_prefs?: string; accent_color?: string },
): Promise<void> {
  const allowed = ['display_name', 'bio'] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(fields[key]);
    }
  }
  if (!sets.length) return;
  sets.push('updated_at = ?');
  vals.push(new Date().toISOString());
  vals.push(id);
  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export async function createOAuthAccount(
  db: D1Database,
  id: string,
  userId: string,
  provider: string,
  providerId: string,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO oauth_accounts (id, user_id, provider, provider_id) VALUES (?, ?, ?, ?)',
    )
    .bind(id, userId, provider, providerId)
    .run();
}
