import type { MantineColorSchemeManager } from '@mantine/core';

/**
 * Gestor del esquema de color de la librería que no lee, no escribe y no escucha nada (spec 017, RF-7,
 * DT-3). El tema lo manda `ThemeProvider`; el gestor por defecto de la librería guardaría su propia
 * entrada (`mantine-color-scheme-value`) y sincronizaría las pestañas con el evento `storage`, lo que
 * contradice RF-7 (la única entrada es `tmu.theme`, y cambiar el tema en otra pestaña no cambia la página).
 */
export const inertColorSchemeManager: MantineColorSchemeManager = {
  get: (defaultValue) => defaultValue,
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
};
