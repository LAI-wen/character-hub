import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken, signRefreshToken, signSessionToken, verifyToken } from './jwt';
import { getGoogleAuthUrl, exchangeGoogleCode, getGoogleUser, getGitHubAuthUrl, exchangeGitHubCode, getGitHubUser, getGitHubPrimaryEmail } from './oauth';
import { createUser, getUserByEmail, getUserById, getOAuthAccount, createOAuthAccount } from '../db/queries/users';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

type AuthRouteEnv = { Bindings: Env; Variables: Variables };
type AuthContext = Context<AuthRouteEnv>;

export const authRouter = new Hono<AuthRouteEnv>();

const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const registerSchema = z.object({
  email: z.string().email(),
  handle: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/),
  password: z.string().min(8).max(1000),
  display_name: z.string().max(64).optional(),
  invite_code: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().max(1000),
});

function refreshCookie(token: string, maxAge: number) {
  return `refresh_token=${token}; HttpOnly; Secure; SameSite=None; Path=/api/v1/auth/refresh; Max-Age=${maxAge}`;
}

function sessionCookie(token: string, maxAge: number, isLocal: boolean) {
  const secure = isLocal ? '' : '; Secure';
  return `session=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function isLocalRequest(c: AuthContext): boolean {
  const appEnv = c.env.APP_ENV?.toLowerCase();
  const hostname = new URL(c.req.url).hostname;
  return appEnv === 'local' || appEnv === 'test' || hostname === 'localhost' || hostname === '127.0.0.1';
}

authRouter.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { email, handle, password, display_name, invite_code } = parsed.data;

  const inviteRow = await c.env.DB.prepare(
    'SELECT id FROM invite_codes WHERE code = ? AND used_at IS NULL',
  ).bind(invite_code.toUpperCase()).first<{ id: string }>();
  if (!inviteRow) return errorResponse(c, 400, 'INVITE_INVALID', '邀請碼無效或已被使用');

  if (await getUserByEmail(c.env.DB, email)) return errorResponse(c, 409, 'CONFLICT', 'Email already registered');
  if (await c.env.DB.prepare('SELECT id FROM users WHERE handle = ?').bind(handle).first()) {
    return errorResponse(c, 409, 'CONFLICT', 'Handle taken');
  }

  const id = crypto.randomUUID();
  await createUser(c.env.DB, { id, email, handle, display_name, password_hash: await hashPassword(password) });
  await c.env.DB.prepare(
    'UPDATE invite_codes SET used_by_user_id = ?, used_at = ? WHERE id = ?',
  ).bind(id, new Date().toISOString(), inviteRow.id).run();

  const [refreshToken, sessionToken] = await Promise.all([
    signRefreshToken(id, handle, c.env.JWT_SECRET),
    signSessionToken(id, handle, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(refreshToken, REFRESH_MAX_AGE));
  c.header('Set-Cookie', sessionCookie(sessionToken, REFRESH_MAX_AGE, isLocalRequest(c)));
  return c.json({ data: { id, email, handle, displayName: display_name ?? handle } }, 201);
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { email, password } = parsed.data;
  const user = await getUserByEmail(c.env.DB, email);
  if (!user || !user.password_hash) return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid credentials');
  if (!await verifyPassword(password, user.password_hash)) return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid credentials');

  const [refreshToken, sessionToken] = await Promise.all([
    signRefreshToken(user.id, user.username, c.env.JWT_SECRET),
    signSessionToken(user.id, user.username, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(refreshToken, REFRESH_MAX_AGE));
  c.header('Set-Cookie', sessionCookie(sessionToken, REFRESH_MAX_AGE, isLocalRequest(c)));
  return c.json({ data: { id: user.id, email: user.email, displayName: user.display_name ?? user.username } });
});

authRouter.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? '';
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
  if (sessionMatch) {
    try {
      const payload = await verifyToken(sessionMatch[1], c.env.JWT_SECRET);
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await c.env.KV.put(`blacklist:${payload.jti}`, '1', { expirationTtl: ttl });
    } catch { /* already invalid */ }
  }
  c.header('Set-Cookie', refreshCookie('', 0));
  c.header('Set-Cookie', sessionCookie('', 0, isLocalRequest(c)));
  return c.json({ ok: true });
});

authRouter.get('/me', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? '';
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return errorResponse(c, 401, 'UNAUTHORIZED', 'Not authenticated');

  let payload;
  try {
    payload = await verifyToken(match[1], c.env.JWT_SECRET);
  } catch {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Session invalid or expired');
  }

  if (await c.env.KV.get(`blacklist:${payload.jti}`)) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Session revoked');
  }

  const user = await getUserById(c.env.DB, payload.sub);
  if (!user) return errorResponse(c, 404, 'NOT_FOUND', 'User not found');

  return c.json({
    data: {
      id: user.id,
      email: user.email,
      displayName: user.display_name ?? user.username,
    },
  });
});

authRouter.get('/csrf', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? '';
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return errorResponse(c, 401, 'UNAUTHORIZED', 'Not authenticated');

  try {
    await verifyToken(match[1], c.env.JWT_SECRET);
  } catch {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Session invalid or expired');
  }

  const csrfToken = crypto.randomUUID();
  await c.env.KV.put(`csrf:${csrfToken}`, match[1].slice(-16), { expirationTtl: 3600 });
  return c.json({ csrfToken });
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

// Returns the existing user, or null if this is a brand-new identity.
async function findExistingOAuthUser(
  db: D1Database,
  provider: string, providerId: string,
  email: string,
): Promise<{ id: string; handle: string } | null> {
  const existing = await getOAuthAccount(db, provider, providerId);
  if (existing) {
    const user = await getUserById(db, existing.user_id);
    if (!user) return null;
    return { id: user.id, handle: user.username };
  }
  const byEmail = await getUserByEmail(db, email);
  if (byEmail) {
    await createOAuthAccount(db, crypto.randomUUID(), byEmail.id, provider, providerId);
    return { id: byEmail.id, handle: byEmail.username };
  }
  return null;
}

// Creates a new user + OAuth account. Call only after invite has been validated.
async function createNewOAuthUser(
  db: D1Database,
  email: string, name: string,
  provider: string, providerId: string,
): Promise<{ id: string; handle: string }> {
  const id = crypto.randomUUID();
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'user';
  let handle = base;
  let suffix = 1;
  while (await db.prepare('SELECT id FROM users WHERE handle = ?').bind(handle).first()) {
    handle = `${base}-${suffix++}`;
  }
  await createUser(db, { id, email: email.toLowerCase(), handle, display_name: name });
  await createOAuthAccount(db, crypto.randomUUID(), id, provider, providerId);
  return { id, handle };
}

function parseOAuthState(raw: string | null): { invite: string | null } {
  if (!raw) return { invite: null };
  try { return { invite: JSON.parse(raw)?.invite ?? null }; }
  catch { return { invite: null }; }
}

// Looks up a valid invite code row. Returns a redirect on failure, the row id on success.
async function validateInvite(invite: string | null, db: D1Database, frontendUrl: string): Promise<{ rowId: string } | Response> {
  const base = frontendUrl.replace(/\/$/, '');
  if (!invite) return Response.redirect(`${base}/login?error=invite_required`, 302);
  const row = await db.prepare(
    'SELECT id FROM invite_codes WHERE code = ? AND used_at IS NULL',
  ).bind(invite.toUpperCase()).first<{ id: string }>();
  if (!row) return Response.redirect(`${base}/login?error=invite_invalid`, 302);
  return { rowId: row.id };
}

async function markInviteUsed(db: D1Database, rowId: string, userId: string): Promise<void> {
  await db.prepare(
    'UPDATE invite_codes SET used_by_user_id = ?, used_at = ? WHERE id = ?',
  ).bind(userId, new Date().toISOString(), rowId).run();
}

// Validates an invite code and marks it used for newUserId.
// Returns a redirect response on failure, null on success.
async function consumeInvite(db: D1Database, invite: string | null, newUserId: string, frontendUrl: string): Promise<Response | null> {
  const result = await validateInvite(invite, db, frontendUrl);
  if (result instanceof Response) return result;
  await markInviteUsed(db, result.rowId, newUserId);
  return null;
}

async function issueTokensAndRedirect(c: AuthContext, userId: string, handle: string, frontendUrl: string) {
  const [refreshToken, sessionToken] = await Promise.all([
    signRefreshToken(userId, handle, c.env.JWT_SECRET),
    signSessionToken(userId, handle, c.env.JWT_SECRET),
  ]);
  c.header('Set-Cookie', refreshCookie(refreshToken, REFRESH_MAX_AGE));
  c.header('Set-Cookie', sessionCookie(sessionToken, REFRESH_MAX_AGE, isLocalRequest(c)));
  const base = frontendUrl.replace(/\/$/, '');
  return c.redirect(`${base}/auth/callback`);
}

authRouter.get('/google', async (c) => {
  const invite = c.req.query('invite') ?? null;
  const state = crypto.randomUUID();
  await c.env.KV.put(`oauth_state:${state}`, JSON.stringify({ invite }), { expirationTtl: 300 });
  const redirectUri = new URL('/api/v1/auth/google/callback', c.env.FRONTEND_URL).toString();
  return c.redirect(await getGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state));
});

authRouter.get('/google/callback', async (c) => {
  const { code, state } = c.req.query();
  const kvRaw = await c.env.KV.get(`oauth_state:${state}`);
  if (!state || !kvRaw) return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid state');
  await c.env.KV.delete(`oauth_state:${state}`);
  const { invite } = parseOAuthState(kvRaw);

  const redirectUri = new URL('/api/v1/auth/google/callback', c.env.FRONTEND_URL).toString();
  const tokens = await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redirectUri);
  const gUser = await getGoogleUser(tokens.access_token);

  const existing = await findExistingOAuthUser(c.env.DB, 'google', gUser.id, gUser.email);
  if (existing) {
    return issueTokensAndRedirect(c, existing.id, existing.handle, c.env.FRONTEND_URL);
  }

  // Brand-new user — validate invite BEFORE creating account to avoid orphaned rows
  const inviteResult = await validateInvite(invite, c.env.DB, c.env.FRONTEND_URL);
  if (inviteResult instanceof Response) return inviteResult;

  const newUser = await createNewOAuthUser(c.env.DB, gUser.email, gUser.name, 'google', gUser.id);
  await markInviteUsed(c.env.DB, inviteResult.rowId, newUser.id);
  return issueTokensAndRedirect(c, newUser.id, newUser.handle, c.env.FRONTEND_URL);
});

authRouter.get('/github', async (c) => {
  const invite = c.req.query('invite') ?? null;
  const state = crypto.randomUUID();
  await c.env.KV.put(`oauth_state:${state}`, JSON.stringify({ invite }), { expirationTtl: 300 });
  return c.redirect(await getGitHubAuthUrl(c.env.GITHUB_CLIENT_ID, state));
});

authRouter.get('/github/callback', async (c) => {
  const { code, state } = c.req.query();
  const kvRaw = await c.env.KV.get(`oauth_state:${state}`);
  if (!state || !kvRaw) return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid state');
  await c.env.KV.delete(`oauth_state:${state}`);
  const { invite } = parseOAuthState(kvRaw);

  const tokens = await exchangeGitHubCode(code, c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
  const ghUser = await getGitHubUser(tokens.access_token);
  const email = ghUser.email ?? await getGitHubPrimaryEmail(tokens.access_token);
  if (!email) return errorResponse(c, 400, 'VALIDATION_ERROR', 'GitHub account has no verified email');

  const existing = await findExistingOAuthUser(c.env.DB, 'github', String(ghUser.id), email);
  if (existing) {
    return issueTokensAndRedirect(c, existing.id, existing.handle, c.env.FRONTEND_URL);
  }

  // Brand-new user — validate invite BEFORE creating account to avoid orphaned rows
  const inviteResult = await validateInvite(invite, c.env.DB, c.env.FRONTEND_URL);
  if (inviteResult instanceof Response) return inviteResult;

  const newUser = await createNewOAuthUser(c.env.DB, email, ghUser.name || ghUser.login, 'github', String(ghUser.id));
  await markInviteUsed(c.env.DB, inviteResult.rowId, newUser.id);
  return issueTokensAndRedirect(c, newUser.id, newUser.handle, c.env.FRONTEND_URL);
});
