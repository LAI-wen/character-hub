import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

export const corsMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const origin = c.req.header('Origin') ?? '';
    const allowed = c.env.FRONTEND_URL ?? '*';
    c.header('Access-Control-Allow-Origin', origin || allowed);
    c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-OC-Password');
    c.header('Access-Control-Allow-Credentials', 'true');
    if (c.req.method === 'OPTIONS') return c.text('', 204);
    await next();
  }
);
