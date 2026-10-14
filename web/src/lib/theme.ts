/**
 * Light/dark theme. The user's explicit choice is saved in localStorage; with no saved choice the app
 * follows the OS setting. The resolved theme is written to <html data-theme> which theme.css reads.
 * index.html runs the same logic inline before first paint so there is no flash of the wrong theme.
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'bulliondesk.theme'
const darkQuery = '(prefers-color-scheme: dark)'

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage blocked (private mode): the choice lasts for this page only.
  }
}

export function getSystemTheme(): Theme {
  return window.matchMedia?.(darkQuery).matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

/** Calls back when the OS theme changes; returns an unsubscribe function. */
export function onSystemThemeChange(callback: (theme: Theme) => void): () => void {
  const query = window.matchMedia?.(darkQuery)
  if (!query) return () => {}
  const listener = (event: MediaQueryListEvent) => callback(event.matches ? 'dark' : 'light')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
