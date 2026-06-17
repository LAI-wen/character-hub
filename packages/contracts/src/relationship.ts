import { z } from "zod"

// ── Relationship ──────────────────────────────────────────────────────────────

export const RelationshipTimelineItemSchema = z.tuple([
  z.string(), // time label (e.g. "百年前")
  z.string(), // event text
])
export type RelationshipTimelineItem = z.infer<typeof RelationshipTimelineItemSchema>

export const RelationshipSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  // sourceType / targetType: "character" | "world_entry"
  sourceType: z.string().default("character"),
  sourceId: z.string(),
  targetType: z.string().default("character"),
  targetId: z.string(),
  type: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  // Shared description (symmetric)
  description: z.string().nullable().optional(),
  // Asymmetric perspective text
  srcView: z.string().nullable().optional(), // source 眼中的 target
  tgtView: z.string().nullable().optional(), // target 眼中的 source
  // "line" = single central label | "arrows" = two directional coloured chips
  mapStyle: z.enum(["line", "arrows"]).default("line"),
  direction: z.enum(["undirected", "one-way", "two-way", "many"]).default("undirected"),
  groupId: z.string().nullable().optional(),
  visibility: z.string().default("private"),
  // Inline timeline — [[timeLabel, eventText], ...]
  timeline: z.array(RelationshipTimelineItemSchema).nullable().optional(),
  // Asset IDs for shared album (joined from asset_links)
  albumAssetIds: z.array(z.string()).nullable().optional(),
  sortOrder: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
})
export type Relationship = z.infer<typeof RelationshipSchema>

export const CreateRelationshipSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  sourceType: z.string().default("character"),
  targetType: z.string().default("character"),
  label: z.string().max(120).optional(),
  type: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  srcView: z.string().max(500).optional(),
  tgtView: z.string().max(500).optional(),
  mapStyle: z.enum(["line", "arrows"]).optional(),
  direction: z.enum(["undirected", "one-way", "two-way", "many"]).optional(),
  groupId: z.string().optional(),
  visibility: z.string().optional(),
  timeline: z.array(RelationshipTimelineItemSchema).optional(),
})
export type CreateRelationshipRequest = z.infer<typeof CreateRelationshipSchema>

export const PatchRelationshipSchema = CreateRelationshipSchema.partial()
export type PatchRelationshipRequest = z.infer<typeof PatchRelationshipSchema>

// ── RelationshipGroup ─────────────────────────────────────────────────────────

export const RelationshipGroupSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  color: z.string().default("#A67F0E"),
  description: z.string().nullable().optional(),
  // Entity IDs of members (characters or world_entries)
  memberIds: z.array(z.string()).default([]),
  timeline: z.array(RelationshipTimelineItemSchema).nullable().optional(),
  albumAssetIds: z.array(z.string()).nullable().optional(),
  sortOrder: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type RelationshipGroup = z.infer<typeof RelationshipGroupSchema>

export const CreateRelationshipGroupSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().optional(),
  description: z.string().max(2000).optional(),
  memberIds: z.array(z.string()).min(2),
  timeline: z.array(RelationshipTimelineItemSchema).optional(),
})
export type CreateRelationshipGroupRequest = z.infer<typeof CreateRelationshipGroupSchema>

export const PatchRelationshipGroupSchema = CreateRelationshipGroupSchema.partial()
export type PatchRelationshipGroupRequest = z.infer<typeof PatchRelationshipGroupSchema>

// ── Responses ─────────────────────────────────────────────────────────────────

export const RelationshipListResponseSchema = z.object({
  relationships: z.array(RelationshipSchema),
  groups: z.array(RelationshipGroupSchema).optional(),
  // Node positions: { [entityId]: { x: 0-1, y: 0-1 } }
  layout: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
})
export type RelationshipListResponse = z.infer<typeof RelationshipListResponseSchema>

export const RelationshipResponseSchema = z.object({
  relationship: RelationshipSchema,
})
export type RelationshipResponse = z.infer<typeof RelationshipResponseSchema>

export const RelationshipGroupResponseSchema = z.object({
  group: RelationshipGroupSchema,
})
export type RelationshipGroupResponse = z.infer<typeof RelationshipGroupResponseSchema>
