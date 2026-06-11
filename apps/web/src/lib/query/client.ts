import { QueryClient } from "@tanstack/react-query"
import { AppApiError } from "@/lib/api/errors"

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
    },
  },
})
