import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { authRouter } from './auth/router';
import { usersRouter } from './users/router';
import { projectsRouter } from './projects/router';
import { ocsRouter } from './ocs/router';
import { mediaRouter } from './media/router';
import { relationshipsRouter } from './relationships/router';
import { worldviewRouter } from './worldview/router';
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
api.all('/commissions/*', (c) => c.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Commissions not yet implemented' } }, 501));

app.route('/api/v1', api);
app.get('/', (c) => c.json({ ok: true, service: 'oc-tools-api' }));

export default app;
