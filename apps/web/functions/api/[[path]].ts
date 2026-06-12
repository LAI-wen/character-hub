const API_ORIGIN = "https://oc-tools-api.beibeiz.workers.dev"

export async function onRequest(ctx: { request: Request }) {
  const url = new URL(ctx.request.url)
  const target = new URL(url.pathname + url.search, API_ORIGIN)

  const req = new Request(target.toString(), {
    method: ctx.request.method,
    headers: ctx.request.headers,
    body: ctx.request.method !== "GET" && ctx.request.method !== "HEAD"
      ? ctx.request.body
      : null,
  })

  return fetch(req, { redirect: "manual" })
}
