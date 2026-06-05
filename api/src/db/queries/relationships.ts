import type { Relationship } from '../../types';

export function getRelationshipsByUser(db: D1Database, userId: string, projectId?: string) {
  if (projectId) {
    return db.prepare(`
      SELECT r.* FROM oc_relationships r
      JOIN ocs a ON a.id = r.oc_a_id
      WHERE r.user_id = ? AND a.project_id = ?
      ORDER BY r.created_at DESC
    `).bind(userId, projectId).all<Relationship>();
  }
  return db.prepare('SELECT * FROM oc_relationships WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId).all<Relationship>();
}

export function getRelationshipById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM oc_relationships WHERE id = ?').bind(id).first<Relationship>();
}

export function createRelationship(db: D1Database, r: {
  id: string; user_id: string; oc_a_id: string; oc_b_id: string;
  label: string; description?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    INSERT INTO oc_relationships (id, user_id, oc_a_id, oc_b_id, label, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(r.id, r.user_id, r.oc_a_id, r.oc_b_id, r.label, r.description ?? null, now, now).run();
}

export function updateRelationship(db: D1Database, id: string, fields: {
  label?: string; description?: string | null;
}) {
  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  vals.push(id);
  return db.prepare(`UPDATE oc_relationships SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
}

export function deleteRelationship(db: D1Database, id: string) {
  return db.prepare('DELETE FROM oc_relationships WHERE id = ?').bind(id).run();
}
