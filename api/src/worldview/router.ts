import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getEntriesByUser, getEntryById, getEntryRels, createEntry, updateEntry, deleteEntry, createEntryRel, deleteEntryRel } from '../db/queries/worldview';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const worldviewRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  name: z.string().min(1).max(64),
  en_name: z.string().max(64).optional(),
  type: z.string().max(32).optional(),
  blurb: z.string().max(200).optional(),
  setting: z.string().max(5000).optional(),
  project_id: z.string().uuid().nullable().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  en_name: z.string().max(64).nullable().optional(),
  type: z.string().max(32).nullable().optional(),
  blurb: z.string().max(200).nullable().optional(),
  setting: z.string().max(5000).nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  linked_oc_ids: z.array(z.string().uuid()).optional(),
  gallery_labels: z.array(z.string()).optional(),
});

const addRelSchema = z.object({
  target_entry_id: z.string().uuid(),
  kind: z.enum(['敵對', '盟友', '隸屬', '分支', '相關']),
});

worldviewRouter.get('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const { project } = c.req.query();
  const result = await getEntriesByUser(c.env.DB, sub, project);
  return c.json(result.results);
});

worldviewRouter.post('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = crypto.randomUUID();
  await createEntry(c.env.DB, { id, user_id: sub, slug, ...parsed.data });
  const entry = await getEntryById(c.env.DB, id);
  const rels = await getEntryRels(c.env.DB, id);
  return c.json({ ...entry, rels: rels.results }, 201);
});

worldviewRouter.get('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const entry = await getEntryById(c.env.DB, c.req.param('id'));
  if (!entry) return errorResponse(c, 404, 'NOT_FOUND', 'Entry not found');
  if (entry.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  const rels = await getEntryRels(c.env.DB, entry.id);
  return c.json({ ...entry, rels: rels.results });
});

worldviewRouter.patch('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const entry = await getEntryById(c.env.DB, c.req.param('id'));
  if (!entry) return errorResponse(c, 404, 'NOT_FOUND', 'Entry not found');
  if (entry.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { linked_oc_ids, gallery_labels, ...rest } = parsed.data;
  await updateEntry(c.env.DB, entry.id, {
    ...rest,
    ...(linked_oc_ids !== undefined ? { linked_oc_ids: JSON.stringify(linked_oc_ids) } : {}),
    ...(gallery_labels !== undefined ? { gallery_labels: JSON.stringify(gallery_labels) } : {}),
  });

  const updated = await getEntryById(c.env.DB, entry.id);
  const rels = await getEntryRels(c.env.DB, entry.id);
  return c.json({ ...updated, rels: rels.results });
});

worldviewRouter.delete('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const entry = await getEntryById(c.env.DB, c.req.param('id'));
  if (!entry) return errorResponse(c, 404, 'NOT_FOUND', 'Entry not found');
  if (entry.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  await deleteEntry(c.env.DB, entry.id);
  return c.json({ ok: true });
});

worldviewRouter.post('/:id/rels', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const entry = await getEntryById(c.env.DB, c.req.param('id'));
  if (!entry) return errorResponse(c, 404, 'NOT_FOUND', 'Entry not found');
  if (entry.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const body = await c.req.json().catch(() => null);
  const parsed = addRelSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const target = await getEntryById(c.env.DB, parsed.data.target_entry_id);
  if (!target || target.user_id !== sub) return errorResponse(c, 404, 'NOT_FOUND', 'Target entry not found');

  const id = crypto.randomUUID();
  await createEntryRel(c.env.DB, id, entry.id, parsed.data.target_entry_id, parsed.data.kind);
  return c.json({ id, entry_id: entry.id, ...parsed.data }, 201);
});

worldviewRouter.delete('/:id/rels/:relId', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const entry = await getEntryById(c.env.DB, c.req.param('id'));
  if (!entry) return errorResponse(c, 404, 'NOT_FOUND', 'Entry not found');
  if (entry.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  await deleteEntryRel(c.env.DB, c.req.param('relId'), entry.id);
  return c.json({ ok: true });
});
