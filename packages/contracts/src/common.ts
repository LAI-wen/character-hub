import { z } from "zod"

export const VisibilitySchema = z.enum(["public", "private", "unlisted"])
export type Visibility = z.infer<typeof VisibilitySchema>

export const ProjectRoleSchema = z.enum([
  "owner",
  "host",
  "cohost",
  "member",
  "viewer",
])
export type ProjectRole = z.infer<typeof ProjectRoleSchema>

export const RelationshipDirectionSchema = z.enum([
  "undirected",
  "a_to_b",
  "b_to_a",
  "bidirectional",
])
export type RelationshipDirection = z.infer<typeof RelationshipDirectionSchema>

export const FeatureSchema = z.enum([
  "worldview",
  "relationships",
  "story",
  "gallery",
  "commissions",
  "public_page",
])
export type Feature = z.infer<typeof FeatureSchema>

export function dataResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema })
}

export function listResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: z.array(schema) })
}
