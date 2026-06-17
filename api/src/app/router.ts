import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { attachAppAuth, requirePermission } from './auth';
import type { ProjectRole } from './auth';
import { AppHttpError, handleAppError, notImplemented, optionalLimit, validateJson } from './http';
import { all, batch, boolToInt, buildPatch, first, getDb, jsonColumn, parseJson, run } from './db';
import { hashPassword, verifyPassword } from '../auth/password';
import type { Env, Variables } from '../types';

type AppRouteEnv = { Bindings: Env; Variables: Variables };
type AppContext = Context<AppRouteEnv>;

export const appApiRouter = new Hono<AppRouteEnv>();
export const publicApiRouter = new Hono<AppRouteEnv>();

appApiRouter.onError(handleAppError);
publicApiRouter.onError(handleAppError);
appApiRouter.use('*', attachAppAuth);

const features = {
  characters: 'characters',
  worldview: 'worldview',
  story: 'story',
  gallery: 'gallery',
  relationships: 'relationships',
  inbox: 'inbox',
  publicPage: 'publicPage',
  template: 'template',
  roster: 'roster',
  applications: 'applications',
  submissions: 'submissions',
  participants: 'participants',
  permissions: 'permissions',
};

const jsonObject = z.record(z.unknown());
const optionalJsonObject = jsonObject.nullable().optional();
const optionalStringArray = z.array(z.string()).optional();

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  preset: z.enum(['personal_organization', 'public_showcase', 'private_collaboration', 'public_collaboration']).optional(),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(4000).optional(),
  color: z.string().max(32).optional(),
  themeColor: z.string().max(32).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  collaborationMode: z.enum(['solo', 'collaborative']).optional(),
  portalEnabled: z.boolean().optional(),
  joinPolicy: z.enum(['closed', 'invite', 'application', 'open']).optional(),
  submissionsEnabled: z.boolean().optional(),
  enabledFeatures: optionalStringArray,
});

const updateProjectSchema = createProjectSchema.partial().omit({ preset: true });

const createCharacterSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  romaji: z.string().max(120).nullable().optional(),
  rom: z.string().max(120).nullable().optional(),
  nickname: z.string().max(120).nullable().optional(),
  species: z.string().max(120).nullable().optional(),
  summary: z.string().max(4000).nullable().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  tags: optionalStringArray,
  avatarAssetId: z.string().nullable().optional(),
  projectId: z.string().optional(),
  projectRole: z.string().max(120).nullable().optional(),
  factionId: z.string().nullable().optional(),
  factionLabel: z.string().max(120).nullable().optional(),
  fieldValues: optionalJsonObject,
});

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).optional(),
  romaji: z.string().max(120).nullable().optional(),
  rom: z.string().max(120).nullable().optional(),
  nickname: z.string().max(120).nullable().optional(),
  species: z.string().max(120).nullable().optional(),
  summary: z.string().max(4000).nullable().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  tags: optionalStringArray,
  avatarAssetId: z.string().nullable().optional(),
  heightCm: z.number().int().min(50).max(300).nullable().optional(),
  themeColor: z.string().max(32).nullable().optional(),
  generalProfile: optionalJsonObject,
  artistProfile: optionalJsonObject,
  writerProfile: optionalJsonObject,
});

const createProjectLinkSchema = z.object({
  characterId: z.string().min(1),
  status: z.enum(['draft', 'pending', 'approved', 'active', 'rejected', 'removed']).optional(),
  factionId: z.string().nullable().optional(),
  factionLabel: z.string().max(120).nullable().optional(),
  projectRole: z.string().max(120).nullable().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  templateVersionId: z.string().nullable().optional(),
  fieldValues: optionalJsonObject,
});

const updateProjectLinkSchema = createProjectLinkSchema.omit({ characterId: true }).partial().extend({
  reviewMessage: z.string().max(2000).nullable().optional(),
});

const applyToProjectSchema = z.object({
  projectSlug: z.string().min(1),
  characterId: z.string().min(1),
});

const createWorldEntrySchema = z.object({
  type: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  slug: z.string().min(1).max(180).optional(),
  summary: z.string().max(4000).nullable().optional(),
  content: z.string().max(60000).nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  relatedCharacterIds: optionalStringArray,
  relatedEntryIds: optionalStringArray,
});

const updateWorldEntrySchema = createWorldEntrySchema.partial();

const relationshipEntityRefSchema = z.object({
  type: z.enum(['character', 'world_entry', 'custom', 'group']),
  id: z.string().min(1).max(180),
});

const relationshipAlbumSchema = z.array(z.string().max(160)).max(24);
const relationshipTimelineSchema = z.array(z.tuple([z.string().max(120), z.string().max(1000)])).max(40);

const createRelationshipSchema = z.object({
  sourceRef: relationshipEntityRefSchema,
  targetRef: relationshipEntityRefSchema,
  type: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  description: z.string().max(4000).nullable().optional(),
  direction: z.enum(['undirected', 'one-way', 'two-way', 'many']).optional(),
  groupId: z.string().max(180).nullable().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  album: relationshipAlbumSchema.optional(),
  timeline: relationshipTimelineSchema.optional(),
  sortOrder: z.number().int().optional(),
  srcView: z.string().max(500).nullable().optional(),
  tgtView: z.string().max(500).nullable().optional(),
  mapStyle: z.enum(['line', 'arrows']).optional(),
});

const updateRelationshipSchema = createRelationshipSchema.partial();

const relationshipLayoutSchema = z.object({
  nodes: jsonObject.optional(),
  labels: jsonObject.optional(),
  paths: jsonObject.optional(),
  groups: jsonObject.optional(),
  selectedRelationshipId: z.string().nullable().optional(),
}).passthrough();

const RELATIONSHIP_LAYOUT_MAX_BYTES = 50 * 1024;

const PROJECT_META_FIELDS = ['name', 'slug', 'description', 'color', 'themeColor'] as const;
const PROJECT_SETTINGS_FIELDS = ['collaborationMode', 'joinPolicy', 'submissionsEnabled', 'enabledFeatures'] as const;
const PROJECT_PUBLISH_FIELDS = ['visibility', 'portalEnabled'] as const;

type ProjectRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_asset_id: string | null;
  theme_color: string;
  preset: string;
  visibility: string;
  collaboration_mode: string;
  portal_enabled: number;
  join_policy: string;
  submissions_enabled: number;
  enabled_features_json: string;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  status: string;
  permissions_json: string | null;
  invited_by: string | null;
  joined_at: string;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CharacterRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  name: string;
  romaji: string | null;
  nickname: string | null;
  species: string | null;
  summary: string | null;
  avatar_asset_id: string | null;
  avatar_r2_key: string | null;
  theme_color: string | null;
  visibility: string;
  height_cm: number | null;
  tags_json: string | null;
  general_profile_json: string | null;
  artist_profile_json: string | null;
  writer_profile_json: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type ProjectCharacterLinkRow = {
  id: string;
  project_id: string;
  character_id: string;
  submitted_by_user_id: string | null;
  status: string;
  faction_id: string | null;
  faction_label: string | null;
  project_role: string | null;
  visibility: string;
  template_version_id: string | null;
  field_values_json: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  review_message: string | null;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
};

