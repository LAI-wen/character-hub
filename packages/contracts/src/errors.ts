import { z } from "zod"

export const ApiErrorCodeSchema = z.enum([
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "CONFLICT",
  "INTERNAL_ERROR",
])
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    detail: z.string().optional(),
  }),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
