import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { tokens } from '@/api/tokens'
import { fetchMe, logout as apiLogout, meQueryKey } from './api'
import { AuthContext, type AuthState } from './AuthContext'

/**
 * Owns "who is signed in". Like an Angular AuthService provided in root, but scoped to this
 * component tree and read through useAuth().
 *
 * - The token store says whether a session exists (and changes on login, logout, failed refresh
 *   or a logout in another tab). useSyncExternalStore re-renders us whenever it changes.
 * - While a session exists, GET /api/auth/me loads the user (a TanStack query, cached).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const hasSession = useSyncExternalStore(tokens.subscribe, tokens.hasSession)

  const me = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    enabled: hasSession,
    staleTime: Infinity,
    retry: false,
  })

  // Session gone (logout, refresh rejected): drop every cached response so the next user can't see it.
  useEffect(() => {
    if (!hasSession) queryClient.removeQueries()
  }, [hasSession, queryClient])

  const logout = useCallback(() => apiLogout(), [])
  const { refetch } = me
  const retry = useCallback(() => void refetch(), [refetch])

  const value = useMemo<AuthState>(() => {
    const base = { user: null, error: null, retry, logout }
    if (!hasSession) return { ...base, status: 'anonymous' }
    if (me.isPending) return { ...base, status: 'loading' }
    if (me.isError) return { ...base, status: 'error', error: me.error }
    return { ...base, status: 'authenticated', user: me.data }
  }, [hasSession, me.isPending, me.isError, me.error, me.data, retry, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}
