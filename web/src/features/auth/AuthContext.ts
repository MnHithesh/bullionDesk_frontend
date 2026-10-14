import { createContext, useContext } from 'react'
import type { User } from './api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'

export interface AuthState {
  status: AuthStatus
  user: User | null
  /** Set when status is 'error' (the session exists but /me failed, e.g. the server is down). */
  error: unknown
  retry: () => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