type WorldEntryRow = {
  id: string;
  project_id: string;
  parent_id: string | null;
  created_by_user_id: string;
  type: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  sort_order: number;
  visibility: string;
  summary_cache_json: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type EntityLinkRow = {
  id: string;
  project_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relation_type: string;
  label: string | null;
  sort_order: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type RelationshipRow = {
  id: string;
  project_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  type: string;
  label: string;
  description: string | null;
  direction: string;
  group_id: string | null;
  visibility: string;
  album_json: string | null;
  timeline_json: string | null;
  src_view: string | null;
  tgt_view: string | null;
  map_style: string | null;
  sort_order: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RelationshipGroupRow = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  description: string | null;
  member_ids_json: string;
  timeline_json: string;
  sort_order: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type RelationshipLayoutRow = {
  id: string;
  project_id: string;
  scope: string;
  layout_json: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string, fallback: string) {
  const slug = value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || `${fallback}-${crypto.randomUUID().slice(0, 8)}`;
}

function presetDefaults(preset = 'public_showcase') {
  if (preset === 'private_collaboration') {
    return {
      visibility: 'private',
      collaborationMode: 'collaborative',
      portalEnabled: false,
      joinPolicy: 'invite',
      submissionsEnabled: false,
      enabledFeatures: [features.characters, features.worldview, features.story, features.gallery, features.relationships, features.template, features.roster, features.applications, features.participants, features.permissions],
    };
  }
  if (preset === 'public_collaboration') {
    return {
      visibility: 'public',
      collaborationMode: 'collaborative',
      portalEnabled: true,
      joinPolicy: 'application',
      submissionsEnabled: true,
      enabledFeatures: [features.characters, features.worldview, features.story, features.gallery, features.relationships, features.publicPage, features.template, features.roster, features.applications, features.submissions, features.participants, features.permissions],
    };
  }
  if (preset === 'personal_organization') {
    return {
      visibility: 'private',
      collaborationMode: 'solo',
      portalEnabled: false,
      joinPolicy: 'closed',
      submissionsEnabled: false,
      enabledFeatures: [features.characters, features.worldview, features.story, features.gallery, features.relationships, features.inbox],
    };
  }
  return {
    visibility: 'public',
    collaborationMode: 'solo',
    portalEnabled: true,
    joinPolicy: 'closed',
    submissionsEnabled: false,
    enabledFeatures: [features.characters, features.worldview, features.story, features.gallery, features.relationships, features.publicPage],
  };
}

function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    coverAssetId: row.cover_asset_id,
    themeColor: row.theme_color,
    preset: row.preset,
    visibility: row.visibility,
    collaborationMode: row.collaboration_mode,
    portalEnabled: Boolean(row.portal_enabled),
    joinPolicy: row.join_policy,
    submissionsEnabled: Boolean(row.submissions_enabled),
    enabledFeatures: parseJson<string[]>(row.enabled_features_json, []),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapMember(row: ProjectMemberRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    permissions: parseJson<Record<string, unknown>>(row.permissions_json, {}),
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
    removedAt: row.removed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function r2PublicUrl(key: string) {
  return `/api/media/${key}`;
}

const CHAR_AVATAR_JOIN = `LEFT JOIN assets av ON av.id = c.avatar_asset_id`;

function mapCharacter(row: CharacterRow) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    name: row.name,
    romaji: row.romaji,
    nickname: row.nickname,
    species: row.species,
    summary: row.summary,
    tagline: row.summary,
    avatarAssetId: row.avatar_asset_id,
    avatarUrl: row.avatar_r2_key ? r2PublicUrl(row.avatar_r2_key) : null,
    themeColor: row.theme_color ?? null,
    visibility: row.visibility,
    heightCm: row.height_cm ?? null,
    tags: parseJson<string[]>(row.tags_json, []),
    generalProfile: parseJson<Record<string, unknown>>(row.general_profile_json, {}),
    artistProfile: parseJson<Record<string, unknown>>(row.artist_profile_json, {}),
    writerProfile: parseJson<Record<string, unknown>>(row.writer_profile_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapProjectLink(row: ProjectCharacterLinkRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    characterId: row.character_id,
    submittedByUserId: row.submitted_by_user_id,
    submittedBy: row.submitted_by_user_id,
    status: row.status,
    factionId: row.faction_id,
    factionLabel: row.faction_label,
    faction: row.faction_label,
    projectRole: row.project_role,
    visibility: row.visibility,
    templateVersionId: row.template_version_id,
    fieldValues: parseJson<Record<string, unknown>>(row.field_values_json, {}),
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedBy: row.reviewed_by_user_id,
    reviewMessage: row.review_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    removedAt: row.removed_at,
  };
}

function mapWorldEntry(row: WorldEntryRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    createdByUserId: row.created_by_user_id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.content,
    content: row.content,
    sortOrder: row.sort_order,
    visibility: row.visibility,
    summaryCache: parseJson<Record<string, unknown>>(row.summary_cache_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapEntityLink(row: EntityLinkRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    targetType: row.target_type,
    targetId: row.target_id,
    relationType: row.relation_type,
    label: row.label,
    sortOrder: row.sort_order,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function relationshipAvatar(ref: { type: string; id: string }, fallback: string, color: string) {
  const label = ref.type === 'world_entry' ? '世' : ref.type === 'group' ? '群' : ref.id.slice(0, 1).toUpperCase() || fallback;
  return [label, color];
}

function mapRelationship(row: RelationshipRow) {
  const sourceRef = { type: row.source_type, id: row.source_id };
  const targetRef = { type: row.target_type, id: row.target_id };
  const album = parseJson<string[]>(row.album_json, []);
  const timeline = parseJson<[string, string][]>(row.timeline_json, []);
  const relText = row.type === row.label ? row.label : `${row.label} ${row.type}`.trim();
  return {
    id: row.id,
    baseId: row.id,
    projectId: row.project_id,
    sourceRef,
    targetRef,
    sourceType: row.source_type,
    sourceId: row.source_id,
    targetType: row.target_type,
    targetId: row.target_id,
    type: row.type,
    label: row.label,
    title: row.label,
    rel: relText,
    chip: `${row.label} · ${row.type}`,
    description: row.description,
    desc: row.description || '這筆關係尚未填寫詳細說明。',
    direction: row.direction,
    groupId: row.group_id,
    visibility: row.visibility,
    album,
    timeline,
    nodes: [row.source_id, row.target_id],
    avatars: [
      relationshipAvatar(sourceRef, '源', '#8FA3B0'),
      relationshipAvatar(targetRef, '目', '#D84A3D'),
    ],
    srcView: row.src_view ?? null,
    tgtView: row.tgt_view ?? null,
    mapStyle: (row.map_style as 'line' | 'arrows' | null) ?? 'line',
    sortOrder: row.sort_order,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapRelationshipGroup(row: RelationshipGroupRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    description: row.description ?? null,
    memberIds: parseJson<string[]>(row.member_ids_json, []),
    timeline: parseJson<[string, string][]>(row.timeline_json, []),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function defaultRelationshipLayout(projectId: string) {
  return {
    projectId,
    scope: 'project',
    nodes: {},
    labels: {},
    paths: {},
    groups: {},
    updatedAt: null,
  };
}

function mapRelationshipLayout(row: RelationshipLayoutRow | null, projectId: string) {
  if (!row) return defaultRelationshipLayout(projectId);
  const layout = parseJson<Record<string, unknown>>(row.layout_json, {});
  return {
    ...defaultRelationshipLayout(projectId),
    ...layout,
    id: row.id,
    projectId: row.project_id,
    scope: row.scope,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeRelationshipLayout(current: Record<string, unknown>, patch: Record<string, unknown>) {
  const merged = { ...current };
  (['nodes', 'labels', 'paths', 'groups'] as const).forEach((key) => {
    if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key])) {
      merged[key] = {
        ...((current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])) ? current[key] as Record<string, unknown> : {}),
        ...(patch[key] as Record<string, unknown>),
      };
    }
  });
  return {
    projectId: typeof current.projectId === 'string' ? current.projectId : undefined,
    scope: 'project',
    nodes: (merged.nodes && typeof merged.nodes === 'object') ? merged.nodes : {},
    labels: (merged.labels && typeof merged.labels === 'object') ? merged.labels : {},
    paths: (merged.paths && typeof merged.paths === 'object') ? merged.paths : {},
    groups: (merged.groups && typeof merged.groups === 'object') ? merged.groups : {},
  };
}

function assertRelationshipLayoutShape(layout: Record<string, unknown>) {
  const serialized = JSON.stringify(layout);
  if (serialized.length > RELATIONSHIP_LAYOUT_MAX_BYTES) {
    throw new AppHttpError(413, 'PAYLOAD_TOO_LARGE', 'Relationship layout JSON is too large');
  }
  (['nodes', 'labels', 'paths', 'groups'] as const).forEach((key) => {
    const value = layout[key];
    if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      throw new AppHttpError(400, 'VALIDATION_ERROR', `${key} must be an object`, { [key]: 'Expected object' });
    }
  });
}

async function getProjectRow(db: D1Database, projectId: string) {
  return first<ProjectRow>(db, 'SELECT * FROM projects WHERE id = ? AND archived_at IS NULL', [projectId]);
}

async function getProjectMember(db: D1Database, projectId: string, userId: string) {
  return first<ProjectMemberRow>(
    db,
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND status = ? AND removed_at IS NULL',
    [projectId, userId, 'active'],
  );
}

async function getVisibleProject(c: AppContext, projectId: string, permission: Parameters<typeof requirePermission>[1]) {
  const db = getDb(c);
  const user = c.get('user');
  const project = await getProjectRow(db, projectId);
  if (!project) throw new AppHttpError(404, 'NOT_FOUND', 'Project not found');

  const member = project.owner_user_id === user.sub ? null : await getProjectMember(db, project.id, user.sub);
  const viewerRole: ProjectRole = project.owner_user_id === user.sub ? 'owner' : (member?.role as ProjectRole | undefined) ?? null;
  if (!viewerRole) throw new AppHttpError(403, 'FORBIDDEN', 'Workspace membership is required. Public visitor data must use /api/public.');

  await requirePermission(c, permission, { projectId, viewerRole });
  return { project, viewerRole, member };
}

async function getProjectStats(db: D1Database, projectId: string) {
  const stats = await first<{
    character_count: number;
    world_entry_count: number;
    story_count: number;
    asset_count: number;
  }>(
    db,
    `SELECT
      (SELECT COUNT(*) FROM project_character_links WHERE project_id = ? AND removed_at IS NULL) AS character_count,
      (SELECT COUNT(*) FROM world_entries WHERE project_id = ? AND archived_at IS NULL) AS world_entry_count,
      (SELECT COUNT(*) FROM stories WHERE project_id = ? AND archived_at IS NULL) AS story_count,
      (SELECT COUNT(*) FROM asset_links WHERE project_id = ?) AS asset_count`,
    [projectId, projectId, projectId, projectId],
  );

  return {
    characters: Number(stats?.character_count ?? 0),
    worldEntries: Number(stats?.world_entry_count ?? 0),
    stories: Number(stats?.story_count ?? 0),
    assets: Number(stats?.asset_count ?? 0),
  };
}

async function getCharacterRow(db: D1Database, characterId: string) {
  return first<CharacterRow>(db,
    `SELECT c.*, av.r2_key as avatar_r2_key FROM characters c ${CHAR_AVATAR_JOIN} WHERE c.id = ? AND c.archived_at IS NULL`,
    [characterId]);
}

async function getProjectLinkById(db: D1Database, projectId: string, linkId: string) {
  return first<ProjectCharacterLinkRow>(
    db,
    'SELECT * FROM project_character_links WHERE project_id = ? AND id = ? AND removed_at IS NULL',
    [projectId, linkId],
  );
}

async function getProjectLinkForCharacter(db: D1Database, projectId: string, characterId: string) {
  return first<ProjectCharacterLinkRow>(
    db,
    'SELECT * FROM project_character_links WHERE project_id = ? AND character_id = ? AND removed_at IS NULL',
    [projectId, characterId],
  );
}

function projectCharacterLinkInsert(db: D1Database, params: {
  projectId: string;
  characterId: string;
  userId: string;
  status?: string;
  factionId?: string | null;
  factionLabel?: string | null;
  projectRole?: string | null;
  visibility?: string;
  templateVersionId?: string | null;
  fieldValues?: Record<string, unknown> | null;
}) {
  const now = nowIso();
  const id = crypto.randomUUID();
  return {
    id,
    statement: db.prepare(
    `INSERT INTO project_character_links (
      id, project_id, character_id, submitted_by_user_id, status, faction_id, faction_label,
      project_role, visibility, template_version_id, field_values_json, submitted_at,
      reviewed_at, reviewed_by_user_id, review_message, created_at, updated_at, removed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).bind(
      id,
      params.projectId,
      params.characterId,
      params.userId,
      params.status ?? 'active',
      params.factionId ?? null,
      params.factionLabel ?? null,
      params.projectRole ?? null,
      params.visibility ?? 'private',
      params.templateVersionId ?? null,
      jsonColumn(params.fieldValues, {}),
      now,
      params.status === 'pending' ? null : now,
      params.status === 'pending' ? null : params.userId,
      null,
      now,
      now,
    ),
  };
}

async function createProjectCharacterLink(db: D1Database, params: Parameters<typeof projectCharacterLinkInsert>[1]) {
  const insert = projectCharacterLinkInsert(db, params);
  await batch(db, [insert.statement]);
  return getProjectLinkById(db, params.projectId, insert.id);
}

function worldEntryLinkStatements(db: D1Database, params: {
  projectId: string;
  entryId: string;
  userId: string;
  relatedCharacterIds?: string[];
  relatedEntryIds?: string[];
}) {
  const now = nowIso();
  const statements: D1PreparedStatement[] = [];

  if (params.relatedCharacterIds) {
    statements.push(db.prepare(
      'DELETE FROM entity_links WHERE project_id = ? AND source_type = ? AND source_id = ? AND target_type = ?',
    ).bind(params.projectId, 'world_entry', params.entryId, 'character'));
    params.relatedCharacterIds.forEach((characterId, index) => {
      statements.push(db.prepare(
        `INSERT INTO entity_links (
          id, project_id, source_type, source_id, target_type, target_id, relation_type,
          label, sort_order, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), params.projectId, 'world_entry', params.entryId, 'character', characterId, 'related_character', null, index, params.userId, now, now));
    });
  }

  if (params.relatedEntryIds) {
    statements.push(db.prepare(
      'DELETE FROM entity_links WHERE project_id = ? AND source_type = ? AND source_id = ? AND target_type = ?',
    ).bind(params.projectId, 'world_entry', params.entryId, 'world_entry'));
    params.relatedEntryIds.forEach((targetEntryId, index) => {
      if (targetEntryId === params.entryId) return;
      statements.push(db.prepare(
        `INSERT INTO entity_links (
          id, project_id, source_type, source_id, target_type, target_id, relation_type,
          label, sort_order, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), params.projectId, 'world_entry', params.entryId, 'world_entry', targetEntryId, 'related_entry', null, index, params.userId, now, now));
    });
  }

  return statements;
}

async function validateWorldEntryRefs(db: D1Database, params: {
  projectId: string;
  entryId: string;
  relatedCharacterIds?: string[];
  relatedEntryIds?: string[];
}) {
  const charIds = params.relatedCharacterIds ?? [];
  const entryIds = params.relatedEntryIds ?? [];

  if (charIds.length > 0) {
    const placeholders = charIds.map(() => '?').join(',');
    const rows = await all<{ character_id: string }>(
      db,
      `SELECT character_id FROM project_character_links WHERE project_id = ? AND character_id IN (${placeholders}) AND removed_at IS NULL`,
      [params.projectId, ...charIds],
    );
    const found = new Set(rows.map((r) => r.character_id));
    for (const characterId of charIds) {
      if (!found.has(characterId)) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', `Related character is not linked to this project: ${characterId}`);
    }
  }

  if (entryIds.length > 0) {
    if (entryIds.includes(params.entryId)) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', 'World entry cannot link to itself');
    const placeholders = entryIds.map(() => '?').join(',');
    const rows = await all<{ id: string }>(
      db,
      `SELECT id FROM world_entries WHERE project_id = ? AND id IN (${placeholders}) AND archived_at IS NULL`,
      [params.projectId, ...entryIds],
    );
    const found = new Set(rows.map((r) => r.id));
    for (const targetEntryId of entryIds) {
      if (!found.has(targetEntryId)) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', `Related world entry is not in this project: ${targetEntryId}`);
    }
  }
}

async function validateWorldEntryParent(db: D1Database, params: {
  projectId: string;
  entryId: string;
  parentId?: string | null;
}) {
  if (!params.parentId) return;
  if (params.parentId === params.entryId) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', 'World entry cannot be its own parent');

  let cursor: string | null = params.parentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === params.entryId || visited.has(cursor)) {
      throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', 'World entry parent would create a cycle');
    }
    visited.add(cursor);
    const row = await getWorldEntryRow(db, params.projectId, cursor);
    if (!row) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', 'Parent world entry is not in this project');
    cursor = row.parent_id;
  }
}

async function replaceWorldEntryLinks(db: D1Database, params: {
  projectId: string;
  entryId: string;
  userId: string;
  relatedCharacterIds?: string[];
  relatedEntryIds?: string[];
}) {
  await validateWorldEntryRefs(db, params);
  await batch(db, worldEntryLinkStatements(db, params));
}

async function getWorldEntryRow(db: D1Database, projectId: string, entryId: string) {
  return first<WorldEntryRow>(
    db,
    'SELECT * FROM world_entries WHERE project_id = ? AND id = ? AND archived_at IS NULL',
    [projectId, entryId],
  );
}

async function getEntityLinksForWorldEntry(db: D1Database, projectId: string, entryId: string) {
  return all<EntityLinkRow>(
    db,
    `SELECT * FROM entity_links
     WHERE project_id = ?
       AND source_type = ?
       AND source_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [projectId, 'world_entry', entryId],
  );
}

async function getRelationshipRow(db: D1Database, projectId: string, relationshipId: string) {
  return first<RelationshipRow>(
    db,
    'SELECT * FROM relationships WHERE project_id = ? AND id = ? AND deleted_at IS NULL',
    [projectId, relationshipId],
  );
}

async function getRelationshipLayoutRow(db: D1Database, projectId: string) {
  return first<RelationshipLayoutRow>(
    db,
    'SELECT * FROM relationship_layouts WHERE project_id = ? AND scope = ?',
    [projectId, 'project'],
  );
}

async function validateRelationshipEntityRef(db: D1Database, projectId: string, ref: z.infer<typeof relationshipEntityRefSchema>) {
  if (ref.type === 'character') {
    const link = await getProjectLinkForCharacter(db, projectId, ref.id);
    if (!link) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', `Relationship character is not linked to this project: ${ref.id}`);
    return;
  }
  if (ref.type === 'world_entry') {
    const entry = await getWorldEntryRow(db, projectId, ref.id);
    if (!entry) throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', `Relationship world entry is not in this project: ${ref.id}`);
  }
}

async function validateRelationshipRefs(db: D1Database, projectId: string, input: {
  sourceRef?: z.infer<typeof relationshipEntityRefSchema>;
  targetRef?: z.infer<typeof relationshipEntityRefSchema>;
}) {
  if (input.sourceRef && input.targetRef && input.sourceRef.type === input.targetRef.type && input.sourceRef.id === input.targetRef.id) {
    throw new AppHttpError(422, 'UNPROCESSABLE_ENTITY', 'Relationship source and target must be different');
  }
  if (input.sourceRef) await validateRelationshipEntityRef(db, projectId, input.sourceRef);
  if (input.targetRef) await validateRelationshipEntityRef(db, projectId, input.targetRef);
}


appApiRouter.get('/projects', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { includeArchived, q } = c.req.query();
  const limit = optionalLimit(c.req.query('limit'));
  const archivedClause = includeArchived === 'true' ? '' : 'AND p.archived_at IS NULL';
  const search = q ? `%${q}%` : null;
  const projects = await all<ProjectRow>(
    db,
    `SELECT DISTINCT p.*
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? AND pm.status = ? AND pm.removed_at IS NULL
     WHERE (p.owner_user_id = ? OR pm.user_id = ?)
       ${archivedClause}
       AND (? IS NULL OR p.name LIKE ? OR p.slug LIKE ?)
     ORDER BY p.updated_at DESC
     LIMIT ?`,
    [user.sub, 'active', user.sub, user.sub, search, search, search, limit],
  );
  return c.json({ projects: projects.map(mapProject), nextCursor: null });
});

appApiRouter.post('/projects', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  await requirePermission(c, 'authenticated');
  const input = await validateJson(c, createProjectSchema);
  const defaults = presetDefaults(input.preset);
  const now = nowIso();
  const id = crypto.randomUUID();
  const preset = input.preset ?? 'public_showcase';
  const slug = slugify(input.slug ?? input.name, 'project');
  const themeColor = input.themeColor ?? input.color ?? '#8FA3B0';
  const duplicate = await first<{ id: string }>(db, 'SELECT id FROM projects WHERE slug = ?', [slug]);
  if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'Project slug already exists');

  const membershipId = crypto.randomUUID();
  await batch(db, [
    db.prepare(
    `INSERT INTO projects (
      id, owner_user_id, slug, name, description, cover_asset_id, theme_color, preset,
      visibility, collaboration_mode, portal_enabled, join_policy, submissions_enabled,
      enabled_features_json, status, created_at, updated_at, archived_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).bind(
      id,
      user.sub,
      slug,
      input.name,
      input.description ?? null,
      themeColor,
      preset,
      input.visibility ?? defaults.visibility,
      input.collaborationMode ?? defaults.collaborationMode,
      boolToInt(input.portalEnabled ?? defaults.portalEnabled),
      input.joinPolicy ?? defaults.joinPolicy,
      boolToInt(input.submissionsEnabled ?? defaults.submissionsEnabled),
      jsonColumn(input.enabledFeatures ?? defaults.enabledFeatures, []),
      'active',
      now,
      now,
    ),
    db.prepare(
    `INSERT INTO project_members (
      id, project_id, user_id, role, status, permissions_json, invited_by,
      joined_at, removed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?)`,
    ).bind(membershipId, id, user.sub, 'owner', 'active', now, now, now),
    db.prepare(
    `INSERT INTO public_pages (
      id, project_id, slug, status, draft_json, theme_json, settings_json,
      published_version_id, updated_by_user_id, created_at, updated_at, published_at, unpublished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL)`,
    ).bind(
      crypto.randomUUID(),
      id,
      slug,
      input.portalEnabled ?? defaults.portalEnabled ? 'draft' : 'disabled',
      jsonColumn({ blocks: [], updatedAt: now }, {}),
      jsonColumn({ color: themeColor }, {}),
      jsonColumn({ visibility: input.visibility ?? defaults.visibility }, {}),
      user.sub,
      now,
      now,
    ),
  ]);

  const project = await getProjectRow(db, id);
  const membership = await getProjectMember(db, id, user.sub);
  return c.json({ project: mapProject(project!), membership: mapMember(membership) }, 201);
});

appApiRouter.get('/projects/:projectId', async (c) => {
  const db = getDb(c);
  const { project, viewerRole } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  return c.json({
    project: mapProject(project),
    viewerRole,
    stats: await getProjectStats(db, project.id),
  });
});

appApiRouter.get('/projects/:projectId/members', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  type MemberRow = { id: string; user_id: string; role: string; status: string; joined_at: string; display_name: string; handle: string; char_count: number };
  const rows = await all<MemberRow>(db,
    `SELECT pm.id, pm.user_id, pm.role, pm.status, pm.joined_at,
            u.display_name, u.handle,
            COUNT(pcl.id) AS char_count
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     LEFT JOIN project_character_links pcl ON pcl.project_id = pm.project_id AND pcl.submitted_by_user_id = pm.user_id AND pcl.removed_at IS NULL
     WHERE pm.project_id = ? AND pm.removed_at IS NULL
     GROUP BY pm.id
     ORDER BY CASE pm.role WHEN 'owner' THEN 0 ELSE 1 END, pm.joined_at ASC`,
    [project.id]);
  const isOwner = project.owner_user_id === user.sub;
  return c.json({ members: rows.map(r => ({ id: r.id, userId: r.user_id, role: r.role, status: r.status, joinedAt: r.joined_at, displayName: r.display_name, handle: r.handle, charCount: r.char_count, isCurrentUser: r.user_id === user.sub })), viewerIsOwner: isOwner });
});

const updateMemberSchema = z.object({
  permissions: z.record(z.string(), z.enum(['allow', 'deny'])).optional(),
  role: z.enum(['host', 'cohost', 'member', 'viewer']).optional(),
});

appApiRouter.patch('/projects/:projectId/members/:memberId', async (c) => {
  const db = getDb(c);
  const { project, viewerRole } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  await requirePermission(c, 'project:manage_settings', { projectId: project.id, viewerRole });
  const input = await validateJson(c, updateMemberSchema);
  const memberId = c.req.param('memberId');
  const member = await first<{ id: string; role: string }>(db,
    'SELECT id, role FROM project_members WHERE id = ? AND project_id = ? AND removed_at IS NULL',
    [memberId, project.id]);
  if (!member) throw new AppHttpError(404, 'NOT_FOUND', 'Member not found');
  if (member.role === 'owner') throw new AppHttpError(403, 'FORBIDDEN', 'Cannot modify owner permissions');
  const now = nowIso();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  if (input.permissions !== undefined) { sets.push('permissions_json = ?'); vals.push(JSON.stringify(input.permissions)); }
  if (input.role !== undefined) { sets.push('role = ?'); vals.push(input.role); }
  if (sets.length > 1) {
    vals.push(memberId);
    await run(db, `UPDATE project_members SET ${sets.join(', ')} WHERE id = ?`, vals);
  }
  return c.json({ ok: true });
});

appApiRouter.patch('/projects/:projectId', async (c) => {
  const db = getDb(c);
  const { project, viewerRole } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const input = await validateJson(c, updateProjectSchema);
  const now = nowIso();
  if (PROJECT_META_FIELDS.some((field) => field in input)) await requirePermission(c, 'project:update', { projectId: project.id, viewerRole });
  if (PROJECT_SETTINGS_FIELDS.some((field) => field in input)) await requirePermission(c, 'project:manage_settings', { projectId: project.id, viewerRole });
  if (PROJECT_PUBLISH_FIELDS.some((field) => field in input)) await requirePermission(c, 'project:publish', { projectId: project.id, viewerRole });

  const slug = input.slug ? slugify(input.slug, 'project') : undefined;
  if (slug && slug !== project.slug) {
    const duplicate = await first<{ id: string }>(db, 'SELECT id FROM projects WHERE slug = ? AND id != ?', [slug, project.id]);
    if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'Project slug already exists');
  }

  const { sets, values } = buildPatch(input as Record<string, unknown>, {
    name: { column: 'name' },
    slug: { column: 'slug', value: (value) => slugify(String(value), 'project') },
    description: { column: 'description' },
    color: { column: 'theme_color' },
    themeColor: { column: 'theme_color' },
    visibility: { column: 'visibility' },
    collaborationMode: { column: 'collaboration_mode' },
    portalEnabled: { column: 'portal_enabled', value: boolToInt },
    joinPolicy: { column: 'join_policy' },
    submissionsEnabled: { column: 'submissions_enabled', value: boolToInt },
    enabledFeatures: { column: 'enabled_features_json', value: (value) => jsonColumn(value, []) },
  });

  if (!sets.length) return c.json({ project: mapProject(project), navigation: { projectId: project.id } });

  const statements = [
    db.prepare(`UPDATE projects SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...values, now, project.id),
  ];
  if (slug) statements.push(db.prepare('UPDATE public_pages SET slug = ?, updated_at = ? WHERE project_id = ?').bind(slug, now, project.id));
  if ('portalEnabled' in input) {
    statements.push(db.prepare('UPDATE public_pages SET status = CASE WHEN ? = 1 AND status = ? THEN ? WHEN ? = 0 THEN ? ELSE status END, updated_at = ? WHERE project_id = ?').bind(
      boolToInt(input.portalEnabled),
      'disabled',
      'draft',
      boolToInt(input.portalEnabled),
      'disabled',
      now,
      project.id,
    ));
  }
  await batch(db, statements);
  const updated = await getProjectRow(db, project.id);
  return c.json({ project: mapProject(updated!), navigation: { projectId: project.id, changedCapabilities: 'enabledFeatures' in input } });
});

appApiRouter.delete('/projects/:projectId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  if (project.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Only the project owner can delete a project');
  const now = nowIso();
  await run(db, 'UPDATE projects SET archived_at = ?, updated_at = ? WHERE id = ?', [now, now, project.id]);
  return c.json({ ok: true });
});

appApiRouter.get('/characters', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { projectId, q, visibility } = c.req.query();
  const limit = optionalLimit(c.req.query('limit'));
  const search = q ? `%${q}%` : null;

  if (projectId) {
    await getVisibleProject(c, projectId, 'project:view');
    const rows = await all<CharacterRow & { project_link_id: string }>(
      db,
      `SELECT c.*, pcl.id AS project_link_id, av.r2_key as avatar_r2_key
       FROM project_character_links pcl
       JOIN characters c ON c.id = pcl.character_id
       ${CHAR_AVATAR_JOIN}
       WHERE pcl.project_id = ?
         AND pcl.removed_at IS NULL
         AND c.archived_at IS NULL
         AND (? IS NULL OR c.visibility = ?)
         AND (? IS NULL OR c.name LIKE ? OR c.slug LIKE ?)
       ORDER BY pcl.updated_at DESC
       LIMIT ?`,
      [projectId, visibility ?? null, visibility ?? null, search, search, search, limit],
    );
    return c.json({ characters: rows.map(mapCharacter), nextCursor: null });
  }

  const rows = await all<CharacterRow>(
    db,
    `SELECT c.*, av.r2_key as avatar_r2_key
     FROM characters c ${CHAR_AVATAR_JOIN}
     WHERE c.owner_user_id = ?
       AND c.archived_at IS NULL
       AND (? IS NULL OR c.visibility = ?)
       AND (? IS NULL OR c.name LIKE ? OR c.slug LIKE ?)
     ORDER BY c.updated_at DESC
     LIMIT ?`,
    [user.sub, visibility ?? null, visibility ?? null, search, search, search, limit],
  );
  const characters = rows.map(mapCharacter);
  if (characters.length === 0) return c.json({ characters: [], nextCursor: null });

  // Attach project memberships
  const charIds = characters.map(c => c.id);
  const placeholders = charIds.map(() => '?').join(',');
  const memRows = await all<{ character_id: string; project_id: string; project_name: string; project_color: string; faction_label: string | null; project_role: string | null; status: string | null; link_id: string }>(
    db,
    `SELECT pcl.id AS link_id, pcl.character_id, p.id AS project_id, p.name AS project_name, p.theme_color AS project_color,
            pcl.faction_label, pcl.project_role, pcl.status
     FROM project_character_links pcl
     JOIN projects p ON pcl.project_id = p.id
     WHERE pcl.character_id IN (${placeholders})
       AND pcl.removed_at IS NULL
       AND p.archived_at IS NULL`,
    charIds,
  );
  const membershipMap = new Map<string, { projectId: string; projectName: string; projectColor: string; factionLabel?: string | null; projectRole?: string | null; status?: string | null; linkId?: string }[]>();
  for (const r of memRows) {
    if (!membershipMap.has(r.character_id)) membershipMap.set(r.character_id, []);
    membershipMap.get(r.character_id)!.push({
      projectId: r.project_id, projectName: r.project_name, projectColor: r.project_color,
      factionLabel: r.faction_label, projectRole: r.project_role, status: r.status, linkId: r.link_id,
    });
  }
  const enriched = characters.map(ch => ({ ...ch, memberships: membershipMap.get(ch.id) ?? [] }));
  return c.json({ characters: enriched, nextCursor: null });
});

appApiRouter.post('/characters', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  await requirePermission(c, 'character:create');
  const input = await validateJson(c, createCharacterSchema);
  const now = nowIso();
  const id = crypto.randomUUID();
  const slug = slugify(input.slug ?? input.name, 'character');
  const duplicate = await first<{ id: string }>(db, 'SELECT id FROM characters WHERE owner_user_id = ? AND slug = ?', [user.sub, slug]);
  if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'Character slug already exists');

  const statements = [
    db.prepare(
    `INSERT INTO characters (
      id, owner_user_id, slug, name, romaji, nickname, species, summary, avatar_asset_id,
      visibility, tags_json, general_profile_json, artist_profile_json, writer_profile_json,
      created_at, updated_at, archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).bind(
      id,
      user.sub,
      slug,
      input.name,
      input.romaji ?? input.rom ?? null,
      input.nickname ?? null,
      input.species ?? null,
      input.summary ?? null,
      input.avatarAssetId ?? null,
      input.visibility ?? 'private',
      jsonColumn(input.tags, []),
      jsonColumn({}, {}),
      jsonColumn({}, {}),
      jsonColumn({}, {}),
      now,
      now,
    ),
  ];

  let application: Record<string, unknown> | null = null;
  let projectLinkId: string | null = null;
  if (input.projectId) {
    const { project, viewerRole } = await getVisibleProject(c, input.projectId, 'project_character:create');
    const projectLinkInsert = projectCharacterLinkInsert(db, {
      projectId: project.id,
      characterId: id,
      userId: user.sub,
      status: viewerRole === 'owner' ? 'approved' : 'active',
      factionId: input.factionId ?? null,
      factionLabel: input.factionLabel ?? null,
      projectRole: input.projectRole ?? null,
      visibility: input.visibility ?? 'private',
      fieldValues: input.fieldValues ?? {},
    });
    projectLinkId = projectLinkInsert.id;
    statements.push(projectLinkInsert.statement);
  }

  await batch(db, statements);
  const character = await getCharacterRow(db, id);
  const projectLink = input.projectId && projectLinkId ? await getProjectLinkById(db, input.projectId, projectLinkId) : null;
  return c.json({ character: mapCharacter(character!), projectLink: mapProjectLink(projectLink), application }, 201);
});

appApiRouter.get('/characters/:characterId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const character = await getCharacterRow(db, c.req.param('characterId'));
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');

  const projectId = c.req.query('projectId');
  let projectLink: ProjectCharacterLinkRow | null = null;
  if (projectId) {
    await getVisibleProject(c, projectId, 'project:view');
    projectLink = await getProjectLinkForCharacter(db, projectId, character.id);
    if (!projectLink && character.owner_user_id !== user.sub) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found in this project');
  } else if (character.owner_user_id !== user.sub && character.visibility === 'private') {
    throw new AppHttpError(403, 'FORBIDDEN', 'Character is not visible to this user');
  }

  return c.json({ character: mapCharacter(character), projectLink: mapProjectLink(projectLink) });
});

appApiRouter.patch('/characters/:characterId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const character = await getCharacterRow(db, c.req.param('characterId'));
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Only the character owner can update character body fields');
  await requirePermission(c, 'character:update');
  const input = await validateJson(c, updateCharacterSchema);
  const now = nowIso();
  const slug = input.slug ? slugify(input.slug, 'character') : undefined;
  if (slug && slug !== character.slug) {
    const duplicate = await first<{ id: string }>(db, 'SELECT id FROM characters WHERE owner_user_id = ? AND slug = ? AND id != ?', [user.sub, slug, character.id]);
    if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'Character slug already exists');
  }

  const { sets, values } = buildPatch(input as Record<string, unknown>, {
    name: { column: 'name' },
    slug: { column: 'slug', value: (value) => slugify(String(value), 'character') },
    romaji: { column: 'romaji' },
    rom: { column: 'romaji' },
    nickname: { column: 'nickname' },
    species: { column: 'species' },
    summary: { column: 'summary' },
    visibility: { column: 'visibility' },
    tags: { column: 'tags_json', value: (value) => jsonColumn(value, []) },
    avatarAssetId: { column: 'avatar_asset_id' },
    heightCm: { column: 'height_cm' },
    themeColor: { column: 'theme_color' },
    generalProfile: { column: 'general_profile_json', value: (value) => jsonColumn(value, {}) },
    artistProfile: { column: 'artist_profile_json', value: (value) => jsonColumn(value, {}) },
    writerProfile: { column: 'writer_profile_json', value: (value) => jsonColumn(value, {}) },
  });

  if (sets.length) await run(db, `UPDATE characters SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...values, now, character.id]);
  const updated = await getCharacterRow(db, character.id);
  return c.json({ character: mapCharacter(updated!) });
});

