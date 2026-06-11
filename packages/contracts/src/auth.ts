import { z } from "zod"

export const ViewerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  createdAt: z.string().datetime().optional(),
})
export type Viewer = z.infer<typeof ViewerSchema>

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof LoginSchema>

export const ViewerResponseSchema = z.object({ data: ViewerSchema })
export type ViewerResponse = z.infer<typeof ViewerResponseSchema>
