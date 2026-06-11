import { AppApiError } from "./errors"

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown | FormData
  json?: unknown
}

let _csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken
  const res = await fetch("/api/v1/auth/csrf", { credentials: "include" })
  if (!res.ok) return ""
  const data = (await res.json()) as { csrfToken: string }
  _csrfToken = data.csrfToken
  return _csrfToken
}

export function clearCsrfToken() {
  _csrfToken = null
}

export async function apiClient<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET"
  const isMutating = method !== "GET"

  const rawBody = options.json !== undefined ? options.json : options.body
  const isFormData = rawBody instanceof FormData
  const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" }

  if (isMutating) {
    const csrf = await getCsrfToken()
    if (csrf) headers["X-CSRF-Token"] = csrf
  }

  const res = await fetch(path, {
    method,
    credentials: "include",
    headers,
    body: rawBody != null ? (isFormData ? (rawBody as FormData) : JSON.stringify(rawBody)) : undefined,
  })

  if (!res.ok) {
    let code = "UNKNOWN_ERROR"
    let detail: string | undefined
    try {
      const err = (await res.json()) as {
        error?: { code?: string; message?: string }
      }
      code = err.error?.code ?? code
      detail = err.error?.message
    } catch {
      // ignore parse error
    }
    throw new AppApiError(res.status, code, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
