import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_THEME, defaultCssVariablesResolver, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import { findColorLiterals, findColorLiteralsInCss } from './colorLiterals';
import { cssVariablesResolver } from './cssVariablesResolver';
import { mantineTheme } from './mantineTheme';
import { tokenPalettes } from './tokenPalettes';

/**
 * Spec 017, RF-2, RNF-6; plan 9.1 (a) a (e). Sin DOM: lee el tema, el resolvedor y los CSS como texto.
 * El punto (f) (cómo detecta el detector) lo prueba `colorLiterals.test.ts`.
 */
const root = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const read = (relative: string) => readFileSync(root(relative), 'utf8');

/** Recorre un objeto y devuelve cada valor de texto con su ruta. */
function strings(value: unknown, path = ''): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
  }
  return [];
}

const literalsIn = (entries: { path: string; text: string }[]) =>
  entries.flatMap(({ path, text }) => findColorLiterals(text).map((literal) => `${path}: ${literal}`));

/** El tema mezclado con el de la librería (con los `components.*.extend` de cada familia). */
function mergedWithoutComponents() {
  const merged = mergeMantineTheme(DEFAULT_THEME, mantineTheme);
  return { merged, rest: merged };
}

describe('(a) el tema y las paletas no tienen colores literales', () => {
  it('tokenPalettes: 15 paletas de 10 referencias a tokens', () => {
    const names = Object.keys(tokenPalettes);
    expect(names).toContain('volt');
    expect(names).toHaveLength(15);
    for (const name of names) {
      expect(tokenPalettes[name]).toHaveLength(10);
      for (const shade of tokenPalettes[name]) expect(shade).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it('las paletas cubren todos los nombres de color de la librería', () => {
    for (const name of Object.keys(DEFAULT_THEME.colors)) expect(tokenPalettes).toHaveProperty(name);
  });

  it('createTheme: ningún valor es un color literal', () => {
    expect(literalsIn(strings(mantineTheme))).toEqual([]);
  });

  it('el tema ya mezclado con el de la librería no deja ningún color literal', () => {
    expect(literalsIn(strings(mergedWithoutComponents().rest))).toEqual([]);
  });

  it('el color principal es `volt` con el matiz 6 y la fuente sale de los tokens', () => {
    expect(mantineTheme.primaryColor).toBe('volt');
    expect(mantineTheme.primaryShade).toBe(6);
    expect(mantineTheme.fontFamily).toBe('var(--face)');
    expect(mantineTheme.respectReducedMotion).toBe(true);
  });
});

describe('(b) el resolvedor, mezclado con el de la librería, no deja valores literales', () => {
  const { merged } = mergedWithoutComponents();
  const base = defaultCssVariablesResolver(merged);
  const mine = cssVariablesResolver(merged);
  const toRecord = (variables: object): Record<string, string> => Object.fromEntries(Object.entries(variables));
  const combined = {
    variables: toRecord({ ...base.variables, ...mine.variables }),
    light: toRecord({ ...base.light, ...mine.light }),
    dark: toRecord({ ...base.dark, ...mine.dark }),
  };
  const mineLight = toRecord(mine.light);
  const mineDark = toRecord(mine.dark);

  it('variables, claro y oscuro', () => {
    expect(literalsIn(strings(combined))).toEqual([]);
  });

  it('cuerpo, texto, bordes, marcador, deshabilitado, error, ancla y contraste apuntan a tokens', () => {
    for (const scheme of [combined.light, combined.dark]) {
      for (const name of [
        '--mantine-color-body',
        '--mantine-color-text',
        '--mantine-color-error',
        '--mantine-color-placeholder',
        '--mantine-color-default-border',
        '--mantine-color-disabled',
        '--mantine-color-anchor',
        '--mantine-primary-color-contrast',
      ]) {
        expect(scheme[name]).toMatch(/^var\(--[\w-]+\)$/);
      }
    }
  });

  it('los dos esquemas llevan las mismas variables de color (los tokens ya cambian con data-theme)', () => {
    for (const name of Object.keys(mineLight)) expect(mineLight[name]).toBe(mineDark[name]);
  });
});

/** CSS de `theme/components/` (se añaden en las tareas de cada familia). */
function componentCssFiles(): string[] {
  const dir = root('./components/');
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.css'))
        .map((file) => `./components/${file}`)
    : [];
}

/** CSS de vista o de componente que ya no tiene colores literales (cada tarea de migración añade el suyo). */
const MIGRATED_PROJECT_CSS: string[] = [];

describe('(c) el CSS del proyecto migrado no tiene colores literales', () => {
  it('theme/components y los CSS de vista migrados', () => {
    for (const file of [...componentCssFiles(), ...MIGRATED_PROJECT_CSS]) {
      expect(findColorLiteralsInCss(read(file)), file).toEqual([]);
    }
  });
});

/** Literales de los CSS de la librería que se admiten, con la razón de por qué no se pintan o se anulan. */
const LOADING_SHIMMER =
  'Destello del estado `loading` del botón: solo existe con `data-loading`, que la interfaz no usa (DT-12, P3: «Enviando…» lo pone `pending`, propio).';
const OVERLAY_FALLBACK =
  'Valor de respaldo de `--overlay-bg`: `modal.css` (sin capa) fija `background` con `--scrim` y gana a la capa de la librería, así que el respaldo no se pinta.';
const ALLOWED_MANTINE_LITERALS: { file: string; literal: string; reason: string }[] = [
  { file: 'Button.layer.css', literal: 'rgba(255, 255, 255, 0.15)', reason: LOADING_SHIMMER },
  { file: 'Button.layer.css', literal: 'rgba(0, 0, 0, 0.15)', reason: LOADING_SHIMMER },
  { file: 'ActionIcon.layer.css', literal: 'rgba(255, 255, 255, 0.15)', reason: LOADING_SHIMMER },
  { file: 'ActionIcon.layer.css', literal: 'rgba(0, 0, 0, 0.15)', reason: LOADING_SHIMMER },
  { file: 'Overlay.layer.css', literal: 'rgba(0, 0, 0, 0.6)', reason: OVERLAY_FALLBACK },
];

describe('(d) los CSS de la librería importados solo traen los literales admitidos', () => {
  const imported = [...read('./mantineCss.ts').matchAll(/@mantine\/core\/styles\/([\w.]+\.css)/g)].map((match) => match[1]);

  it('mantineCss.ts importa solo hojas en capa y nunca baseline ni las variables por defecto', () => {
    expect(imported.length).toBeGreaterThan(10);
    for (const file of imported) expect(file).toMatch(/\.layer\.css$/);
    expect(imported).not.toContain('baseline.layer.css');
    expect(imported).not.toContain('default-css-variables.layer.css');
  });

  it('cada literal está en la lista de admitidos y cada admitido sigue existiendo', () => {
    const found: { file: string; literal: string }[] = [];
    for (const file of imported) {
      const css = readFileSync(
        fileURLToPath(new URL(`../../node_modules/@mantine/core/styles/${file}`, import.meta.url)),
        'utf8',
      );
      for (const { literal } of findColorLiteralsInCss(css)) found.push({ file, literal });
    }
    const key = (entry: { file: string; literal: string }) => `${entry.file} → ${entry.literal}`;
    const allowed = new Set(ALLOWED_MANTINE_LITERALS.map(key));
    const foundSet = new Set(found.map(key));
    expect([...foundSet].filter((entry) => !allowed.has(entry))).toEqual([]);
    expect([...allowed].filter((entry) => !foundSet.has(entry))).toEqual([]);
    for (const entry of ALLOWED_MANTINE_LITERALS) expect(entry.reason.length).toBeGreaterThan(20);
  });
});

describe('(e) toda var(--x) del tema apunta a un token o a una variable de la librería', () => {
  const tokens = new Set([...read('../styles/tokens.css').matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  const referenced = (text: string) => [...text.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]);

  it('el tema, las paletas y el resolvedor', () => {
    const { merged, rest } = mergedWithoutComponents();
    const everything = [...strings(tokenPalettes), ...strings(cssVariablesResolver(merged)), ...strings(rest)];
    const unknown = everything
      .flatMap(({ text }) => referenced(text))
      .filter((name) => !tokens.has(name) && !name.startsWith('--mantine-'));
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('el CSS de theme/components usa tokens, variables de la librería o las que define él mismo', () => {
    for (const file of componentCssFiles()) {
      const css = read(file);
      const own = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
      const withoutFallbacks = css.replace(/var\(\s*--[\w-]+\s*,[^)]*\)/g, '');
      const unknown = referenced(withoutFallbacks).filter(
        (name) => !tokens.has(name) && !own.has(name) && !name.startsWith('--mantine-'),
      );
      expect([...new Set(unknown)], file).toEqual([]);
    }
  });
});
