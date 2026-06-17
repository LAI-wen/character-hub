import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth/context"
import type { ReactNode } from "react"

export function AuthGuard({ children }: { children: ReactNode }) {
  const { viewer, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <span style={{ color: "var(--text-faint)", fontSize: 14 }}>載入中⋯</span>
    </div>
  )

  if (!viewer) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
  }

  return <>{children}</>
}