appApiRouter.post('/characters/:characterId/avatar', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  await requirePermission(c, 'character:update');
  const character = await getCharacterRow(db, c.req.param('characterId'));
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Access denied');
  const contentType = c.req.header('Content-Type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) throw new AppHttpError(400, 'VALIDATION_ERROR', 'multipart/form-data required');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw new AppHttpError(400, 'VALIDATION_ERROR', 'file required');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Only jpeg/png/webp/gif allowed');
  if (file.size > 10 * 1024 * 1024) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Max 10 MB');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const r2Key = `avatars/${character.id}/${crypto.randomUUID()}.${ext}`;
  const oldR2Key = character.avatar_r2_key;
  await c.env.BUCKET.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const assetId = crypto.randomUUID();
  const now = nowIso();
  await run(db, `INSERT INTO assets (id, owner_user_id, r2_key, original_name, mime_type, size_bytes, asset_type, title, visibility, upload_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [assetId, user.sub, r2Key, file.name, file.type, file.size, 'avatar', character.name + ' avatar', 'private', 'uploaded', now, now]);
  await run(db, `UPDATE characters SET avatar_asset_id = ?, updated_at = ? WHERE id = ?`, [assetId, now, character.id]);
  if (oldR2Key) await c.env.BUCKET.delete(oldR2Key);
  const updated = await getCharacterRow(db, character.id);
  return c.json({ character: mapCharacter(updated!), avatarUrl: r2PublicUrl(r2Key) });
});

appApiRouter.post('/characters/:characterId/main-visual', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  await requirePermission(c, 'character:update');
  const character = await getCharacterRow(db, c.req.param('characterId'));
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Access denied');
  const contentType = c.req.header('Content-Type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) throw new AppHttpError(400, 'VALIDATION_ERROR', 'multipart/form-data required');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw new AppHttpError(400, 'VALIDATION_ERROR', 'file required');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Only jpeg/png/webp/gif allowed');
  if (file.size > 20 * 1024 * 1024) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Max 20 MB');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const r2Key = `main-visuals/${character.id}/${crypto.randomUUID()}.${ext}`;
  await c.env.BUCKET.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return c.json({ url: r2PublicUrl(r2Key) });
});

appApiRouter.post('/characters/:characterId/upload', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  await requirePermission(c, 'character:update');
  const character = await getCharacterRow(db, c.req.param('characterId'));
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Access denied');
  const contentType = c.req.header('Content-Type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) throw new AppHttpError(400, 'VALIDATION_ERROR', 'multipart/form-data required');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw new AppHttpError(400, 'VALIDATION_ERROR', 'file required');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Only jpeg/png/webp/gif allowed');
  if (file.size > 20 * 1024 * 1024) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Max 20 MB');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const r2Key = `characters/${character.id}/images/${crypto.randomUUID()}.${ext}`;
  await c.env.BUCKET.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return c.json({ url: r2PublicUrl(r2Key) });
});

appApiRouter.delete('/characters/:characterId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const character = await getCharacterRow(db, c.req.param('characterId'));
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Only the character owner can delete a character');
  const now = nowIso();
  await run(db, 'UPDATE characters SET archived_at = ?, updated_at = ? WHERE id = ?', [now, now, character.id]);
  return c.json({ ok: true });
});

appApiRouter.post('/apply', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const input = await validateJson(c, applyToProjectSchema);

  const project = await first<ProjectRow>(db, 'SELECT * FROM projects WHERE slug = ? AND archived_at IS NULL', [input.projectSlug]);
  if (!project || project.visibility === 'private') throw new AppHttpError(404, 'NOT_FOUND', 'Project not found or not accepting applications');
  if (project.owner_user_id === user.sub) throw new AppHttpError(400, 'INVALID_REQUEST', 'You cannot apply to your own project');

  const character = await getCharacterRow(db, input.characterId);
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Character does not belong to you');

  const duplicate = await getProjectLinkForCharacter(db, project.id, character.id);
  if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'This character has already applied or been linked to this project');

  const link = await createProjectCharacterLink(db, {
    projectId: project.id,
    characterId: character.id,
    userId: user.sub,
    status: 'pending',
  });
  return c.json({ projectLink: mapProjectLink(link), project: { id: project.id, name: project.name, slug: project.slug } }, 201);
});

appApiRouter.get('/projects/:projectId/characters', async (c) => {
  const db = getDb(c);
  await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const rows = await all<ProjectCharacterLinkRow & CharacterRow>(
    db,
    `SELECT pcl.*,
            c.id AS character_id, c.owner_user_id, c.slug, c.name, c.romaji, c.nickname,
            c.species, c.summary, c.avatar_asset_id, c.theme_color, c.visibility,
            c.height_cm, c.tags_json, c.general_profile_json, c.artist_profile_json,
            c.writer_profile_json, c.created_at AS c_created_at, c.updated_at AS c_updated_at,
            c.archived_at AS c_archived_at,
            av.r2_key AS avatar_r2_key
     FROM project_character_links pcl
     JOIN characters c ON c.id = pcl.character_id
     ${CHAR_AVATAR_JOIN}
     WHERE pcl.project_id = ? AND pcl.removed_at IS NULL AND c.archived_at IS NULL
     ORDER BY pcl.updated_at DESC`,
    [c.req.param('projectId')],
  );
  const roster = rows.map((row) => {
    const charRow: CharacterRow = {
      id: row.character_id, owner_user_id: row.owner_user_id, slug: row.slug,
      name: row.name, romaji: row.romaji, nickname: row.nickname, species: row.species,
      summary: row.summary, avatar_asset_id: row.avatar_asset_id, avatar_r2_key: row.avatar_r2_key,
      theme_color: row.theme_color, visibility: row.visibility, height_cm: row.height_cm,
      tags_json: row.tags_json, general_profile_json: row.general_profile_json,
      artist_profile_json: row.artist_profile_json, writer_profile_json: row.writer_profile_json,
      created_at: (row as any).c_created_at, updated_at: (row as any).c_updated_at,
      archived_at: (row as any).c_archived_at,
    };
    return { projectLink: mapProjectLink(row), character: mapCharacter(charRow) };
  });
  return c.json({ roster, nextCursor: null });
});

appApiRouter.post('/projects/:projectId/characters', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project_character:create');
  const input = await validateJson(c, createProjectLinkSchema);
  const character = await getCharacterRow(db, input.characterId);
  if (!character) throw new AppHttpError(404, 'NOT_FOUND', 'Character not found');
  if (character.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Only the owner can link this character in Backend Skeleton v1');
  const duplicate = await getProjectLinkForCharacter(db, project.id, character.id);
  if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'Character is already linked to this project');

  const link = await createProjectCharacterLink(db, {
    projectId: project.id,
    characterId: character.id,
    userId: user.sub,
    status: input.status ?? 'active',
    factionId: input.factionId ?? null,
    factionLabel: input.factionLabel ?? null,
    projectRole: input.projectRole ?? null,
    visibility: input.visibility ?? 'private',
    templateVersionId: input.templateVersionId ?? null,
    fieldValues: input.fieldValues ?? {},
  });
  return c.json({ projectLink: mapProjectLink(link), character: mapCharacter(character) }, 201);
});

appApiRouter.get('/projects/:projectId/characters/:linkId', async (c) => {
  const db = getDb(c);
  await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const link = await getProjectLinkById(db, c.req.param('projectId'), c.req.param('linkId'));
  if (!link) throw new AppHttpError(404, 'NOT_FOUND', 'Project character link not found');
  const character = await getCharacterRow(db, link.character_id);
  return c.json({ projectLink: mapProjectLink(link), character: character ? mapCharacter(character) : null });
});

appApiRouter.patch('/projects/:projectId/characters/:linkId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project_character:update');
  const link = await getProjectLinkById(db, c.req.param('projectId'), c.req.param('linkId'));
  if (!link) throw new AppHttpError(404, 'NOT_FOUND', 'Project character link not found');
  const input = await validateJson(c, updateProjectLinkSchema);
  const now = nowIso();
  const { sets, values } = buildPatch(input as Record<string, unknown>, {
    status: { column: 'status' },
    factionId: { column: 'faction_id' },
    factionLabel: { column: 'faction_label' },
    projectRole: { column: 'project_role' },
    visibility: { column: 'visibility' },
    templateVersionId: { column: 'template_version_id' },
    fieldValues: { column: 'field_values_json', value: (value) => jsonColumn(value, {}) },
    reviewMessage: { column: 'review_message' },
  });
  if ('status' in input) {
    sets.push('reviewed_at = ?', 'reviewed_by_user_id = ?');
    values.push(now, user.sub);
  }
  if (sets.length) await run(db, `UPDATE project_character_links SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...values, now, link.id]);

  // On approval: auto-add applicant as project member if not already one
  if (input.status === 'active' && link.submitted_by_user_id && link.submitted_by_user_id !== project.owner_user_id) {
    const existing = await getProjectMember(db, project.id, link.submitted_by_user_id);
    if (!existing) {
      const memberId = crypto.randomUUID();
      await run(db,
        `INSERT INTO project_members (id, project_id, user_id, role, status, permissions_json, invited_by, joined_at, removed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?)`,
        [memberId, project.id, link.submitted_by_user_id, 'member', 'active', now, now, now],
      );
    }
  }

  const updated = await getProjectLinkById(db, c.req.param('projectId'), link.id);
  return c.json({ projectLink: mapProjectLink(updated) });
});

