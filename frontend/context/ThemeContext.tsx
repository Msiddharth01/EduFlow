'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme') as Theme | null;
      if (attr === 'light' || attr === 'dark') return attr;
      const saved = localStorage.getItem('learnai_theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });
  const [mounted, setMounted] = useState(false);

  const applyThemeToDom = (t: Theme) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');

    if (document.body) {
      document.body.setAttribute('data-theme', t);
      document.body.style.colorScheme = t;
      document.body.classList.toggle('dark', t === 'dark');
      document.body.classList.toggle('light', t === 'light');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('learnai_theme') as Theme | null;
    const resolved = saved === 'light' || saved === 'dark' ? saved : 'dark';
    setThemeState(resolved);
    applyThemeToDom(resolved);
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('learnai_theme', newTheme);
    applyThemeToDom(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
