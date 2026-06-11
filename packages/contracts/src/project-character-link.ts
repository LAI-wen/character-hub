import { z } from "zod"
import { VisibilitySchema } from "./common"
import { CharacterSchema } from "./character"

export const ProjectCharacterLinkSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  characterId: z.string(),
  submittedByUserId: z.string().nullable().optional(),
  status: z.string().optional(),
  factionLabel: z.string().nullable().optional(),
  projectRole: z.string().nullable().optional(),
  visibility: VisibilitySchema.optional(),
  fieldValues: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  removedAt: z.string().nullable().optional(),
})
export type ProjectCharacterLink = z.infer<typeof ProjectCharacterLinkSchema>

export const CreateProjectCharacterLinkSchema = z.object({
  characterId: z.string().min(1),
  projectRole: z.string().max(100).optional(),
  visibility: VisibilitySchema.optional(),
})
export type CreateProjectCharacterLinkRequest = z.infer<
  typeof CreateProjectCharacterLinkSchema
>

export const PatchProjectCharacterLinkSchema =
  CreateProjectCharacterLinkSchema.omit({ characterId: true }).partial()
export type PatchProjectCharacterLinkRequest = z.infer<
  typeof PatchProjectCharacterLinkSchema
>

export const ProjectCharacterLinkListResponseSchema = z.object({
  roster: z.array(
    z.object({
      projectLink: ProjectCharacterLinkSchema,
      character: CharacterSchema.nullable(),
    }),
  ),
  nextCursor: z.string().nullable().optional(),
})
export type ProjectCharacterLinkListResponse = z.infer<
  typeof ProjectCharacterLinkListResponseSchema
>

export const ProjectCharacterLinkResponseSchema = z.object({
  projectLink: ProjectCharacterLinkSchema,
  character: CharacterSchema.nullable().optional(),
})
export type ProjectCharacterLinkResponse = z.infer<
  typeof ProjectCharacterLinkResponseSchema
>
