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
  "one-way",
  "two-way",
  "many",
])
export type RelationshipDirection = z.infer<typeof RelationshipDirectionSchema>

export const FeatureSchema = z.enum([
  "characters",
  "worldview",
  "relationships",
  "story",
  "gallery",
  "inbox",
  "publicPage",
  "template",
  "roster",
  "applications",
  "submissions",
  "participants",
  "permissions",
])
export type Feature = z.infer<typeof FeatureSchema>

export function dataResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema })
}

export function listResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: z.array(schema) })
}