appApiRouter.delete('/projects/:projectId/characters/:linkId', async (c) => {
  const db = getDb(c);
  await getVisibleProject(c, c.req.param('projectId'), 'project_character:update');
  const link = await getProjectLinkById(db, c.req.param('projectId'), c.req.param('linkId'));
  if (!link) throw new AppHttpError(404, 'NOT_FOUND', 'Project character link not found');
  const now = nowIso();
  await run(db, 'UPDATE project_character_links SET removed_at = ?, status = ?, updated_at = ? WHERE id = ?', [now, 'removed', now, link.id]);
  return c.json({ deleted: true, projectLinkId: link.id });
});

appApiRouter.get('/projects/:projectId/world-entries', async (c) => {
  const db = getDb(c);
  await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const { type, parentId, q, visibility } = c.req.query();
  const search = q ? `%${q}%` : null;
  const entries = await all<WorldEntryRow>(
    db,
    `SELECT * FROM world_entries
     WHERE project_id = ?
       AND archived_at IS NULL
       AND (? IS NULL OR type = ?)
       AND (? IS NULL OR parent_id = ?)
       AND (? IS NULL OR visibility = ?)
       AND (? IS NULL OR title LIKE ? OR slug LIKE ?)
     ORDER BY sort_order ASC, updated_at DESC`,
    [c.req.param('projectId'), type ?? null, type ?? null, parentId ?? null, parentId ?? null, visibility ?? null, visibility ?? null, search, search, search],
  );
  const entityLinks = await all<EntityLinkRow>(
    db,
    `SELECT el.*
     FROM entity_links el
     JOIN world_entries we ON we.id = el.source_id AND we.project_id = el.project_id
     WHERE el.project_id = ?
       AND el.source_type = ?
       AND we.archived_at IS NULL
     ORDER BY el.sort_order ASC, el.created_at ASC`,
    [c.req.param('projectId'), 'world_entry'],
  );
  return c.json({ entries: entries.map(mapWorldEntry), entityLinks: entityLinks.map(mapEntityLink), nextCursor: null });
});

