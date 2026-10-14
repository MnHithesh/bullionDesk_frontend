import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from '@/components/toast/Toaster'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { createQueryClient } from './queryClient'

/**
 * App-wide providers: the React equivalent of Angular's root injector setup in app.config.ts
 * (provideHttpClient, provideRouter …). Tests pass their own QueryClient for isolation.
 */
export function Providers({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient?: QueryClient
}) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </QueryClientProvider>
  )
}
