import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../auth/jwt';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return errorResponse(c, 401, 'UNAUTHORIZED', 'Missing token');

    let payload;
    try {
      payload = await verifyToken(token, c.env.JWT_SECRET);
    } catch {
      return errorResponse(c, 401, 'UNAUTHORIZED', 'Token invalid or expired');
    }

    const blacklisted = await c.env.KV.get(`blacklist:${payload.jti}`);
    if (blacklisted) return errorResponse(c, 401, 'UNAUTHORIZED', 'Token revoked');

    c.set('user', payload);
    await next();
  }
);
