/**
 * Where the tokens live.
 *
 * - Access token: memory only. Short-lived, and never in storage, so an XSS bug can't read a stored copy.
 * - Refresh token: localStorage, so a page reload or a new tab can restore the session.
 *
 * Trade-off vs an httpOnly cookie: a cookie can't be read by JavaScript at all, so XSS can't steal it.
 * But it needs the backend to set it (and CSRF protection), and our gateway returns tokens in the
 * response body. localStorage is readable by any script on the page, so the defence here is
 * preventing XSS (React escapes output, no dangerouslySetInnerHTML) plus refresh-token rotation on
 * the backend. See docs/FRONTEND-LEARNING.md, step 2.
 *
 * This is a tiny external store: React reads it with useSyncExternalStore (see AuthProvider).
 */

const REFRESH_KEY = 'bulliondesk.refreshToken'

let accessToken: string | null = null
const listeners = new Set<() => void>()

function readRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function writeRefresh(value: string | null) {
  try {
    if (value) localStorage.setItem(REFRESH_KEY, value)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Storage blocked: the session survives until reload only.
  }
}

function emit() {
  for (const listener of listeners) listener()
}

export const tokens = {
  getAccessToken: () => accessToken,
  getRefreshToken: readRefresh,

  /** True while there is something to restore a session from. */
  hasSession: () => accessToken !== null || readRefresh() !== null,

  set(next: { accessToken: string; refreshToken: string }) {
    accessToken = next.accessToken
    writeRefresh(next.refreshToken)
    emit()
  },

  clear() {
    const had = accessToken !== null || readRefresh() !== null
    accessToken = null
    writeRefresh(null)
    if (had) emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Another tab logging in or out changes localStorage; mirror it here.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== REFRESH_KEY) return
    if (event.newValue === null) accessToken = null
    emit()
  })
}
