import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { checkVisibility } from '../ocs/visibility';
import { getOCById, getMediaByOC, getMediaById, createMedia, updateMedia, deleteMedia } from '../db/queries/ocs';
import { uploadToR2, deleteFromR2, getR2PublicUrl } from './r2';
import { verifyToken } from '../auth/jwt';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

export const mediaRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;

const addExternalSchema = z.object({
  url: z.string().url(),
  category: z.string().min(1),
  caption: z.string().max(200).optional(),
  sort_order: z.number().int().optional(),
});

const patchSchema = z.object({
  caption: z.string().max(200).nullable().optional(),
  sort_order: z.number().int().optional(),
  category: z.string().min(1).optional(),
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

mediaRouter.get('/', async (c) => {
  const ocId = c.req.param('ocId')!;
  const oc = await getOCById(c.env.DB, ocId);
  if (!oc) return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');

  const requestingUserId = await getRequestingUserId(c);
  const access = await checkVisibility(oc, requestingUserId, c.req.header('X-OC-Password') ?? null);
  if (access === 'needs_password') return errorResponse(c, 403, 'FORBIDDEN', 'Password required');
  if (access === 'forbidden' || access === 'private') return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');

  const result = await getMediaByOC(c.env.DB, ocId);
  return c.json(result.results);
});

mediaRouter.post('/', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const ocId = c.req.param('ocId')!;
  const oc = await getOCById(c.env.DB, ocId);
  if (!oc) return errorResponse(c, 404, 'NOT_FOUND', 'OC not found');
  if (oc.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const contentType = c.req.header('Content-Type') ?? '';

  if (contentType.startsWith('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;
    const caption = (formData.get('caption') as string | null) ?? undefined;

    if (!file || !category) return errorResponse(c, 400, 'VALIDATION_ERROR', 'file and category required');
    if (!ALLOWED_MIME.includes(file.type)) return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid file type');
    if (file.size > MAX_SIZE) return errorResponse(c, 400, 'VALIDATION_ERROR', 'File too large (max 10 MB)');

    const ext = file.type.split('/')[1];
    const r2Key = `ocs/${ocId}/${crypto.randomUUID()}.${ext}`;
    await uploadToR2(c.env.BUCKET, r2Key, await file.arrayBuffer(), file.type);
    const url = getR2PublicUrl(r2Key);
    const id = crypto.randomUUID();
    await createMedia(c.env.DB, { id, oc_id: ocId, category, url, r2_key: r2Key, caption });
    return c.json(await getMediaById(c.env.DB, id), 201);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = addExternalSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);
  const id = crypto.randomUUID();
  await createMedia(c.env.DB, { id, oc_id: ocId, ...parsed.data });
  return c.json(await getMediaById(c.env.DB, id), 201);
});

mediaRouter.patch('/:mid', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const oc = await getOCById(c.env.DB, c.req.param('ocId')!);
  if (!oc || oc.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const media = await getMediaById(c.env.DB, c.req.param('mid'));
  if (!media || media.oc_id !== oc.id) return errorResponse(c, 404, 'NOT_FOUND', 'Media not found');

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 400, 'VALIDATION_ERROR', parsed.error.message);

  await updateMedia(c.env.DB, media.id, parsed.data);
  return c.json(await getMediaById(c.env.DB, media.id));
});

mediaRouter.delete('/:mid', requireAuth, async (c) => {
  const { sub } = c.get('user');
  const oc = await getOCById(c.env.DB, c.req.param('ocId')!);
  if (!oc || oc.user_id !== sub) return errorResponse(c, 403, 'FORBIDDEN', 'Access denied');

  const media = await getMediaById(c.env.DB, c.req.param('mid'));
  if (!media || media.oc_id !== oc.id) return errorResponse(c, 404, 'NOT_FOUND', 'Media not found');

  if (media.r2_key) await deleteFromR2(c.env.BUCKET, media.r2_key);
  await deleteMedia(c.env.DB, media.id);
  return c.json({ ok: true });
});
