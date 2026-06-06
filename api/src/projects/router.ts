import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getProjectsByUser, getProjectById, createProject, updateProject, deleteProject } from '../db/queries/projects';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const projectsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  name: z.string().min(1).max(64),
  sub_name: z.string().max(64).optional(),
  sort_order: z.number().int().optional(),
});

const patchSchema = createSchema.partial();

projectsRouter.get('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const result = await getProjectsByUser(c.env.DB, sub);
  return c.json(result.results);
});

projectsRouter.post('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = crypto.randomUUID();
  await createProject(c.env.DB, { id, user_id: sub, slug, ...parsed.data });
  return c.json(await getProjectById(c.env.DB, id), 201);
});

projectsRouter.get('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const project = await getProjectById(c.env.DB, c.req.param('id'));
  if (!project) return errorResponse(c, 404, 'NOT_FOUND', 'Project not found');
  if (project.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  return c.json(project);
});

projectsRouter.patch('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const project = await getProjectById(c.env.DB, c.req.param('id'));
  if (!project) return errorResponse(c, 404, 'NOT_FOUND', 'Project not found');
  if (project.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  await updateProject(c.env.DB, project.id, parsed.data);
  return c.json(await getProjectById(c.env.DB, project.id));
});

projectsRouter.delete('/:id', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const project = await getProjectById(c.env.DB, c.req.param('id'));
  if (!project) return errorResponse(c, 404, 'NOT_FOUND', 'Project not found');
  if (project.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');
  await deleteProject(c.env.DB, project.id);
  return c.json({ ok: true });
});
