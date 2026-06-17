import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, clearCsrfToken } from "@/lib/api/client"
import type { Viewer } from "@oc-tools/contracts"

type AuthContextValue = {
  viewer: Viewer | null
  isLoading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const viewerQueryKey = ["viewer"] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: viewerQueryKey,
    queryFn: () => apiClient<{ data: Viewer }>("/api/v1/auth/me").then((r) => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  async function logout() {
    await apiClient("/api/v1/auth/logout", { method: "POST" })
    clearCsrfToken()
    queryClient.setQueryData(viewerQueryKey, undefined)
  }

  const value: AuthContextValue = {
    viewer: data ?? null,
    isLoading: isPending,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
