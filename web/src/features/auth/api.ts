import { identityApi, unwrap } from '@/api/client'
import type { components } from '@/api/schema/identity'
import { tokens } from '@/api/tokens'

export type User = components['schemas']['UserProfileResponse']
type Credentials = components['schemas']['LoginRequest']
type Registration = components['schemas']['RegisterRequest']

export const meQueryKey = ['auth', 'me'] as const

export function fetchMe(): Promise<User> {
  return unwrap(identityApi.GET('/api/auth/me'))
}

/** Signs in and stores the tokens. AuthProvider notices the new session and loads the user. */
export async function login(credentials: Credentials): Promise<void> {
  tokens.set(await unwrap(identityApi.POST('/api/auth/login', { body: credentials })))
}

/** Creates the account, then signs in with the same credentials. */
export async function register(registration: Registration): Promise<void> {
  await unwrap(identityApi.POST('/api/auth/register', { body: registration }))
  await login({ email: registration.email, password: registration.password })
}

/**
 * Ends the session locally straight away, then tells the backend to revoke the refresh token.
 * The server call is best effort: the user is logged out on this device either way.
 */
export async function logout(): Promise<void> {
  const refreshToken = tokens.getRefreshToken()
  tokens.clear()
  if (!refreshToken) return
  try {
    await identityApi.POST('/api/auth/logout', { body: { refreshToken } })
  } catch {
    // Offline or server down: the token expires on its own.
  }
}
