import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  onSystemThemeChange,
  storeTheme,
  type Theme,
} from './theme'

export function useTheme() {
  const [stored, setStored] = useState<Theme | null>(getStoredTheme)
  const [system, setSystem] = useState<Theme>(getSystemTheme)
  const theme = stored ?? system

  // Follow OS changes; this only shows while the user hasn't picked a theme.
  useEffect(() => onSystemThemeChange(setSystem), [])

  useEffect(() => applyTheme(theme), [theme])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    storeTheme(next)
    setStored(next)
  }, [theme])

  return { theme, toggleTheme }
}
