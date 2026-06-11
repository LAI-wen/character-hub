export class AppApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail?: string
  constructor(status: number, code: string, detail?: string) {
    super(`API error ${status}: ${code}`)
    this.name = "AppApiError"
    this.status = status
    this.code = code
    this.detail = detail
  }
}
