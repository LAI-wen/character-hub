import { z } from "zod"

export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type NodePosition = z.infer<typeof NodePositionSchema>

export const RelationshipLayoutSchema = z.object({
  projectId: z.string(),
  scope: z.string().optional(),
  nodes: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  labels: z.record(z.string(), z.unknown()).optional(),
  paths: z.record(z.string(), z.unknown()).optional(),
  groups: z.record(z.string(), z.unknown()).optional(),
  updatedAt: z.string().nullable().optional(),
})
export type RelationshipLayout = z.infer<typeof RelationshipLayoutSchema>

export const PatchRelationshipLayoutSchema = z.object({
  nodes: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  labels: z.record(z.string(), z.unknown()).optional(),
  paths: z.record(z.string(), z.unknown()).optional(),
  groups: z.record(z.string(), z.unknown()).optional(),
})
export type PatchRelationshipLayoutRequest = z.infer<
  typeof PatchRelationshipLayoutSchema
>

export const RelationshipLayoutResponseSchema = z.object({
  layout: RelationshipLayoutSchema,
})
export type RelationshipLayoutResponse = z.infer<
  typeof RelationshipLayoutResponseSchema
>
