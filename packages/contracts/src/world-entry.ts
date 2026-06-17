import { z } from "zod"
import { VisibilitySchema } from "./common"

export const WorldEntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  parentId: z.string().nullable().optional(),
  type: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  visibility: VisibilitySchema.optional(),
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type WorldEntry = z.infer<typeof WorldEntrySchema>

export const CreateWorldEntrySchema = z.object({
  title: z.string().min(1).max(180),
  type: z.string().default("lore"),
  slug: z.string().min(1).max(180).optional(),
  summary: z.string().max(4000).nullable().optional(),
  content: z.string().max(60000).nullable().optional(),
  parentId: z.string().nullable().optional(),
  visibility: VisibilitySchema.optional(),
})
export type CreateWorldEntryRequest = z.infer<typeof CreateWorldEntrySchema>

export const PatchWorldEntrySchema = CreateWorldEntrySchema.partial()
export type PatchWorldEntryRequest = z.infer<typeof PatchWorldEntrySchema>

export const EntityLinkSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  relationType: z.string(),
  label: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type EntityLink = z.infer<typeof EntityLinkSchema>

export const WorldEntryListResponseSchema = z.object({
  entries: z.array(WorldEntrySchema),
  entityLinks: z.array(EntityLinkSchema).optional(),
  nextCursor: z.string().nullable().optional(),
})
export type WorldEntryListResponse = z.infer<typeof WorldEntryListResponseSchema>

export const WorldEntryResponseSchema = z.object({
  entry: WorldEntrySchema,
  entityLinks: z.array(EntityLinkSchema).optional(),
})
export type WorldEntryResponse = z.infer<typeof WorldEntryResponseSchema>
