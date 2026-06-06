import { Hono } from 'hono';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken, signRefreshToken, verifyToken } from './jwt';
import { getGoogleAuthUrl, exchangeGoogleCode, getGoogleUser, getGitHubAuthUrl, exchangeGitHubCode, getGitHubUser, getGitHubPrimaryEmail } from './oauth';
import { createUser, getUserByEmail, getUserById, getOAuthAccount, createOAuthAccount } from '../db/queries/users';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/),
  password: z.string().min(8),
  display_name: z.string().max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function refreshCookie(token: string, maxAge: number) {
  return `refresh_token=${token}; HttpOnly; Secure; SameSite=None; Path=/api/v1/auth/refresh; Max-Age=${maxAge}`;
}

authRouter.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { email, username, password, display_name } = parsed.data;
  if (await getUserByEmail(c.env.DB, email)) return errorResponse(c, 409, 'CONFLICT', 'Email already registered');
  if (await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()) {
    return errorResponse(c, 409, 'CONFLICT', 'Username taken');
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await createUser(c.env.DB, { id, email, username, display_name, password_hash: await hashPassword(password), created_at: now });

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(id, username, c.env.JWT_SECRET),
    signRefreshToken(id, username, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(refreshToken, REFRESH_MAX_AGE));
  return c.json({ access_token: accessToken, user: { id, email, username, display_name: display_name ?? null } }, 201);
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { email, password } = parsed.data;
  const user = await getUserByEmail(c.env.DB, email);
  if (!user || !user.password_hash) return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid credentials');
  if (!await verifyPassword(password, user.password_hash)) return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid credentials');

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.username, c.env.JWT_SECRET),
    signRefreshToken(user.id, user.username, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(refreshToken, REFRESH_MAX_AGE));
  return c.json({ access_token: accessToken, user: { id: user.id, email: user.email, username: user.username, display_name: user.display_name } });
});

authRouter.post('/logout', async (c) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await c.env.KV.put(`blacklist:${payload.jti}`, '1', { expirationTtl: ttl });
    } catch { /* already invalid */ }
  }
  c.header('Set-Cookie', refreshCookie('', 0));
  return c.json({ ok: true });
});

authRouter.post('/refresh', async (c) => {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(/refresh_token=([^;]+)/);
  if (!match) return errorResponse(c, 401, 'UNAUTHORIZED', 'No refresh token');

  let payload;
  try {
    payload = await verifyToken(match[1], c.env.JWT_SECRET);
  } catch {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Refresh token invalid or expired');
  }

  if (await c.env.KV.get(`blacklist:${payload.jti}`)) return errorResponse(c, 401, 'UNAUTHORIZED', 'Token revoked');

  const user = await getUserById(c.env.DB, payload.sub);
  if (!user) return errorResponse(c, 404, 'NOT_FOUND', 'User not found');

  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await c.env.KV.put(`blacklist:${payload.jti}`, '1', { expirationTtl: ttl });

  const [newAccess, newRefresh] = await Promise.all([
    signAccessToken(user.id, user.username, c.env.JWT_SECRET),
    signRefreshToken(user.id, user.username, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(newRefresh, REFRESH_MAX_AGE));
  return c.json({ access_token: newAccess });
});

// ── OAuth helpers ──────────────────────────────────────────────────────────────

async function findOrCreateOAuthUser(
  db: D1Database,
  provider: string, providerId: string,
  email: string, name: string, avatarUrl: string,
): Promise<{ id: string; username: string }> {
  const existing = await getOAuthAccount(db, provider, providerId);
  if (existing) {
    const user = await getUserById(db, existing.user_id);
    return { id: user!.id, username: user!.username };
  }
  const byEmail = await getUserByEmail(db, email);
  if (byEmail) {
    await createOAuthAccount(db, crypto.randomUUID(), byEmail.id, provider, providerId);
    return { id: byEmail.id, username: byEmail.username };
  }
  const id = crypto.randomUUID();
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'user';
  let username = base;
  let suffix = 1;
  while (await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()) {
    username = `${base}-${suffix++}`;
  }
  await createUser(db, { id, email, username, display_name: name, avatar_url: avatarUrl, created_at: Math.floor(Date.now() / 1000) });
  await createOAuthAccount(db, crypto.randomUUID(), id, provider, providerId);
  return { id, username };
}

async function issueTokensAndRedirect(c: any, userId: string, username: string, frontendUrl: string) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId, username, c.env.JWT_SECRET),
    signRefreshToken(userId, username, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(refreshToken, REFRESH_MAX_AGE));
  return c.redirect(`${frontendUrl}/pages/dashboard.html#token=${accessToken}`);
}

authRouter.get('/google', async (c) => {
  const state = crypto.randomUUID();
  await c.env.KV.put(`oauth_state:${state}`, '1', { expirationTtl: 60 });
  const redirectUri = new URL('/api/v1/auth/google/callback', c.req.url).toString();
  return c.redirect(await getGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state));
});

authRouter.get('/google/callback', async (c) => {
  const { code, state } = c.req.query();
  if (!state || !await c.env.KV.get(`oauth_state:${state}`)) return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid state');
  await c.env.KV.delete(`oauth_state:${state}`);

  const redirectUri = new URL('/api/v1/auth/google/callback', c.req.url).toString();
  const tokens = await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redirectUri);
  const gUser = await getGoogleUser(tokens.access_token);
  const { id, username } = await findOrCreateOAuthUser(c.env.DB, 'google', gUser.id, gUser.email, gUser.name, gUser.picture);
  return issueTokensAndRedirect(c, id, username, c.env.FRONTEND_URL);
});

authRouter.get('/github', async (c) => {
  const state = crypto.randomUUID();
  await c.env.KV.put(`oauth_state:${state}`, '1', { expirationTtl: 60 });
  return c.redirect(await getGitHubAuthUrl(c.env.GITHUB_CLIENT_ID, state));
});

authRouter.get('/github/callback', async (c) => {
  const { code, state } = c.req.query();
  if (!state || !await c.env.KV.get(`oauth_state:${state}`)) return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid state');
  await c.env.KV.delete(`oauth_state:${state}`);

  const tokens = await exchangeGitHubCode(code, c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
  const ghUser = await getGitHubUser(tokens.access_token);
  const email = ghUser.email ?? await getGitHubPrimaryEmail(tokens.access_token);
  if (!email) return errorResponse(c, 400, 'VALIDATION_ERROR', 'GitHub account has no verified email');

  const { id, username } = await findOrCreateOAuthUser(c.env.DB, 'github', String(ghUser.id), email, ghUser.name || ghUser.login, ghUser.avatar_url);
  return issueTokensAndRedirect(c, id, username, c.env.FRONTEND_URL);
});
