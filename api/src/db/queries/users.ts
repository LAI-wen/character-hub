import type { User } from '../../types';

export function getUserById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export function getUserByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
}

export function getUserByUsername(db: D1Database, username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
}

export function createUser(db: D1Database, user: {
  id: string; email: string; username: string;
  display_name?: string; password_hash?: string; avatar_url?: string; bio?: string;
  accent_color?: string; social_links?: string; notification_prefs?: string; created_at: number;
}) {
  return db.prepare(`
    INSERT INTO users (id, email, username, display_name, password_hash, avatar_url, bio,
      accent_color, social_links, notification_prefs, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id, user.email, user.username,
    user.display_name ?? null, user.password_hash ?? null,
    user.avatar_url ?? null, user.bio ?? null,
    user.accent_color ?? '#2E6F6A',
    user.social_links ?? '[]',
    user.notification_prefs ?? '{}',
    user.created_at
  ).run();
}

export function updateUser(db: D1Database, id: string, fields: {
  display_name?: string; avatar_url?: string | null; bio?: string;
  accent_color?: string; social_links?: string; notification_prefs?: string;
}) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (!sets.length) return Promise.resolve();
  vals.push(id);
  return db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export function getOAuthAccount(db: D1Database, provider: string, providerId: string) {
  return db.prepare(
    'SELECT * FROM oauth_accounts WHERE provider = ? AND provider_id = ?'
  ).bind(provider, providerId).first<{ id: string; user_id: string; provider: string; provider_id: string }>();
}

export function createOAuthAccount(db: D1Database, id: string, userId: string, provider: string, providerId: string) {
  return db.prepare(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_id) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, provider, providerId).run();
}
