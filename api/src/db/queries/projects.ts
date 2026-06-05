import type { Project } from '../../types';

export function getProjectsByUser(db: D1Database, userId: string) {
  return db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order, name')
    .bind(userId).all<Project>();
}

export function getProjectById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>();
}

export function createProject(db: D1Database, p: {
  id: string; user_id: string; slug: string; name: string; sub_name?: string; sort_order?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    INSERT INTO projects (id, user_id, slug, name, sub_name, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(p.id, p.user_id, p.slug, p.name, p.sub_name ?? null, p.sort_order ?? 0, now, now).run();
}

export function updateProject(db: D1Database, id: string, fields: {
  name?: string; sub_name?: string; sort_order?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  vals.push(id);
  return db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export function deleteProject(db: D1Database, id: string) {
  return db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
}
