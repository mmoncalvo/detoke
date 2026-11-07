import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Light or dark theme. The "dark" class goes on <html>; the inline script in
// index.html applies it before the first paint to avoid a flash.
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'detoke.theme';

// Browser bar color for each theme
const THEME_COLOR: Record<Theme, string> = { light: '#FBF7EE', dark: '#17211B' };

const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

/** The saved choice; without one, the operating system preference. */
function initialTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    /* storage not available */
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* no storage (private mode): the theme lasts for this session only */
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
