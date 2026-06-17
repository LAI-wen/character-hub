import { QueryClient } from "@tanstack/react-query"
import { AppApiError } from "@/lib/api/errors"

function defaultMutationError(error: unknown) {
  if (error instanceof AppApiError) {
    if (error.status === 401) return
    const msg = error.detail || error.code
    console.error("[mutation]", error.status, msg)
    if (typeof window !== "undefined") {
      const toast = document.createElement("div")
      toast.textContent = `操作失敗：${msg}`
      Object.assign(toast.style, {
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        zIndex: "9999", background: "#2a1a1a", color: "#fff", fontSize: "13px",
        fontFamily: "var(--font-sans, sans-serif)", fontWeight: "600",
        padding: "10px 18px", borderRadius: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,.4)",
        pointerEvents: "none",
      })
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3500)
    }
  } else if (error instanceof Error) {
    console.error("[mutation]", error.message)
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof AppApiError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            return false
          }
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
      onError: defaultMutationError,
    },
  },
})
