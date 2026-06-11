import { z } from "zod"
import { VisibilitySchema, FeatureSchema } from "./common"

export const ProjectSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  coverAssetId: z.string().nullable().optional(),
  themeColor: z.string().optional(),
  preset: z.string().optional(),
  visibility: VisibilitySchema,
  collaborationMode: z.string().optional(),
  portalEnabled: z.boolean().optional(),
  joinPolicy: z.string().optional(),
  submissionsEnabled: z.boolean().optional(),
  enabledFeatures: z.array(z.string()),
  status: z.enum(["active", "archived"]).optional(),
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Project = z.infer<typeof ProjectSchema>

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  visibility: VisibilitySchema.default("private"),
  enabledFeatures: z.array(FeatureSchema).optional(),
})
export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>

export const PatchProjectSchema = CreateProjectSchema.partial()
export type PatchProjectRequest = z.infer<typeof PatchProjectSchema>

// API response wrappers matching actual API format
export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  nextCursor: z.string().nullable(),
})
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>

export const ProjectStatsSchema = z.object({
  characters: z.number(),
  worldEntries: z.number(),
  stories: z.number(),
  assets: z.number(),
})
export type ProjectStats = z.infer<typeof ProjectStatsSchema>

export const ProjectResponseSchema = z.object({
  project: ProjectSchema,
  viewerRole: z.string().optional(),
  stats: ProjectStatsSchema.optional(),
})
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>