appApiRouter.post('/projects/:projectId/world-entries', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'world:create');
  const input = await validateJson(c, createWorldEntrySchema);
  const now = nowIso();
  const id = crypto.randomUUID();
  const slug = slugify(input.slug ?? input.title, 'world');
  const duplicate = await first<{ id: string }>(db, 'SELECT id FROM world_entries WHERE project_id = ? AND slug = ?', [project.id, slug]);
  if (duplicate) throw new AppHttpError(409, 'CONFLICT', 'World entry slug already exists in this project');
  await validateWorldEntryParent(db, { projectId: project.id, entryId: id, parentId: input.parentId });
  await validateWorldEntryRefs(db, {
    projectId: project.id,
    entryId: id,
    relatedCharacterIds: input.relatedCharacterIds,
    relatedEntryIds: input.relatedEntryIds,
  });

  await batch(db, [
    db.prepare(
    `INSERT INTO world_entries (
      id, project_id, parent_id, created_by_user_id, type, slug, title, summary,
      content, sort_order, visibility, summary_cache_json, created_at, updated_at, archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
    ).bind(
      id,
      project.id,
      input.parentId ?? null,
      user.sub,
      input.type,
      slug,
      input.title,
      input.summary ?? null,
      input.content ?? null,
      input.sortOrder ?? 0,
      input.visibility ?? 'private',
      now,
      now,
    ),
    ...worldEntryLinkStatements(db, {
      projectId: project.id,
      entryId: id,
      userId: user.sub,
      relatedCharacterIds: input.relatedCharacterIds,
      relatedEntryIds: input.relatedEntryIds,
    }),
  ]);
  const entry = await getWorldEntryRow(db, project.id, id);
  const entityLinks = await getEntityLinksForWorldEntry(db, project.id, id);
  return c.json({ entry: mapWorldEntry(entry!), entityLinks: entityLinks.map(mapEntityLink) }, 201);
});

appApiRouter.get('/projects/:projectId/world-entries/:entryId', async (c) => {
  const db = getDb(c);
  await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const entry = await getWorldEntryRow(db, c.req.param('projectId'), c.req.param('entryId'));
  if (!entry) throw new AppHttpError(404, 'NOT_FOUND', 'World entry not found');
  const entityLinks = await getEntityLinksForWorldEntry(db, c.req.param('projectId'), entry.id);
  return c.json({ entry: mapWorldEntry(entry), entityLinks: entityLinks.map(mapEntityLink) });
});

appApiRouter.patch('/projects/:projectId/world-entries/:entryId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'world:update');
  const entry = await getWorldEntryRow(db, project.id, c.req.param('entryId'));
  if (!entry) throw new AppHttpError(404, 'NOT_FOUND', 'World entry not found');
  const input = await validateJson(c, updateWorldEntrySchema);
  if ('parentId' in input) await validateWorldEntryParent(db, { projectId: project.id, entryId: entry.id, parentId: input.parentId });
  await validateWorldEntryRefs(db, {
    projectId: project.id,
    entryId: entry.id,
    relatedCharacterIds: input.relatedCharacterIds,
    relatedEntryIds: input.relatedEntryIds,
  });

  const { sets, values } = buildPatch(input as Record<string, unknown>, {
    type: { column: 'type' },
    title: { column: 'title' },
    slug: { column: 'slug', value: (value) => slugify(String(value), 'world') },
    summary: { column: 'summary' },
    content: { column: 'content' },
    parentId: { column: 'parent_id' },
    sortOrder: { column: 'sort_order' },
    visibility: { column: 'visibility' },
  });
  const now = nowIso();
  const statements = [
    ...(sets.length ? [db.prepare(`UPDATE world_entries SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...values, now, entry.id)] : []),
    ...worldEntryLinkStatements(db, {
    projectId: project.id,
    entryId: entry.id,
    userId: user.sub,
    relatedCharacterIds: input.relatedCharacterIds,
    relatedEntryIds: input.relatedEntryIds,
    }),
  ];
  await batch(db, statements);
  const updated = await getWorldEntryRow(db, project.id, entry.id);
  const entityLinks = await getEntityLinksForWorldEntry(db, project.id, entry.id);
  return c.json({ entry: mapWorldEntry(updated!), entityLinks: entityLinks.map(mapEntityLink) });
});

appApiRouter.delete('/projects/:projectId/world-entries/:entryId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'world:update');
  const entry = await getWorldEntryRow(db, project.id, c.req.param('entryId'));
  if (!entry) throw new AppHttpError(404, 'NOT_FOUND', 'World entry not found');
  const now = nowIso();
  await batch(db, [
    db.prepare('UPDATE world_entries SET archived_at = ?, updated_at = ? WHERE id = ?').bind(now, now, entry.id),
    db.prepare(`DELETE FROM entity_links
      WHERE project_id = ?
        AND ((source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?))`).bind(project.id, 'world_entry', entry.id, 'world_entry', entry.id),
  ]);
  return c.json({ deleted: true, entryId: entry.id });
});

// ── Stories ──────────────────────────────────────────────────────────────────

const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const patchStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['draft', 'ongoing', 'complete', 'hiatus']).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
});

const createChapterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(200000).optional(),
  summary: z.string().max(1000).optional(),
});

const patchChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(200000).optional(),
  summary: z.string().max(1000).optional(),
  sortOrder: z.number().int().optional(),
});

type StoryRow = { id: string; project_id: string; slug: string; title: string; description: string | null; status: string; visibility: string; chapter_count: number; created_at: string; updated_at: string };
type ChapterRow = { id: string; story_id: string; title: string; summary: string | null; content: string | null; sort_order: number; status: string; created_at: string; updated_at: string };

function mapStory(row: StoryRow) {
  return { id: row.id, projectId: row.project_id, slug: row.slug, title: row.title, description: row.description ?? null, status: row.status, visibility: row.visibility, chapterCount: Number(row.chapter_count ?? 0), createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapChapter(row: ChapterRow) {
  return { id: row.id, storyId: row.story_id, title: row.title, summary: row.summary ?? null, content: row.content ?? null, sortOrder: row.sort_order, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

appApiRouter.get('/projects/:projectId/stories', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const rows = await all<StoryRow>(db,
    `SELECT s.*, (SELECT COUNT(*) FROM story_chapters sc WHERE sc.story_id = s.id AND sc.archived_at IS NULL) AS chapter_count
     FROM stories s WHERE s.project_id = ? AND s.archived_at IS NULL ORDER BY s.created_at DESC`,
    [project.id]);
  return c.json({ stories: rows.map(mapStory) });
});

appApiRouter.post('/projects/:projectId/stories', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:create');
  const input = await validateJson(c, createStorySchema);
  const id = crypto.randomUUID();
  const slug = id.slice(0, 8);
  const now = nowIso();
  await run(db, `INSERT INTO stories (id, project_id, created_by_user_id, slug, title, description, status, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, project.id, user.sub, slug, input.title, input.description ?? null, 'draft', 'private', now, now]);
  return c.json({ story: { id, projectId: project.id, slug, title: input.title, description: input.description ?? null, status: 'draft', visibility: 'private', chapterCount: 0, createdAt: now, updatedAt: now } }, 201);
});

appApiRouter.patch('/projects/:projectId/stories/:storyId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:update');
  const story = await first<{ id: string }>(db, `SELECT id FROM stories WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('storyId'), project.id]);
  if (!story) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const input = await validateJson(c, patchStorySchema);
  const now = nowIso();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  if (input.title !== undefined) { sets.push('title = ?'); vals.push(input.title); }
  if (input.description !== undefined) { sets.push('description = ?'); vals.push(input.description); }
  if (input.status !== undefined) { sets.push('status = ?'); vals.push(input.status); }
  if (input.visibility !== undefined) { sets.push('visibility = ?'); vals.push(input.visibility); }
  vals.push(story.id);
  await run(db, `UPDATE stories SET ${sets.join(', ')} WHERE id = ?`, vals);
  const updated = await first<StoryRow>(db,
    `SELECT s.*, (SELECT COUNT(*) FROM story_chapters sc WHERE sc.story_id = s.id AND sc.archived_at IS NULL) AS chapter_count FROM stories s WHERE s.id = ?`,
    [story.id]);
  return c.json({ story: mapStory(updated!) });
});

appApiRouter.delete('/projects/:projectId/stories/:storyId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:update');
  const story = await first<{ id: string }>(db, `SELECT id FROM stories WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('storyId'), project.id]);
  if (!story) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const now = nowIso();
  await run(db, `UPDATE stories SET archived_at = ?, updated_at = ? WHERE id = ?`, [now, now, story.id]);
  return c.json({ deleted: true });
});

appApiRouter.get('/projects/:projectId/stories/:storyId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const rows = await all<StoryRow>(db,
    `SELECT s.*, (SELECT COUNT(*) FROM story_chapters sc WHERE sc.story_id = s.id AND sc.archived_at IS NULL) AS chapter_count
     FROM stories s WHERE s.id = ? AND s.project_id = ? AND s.archived_at IS NULL`,
    [c.req.param('storyId'), project.id]);
  if (!rows[0]) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const chapters = await all<ChapterRow>(db, `SELECT * FROM story_chapters WHERE story_id = ? AND archived_at IS NULL ORDER BY sort_order ASC`, [rows[0].id]);
  return c.json({ story: mapStory(rows[0]), chapters: chapters.map(mapChapter) });
});

appApiRouter.post('/projects/:projectId/stories/:storyId/chapters', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:create');
  const story = await first<{ id: string }>(db, `SELECT id FROM stories WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('storyId'), project.id]);
  if (!story) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const input = await validateJson(c, createChapterSchema);
  const countRow = await first<{ n: number }>(db, `SELECT COUNT(*) AS n FROM story_chapters WHERE story_id = ? AND archived_at IS NULL`, [story.id]);
  const sortOrder = Number(countRow?.n ?? 0);
  const id = crypto.randomUUID();
  const now = nowIso();
  await run(db, `INSERT INTO story_chapters (id, story_id, title, summary, content, sort_order, status, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, story.id, input.title, input.summary ?? null, input.content ?? null, sortOrder, 'draft', 'private', now, now]);
  return c.json({ chapter: { id, storyId: story.id, title: input.title, summary: input.summary ?? null, content: input.content ?? null, sortOrder, status: 'draft', createdAt: now, updatedAt: now } }, 201);
});

appApiRouter.put('/projects/:projectId/stories/:storyId/chapters/reorder', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:update');
  const story = await first<{ id: string }>(db, `SELECT id FROM stories WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('storyId'), project.id]);
  if (!story) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const { ids } = await validateJson(c, z.object({ ids: z.array(z.string()) }));
  const now = nowIso();
  await Promise.all(ids.map((id, i) =>
    run(db, `UPDATE story_chapters SET sort_order = ?, updated_at = ? WHERE id = ? AND story_id = ?`, [i, now, id, story.id])
  ));
  return c.json({ ok: true });
});

appApiRouter.patch('/projects/:projectId/stories/:storyId/chapters/:chapterId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:update');
  const story = await first<{ id: string }>(db, `SELECT id FROM stories WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('storyId'), project.id]);
  if (!story) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const chapter = await first<{ id: string }>(db, `SELECT id FROM story_chapters WHERE id = ? AND story_id = ? AND archived_at IS NULL`, [c.req.param('chapterId'), story.id]);
  if (!chapter) throw new AppHttpError(404, 'NOT_FOUND', 'Chapter not found');
  const input = await validateJson(c, patchChapterSchema);
  const patch = buildPatch(input as Record<string, unknown>, {
    title: { column: 'title' },
    summary: { column: 'summary' },
    content: { column: 'content' },
    sortOrder: { column: 'sort_order' },
  });
  if (patch.sets.length === 0) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Nothing to update');
  const now = nowIso();
  patch.values.push(now, chapter.id);
  await run(db, `UPDATE story_chapters SET ${patch.sets.join(', ')}, updated_at = ? WHERE id = ?`, patch.values);
  const row = await first<ChapterRow>(db, `SELECT * FROM story_chapters WHERE id = ?`, [chapter.id]);
  return c.json({ chapter: mapChapter(row!) });
});

appApiRouter.delete('/projects/:projectId/stories/:storyId/chapters/:chapterId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'story:update');
  const story = await first<{ id: string }>(db, `SELECT id FROM stories WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('storyId'), project.id]);
  if (!story) throw new AppHttpError(404, 'NOT_FOUND', 'Story not found');
  const chapter = await first<{ id: string }>(db, `SELECT id FROM story_chapters WHERE id = ? AND story_id = ? AND archived_at IS NULL`, [c.req.param('chapterId'), story.id]);
  if (!chapter) throw new AppHttpError(404, 'NOT_FOUND', 'Chapter not found');
  const now = nowIso();
  await run(db, `UPDATE story_chapters SET archived_at = ?, updated_at = ? WHERE id = ?`, [now, now, chapter.id]);
  return c.json({ deleted: true });
});

