import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-OC-Password',
  'Access-Control-Allow-Credentials': 'true',
};

export const corsMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const origin = c.req.header('Origin') ?? '';
    const allowedOrigin = origin || (c.env.FRONTEND_URL ?? '*');

    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    await next();
    c.res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => c.res.headers.set(k, v));
  }
);
