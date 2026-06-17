import { z } from "zod"

export const AssetSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  assetType: z.string(),
  authorName: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  createdAt: z.string(),
})
export type Asset = z.infer<typeof AssetSchema>

export const AssetListResponseSchema = z.object({
  assets: z.array(AssetSchema),
  totalBytes: z.number().optional(),
  limitBytes: z.number().optional(),
})
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>
