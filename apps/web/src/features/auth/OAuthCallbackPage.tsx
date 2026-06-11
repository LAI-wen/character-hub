import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    if (token) {
      sessionStorage.setItem("access_token", token)
    }
    window.location.replace("/workspace")
  }, [searchParams])

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <p style={{ color: "var(--text-faint)" }}>登入中⋯</p>
    </div>
  )
}
