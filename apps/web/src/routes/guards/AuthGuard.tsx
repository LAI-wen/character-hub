import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth/context"
import type { ReactNode } from "react"

export function AuthGuard({ children }: { children: ReactNode }) {
  const { viewer, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null

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
