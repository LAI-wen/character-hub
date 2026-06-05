import type { OC, OCMedia } from '../../types';

export function getOCsByUser(db: D1Database, userId: string, projectId?: string) {
  if (projectId) {
    return db.prepare('SELECT * FROM ocs WHERE user_id = ? AND project_id = ? ORDER BY name')
      .bind(userId, projectId).all<OC>();
  }
  return db.prepare('SELECT * FROM ocs WHERE user_id = ? ORDER BY name').bind(userId).all<OC>();
}

export function getPublicOCs(db: D1Database, query?: string) {
  if (query) {
    const q = `%${query}%`;
    return db.prepare(
      `SELECT * FROM ocs WHERE visibility = 'public' AND (name LIKE ? OR rom LIKE ? OR species LIKE ?) ORDER BY created_at DESC LIMIT 50`
    ).bind(q, q, q).all<OC>();
  }
  return db.prepare(`SELECT * FROM ocs WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 50`).all<OC>();
}

export function getOCById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM ocs WHERE id = ?').bind(id).first<OC>();
}

export function createOC(db: D1Database, oc: {
  id: string; user_id: string; project_id?: string | null; slug: string;
  name: string; rom?: string; species?: string; tagline?: string;
  card_color?: string; display_mode?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    INSERT INTO ocs (id, user_id, project_id, slug, name, rom, species, tagline,
      card_color, display_mode, profile_fields, swatches, checklist, license,
      markers, visibility, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', '[]', 'public', ?, ?)
  `).bind(
    oc.id, oc.user_id, oc.project_id ?? null, oc.slug, oc.name,
    oc.rom ?? null, oc.species ?? null, oc.tagline ?? null,
    oc.card_color ?? '#8FA3B0', oc.display_mode ?? 'full', now, now
  ).run();
}

export function updateOC(db: D1Database, id: string, fields: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  vals.push(id);
  return db.prepare(`UPDATE ocs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export function deleteOC(db: D1Database, id: string) {
  return db.prepare('DELETE FROM ocs WHERE id = ?').bind(id).run();
}

export function getMediaByOC(db: D1Database, ocId: string) {
  return db.prepare('SELECT * FROM oc_media WHERE oc_id = ? ORDER BY sort_order, created_at')
    .bind(ocId).all<OCMedia>();
}

export function getMediaById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM oc_media WHERE id = ?').bind(id).first<OCMedia>();
}

export function createMedia(db: D1Database, m: {
  id: string; oc_id: string; category: string; url: string;
  r2_key?: string; caption?: string; sort_order?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    INSERT INTO oc_media (id, oc_id, category, url, r2_key, caption, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(m.id, m.oc_id, m.category, m.url, m.r2_key ?? null, m.caption ?? null, m.sort_order ?? 0, now).run();
}

export function updateMedia(db: D1Database, id: string, fields: {
  caption?: string | null; sort_order?: number; category?: string;
}) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (!sets.length) return Promise.resolve();
  vals.push(id);
  return db.prepare(`UPDATE oc_media SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export function deleteMedia(db: D1Database, id: string) {
  return db.prepare('DELETE FROM oc_media WHERE id = ?').bind(id).run();
}
