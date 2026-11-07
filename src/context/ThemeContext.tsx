import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

// Light / dark / system theme. The "dark" class goes on <html>; the inline script in
// index.html applies it before the first paint to avoid a flash.
export type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'detoke.theme'

// Browser bar color for the effective theme
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#FBF7EE', dark: '#17211B' }

const DARK_QUERY = '(prefers-color-scheme: dark)'

interface ThemeState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)
  const resolvedTheme = theme === 'system' ? system : theme

  // Follow operating system changes
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystem(media.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  // Apply the class, color-scheme and theme-color
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolvedTheme])
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // No storage (private mode): the theme lasts for this session only
    }
  }, [])

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
