import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { checkVisibility } from './visibility';
import { getOCsByUser, getPublicOCs, getOCById, createOC, updateOC, deleteOC } from '../db/queries/ocs';
import { hashPassword } from '../auth/password';
import { verifyToken } from '../auth/jwt';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const ocsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  name: z.string().min(1).max(64),
  rom: z.string().max(64).optional(),
  species: z.string().max(64).optional(),
  tagline: z.string().max(200).optional(),
  card_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  display_mode: z.enum(['full', 'avatar']).optional(),
  project_id: z.string().uuid().optional().nullable(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  rom: z.string().max(64).nullable().optional(),
  species: z.string().max(64).nullable().optional(),
  tagline: z.string().max(200).nullable().optional(),
  card_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  display_mode: z.enum(['full', 'avatar']).optional(),
  project_id: z.string().uuid().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  profile_fields: z.array(z.object({ k: z.string(), v: z.string() })).optional(),
  swatches: z.array(z.object({ nm: z.string(), rom: z.string().optional(), hex: z.string(), note: z.string().optional(), grp: z.string().optional() })).optional(),
  checklist: z.array(z.object({ type: z.enum(['must', 'avoid']), t: z.string(), en: z.string().optional() })).optional(),
  license: z.array(z.object({ t: z.string(), e: z.string().optional(), v: z.enum(['allow', 'deny']) })).optional(),
  markers: z.array(z.object({ type: z.enum(['point', 'rect']), x: z.number(), y: z.number(), w: z.number().optional(), h: z.number().optional(), label: z.string() })).optional(),
  visibility: z.enum(['public', 'unlisted', 'password', 'private']).optional(),
  password: z.string().min(4).optional(),
});

async function getRequestingUserId(c: any): Promise<string | null> {
  const header = c.req.header('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const p = await verifyToken(header.slice(7), c.env.JWT_SECRET);
    const blacklisted = await c.env.KV.get(`blacklist:${p.jti}`);
    return blacklisted ? null : p.sub;
  } catch { return null; }
}

ocsRouter.get('/', async (c) => {
  const { user: username, project, q } = c.req.query();

  if (username) {
    const userRow = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username).first<{ id: string }>();
    if (!userRow) return c.json([]);
    const requestingUserId = await getRequestingUserId(c);
    const result = await getOCsByUser(c.env.DB, userRow.id, project);
    const filtered = result.results.filter(oc =>
      oc.user_id === requestingUserId || oc.visibility === 'public'
    );
    return c.json(filtered);
  }

  const result = await getPublicOCs(c.env.DB, q);
  return c.json(result.results);
});

ocsRouter.post('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = crypto.randomUUID();
  await createOC(c.env.DB, { id, user_id: sub, slug, ...parsed.data });
  return c.json(await getOCById(c.env.DB, id), 201);
});

ocsRouter.get('/:id', async (c) => {
  const oc = await getOCById(c.env.DB, c.req.param('id'));
  if (!oc) return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');

  const requestingUserId = await getRequestingUserId(c);
  const passwordAttempt = c.req.header('X-OC-Password') ?? null;
  const result = await checkVisibility(oc, requestingUserId, passwordAttempt);

  if (result === 'needs_password') return errorResponse(c, 403, 'FORBIDDEN', 'Password required');
  if (result === 'forbidden' || result === 'private') return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');

  const { password_hash, ...safe } = oc;
  return c.json(safe);
});

ocsRouter.patch('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const oc = await getOCById(c.env.DB, c.req.param('id'));
  if (!oc) return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');
  if (oc.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { password, profile_fields, swatches, checklist, license, markers, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (password !== undefined) updates.password_hash = await hashPassword(password);
  if (profile_fields !== undefined) updates.profile_fields = JSON.stringify(profile_fields);
  if (swatches !== undefined) updates.swatches = JSON.stringify(swatches);
  if (checklist !== undefined) updates.checklist = JSON.stringify(checklist);
  if (license !== undefined) updates.license = JSON.stringify(license);
  if (markers !== undefined) updates.markers = JSON.stringify(markers);

  await updateOC(c.env.DB, oc.id, updates);
  const updated = await getOCById(c.env.DB, oc.id);
  const { password_hash, ...safe } = updated!;
  return c.json(safe);
});

ocsRouter.delete('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const oc = await getOCById(c.env.DB, c.req.param('id'));
  if (!oc) return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');
  if (oc.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  await deleteOC(c.env.DB, oc.id);
  return c.json({ ok: true });
});
