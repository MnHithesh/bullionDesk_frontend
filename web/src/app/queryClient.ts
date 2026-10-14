import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 4xx won't fix itself on retry; network blips and 5xx get two more tries.
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status < 500) && failureCount < 2,
      },
    },
  })
}
