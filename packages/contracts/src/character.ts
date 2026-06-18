import { z } from "zod"
import { VisibilitySchema } from "./common"

export const CharacterSchema = z.object({
  id: z.string(),
  ownerUserId: z.string().optional(),
  slug: z.string(),
  name: z.string(),
  romaji: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  species: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  avatarAssetId: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  themeColor: z.string().nullable().optional(),
  visibility: VisibilitySchema,
  tags: z.array(z.string()).optional(),
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  generalProfile: z.record(z.string(), z.unknown()).optional(),
  artistProfile: z.record(z.string(), z.unknown()).optional(),
  writerProfile: z.record(z.string(), z.unknown()).optional(),
})
export type Character = z.infer<typeof CharacterSchema>

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  summary: z.string().max(4000).optional(),
  species: z.string().max(120).optional(),
  themeColor: z.string().max(32).nullable().optional(),
  visibility: VisibilitySchema.default("private"),
})
export type CreateCharacterRequest = z.infer<typeof CreateCharacterSchema>

export const PatchCharacterSchema = CreateCharacterSchema.partial()
export type PatchCharacterRequest = z.infer<typeof PatchCharacterSchema>

export const CharacterMembershipSchema = z.object({
  projectId:    z.string(),
  projectName:  z.string(),
  projectColor: z.string(),
  factionLabel: z.string().nullable().optional(),
  projectRole:  z.string().nullable().optional(),
  status:       z.string().nullable().optional(),
  linkId:       z.string().optional(),
})
export type CharacterMembership = z.infer<typeof CharacterMembershipSchema>

export const CharacterWithMembershipsSchema = CharacterSchema.extend({
  memberships: z.array(CharacterMembershipSchema).optional(),
})
export type CharacterWithMemberships = z.infer<typeof CharacterWithMembershipsSchema>

export const CharacterListResponseSchema = z.object({
  characters: z.array(CharacterWithMembershipsSchema),
  nextCursor: z.string().nullable().optional(),
})
export type CharacterListResponse = z.infer<typeof CharacterListResponseSchema>

export const CharacterResponseSchema = z.object({
  character: CharacterSchema,
  projectLink: z.object({ id: z.string(), projectId: z.string() }).nullable().optional(),
})
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>
