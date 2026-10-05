import { createContext } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeContextValue {
  theme: Theme;
  /** `origin` es el punto desde el que se abre el círculo del cambio de tema. */
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
