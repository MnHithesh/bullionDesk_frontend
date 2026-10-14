import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { errorMessage, isApiError } from '@/api/errors'
import { toast } from '@/components/toast/toastStore'

/** Server faults and network failures: worth a toast. 4xx answers are shown where they happen. */
export function isServerFault(error: unknown) {
  return (isApiError(error) && error.status >= 500) || error instanceof TypeError
}

function reference(error: unknown) {
  return isApiError(error) ? error.correlationId : undefined
}

/**
 * The app's QueryClient. Global error handlers raise toasts for server faults:
 * - a query that already has data and fails on a refetch (the page keeps the old data, so
 *   without a toast nobody would notice). First-load failures show an inline ErrorState instead.
 *   The toast id is the query's hash, so a failing poll updates one toast rather than stacking.
 * - any mutation that hits a 5xx or the network. 4xx answers (validation, business rules) are
 *   shown next to the form that caused them.
 */
export function createQueryClient({ retry = true }: { retry?: boolean } = {}) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!isServerFault(error) || query.state.data === undefined) return
        toast.error('Could not refresh data', {
          id: `query-${query.queryHash}`,
          description: errorMessage(error),
          reference: reference(error),
        })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (!isServerFault(error)) return
        toast.error('Request failed', {
          description: errorMessage(error),
          reference: reference(error),
        })
      },
    }),
    defaultOptions: {
      queries: {
        // A 4xx won't fix itself on retry; network blips and 5xx get two more tries.
        retry: retry
          ? (failureCount, error) => !(isApiError(error) && error.status < 500) && failureCount < 2
          : false,
      },
      mutations: { retry: false },
    },
  })
}
