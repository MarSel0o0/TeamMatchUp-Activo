import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { cssVariablesResolver } from '@/theme/cssVariablesResolver';
import { mantineTheme } from '@/theme/mantineTheme';
import { inertColorSchemeManager } from './inertColorSchemeManager';

/**
 * `MantineProvider` de la aplicación (spec 017, RF-2, RF-7, DT-3): el tema hecho de tokens, el resolvedor
 * de variables, el esquema forzado al tema vigente y el gestor inerte (la librería no lee ni escribe
 * nada y no sincroniza pestañas). `defaultColorScheme` evita que su primer efecto marque «light» un
 * instante. Lo usan `ThemeProvider` y la pantalla de error de `ErrorBoundary`, que vive fuera de los
 * demás proveedores.
 */
export function AppMantineProvider({ colorScheme, children }: { colorScheme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <MantineProvider
      theme={mantineTheme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme={colorScheme}
      defaultColorScheme={colorScheme}
      colorSchemeManager={inertColorSchemeManager}
      withGlobalClasses
      withStaticClasses
    >
      {children}
    </MantineProvider>
  );
}
