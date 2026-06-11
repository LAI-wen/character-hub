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

// Public media serving — proxies R2 objects; works in both dev and production
app.get('/api/media/*', async (c) => {
  const key = c.req.path.slice('/api/media/'.length);
  if (!key) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
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
