import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getRelationshipsByUser, getRelationshipById, createRelationship, updateRelationship, deleteRelationship } from '../db/queries/relationships';
import { getOCById } from '../db/queries/ocs';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const relationshipsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  oc_a_id: z.string().uuid(),
  oc_b_id: z.string().uuid(),
  label: z.string().min(1).max(64),
  description: z.string().max(2000).optional(),
});

const patchSchema = z.object({
  label: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).nullable().optional(),
});

relationshipsRouter.get('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const { project } = c.req.query();
  const result = await getRelationshipsByUser(c.env.DB, sub, project);
  return c.json(result.results);
});

relationshipsRouter.post('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const [ocA, ocB] = await Promise.all([
    getOCById(c.env.DB, parsed.data.oc_a_id),
    getOCById(c.env.DB, parsed.data.oc_b_id),
  ]);
  if (!ocA || ocA.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'oc_a_id does not belong to you');
  if (!ocB || ocB.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'oc_b_id does not belong to you');

  const id = crypto.randomUUID();
  await createRelationship(c.env.DB, { id, user_id: sub, ...parsed.data });
  return c.json(await getRelationshipById(c.env.DB, id), 201);
});

relationshipsRouter.patch('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const rel = await getRelationshipById(c.env.DB, c.req.param('id'));
  if (!rel) return errorResponse(c, 404, 'NOT_FOUND', 'Relationship not found');
  if (rel.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  await updateRelationship(c.env.DB, rel.id, parsed.data);
  return c.json(await getRelationshipById(c.env.DB, rel.id));
});

relationshipsRouter.delete('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const rel = await getRelationshipById(c.env.DB, c.req.param('id'));
  if (!rel) return errorResponse(c, 404, 'NOT_FOUND', 'Relationship not found');
  if (rel.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  await deleteRelationship(c.env.DB, rel.id);
  return c.json({ ok: true });
});
