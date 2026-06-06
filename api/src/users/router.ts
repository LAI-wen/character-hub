import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { verifyToken } from '../auth/jwt';
import { getUserById, getUserByUsername, updateUser } from '../db/queries/users';
import { getOCsByUser } from '../db/queries/ocs';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const patchMeSchema = z.object({
  display_name: z.string().max(64).optional(),
  bio: z.string().max(160).optional(),
  avatar_url: z.string().url().optional().nullable(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  social_links: z.array(z.object({ platform: z.string(), url: z.string() })).max(10).optional(),
  notification_prefs: z.record(z.object({ email: z.boolean(), discord: z.boolean() })).optional(),
});

usersRouter.get('/me', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const user = await getUserById(c.env.DB, sub);
  if (!user) return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  const { password_hash, ...safe } = user;
  return c.json(safe);
});

usersRouter.patch('/me', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = patchMeSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  const { social_links, notification_prefs, ...rest } = parsed.data;
  await updateUser(c.env.DB, sub, {
    ...rest,
    ...(social_links !== undefined ? { social_links: JSON.stringify(social_links) } : {}),
    ...(notification_prefs !== undefined ? { notification_prefs: JSON.stringify(notification_prefs) } : {}),
  });

  const updated = await getUserById(c.env.DB, sub);
  const { password_hash, ...safe } = updated!;
  return c.json(safe);
});

usersRouter.get('/:username', async (c) => {
  const user = await getUserByUsername(c.env.DB, c.req.param('username'));
  if (!user) return errorResponse(c, 404, 'NOT_FOUND', 'User not found');

  let isOwner = false;
  const header = c.req.header('Authorization') ?? '';
  if (header.startsWith('Bearer ')) {
    try {
      const p = await verifyToken(header.slice(7), c.env.JWT_SECRET);
      const blacklisted = await c.env.KV.get(`blacklist:${p.jti}`);
      isOwner = !blacklisted && p.sub === user.id;
    } catch { /* not authenticated */ }
  }

  const allOCs = await getOCsByUser(c.env.DB, user.id);
  const visibleOCs = isOwner
    ? allOCs.results
    : allOCs.results.filter(oc => oc.visibility === 'public' || oc.visibility === 'unlisted');

  return c.json({
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url,
    accent_color: user.accent_color,
    social_links: JSON.parse(user.social_links),
    ocs: visibleOCs.map(oc => ({
      id: oc.id, slug: oc.slug, name: oc.name, rom: oc.rom,
      species: oc.species, card_color: oc.card_color, visibility: oc.visibility,
    })),
  });
});
