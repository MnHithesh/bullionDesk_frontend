import createClient from 'openapi-fetch'
import { toApiError } from './errors'
import type { paths as IdentityPaths } from './schema/identity'
import { tokens } from './tokens'

/**
 * Typed API clients. One per backend service, because each service publishes its own OpenAPI
 * document; all of them go through the same gateway origin (/api, proxied in dev).
 *
 * authFetch is our equivalent of an Angular HttpInterceptor:
 *  1. adds `Authorization: Bearer <access token>`
 *  2. on a 401, refreshes the access token once and retries the request once
 *  3. if the refresh is rejected, clears the tokens; AuthProvider sees that and logs the user out
 * Concurrent 401s share a single in-flight refresh call.
 */

const baseUrl = typeof window === 'undefined' ? '' : window.location.origin

// Read globalThis.fetch at call time (not import time) so test mocks (MSW) are always seen.
const plainFetch = (request: Request, init?: RequestInit) => globalThis.fetch(request, init)

// Used only for the refresh call itself, which must not go through authFetch (it would recurse).
const refreshClient = createClient<IdentityPaths>({ baseUrl, fetch: plainFetch })

let refreshInFlight: Promise<string | null> | null = null

/**
 * Gets a new access token using the stored refresh token.
 * Resolves to the new token, or null if the backend rejected the refresh (session over).
 * Rejects on network errors, which don't end the session.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = tokens.getRefreshToken()
  if (!refreshToken) return null

  const { data, response } = await refreshClient.POST('/api/auth/refresh', {
    body: { refreshToken },
  })
  if (response.ok && data) {
    tokens.set(data)
    return data.accessToken
  }
  tokens.clear()
  return null
}

function withAuth(request: Request, token: string | null): Request {
  if (!token) return request
  const authed = new Request(request)
  authed.headers.set('Authorization', `Bearer ${token}`)
  return authed
}

export async function authFetch(request: Request, init?: RequestInit): Promise<Response> {
  // Keep an unused copy: a request body can only be read once, and we may need to send it again.
  const retry = request.clone()

  let token = tokens.getAccessToken()
  // After a page reload only the refresh token survives; get an access token before the first call.
  if (!token && tokens.getRefreshToken()) token = await refreshAccessToken()

  const response = await globalThis.fetch(withAuth(request, token), init)
  if (response.status !== 401 || !tokens.getRefreshToken()) return response

  // If another request already refreshed while this one was in flight, use its token.
  const current = tokens.getAccessToken()
  const fresh = current && current !== token ? current : await refreshAccessToken()
  if (!fresh) return response

  return globalThis.fetch(withAuth(retry, fresh), init)
}

export const identityApi = createClient<IdentityPaths>({ baseUrl, fetch: authFetch })

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

/**
 * Turns openapi-fetch's { data, error } result into "return data or throw ApiError",
 * which is the shape TanStack Query expects from a query or mutation function.
 */
export async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await request
  if (!response.ok) throw toApiError(response, error)
  return data as T
}
