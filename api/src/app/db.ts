import type { Context } from 'hono';
import { AppHttpError } from './http';

export type PatchMap = Record<string, { column: string; value?: (input: unknown) => unknown }>;

export function getDb(c: Context): D1Database {
  const db = (c.env as { DB?: D1Database }).DB;
  if (!db) throw new AppHttpError(503, 'DB_UNAVAILABLE', 'D1 binding DB is not configured');
  return db;
}

export async function first<T>(db: D1Database, sql: string, params: unknown[] = []) {
  return db.prepare(sql).bind(...params).first<T>();
}

export async function all<T>(db: D1Database, sql: string, params: unknown[] = []) {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

export async function run(db: D1Database, sql: string, params: unknown[] = []) {
  return db.prepare(sql).bind(...params).run();
}

export async function batch(db: D1Database, statements: D1PreparedStatement[]) {
  if (!statements.length) return [];
  return db.batch(statements);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function jsonColumn(value: unknown, fallback: unknown = null) {
  return JSON.stringify(value ?? fallback);
}

export function buildPatch(patch: Record<string, unknown>, map: PatchMap) {
  const sets: string[] = [];
  const values: unknown[] = [];

  Object.entries(map).forEach(([field, config]) => {
    if (!(field in patch)) return;
    sets.push(`${config.column} = ?`);
    values.push(config.value ? config.value(patch[field]) : patch[field]);
  });

  return { sets, values };
}

export function boolToInt(value: unknown) {
  return value ? 1 : 0;
}
