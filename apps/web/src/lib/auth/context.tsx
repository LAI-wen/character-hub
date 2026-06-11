import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { apiClient } from "@/lib/api/client"
import { clearCsrfToken } from "@/lib/api/client"
import type { Viewer } from "@oc-tools/contracts"

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; viewer: Viewer }

type AuthContextValue = {
  viewer: Viewer | null
  isLoading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" })

  useEffect(() => {
    apiClient<{ data: Viewer }>("/api/v1/auth/me")
      .then((res) => setState({ status: "authenticated", viewer: res.data }))
      .catch(() => setState({ status: "unauthenticated" }))
  }, [])

  async function logout() {
    await apiClient("/api/v1/auth/logout", { method: "POST" })
    clearCsrfToken()
    setState({ status: "unauthenticated" })
  }

  const value: AuthContextValue = {
    viewer: state.status === "authenticated" ? state.viewer : null,
    isLoading: state.status === "loading",
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
