import { z } from "zod"

export const StorySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  visibility: z.string(),
  chapterCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Story = z.infer<typeof StorySchema>

export const StoryListResponseSchema = z.object({
  stories: z.array(StorySchema),
})
export type StoryListResponse = z.infer<typeof StoryListResponseSchema>

export const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
})
export type CreateStoryRequest = z.infer<typeof CreateStorySchema>

export const ChapterSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  sortOrder: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Chapter = z.infer<typeof ChapterSchema>

export const StoryDetailResponseSchema = z.object({
  story: StorySchema,
  chapters: z.array(ChapterSchema),
})
export type StoryDetailResponse = z.infer<typeof StoryDetailResponseSchema>

export const CreateChapterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(200000).optional(),
  summary: z.string().max(1000).optional(),
})
export type CreateChapterRequest = z.infer<typeof CreateChapterSchema>

export const PatchChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(200000).optional(),
  summary: z.string().max(1000).optional(),
  sortOrder: z.number().int().optional(),
})
export type PatchChapterRequest = z.infer<typeof PatchChapterSchema>

export const StoryEventSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  storyId: z.string().nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  timeLabel: z.string().nullable(),
  sortKey: z.string().nullable(),
  visibility: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type StoryEvent = z.infer<typeof StoryEventSchema>

export const StoryEventListResponseSchema = z.object({
  events: z.array(StoryEventSchema),
})
export type StoryEventListResponse = z.infer<typeof StoryEventListResponseSchema>

export const CreateStoryEventSchema = z.object({
  title:      z.string().min(1).max(200),
  summary:    z.string().max(5000).optional(),
  timeLabel:  z.string().max(120).optional(),
  sortKey:    z.string().max(64).optional(),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
})
export type CreateStoryEventRequest = z.infer<typeof CreateStoryEventSchema>

export const PatchStoryEventSchema = CreateStoryEventSchema.partial()
export type PatchStoryEventRequest = z.infer<typeof PatchStoryEventSchema>
