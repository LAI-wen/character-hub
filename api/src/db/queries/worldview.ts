import type { WorldviewEntry, WorldviewRel } from '../../types';

export function getEntriesByUser(db: D1Database, userId: string, projectId?: string) {
  if (projectId) {
    return db.prepare('SELECT * FROM worldview_entries WHERE user_id = ? AND project_id = ? ORDER BY name')
      .bind(userId, projectId).all<WorldviewEntry>();
  }
  return db.prepare('SELECT * FROM worldview_entries WHERE user_id = ? ORDER BY name')
    .bind(userId).all<WorldviewEntry>();
}

export function getEntryById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM worldview_entries WHERE id = ?').bind(id).first<WorldviewEntry>();
}

export function getEntryRels(db: D1Database, entryId: string) {
  return db.prepare('SELECT * FROM worldview_entry_rels WHERE entry_id = ?')
    .bind(entryId).all<WorldviewRel>();
}

export function createEntry(db: D1Database, e: {
  id: string; user_id: string; project_id?: string | null; slug: string;
  name: string; en_name?: string; type?: string; blurb?: string; setting?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    INSERT INTO worldview_entries
      (id, user_id, project_id, slug, name, en_name, type, blurb, setting,
       linked_oc_ids, gallery_labels, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?)
  `).bind(
    e.id, e.user_id, e.project_id ?? null, e.slug, e.name,
    e.en_name ?? null, e.type ?? null, e.blurb ?? null, e.setting ?? null,
    now, now
  ).run();
}

export function updateEntry(db: D1Database, id: string, fields: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  vals.push(id);
  return db.prepare(`UPDATE worldview_entries SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export function deleteEntry(db: D1Database, id: string) {
  return db.prepare('DELETE FROM worldview_entries WHERE id = ?').bind(id).run();
}

export function createEntryRel(db: D1Database, id: string, entryId: string, targetEntryId: string, kind: string) {
  return db.prepare(
    'INSERT INTO worldview_entry_rels (id, entry_id, target_entry_id, kind) VALUES (?, ?, ?, ?)'
  ).bind(id, entryId, targetEntryId, kind).run();
}

export function deleteEntryRel(db: D1Database, id: string) {
  return db.prepare('DELETE FROM worldview_entry_rels WHERE id = ?').bind(id).run();
}
