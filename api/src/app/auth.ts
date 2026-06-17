import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { AppHttpError } from './http';
import { verifyToken } from '../auth/jwt';
import type { Env, Variables } from '../types';

export type AppPermission =
  | 'authenticated'
  | 'project:view'
  | 'project:update'
  | 'project:manage_settings'
  | 'project:publish'
  | 'character:create'
  | 'character:update'
  | 'project_character:create'
  | 'project_character:update'
  | 'world:create'
  | 'world:update'
  | 'relationship:create'
  | 'relationship:update'
  | 'relationship:delete'
  | 'relationship:layout'
  | 'story:create'
  | 'story:update'
  | 'asset:create'
  | 'asset:delete'
  | 'event:create'
  | 'event:update'
  | 'event:delete';

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;
export type ProjectRole = 'owner' | 'host' | 'cohost' | 'member' | 'viewer' | null;

type PermissionResource = {
  projectId?: string;
  viewerRole?: ProjectRole;
};

const HOST_PERMISSIONS = new Set<AppPermission>([
  'authenticated',
  'project:view',
  'project:update',
  'world:create',
  'world:update',
  'project_character:update',
  'relationship:create',
  'relationship:update',
  'relationship:delete',
  'relationship:layout',
  'story:create',
  'story:update',
  'asset:create',
  'asset:delete',
  'event:create',
  'event:update',
  'event:delete',
]);

const MEMBER_PERMISSIONS = new Set<AppPermission>([
  'authenticated',
  'project:view',
  'project_character:create',
]);

const VIEWER_PERMISSIONS = new Set<AppPermission>([
  'authenticated',
  'project:view',
]);

const ACCOUNT_PERMISSIONS = new Set<AppPermission>([
  'character:create',
  'character:update',
]);

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isDemoAuthAllowed(c: AppContext) {
  const appEnv = c.env.APP_ENV?.toLowerCase();
  const explicitDemo = c.env.DEMO_AUTH_ENABLED === 'true';
  const hostname = new URL(c.req.url).hostname;
  return explicitDemo || appEnv === 'local' || appEnv === 'demo' || appEnv === 'test' || isLocalHostname(hostname);
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const attachAppAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  // Try Bearer token (for programmatic/script access)
  const authHeader = c.req.header('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7);
    try {
      const payload = await verifyToken(bearerToken, c.env.JWT_SECRET);
      const blacklisted = await c.env.KV.get(`blacklist:${payload.jti}`);
      if (blacklisted) throw new AppHttpError(401, 'UNAUTHENTICATED', 'Token revoked');
      c.set('user', payload);
      c.set('authVia', 'bearer');
      await next();
      return;
    } catch (err) {
      if (err instanceof AppHttpError) throw err;
      // Bearer token invalid — fall through to session cookie
    }
  }

  // Try session cookie
  const cookieHeader = c.req.header('Cookie') ?? '';
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);

  if (sessionMatch) {
    try {
      const payload = await verifyToken(sessionMatch[1], c.env.JWT_SECRET);
      const blacklisted = await c.env.KV.get(`blacklist:${payload.jti}`);
      if (blacklisted) throw new AppHttpError(401, 'UNAUTHENTICATED', 'Session revoked');
      c.set('user', payload);
      c.set('authVia', 'cookie');

      // CSRF check: mutating requests via cookie auth must include a valid CSRF token
      if (MUTATING_METHODS.has(c.req.method)) {
        const csrfToken = c.req.header('X-CSRF-Token');
        if (!csrfToken) throw new AppHttpError(403, 'CSRF_REQUIRED', 'X-CSRF-Token header required');
        const stored = await c.env.KV.get(`csrf:${csrfToken}`);
        if (!stored || stored !== sessionMatch[1].slice(-16)) {
          throw new AppHttpError(403, 'CSRF_INVALID', 'CSRF token invalid or expired');
        }
      }

      await next();
      return;
    } catch (err) {
      if (err instanceof AppHttpError) throw err;
      // Token invalid — fall through to demo auth check
    }
  }

  // Fall back to demo auth (local/demo environments only)
  const demoUserId = c.req.header('X-Demo-User-Id');
  const demoUsername = c.req.header('X-Demo-Username');
  const hasDemoHeader = Boolean(demoUserId || demoUsername);
  const demoAllowed = isDemoAuthAllowed(c);

  if (!demoAllowed) {
    if (hasDemoHeader) {
      throw new AppHttpError(403, 'DEMO_AUTH_DISABLED', 'Demo auth headers are only allowed in local/demo environments');
    }
    throw new AppHttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  if (!hasDemoHeader && !demoAllowed) {
    throw new AppHttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const userId = demoUserId || 'demo-user';
  const username = demoUsername || 'demo';

  c.set('user', {
    sub: userId,
    username,
    jti: 'app-auth-placeholder',
    exp: timestamp + 60 * 60,
    iat: timestamp,
  });
  c.set('authVia', 'demo');

  await next();
});

export async function requirePermission(c: AppContext, permission: AppPermission, resource: PermissionResource = {}) {
  const user = c.get('user');
  if (permission === 'authenticated') {
    if (!user?.sub) throw new AppHttpError(401, 'UNAUTHENTICATED', 'Authentication required');
    return true;
  }
  if (ACCOUNT_PERMISSIONS.has(permission)) {
    if (!user?.sub) throw new AppHttpError(401, 'UNAUTHENTICATED', 'Authentication required');
    return true;
  }

  const role = resource.viewerRole ?? null;
  if (!role) throw new AppHttpError(403, 'FORBIDDEN', 'Workspace membership is required');
  if (role === 'owner') return true;
  if ((role === 'host' || role === 'cohost') && HOST_PERMISSIONS.has(permission)) return true;
  if (role === 'member' && MEMBER_PERMISSIONS.has(permission)) return true;
  if (role === 'viewer' && VIEWER_PERMISSIONS.has(permission)) return true;
  throw new AppHttpError(403, 'FORBIDDEN', `Missing permission: ${permission}`);
}