// ── Gallery / Assets ──────────────────────────────────────────────────────────

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_ASSET_SIZE = 10 * 1024 * 1024;

type AssetRow = { id: string; title: string; r2_key: string | null; mime_type: string | null; size_bytes: number | null; width: number | null; height: number | null; asset_type: string; author_name: string | null; source_url: string | null; created_at: string; project_id?: string | null; project_name?: string | null };

const r2Url = r2PublicUrl;

function mapAsset(row: AssetRow) {
  return { id: row.id, title: row.title, url: row.r2_key ? r2Url(row.r2_key) : '', mimeType: row.mime_type ?? null, sizeBytes: row.size_bytes ?? null, width: row.width ?? null, height: row.height ?? null, assetType: row.asset_type, authorName: row.author_name ?? null, sourceUrl: row.source_url ?? null, createdAt: row.created_at, projectId: row.project_id ?? null, projectName: row.project_name ?? null };
}

appApiRouter.get('/projects/:projectId/assets', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const rows = await all<AssetRow>(db,
    `SELECT a.id, a.title, a.r2_key, a.mime_type, a.width, a.height, a.asset_type, a.author_name, a.source_url, a.created_at
     FROM assets a
     INNER JOIN asset_links al ON al.asset_id = a.id
     WHERE al.project_id = ? AND al.target_type = 'project' AND a.deleted_at IS NULL
     ORDER BY a.created_at DESC`,
    [project.id]);
  return c.json({ assets: rows.map(mapAsset) });
});

appApiRouter.post('/projects/:projectId/assets', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'asset:create');
  const contentType = c.req.header('Content-Type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) throw new AppHttpError(400, 'VALIDATION_ERROR', 'multipart/form-data required');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string | null) ?? '';
  if (!file) throw new AppHttpError(400, 'VALIDATION_ERROR', 'file required');
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Only jpeg/png/webp/gif allowed');
  if (file.size > MAX_ASSET_SIZE) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Max 10 MB');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const r2Key = `projects/${project.id}/${crypto.randomUUID()}.${ext}`;
  await c.env.BUCKET.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const id = crypto.randomUUID();
  const now = nowIso();
  const assetTitle = title || file.name || id;
  await run(db, `INSERT INTO assets (id, owner_user_id, r2_key, original_name, mime_type, size_bytes, asset_type, title, visibility, upload_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, user.sub, r2Key, file.name, file.type, file.size, 'illustration', assetTitle, 'private', 'uploaded', now, now]);
  const linkId = crypto.randomUUID();
  await run(db, `INSERT INTO asset_links (id, asset_id, project_id, target_type, target_id, role, sort_order, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [linkId, id, project.id, 'project', project.id, 'gallery', 0, 'private', now, now]);
  return c.json({ asset: { id, title: assetTitle, url: r2Url(r2Key), mimeType: file.type, width: null, height: null, assetType: 'illustration', authorName: null, sourceUrl: null, createdAt: now } }, 201);
});

appApiRouter.delete('/projects/:projectId/assets/:assetId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'asset:delete');
  const asset = await first<{ id: string; r2_key: string | null; owner_user_id: string }>(db,
    `SELECT a.id, a.r2_key, a.owner_user_id FROM assets a INNER JOIN asset_links al ON al.asset_id = a.id WHERE a.id = ? AND al.project_id = ? AND al.target_type = 'project' AND a.deleted_at IS NULL`,
    [c.req.param('assetId'), project.id]);
  if (!asset) throw new AppHttpError(404, 'NOT_FOUND', 'Asset not found');
  if (asset.owner_user_id !== user.sub) throw new AppHttpError(403, 'FORBIDDEN', 'Not your asset');
  if (asset.r2_key) await c.env.BUCKET.delete(asset.r2_key);
  const now = nowIso();
  await run(db, `UPDATE assets SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, asset.id]);
  return c.json({ deleted: true });
});
// Global asset gallery (all user assets)
appApiRouter.get('/assets', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const rows = await all<AssetRow>(db,
    `SELECT a.id, a.title, a.r2_key, a.mime_type, a.size_bytes, a.width, a.height, a.asset_type, a.author_name, a.source_url, a.created_at,
            p.id AS project_id, p.name AS project_name
     FROM assets a
     LEFT JOIN asset_links al ON al.asset_id = a.id AND al.target_type = 'project'
     LEFT JOIN projects p ON p.id = al.project_id
     WHERE a.owner_user_id = ? AND a.deleted_at IS NULL
     ORDER BY a.created_at DESC`,
    [user.sub]);
  const totalBytes = rows.reduce((s, r) => s + (r.size_bytes ?? 0), 0);
  return c.json({ assets: rows.map(mapAsset), totalBytes, limitBytes: 500 * 1024 * 1024 });
});

// Account storage usage
appApiRouter.get('/account/storage', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const row = await first<{ total_bytes: number; asset_count: number }>(db,
    `SELECT COALESCE(SUM(size_bytes), 0) AS total_bytes, COUNT(*) AS asset_count FROM assets WHERE owner_user_id = ? AND deleted_at IS NULL`,
    [user.sub]);
  return c.json({ totalBytes: row?.total_bytes ?? 0, assetCount: row?.asset_count ?? 0, limitBytes: 500 * 1024 * 1024 });
});

// public-page routes registered below near content-submissions

appApiRouter.get('/projects/:projectId/relationships', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const [relationships, groups, layoutRow] = await Promise.all([
    all<RelationshipRow>(
      db,
      `SELECT * FROM relationships
       WHERE project_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, updated_at DESC`,
      [project.id],
    ),
    all<RelationshipGroupRow>(
      db,
      `SELECT * FROM relationship_groups
       WHERE project_id = ?
       ORDER BY sort_order ASC, updated_at DESC`,
      [project.id],
    ),
    first<RelationshipLayoutRow>(
      db,
      'SELECT * FROM relationship_layouts WHERE project_id = ? AND scope = ?',
      [project.id, 'project'],
    ),
  ]);
  const layoutNodes = layoutRow
    ? (parseJson<Record<string, unknown>>(layoutRow.layout_json, {}) as Record<string, { nodes?: Record<string, { x: number; y: number }> }>)
    : null;
  const layout = layoutNodes?.nodes && Object.keys(layoutNodes.nodes).length > 0
    ? layoutNodes.nodes
    : undefined;
  return c.json({
    relationships: relationships.map(mapRelationship),
    groups: groups.map(mapRelationshipGroup),
    layout,
    nextCursor: null,
  });
});

appApiRouter.post('/projects/:projectId/relationships', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:create');
  const input = await validateJson(c, createRelationshipSchema);
  await validateRelationshipRefs(db, project.id, input);

  const now = nowIso();
  const count = await first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM relationships WHERE project_id = ? AND deleted_at IS NULL', [project.id]);
  const id = crypto.randomUUID();
  await run(
    db,
    `INSERT INTO relationships (
      id, project_id, source_type, source_id, target_type, target_id, type, label,
      description, direction, group_id, visibility, album_json, timeline_json,
      src_view, tgt_view, map_style,
      sort_order, created_by_user_id, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      project.id,
      input.sourceRef.type,
      input.sourceRef.id,
      input.targetRef.type,
      input.targetRef.id,
      input.type,
      input.label,
      input.description ?? null,
      input.direction ?? 'two-way',
      input.groupId ?? null,
      input.visibility ?? 'private',
      jsonColumn(input.album, []),
      jsonColumn(input.timeline, []),
      input.srcView ?? null,
      input.tgtView ?? null,
      input.mapStyle ?? 'line',
      input.sortOrder ?? Number(count?.count ?? 0),
      user.sub,
      now,
      now,
    ],
  );
  const relationship = await getRelationshipRow(db, project.id, id);
  return c.json({ relationship: mapRelationship(relationship!) }, 201);
});

appApiRouter.get('/projects/:projectId/relationships/:relationshipId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const relationship = await getRelationshipRow(db, project.id, c.req.param('relationshipId'));
  if (!relationship) throw new AppHttpError(404, 'NOT_FOUND', 'Relationship not found');
  return c.json({ relationship: mapRelationship(relationship) });
});

appApiRouter.patch('/projects/:projectId/relationships/:relationshipId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:update');
  const relationship = await getRelationshipRow(db, project.id, c.req.param('relationshipId'));
  if (!relationship) throw new AppHttpError(404, 'NOT_FOUND', 'Relationship not found');
  const input = await validateJson(c, updateRelationshipSchema);
  await validateRelationshipRefs(db, project.id, {
    sourceRef: input.sourceRef ?? { type: relationship.source_type as 'character' | 'world_entry' | 'custom' | 'group', id: relationship.source_id },
    targetRef: input.targetRef ?? { type: relationship.target_type as 'character' | 'world_entry' | 'custom' | 'group', id: relationship.target_id },
  });

  const sets: string[] = [];
  const values: unknown[] = [];
  if (input.sourceRef) {
    sets.push('source_type = ?', 'source_id = ?');
    values.push(input.sourceRef.type, input.sourceRef.id);
  }
  if (input.targetRef) {
    sets.push('target_type = ?', 'target_id = ?');
    values.push(input.targetRef.type, input.targetRef.id);
  }
  const patch = buildPatch(input as Record<string, unknown>, {
    type: { column: 'type' },
    label: { column: 'label' },
    description: { column: 'description' },
    direction: { column: 'direction' },
    groupId: { column: 'group_id' },
    visibility: { column: 'visibility' },
    album: { column: 'album_json', value: (value) => jsonColumn(value, []) },
    timeline: { column: 'timeline_json', value: (value) => jsonColumn(value, []) },
    srcView: { column: 'src_view' },
    tgtView: { column: 'tgt_view' },
    mapStyle: { column: 'map_style' },
    sortOrder: { column: 'sort_order' },
  });
  sets.push(...patch.sets);
  values.push(...patch.values);
  if (!sets.length) return c.json({ relationship: mapRelationship(relationship) });

  const now = nowIso();
  await run(db, `UPDATE relationships SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...values, now, relationship.id]);
  const updated = await getRelationshipRow(db, project.id, relationship.id);
  return c.json({ relationship: mapRelationship(updated!) });
});

appApiRouter.delete('/projects/:projectId/relationships/:relationshipId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:delete');
  const relationship = await getRelationshipRow(db, project.id, c.req.param('relationshipId'));
  if (!relationship) throw new AppHttpError(404, 'NOT_FOUND', 'Relationship not found');
  const now = nowIso();
  await run(db, 'UPDATE relationships SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, relationship.id]);
  return c.json({ deleted: true, relationshipId: relationship.id });
});

// ── Timeline / Story Events ───────────────────────────────────────────────────

type StoryEventRow = { id: string; project_id: string; story_id: string | null; title: string; summary: string | null; time_label: string | null; sort_key: string | null; visibility: string; created_at: string; updated_at: string };

function mapStoryEvent(row: StoryEventRow) {
  return { id: row.id, projectId: row.project_id, storyId: row.story_id ?? null, title: row.title, summary: row.summary ?? null, timeLabel: row.time_label ?? null, sortKey: row.sort_key ?? null, visibility: row.visibility, createdAt: row.created_at, updatedAt: row.updated_at };
}

const createEventSchema = z.object({
  title:     z.string().min(1).max(200),
  summary:   z.string().max(5000).optional(),
  timeLabel: z.string().max(120).optional(),
  sortKey:   z.string().max(64).optional(),
  storyId:   z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('private'),
});

const patchEventSchema = createEventSchema.partial();

appApiRouter.get('/projects/:projectId/story-events', async (c) => {
  const db = getDb(c);
  await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const rows = await all<StoryEventRow>(db,
    `SELECT * FROM story_events WHERE project_id = ? AND archived_at IS NULL ORDER BY sort_key ASC, created_at ASC`,
    [c.req.param('projectId')],
  );
  return c.json({ events: rows.map(mapStoryEvent) });
});

appApiRouter.post('/projects/:projectId/story-events', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'event:create');
  const input = await validateJson(c, createEventSchema);
  const id = crypto.randomUUID();
  const now = nowIso();
  await run(db,
    `INSERT INTO story_events (id, project_id, story_id, title, summary, time_label, sort_key, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, project.id, input.storyId ?? null, input.title, input.summary ?? null, input.timeLabel ?? null, input.sortKey ?? now, input.visibility, now, now],
  );
  const row = await first<StoryEventRow>(db, `SELECT * FROM story_events WHERE id = ?`, [id]);
  return c.json({ event: mapStoryEvent(row!) }, 201);
});

