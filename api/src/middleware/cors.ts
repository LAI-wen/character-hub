import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-OC-Password,X-Demo-User-Id,X-Demo-Username,X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
};

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function splitOrigins(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string, requestUrl: string, env: Env) {
  if (!origin) return false;
  const configuredOrigins = splitOrigins(env.FRONTEND_URL);
  if (configuredOrigins.includes(origin)) return true;

  const appEnv = env.APP_ENV?.toLowerCase();
  const requestHostname = new URL(requestUrl).hostname;
  if (appEnv === 'local' || appEnv === 'demo' || appEnv === 'test' || isLocalHostname(requestHostname)) {
    try {
      return isLocalHostname(new URL(origin).hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export const corsMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const origin = c.req.header('Origin') ?? '';
    const allowedOrigin = isAllowedOrigin(origin, c.req.url, c.env) ? origin : '';

    if (c.req.method === 'OPTIONS') {
      if (!allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    await next();
    if (allowedOrigin) {
      c.res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => c.res.headers.set(k, v));
    }
  }
);
