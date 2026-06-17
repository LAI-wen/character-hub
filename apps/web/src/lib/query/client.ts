import { QueryClient } from "@tanstack/react-query"
import { AppApiError } from "@/lib/api/errors"

export function showToast(msg: string) {
  if (typeof window === "undefined") return
  const toast = document.createElement("div")
  toast.textContent = msg
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

function defaultMutationError(error: unknown) {
  if (error instanceof AppApiError) {
    if (error.status === 401) return
    const msg = error.detail || error.code
    console.error("[mutation]", error.status, msg)
    showToast(`操作失敗：${msg}`)
  } else if (error instanceof Error) {
    console.error("[mutation]", error.message)
    showToast("操作失敗，請稍後再試")
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