appApiRouter.patch('/projects/:projectId/story-events/:eventId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'event:update');
  const event = await first<{ id: string }>(db, `SELECT id FROM story_events WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('eventId'), project.id]);
  if (!event) throw new AppHttpError(404, 'NOT_FOUND', 'Event not found');
  const input = await validateJson(c, patchEventSchema);
  const patch = buildPatch(input, {
    title:     { column: 'title' },
    summary:   { column: 'summary' },
    timeLabel: { column: 'time_label' },
    sortKey:   { column: 'sort_key' },
    storyId:   { column: 'story_id' },
    visibility: { column: 'visibility' },
  });
  if (patch.sets.length) {
    const now = nowIso();
    await run(db, `UPDATE story_events SET ${patch.sets.join(', ')}, updated_at = ? WHERE id = ?`, [...patch.values, now, event.id]);
  }
  const row = await first<StoryEventRow>(db, `SELECT * FROM story_events WHERE id = ?`, [event.id]);
  return c.json({ event: mapStoryEvent(row!) });
});

appApiRouter.delete('/projects/:projectId/story-events/:eventId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'event:delete');
  const event = await first<{ id: string }>(db, `SELECT id FROM story_events WHERE id = ? AND project_id = ? AND archived_at IS NULL`, [c.req.param('eventId'), project.id]);
  if (!event) throw new AppHttpError(404, 'NOT_FOUND', 'Event not found');
  const now = nowIso();
  await run(db, `UPDATE story_events SET archived_at = ?, updated_at = ? WHERE id = ?`, [now, now, event.id]);
  return c.json({ deleted: true });
});

// ── Relationship Groups ────────────────────────────────────────────────────────

const createRelationshipGroupSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().max(20).optional(),
  description: z.string().max(2000).nullable().optional(),
  memberIds: z.array(z.string().max(180)).min(2).max(80),
  timeline: relationshipTimelineSchema.optional(),
  sortOrder: z.number().int().optional(),
});

const updateRelationshipGroupSchema = createRelationshipGroupSchema.partial();

async function getRelationshipGroupRow(db: D1Database, projectId: string, groupId: string) {
  return first<RelationshipGroupRow>(
    db,
    'SELECT * FROM relationship_groups WHERE project_id = ? AND id = ?',
    [projectId, groupId],
  );
}

appApiRouter.get('/projects/:projectId/relationship-groups', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const groups = await all<RelationshipGroupRow>(
    db,
    'SELECT * FROM relationship_groups WHERE project_id = ? ORDER BY sort_order ASC, updated_at DESC',
    [project.id],
  );
  return c.json({ groups: groups.map(mapRelationshipGroup) });
});

appApiRouter.post('/projects/:projectId/relationship-groups', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:create');
  const input = await validateJson(c, createRelationshipGroupSchema);
  const now = nowIso();
  const id = crypto.randomUUID();
  const count = await first<{ count: number }>(
    db,
    'SELECT COUNT(*) AS count FROM relationship_groups WHERE project_id = ?',
    [project.id],
  );
  await run(
    db,
    `INSERT INTO relationship_groups (
      id, project_id, name, color, description,
      member_ids_json, timeline_json,
      sort_order, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      project.id,
      input.name,
      input.color ?? '#A67F0E',
      input.description ?? null,
      jsonColumn(input.memberIds, []),
      jsonColumn(input.timeline ?? [], []),
      input.sortOrder ?? Number(count?.count ?? 0),
      user.sub,
      now,
      now,
    ],
  );
  const group = await getRelationshipGroupRow(db, project.id, id);
  return c.json({ group: mapRelationshipGroup(group!) }, 201);
});

appApiRouter.patch('/projects/:projectId/relationship-groups/:groupId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:update');
  const group = await getRelationshipGroupRow(db, project.id, c.req.param('groupId'));
  if (!group) throw new AppHttpError(404, 'NOT_FOUND', 'Relationship group not found');
  const input = await validateJson(c, updateRelationshipGroupSchema);
  const patch = buildPatch(input as Record<string, unknown>, {
    name: { column: 'name' },
    color: { column: 'color' },
    description: { column: 'description' },
    memberIds: { column: 'member_ids_json', value: (v) => jsonColumn(v, []) },
    timeline: { column: 'timeline_json', value: (v) => jsonColumn(v, []) },
    sortOrder: { column: 'sort_order' },
  });
  if (!patch.sets.length) return c.json({ group: mapRelationshipGroup(group) });
  const now = nowIso();
  await run(
    db,
    `UPDATE relationship_groups SET ${patch.sets.join(', ')}, updated_at = ? WHERE id = ?`,
    [...patch.values, now, group.id],
  );
  const updated = await getRelationshipGroupRow(db, project.id, group.id);
  return c.json({ group: mapRelationshipGroup(updated!) });
});

appApiRouter.delete('/projects/:projectId/relationship-groups/:groupId', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:delete');
  const group = await getRelationshipGroupRow(db, project.id, c.req.param('groupId'));
  if (!group) throw new AppHttpError(404, 'NOT_FOUND', 'Relationship group not found');
  const now = nowIso();
  // Detach any relationships that referenced this group
  await run(
    db,
    'UPDATE relationships SET group_id = NULL, updated_at = ? WHERE project_id = ? AND group_id = ?',
    [now, project.id, group.id],
  );
  await run(db, 'DELETE FROM relationship_groups WHERE id = ?', [group.id]);
  return c.json({ deleted: true, groupId: group.id });
});

// ── Relationship Layout ────────────────────────────────────────────────────────

appApiRouter.get('/projects/:projectId/relationship-layout', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const row = await getRelationshipLayoutRow(db, project.id);
  return c.json({ layout: mapRelationshipLayout(row, project.id) });
});

appApiRouter.on(['PUT', 'PATCH'], '/projects/:projectId/relationship-layout', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'relationship:layout');
  const input = await validateJson(c, relationshipLayoutSchema);
  const existing = await getRelationshipLayoutRow(db, project.id);
  const current = existing ? parseJson<Record<string, unknown>>(existing.layout_json, {}) : {};
  const patch = {
    nodes: input.nodes,
    labels: input.labels,
    paths: input.paths,
    groups: input.groups,
  };
  assertRelationshipLayoutShape(patch);
  const merged = {
    ...mergeRelationshipLayout(current, patch),
    projectId: project.id,
    scope: 'project',
  };
  assertRelationshipLayoutShape(merged);

  const now = nowIso();
  await run(
    db,
    `INSERT INTO relationship_layouts (
      id, project_id, scope, layout_json, updated_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, scope)
    DO UPDATE SET layout_json = excluded.layout_json, updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at`,
    [existing?.id ?? crypto.randomUUID(), project.id, 'project', jsonColumn(merged, {}), user.sub, now, now],
  );
  const row = await getRelationshipLayoutRow(db, project.id);
  return c.json({ layout: mapRelationshipLayout(row, project.id) });
});
// ── Content Submissions ──────────────────────────────────────────────────────

type ContentSubmissionRow = {
  id: string;
  project_id: string;
  submitter_user_id: string | null;
  submitter_name: string | null;
  type: string;
  title: string;
  message: string | null;
  asset_id: string | null;
  text_content: string | null;
  related_character_ids_json: string | null;
  status: string;
  destination_type: string | null;
  destination_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  review_message: string | null;
  created_at: string;
  updated_at: string;
};

function mapSubmission(row: ContentSubmissionRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    submitterUserId: row.submitter_user_id,
    submitterName: row.submitter_name,
    type: row.type,
    title: row.title,
    message: row.message,
    assetId: row.asset_id,
    textContent: row.text_content,
    relatedCharacterIds: parseJson<string[]>(row.related_character_ids_json, []),
    status: row.status,
    destinationType: row.destination_type,
    destinationId: row.destination_id,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewMessage: row.review_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const createSubmissionSchema = z.object({
  type: z.enum(['image', 'text', 'video', 'other']),
  title: z.string().min(1).max(200),
  message: z.string().max(2000).nullable().optional(),
  assetId: z.string().nullable().optional(),
  textContent: z.string().max(60000).nullable().optional(),
  relatedCharacterIds: z.array(z.string()).optional(),
  destinationType: z.string().max(80).nullable().optional(),
  destinationId: z.string().nullable().optional(),
});

const updateSubmissionSchema = z.object({
  status: z.enum(['draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn']).optional(),
  reviewMessage: z.string().max(2000).nullable().optional(),
});

appApiRouter.get('/projects/:projectId/submissions/content', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const isOwner = project.owner_user_id === user.sub;
  const rows = await all<ContentSubmissionRow>(
    db,
    isOwner
      ? `SELECT * FROM content_submissions WHERE project_id = ? ORDER BY submitted_at DESC, created_at DESC`
      : `SELECT * FROM content_submissions WHERE project_id = ? AND submitter_user_id = ? ORDER BY submitted_at DESC, created_at DESC`,
    isOwner ? [project.id] : [project.id, user.sub],
  );
  return c.json({ submissions: rows.map(mapSubmission), viewerIsOwner: isOwner });
});

appApiRouter.post('/projects/:projectId/submissions/content', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const input = await validateJson(c, createSubmissionSchema);
  const now = nowIso();
  const id = crypto.randomUUID();
  await run(db,
    `INSERT INTO content_submissions (id, project_id, submitter_user_id, type, title, message, asset_id, text_content, related_character_ids_json, status, destination_type, destination_id, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?)`,
    [id, project.id, user.sub, input.type, input.title, input.message ?? null, input.assetId ?? null, input.textContent ?? null,
     jsonColumn(input.relatedCharacterIds, []), input.destinationType ?? null, input.destinationId ?? null, now, now, now],
  );
  const row = await first<ContentSubmissionRow>(db, 'SELECT * FROM content_submissions WHERE id = ?', [id]);
  return c.json({ submission: mapSubmission(row!) }, 201);
});

appApiRouter.patch('/projects/:projectId/submissions/content/:submissionId', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const submission = await first<ContentSubmissionRow>(db, 'SELECT * FROM content_submissions WHERE id = ? AND project_id = ?', [c.req.param('submissionId'), project.id]);
  if (!submission) throw new AppHttpError(404, 'NOT_FOUND', 'Submission not found');
  const isOwner = project.owner_user_id === user.sub;
  const isSubmitter = submission.submitter_user_id === user.sub;
  if (!isOwner && !isSubmitter) throw new AppHttpError(403, 'FORBIDDEN', 'No access to this submission');
  const input = await validateJson(c, updateSubmissionSchema);
  const now = nowIso();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [now];
  if (input.status) { sets.push('status = ?'); vals.push(input.status); }
  if ('reviewMessage' in input) { sets.push('review_message = ?'); vals.push(input.reviewMessage ?? null); }
  if (isOwner && input.status) { sets.push('reviewed_at = ?', 'reviewed_by_user_id = ?'); vals.push(now, user.sub); }
  vals.push(submission.id);
  await run(db, `UPDATE content_submissions SET ${sets.join(', ')} WHERE id = ?`, vals);
  const updated = await first<ContentSubmissionRow>(db, 'SELECT * FROM content_submissions WHERE id = ?', [submission.id]);
  return c.json({ submission: mapSubmission(updated!) });
});

// ── Public Page settings ──────────────────────────────────────────────────────

type PublicPageRow = {
  id: string;
  project_id: string;
  slug: string;
  status: string;
  draft_json: string;
  theme_json: string | null;
  settings_json: string | null;
  published_version_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  unpublished_at: string | null;
};

function mapPublicPage(row: PublicPageRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    slug: row.slug,
    status: row.status,
    draftJson: parseJson<Record<string, unknown>>(row.draft_json, {}),
    settings: parseJson<Record<string, unknown>>(row.settings_json, {}),
    theme: parseJson<Record<string, unknown>>(row.theme_json, {}),
    publishedVersionId: row.published_version_id,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

const updatePublicPageSchema = z.object({
  status: z.enum(['draft', 'published', 'disabled']).optional(),
  draftJson: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  theme: z.record(z.unknown()).optional(),
});

appApiRouter.get('/projects/:projectId/public-page', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const row = await first<PublicPageRow>(db, 'SELECT * FROM public_pages WHERE project_id = ?', [project.id]);
  if (!row) throw new AppHttpError(404, 'NOT_FOUND', 'Public page not found');
  return c.json({ publicPage: mapPublicPage(row), projectSlug: project.slug });
});

appApiRouter.patch('/projects/:projectId/public-page', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:manage_settings');
  const row = await first<PublicPageRow>(db, 'SELECT * FROM public_pages WHERE project_id = ?', [project.id]);
  if (!row) throw new AppHttpError(404, 'NOT_FOUND', 'Public page not found');
  const input = await validateJson(c, updatePublicPageSchema);
  const now = nowIso();
  const sets: string[] = ['updated_at = ?', 'updated_by_user_id = ?'];
  const vals: unknown[] = [now, user.sub];
  if (input.status) { sets.push('status = ?'); vals.push(input.status); }
  if (input.draftJson) { sets.push('draft_json = ?'); vals.push(JSON.stringify(input.draftJson)); }
  if (input.settings) { sets.push('settings_json = ?'); vals.push(JSON.stringify(input.settings)); }
  if (input.theme) { sets.push('theme_json = ?'); vals.push(JSON.stringify(input.theme)); }
  vals.push(row.id);
  await run(db, `UPDATE public_pages SET ${sets.join(', ')} WHERE id = ?`, vals);
  const updated = await first<PublicPageRow>(db, 'SELECT * FROM public_pages WHERE id = ?', [row.id]);
  return c.json({ publicPage: mapPublicPage(updated!) });
});
// ── Project Template ─────────────────────────────────────────────────────────

type TemplateField = {
  id: string;
  type: 'section' | 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'color' | 'image' | 'relation';
  label: string;
  key: string;
  description?: string;
  required?: boolean;
  visibility?: string;
  editableBy?: string;
  options?: string[];
  min?: number;
  max?: number;
  sortOrder: number;
};

const putTemplateSchema = z.object({
  fields: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1).max(80),
    label: z.string().min(1).max(200),
    key: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    required: z.boolean().optional(),
    visibility: z.string().max(80).optional(),
    editableBy: z.string().max(80).optional(),
    options: z.array(z.string().max(200)).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    sortOrder: z.number().int(),
  })).max(100).optional(),
  canvasTemplates: z.array(z.unknown()).optional(),
  canvasDesign: z.unknown().optional(),
});

