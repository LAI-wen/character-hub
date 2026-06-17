import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { authRouter } from './auth/router';
import { usersRouter } from './users/router';
import { projectsRouter } from './projects/router';
import { ocsRouter } from './ocs/router';
import { mediaRouter } from './media/router';
import { relationshipsRouter } from './relationships/router';
import { worldviewRouter } from './worldview/router';
import { demoRouter } from './demo/router';
import { appApiRouter, publicApiRouter } from './app/router';
import { verifyToken } from './auth/jwt';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', corsMiddleware);

const api = new Hono<{ Bindings: Env; Variables: Variables }>();

api.route('/auth', authRouter);
api.route('/users', usersRouter);
api.route('/projects', projectsRouter);
api.route('/ocs', ocsRouter);
api.route('/ocs/:ocId/media', mediaRouter);
api.route('/relationships', relationshipsRouter);
api.route('/worldview', worldviewRouter);
api.route('/demo', demoRouter);
api.all('/commissions/*', (c) => c.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Commissions not yet implemented' } }, 501));

// Media proxy — serves R2 objects with visibility-aware auth.
// Public/unlisted characters and projects are accessible without auth.
// Private resources require a valid session or Bearer token.
app.get('/api/media/*', async (c) => {
  const key = c.req.path.slice('/api/media/'.length);
  if (!key) return c.json({ error: { code: 'NOT_FOUND' } }, 404);

  // Try to authenticate the caller (Bearer or session cookie).
  let authenticated = false;
  const authHeader = c.req.header('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    try { await verifyToken(authHeader.slice(7), c.env.JWT_SECRET); authenticated = true; } catch {}
  }
  if (!authenticated) {
    const sessionMatch = (c.req.header('Cookie') ?? '').match(/session=([^;]+)/);
    if (sessionMatch) {
      try { await verifyToken(sessionMatch[1], c.env.JWT_SECRET); authenticated = true; } catch {}
    }
  }

  if (!authenticated) {
    // Unauthenticated: only allow access if the owning resource is public/unlisted.
    const charMatch = key.match(/^(?:avatars|main-visuals|characters)\/([^/]+)\//);
    const projMatch = key.match(/^projects\/([^/]+)\//);
    if (charMatch) {
      const row = await c.env.DB
        .prepare('SELECT visibility FROM characters WHERE id = ? AND archived_at IS NULL')
        .bind(charMatch[1]).first<{ visibility: string }>();
      if (!row || row.visibility === 'private') return c.json({ error: { code: 'FORBIDDEN' } }, 403);
    } else if (projMatch) {
      const row = await c.env.DB
        .prepare('SELECT visibility FROM projects WHERE id = ? AND archived_at IS NULL')
        .bind(projMatch[1]).first<{ visibility: string }>();
      if (!row || row.visibility === 'private') return c.json({ error: { code: 'FORBIDDEN' } }, 403);
    } else {
      return c.json({ error: { code: 'FORBIDDEN' } }, 403);
    }
  }

  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
});

app.route('/api/v1', api);
app.route('/api/app', appApiRouter);
app.route('/api/public', publicApiRouter);
app.get('/', (c) => c.json({ ok: true, service: 'oc-tools-api' }));

export default app;
