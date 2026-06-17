import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth/context"
import { PageLoading } from "@/components/LoadingSpinner"
import type { ReactNode } from "react"

export function AuthGuard({ children }: { children: ReactNode }) {
  const { viewer, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoading />

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
