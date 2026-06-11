import type { Context } from 'hono';
import type { z } from 'zod';

export type ErrorFields = Record<string, string | string[]>;

export class AppHttpError extends Error {
  status: number;
  code: string;
  fields?: ErrorFields;

  constructor(status: number, code: string, message: string, fields?: ErrorFields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function errorBody(code: string, message: string, fields?: ErrorFields) {
  return {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
}

export function errorResponse(c: Context, status: number, code: string, message: string, fields?: ErrorFields) {
  return c.json(errorBody(code, message, fields), status as any);
}

export function notImplemented(c: Context, repositoryMethod: string) {
  return errorResponse(c, 501, 'NOT_IMPLEMENTED', `${repositoryMethod} is not implemented in Backend Skeleton v1`);
}

export async function validateJson<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppHttpError(400, 'VALIDATION_ERROR', 'Request body is invalid', parsed.error.flatten().fieldErrors as ErrorFields);
  }
  return parsed.data;
}

export function optionalLimit(value: string | undefined, fallback = 50, max = 100) {
  if (!value) return fallback;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > max) {
    throw new AppHttpError(400, 'VALIDATION_ERROR', `limit must be an integer between 1 and ${max}`);
  }
  return numberValue;
}

export function handleAppError(err: Error, c: Context) {
  if (err instanceof AppHttpError) {
    return errorResponse(c, err.status, err.code, err.message, err.fields);
  }
  console.error(err);
  return errorResponse(c, 500, 'INTERNAL_ERROR', 'Unexpected server error');
}
