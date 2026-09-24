import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { STORAGE_KEYS } from '@/config/env';
import { ThemeContext, type Theme } from './themeContext';

/**
 * Lee el tema que dejó fijado el script de `index.html` antes de que React
 * cargue: así la primera pintura ya sale con el tema correcto, sin destello.
 */
function initialTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function persist(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    // Sin almacenamiento (modo privado estricto) el tema dura la sesión.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'light' ? '#eceef1' : '#0b0c0e',
    );
  }, [theme]);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    persist(next);

    const apply = () => {
      // flushSync: la captura de "después" de la transición debe ver ya el
      // tema nuevo aplicado al DOM.
      flushSync(() => setTheme(next));
      document.documentElement.dataset.theme = next;
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
      apply();
      return;
    }

    // El círculo nace en el botón y crece hasta la esquina más lejana.
    const root = document.documentElement;
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--theme-x', `${x}px`);
    root.style.setProperty('--theme-y', `${y}px`);
    root.style.setProperty('--theme-r', `${radius}px`);

    document.startViewTransition(apply);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