appApiRouter.get('/projects/:projectId/template', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:view');
  const row = await first<{ template_fields_json: string | null }>(
    db, 'SELECT template_fields_json FROM projects WHERE id = ?', [project.id],
  );
  const raw = parseJson<unknown>(row?.template_fields_json, null);
  let fields: TemplateField[] = [];
  let canvasTemplates: unknown[] = [];
  let canvasDesign: unknown = {};
  if (Array.isArray(raw)) {
    fields = raw as TemplateField[];
  } else if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    fields = Array.isArray(r.fields) ? r.fields as TemplateField[] : [];
    canvasTemplates = Array.isArray(r.canvasTemplates) ? r.canvasTemplates : [];
    canvasDesign = r.canvasDesign ?? {};
  }
  return c.json({ fields, canvasTemplates, canvasDesign });
});

appApiRouter.put('/projects/:projectId/template', async (c) => {
  const db = getDb(c);
  const { project } = await getVisibleProject(c, c.req.param('projectId'), 'project:manage_settings');
  const input = await validateJson(c, putTemplateSchema);
  const now = nowIso();
  const stored = {
    fields: input.fields ?? [],
    canvasTemplates: input.canvasTemplates ?? [],
    canvasDesign: input.canvasDesign ?? {},
  };
  await run(db, `UPDATE projects SET template_fields_json = ?, updated_at = ? WHERE id = ?`,
    [JSON.stringify(stored), now, project.id]);
  return c.json(stored);
});

appApiRouter.all('/wishlist', (c) => notImplemented(c, 'CommissionRepository'));
appApiRouter.all('/wishlist/*', (c) => notImplemented(c, 'CommissionRepository'));
appApiRouter.all('/commissions', (c) => notImplemented(c, 'CommissionRepository'));
appApiRouter.all('/commissions/*', (c) => notImplemented(c, 'CommissionRepository'));

// ── Global Search ────────────────────────────────────────────────────────────

appApiRouter.get('/search', async (c) => {
  const db = getDb(c);
  await requirePermission(c, 'authenticated');
  const viewer = c.get('user')!;
  const q = (c.req.query('q') ?? '').trim();
  if (!q || q.length < 1) return c.json({ results: [] });

  const like = `%${q}%`;

  const chars = await all<{ id: string; name: string; slug: string; species: string | null; avatar_r2_key: string | null }>(
    db,
    `SELECT c.id, c.name, c.slug, c.species, av.r2_key as avatar_r2_key
     FROM characters c ${CHAR_AVATAR_JOIN}
     WHERE c.owner_user_id = ? AND c.archived_at IS NULL
       AND (c.name LIKE ? OR c.species LIKE ? OR c.summary LIKE ?)
     ORDER BY c.name ASC LIMIT 8`,
    [viewer.sub, like, like, like],
  );

  const projects = await all<{ id: string; name: string; slug: string; theme_color: string | null }>(
    db,
    `SELECT p.id, p.name, p.slug, p.theme_color
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? AND pm.left_at IS NULL
     WHERE p.archived_at IS NULL
       AND (p.name LIKE ? OR p.description LIKE ?)
     ORDER BY p.name ASC LIMIT 5`,
    [viewer.sub, like, like],
  );

  const entries = await all<{ id: string; title: string; type: string; project_id: string; project_name: string }>(
    db,
    `SELECT we.id, we.title, we.type, we.project_id, p.name as project_name
     FROM world_entries we
     JOIN projects p ON p.id = we.project_id
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? AND pm.left_at IS NULL
     WHERE we.archived_at IS NULL
       AND (we.title LIKE ? OR we.summary LIKE ?)
     ORDER BY we.title ASC LIMIT 8`,
    [viewer.sub, like, like],
  );

  const results = [
    ...chars.map(c => ({ type: 'character' as const, id: c.id, name: c.name, sub: c.species ?? '', path: `/characters/${c.id}`, color: null, imgUrl: c.avatar_r2_key ? r2PublicUrl(c.avatar_r2_key) : null })),
    ...projects.map(p => ({ type: 'project' as const, id: p.id, name: p.name, sub: '', path: `/p/${p.id}/overview`, color: p.theme_color, imgUrl: null })),
    ...entries.map(e => ({ type: 'entry' as const, id: e.id, name: e.title, sub: e.project_name, path: `/p/${e.project_id}/worldview/${e.id}`, color: null, imgUrl: null })),
  ];

  return c.json({ results });
});

// ── Account profile ─────────────────────────────────────────────────────────

const patchAccountSchema = z.object({
  display_name: z.string().max(64).optional(),
  bio: z.string().max(160).optional(),
});

appApiRouter.get('/account', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const row = await first<{
    id: string; email: string; handle: string; display_name: string | null; bio: string | null; avatar_asset_id: string | null; password_hash: string | null;
  }>(db, 'SELECT id, email, handle, display_name, bio, avatar_asset_id, password_hash FROM users WHERE id = ?', [user.sub]);
  if (!row) throw new AppHttpError(404, 'NOT_FOUND', 'User not found');
  return c.json({
    id: row.id, email: row.email, handle: row.handle,
    displayName: row.display_name ?? row.handle,
    bio: row.bio ?? null,
    hasPassword: !!row.password_hash,
  });
});

appApiRouter.patch('/account', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const input = await validateJson(c, patchAccountSchema);
  const patch = buildPatch(input as Record<string, unknown>, { display_name: { column: 'display_name' }, bio: { column: 'bio' } });
  if (patch.sets.length === 0) throw new AppHttpError(400, 'VALIDATION_ERROR', 'Nothing to update');
  patch.values.push(nowIso(), user.sub);
  await run(db, `UPDATE users SET ${patch.sets.join(', ')}, updated_at = ? WHERE id = ?`, patch.values);
  const row = await first<{
    id: string; email: string; handle: string; display_name: string | null; bio: string | null;
  }>(db, 'SELECT id, email, handle, display_name, bio FROM users WHERE id = ?', [user.sub]);
  if (!row) throw new AppHttpError(404, 'NOT_FOUND', 'User not found');
  return c.json({
    id: row.id, email: row.email, handle: row.handle,
    displayName: row.display_name ?? row.handle,
    bio: row.bio ?? null,
  });
});

const setPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, '密碼至少 8 個字元'),
});

appApiRouter.patch('/account/password', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { currentPassword, newPassword } = await validateJson(c, setPasswordSchema);

  const row = await first<{ password_hash: string | null }>(
    db, 'SELECT password_hash FROM users WHERE id = ?', [user.sub],
  );
  if (!row) throw new AppHttpError(404, 'NOT_FOUND', 'User not found');

  if (row.password_hash) {
    if (!currentPassword) throw new AppHttpError(400, 'VALIDATION_ERROR', '請輸入目前的密碼');
    const ok = await verifyPassword(currentPassword, row.password_hash);
    if (!ok) throw new AppHttpError(401, 'UNAUTHORIZED', '目前的密碼不正確');
  }

  const newHash = await hashPassword(newPassword);
  await run(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
    [newHash, nowIso(), user.sub]);
  return c.json({ ok: true });
});

appApiRouter.get('/account/connected', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const rows = await all<{ id: string; provider: string; created_at: string }>(
    db, 'SELECT id, provider, created_at FROM oauth_accounts WHERE user_id = ? ORDER BY created_at ASC', [user.sub],
  );
  return c.json({ accounts: rows.map(r => ({ id: r.id, provider: r.provider, connectedAt: r.created_at })) });
});

appApiRouter.delete('/account/connected/:provider', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const { provider } = c.req.param();

  const userRow = await first<{ password_hash: string | null }>(
    db, 'SELECT password_hash FROM users WHERE id = ?', [user.sub],
  );
  const countRow = await first<{ count: number }>(
    db, 'SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = ?', [user.sub],
  );
  if (!userRow?.password_hash && (countRow?.count ?? 0) <= 1) {
    throw new AppHttpError(400, 'VALIDATION_ERROR', '至少需要保留一種登入方式');
  }

  await run(db, 'DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?', [user.sub, provider]);
  return c.json({ ok: true });
});

function genInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  const s = Array.from(arr).map(b => chars[b % chars.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

function getInviteLimit(c: AppContext): number | null {
  const adminIds = (c.env.INVITE_ADMIN_IDS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (adminIds.includes(c.get('user').sub)) return null; // unlimited
  const limit = parseInt(c.env.INVITE_LIMIT ?? '5', 10);
  return isNaN(limit) ? 5 : limit;
}

appApiRouter.get('/account/invites', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const rows = await all<{
    id: string; code: string; used_by_user_id: string | null; created_at: string; used_at: string | null;
  }>(db, 'SELECT id, code, used_by_user_id, created_at, used_at FROM invite_codes WHERE created_by_user_id = ? ORDER BY created_at DESC', [user.sub]);
  const limit = getInviteLimit(c);
  const created = rows.length;
  return c.json({
    invites: rows.map(r => ({
      id: r.id, code: r.code,
      usedByUserId: r.used_by_user_id,
      createdAt: r.created_at,
      usedAt: r.used_at,
    })),
    limit,
    remaining: limit === null ? null : Math.max(0, limit - created),
    isAdmin: limit === null,
  });
});

appApiRouter.post('/account/invites', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const limit = getInviteLimit(c);
  if (limit !== null) {
    const countRow = await first<{ count: number }>(db, 'SELECT COUNT(*) as count FROM invite_codes WHERE created_by_user_id = ?', [user.sub]);
    if ((countRow?.count ?? 0) >= limit) {
      throw new AppHttpError(400, 'LIMIT_REACHED', `邀請碼上限為 ${limit} 組`);
    }
  }
  const id = crypto.randomUUID();
  let code = genInviteCode();
  while (await first(db, 'SELECT id FROM invite_codes WHERE code = ?', [code])) {
    code = genInviteCode();
  }
  await run(db, 'INSERT INTO invite_codes (id, code, created_by_user_id) VALUES (?, ?, ?)', [id, code, user.sub]);
  return c.json({ invite: { id, code, createdAt: new Date().toISOString() } }, 201);
});

// ── Account preferences (commission / privacy / notifications) ────────────────

const prefsSchema = z.object({
  commission: z.object({
    status:    z.enum(['open', 'waitlist', 'paused']).optional(),
    tagline:   z.string().max(80).optional(),
    cap:       z.enum(['2', '3', '5', '0']).optional(),
    usage:     z.enum(['personal', 'commercial']).optional(),
    autoReply: z.string().max(800).optional(),
    perms:     z.record(z.boolean()).optional(),
  }).optional(),
  privacy: z.object({
    defaultVisibility: z.enum(['public', 'unlisted', 'password', 'private']).optional(),
    watermark: z.boolean().optional(),
    seo:       z.boolean().optional(),
    branding:  z.boolean().optional(),
  }).optional(),
  notifications: z.record(z.object({ email: z.boolean(), discord: z.boolean() })).optional(),
}).strict();

appApiRouter.get('/account/preferences', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const row = await first<{ preferences_json: string }>(
    db, 'SELECT preferences_json FROM users WHERE id = ?', [user.sub],
  );
  return c.json(parseJson(row?.preferences_json, {}));
});

appApiRouter.patch('/account/preferences', async (c) => {
  const db = getDb(c);
  const user = c.get('user');
  const input = await validateJson(c, prefsSchema);
  const row = await first<{ preferences_json: string }>(
    db, 'SELECT preferences_json FROM users WHERE id = ?', [user.sub],
  );
  const current = parseJson(row?.preferences_json, {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...current };
  if (input.commission !== undefined) merged.commission = { ...(current.commission as object ?? {}), ...input.commission };
  if (input.privacy !== undefined) merged.privacy = { ...(current.privacy as object ?? {}), ...input.privacy };
  if (input.notifications !== undefined) merged.notifications = input.notifications;
  await run(db, 'UPDATE users SET preferences_json = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(merged), nowIso(), user.sub]);
  return c.json(merged);
});

publicApiRouter.get('/characters/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = getDb(c);

  const row = await first<CharacterRow>(
    db,
    `SELECT c.*, av.r2_key as avatar_r2_key FROM characters c ${CHAR_AVATAR_JOIN} WHERE c.slug = ? AND c.archived_at IS NULL`,
    [slug],
  );
  if (!row || row.visibility === 'private') {
    throw new AppHttpError(404, 'NOT_FOUND', 'Not found');
  }

  return c.json({ character: mapCharacter(row) });
});

publicApiRouter.get('/projects/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = getDb(c);

  const project = await first<ProjectRow>(
    db, `SELECT * FROM projects WHERE slug = ? AND archived_at IS NULL`, [slug],
  );
  if (!project || project.visibility === 'private') {
    throw new AppHttpError(404, 'NOT_FOUND', 'Not found');
  }

  const charRows = await all<CharacterRow>(
    db,
    `SELECT c.*, av.r2_key as avatar_r2_key
     FROM characters c
     JOIN project_character_links pcl ON pcl.character_id = c.id
     ${CHAR_AVATAR_JOIN}
     WHERE pcl.project_id = ? AND pcl.removed_at IS NULL
       AND c.archived_at IS NULL AND c.visibility != 'private'
     ORDER BY c.name ASC`,
    [project.id],
  );

  const worldRows = await all<WorldEntryRow>(
    db,
    `SELECT * FROM world_entries
     WHERE project_id = ? AND archived_at IS NULL AND visibility != 'private'
     ORDER BY sort_order ASC, title ASC`,
    [project.id],
  );

  return c.json({
    project: mapProject(project),
    characters: charRows.map(mapCharacter),
    worldEntries: worldRows.map(mapWorldEntry),
  });
});
