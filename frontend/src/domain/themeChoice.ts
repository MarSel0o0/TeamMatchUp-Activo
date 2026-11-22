/**
 * Tema inicial de la página (spec 017, RF-5, RF-7, RNF-6; plan 5.1).
 *
 * `chooseInitialTheme` y `bootTheme` son autocontenidas a propósito: sin imports, sin cierres sobre
 * otras variables del módulo (salvo la una de la otra) y sin reloj. `buildBootScript` las serializa
 * con `Function.prototype.toString` y las inyecta como un script clásico en el `<head>`, que corre
 * antes de la primera pintura; así hay una sola fuente de la regla y la prueba ejecuta el mismo
 * texto que recibe la página. No escribe en el almacenamiento: eso lo hace `ThemeProvider` al
 * cambiar de tema.
 */
export type InitialTheme = 'light' | 'dark';

export interface ThemeChoiceInput {
  /** Lo que había guardado (o `null`). */
  stored: string | null;
  /** `false` si leer el almacenamiento lanzó una excepción (por ejemplo, datos de sitio bloqueados). */
  storageAvailable: boolean;
  /** Preferencia `prefers-color-scheme: light` del sistema. */
  systemPrefersLight: boolean;
}

export interface BootEnv {
  readStored(): string | null;
  prefersLight(): boolean;
  apply(theme: InitialTheme): void;
}

/** Lo guardado si es «light» o «dark» y se pudo leer; si no, la preferencia del sistema. */
export function chooseInitialTheme(input: ThemeChoiceInput): InitialTheme {
  if (input.storageAvailable && (input.stored === 'light' || input.stored === 'dark')) {
    return input.stored;
  }
  return input.systemPrefersLight ? 'light' : 'dark';
}

/**
 * Lee, decide y aplica. Una lectura que lanza cuenta como almacenamiento no disponible; si no se puede
 * consultar la preferencia del sistema, se asume oscuro (el tema por defecto de siempre).
 */
export function bootTheme(env: BootEnv): InitialTheme {
  let stored: string | null = null;
  let storageAvailable = true;
  try {
    stored = env.readStored();
  } catch {
    stored = null;
    storageAvailable = false;
  }
  let systemPrefersLight = false;
  try {
    systemPrefersLight = env.prefersLight();
  } catch {
    systemPrefersLight = false;
  }
  const theme = chooseInitialTheme({ stored, storageAvailable, systemPrefersLight });
  env.apply(theme);
  return theme;
}

/**
 * Texto del script clásico que se inyecta en `<head>`: las dos funciones tal cual, y una llamada con
 * las lecturas reales. Escribe `data-theme` (los tokens) y `data-mantine-color-scheme` (la librería)
 * con el mismo valor.
 */
export function buildBootScript(storageKey: string): string {
  const key = JSON.stringify(storageKey).replace(/</g, '\\u003c');
  return (
    '(function(){' +
    chooseInitialTheme.toString() +
    ';' +
    bootTheme.toString() +
    ';' +
    'bootTheme({' +
    `readStored:function(){return localStorage.getItem(${key});},` +
    'prefersLight:function(){return window.matchMedia("(prefers-color-scheme: light)").matches;},' +
    'apply:function(t){var d=document.documentElement;d.dataset.theme=t;d.setAttribute("data-mantine-color-scheme",t);}' +
    '});' +
    '})();'
  );
}
