import { useEffect } from "react"

export function OAuthCallbackPage() {
  useEffect(() => {
    window.location.replace("/workspace")
  }, [])

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <p style={{ color: "var(--text-faint)" }}>登入中⋯</p>
    </div>
  )
}
