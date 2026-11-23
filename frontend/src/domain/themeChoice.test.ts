import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { bootTheme, buildBootScript, chooseInitialTheme } from './themeChoice';

/** Spec 017, RF-5, RF-7, RNF-6; plan 5.1. */
describe('chooseInitialTheme', () => {
  it('usa el tema guardado «light» aunque el sistema prefiera oscuro', () => {
    expect(chooseInitialTheme({ stored: 'light', storageAvailable: true, systemPrefersLight: false })).toBe('light');
  });

  it('usa el tema guardado «dark» aunque el sistema prefiera claro', () => {
    expect(chooseInitialTheme({ stored: 'dark', storageAvailable: true, systemPrefersLight: true })).toBe('dark');
  });

  it('sin tema guardado sigue al sistema: claro', () => {
    expect(chooseInitialTheme({ stored: null, storageAvailable: true, systemPrefersLight: true })).toBe('light');
  });

  it('sin tema guardado sigue al sistema: oscuro', () => {
    expect(chooseInitialTheme({ stored: null, storageAvailable: true, systemPrefersLight: false })).toBe('dark');
  });

  it('ignora un valor guardado que no es «light» ni «dark»', () => {
    for (const stored of ['auto', 'LIGHT', '', 'true', 'dark ']) {
      expect(chooseInitialTheme({ stored, storageAvailable: true, systemPrefersLight: true })).toBe('light');
      expect(chooseInitialTheme({ stored, storageAvailable: true, systemPrefersLight: false })).toBe('dark');
    }
  });

  it('con el almacenamiento no disponible usa el sistema, aunque haya un valor', () => {
    expect(chooseInitialTheme({ stored: 'dark', storageAvailable: false, systemPrefersLight: true })).toBe('light');
    expect(chooseInitialTheme({ stored: null, storageAvailable: false, systemPrefersLight: false })).toBe('dark');
  });
});

describe('bootTheme', () => {
  function fakeEnv(options: { stored?: string | null; throwOnRead?: boolean; prefersLight?: boolean; throwOnMedia?: boolean }) {
    const applied: string[] = [];
    return {
      applied,
      env: {
        readStored: () => {
          if (options.throwOnRead) throw new Error('almacenamiento bloqueado');
          return options.stored ?? null;
        },
        prefersLight: () => {
          if (options.throwOnMedia) throw new Error('sin matchMedia');
          return options.prefersLight ?? false;
        },
        apply: (theme: 'light' | 'dark') => {
          applied.push(theme);
        },
      },
    };
  }

  it('aplica el valor guardado y lo devuelve', () => {
    const { env, applied } = fakeEnv({ stored: 'light', prefersLight: false });
    expect(bootTheme(env)).toBe('light');
    expect(applied).toEqual(['light']);
  });

  it('si la lectura lanza, usa el sistema y aplica una sola vez', () => {
    const { env, applied } = fakeEnv({ throwOnRead: true, prefersLight: true });
    expect(bootTheme(env)).toBe('light');
    expect(applied).toEqual(['light']);
  });

  it('con un valor extraño aplica el del sistema', () => {
    const { env, applied } = fakeEnv({ stored: 'sepia', prefersLight: false });
    expect(bootTheme(env)).toBe('dark');
    expect(applied).toEqual(['dark']);
  });

  it('si no se puede consultar la preferencia del sistema, cae a oscuro', () => {
    const { env, applied } = fakeEnv({ stored: null, throwOnMedia: true });
    expect(bootTheme(env)).toBe('dark');
    expect(applied).toEqual(['dark']);
  });
});

describe('serialización (el script llega a la página como texto)', () => {
  const cases = [
    { stored: 'light', storageAvailable: true, systemPrefersLight: false },
    { stored: 'dark', storageAvailable: true, systemPrefersLight: true },
    { stored: null, storageAvailable: true, systemPrefersLight: true },
    { stored: null, storageAvailable: true, systemPrefersLight: false },
    { stored: 'raro', storageAvailable: true, systemPrefersLight: true },
    { stored: 'dark', storageAvailable: false, systemPrefersLight: true },
  ] as const;

  it('chooseInitialTheme.toString() se ejecuta en un contexto sin globales y da lo mismo', () => {
    for (const input of cases) {
      const result = runInNewContext(`(${chooseInitialTheme.toString()})(input)`, { input }, { timeout: 1000 });
      expect(result).toBe(chooseInitialTheme(input));
    }
  });

  it('el texto de la función no usa imports ni ayudas del empaquetador', () => {
    expect(chooseInitialTheme.toString()).not.toMatch(/\bimport\b|__name|__vite|__vi_|\brequire\b/);
    expect(bootTheme.toString()).not.toMatch(/\bimport\b|__name|__vite|__vi_|\brequire\b/);
  });

  /** Un documento y un almacén mínimos, como los que ve el script en la página. */
  function runScript(options: { stored?: string | null; throwOnRead?: boolean; prefersLight?: boolean; noMatchMedia?: boolean }) {
    const attributes: Record<string, string> = {};
    const dataset: Record<string, string> = {};
    const reads: string[] = [];
    const sandbox: Record<string, unknown> = {
      localStorage: {
        getItem(key: string) {
          reads.push(key);
          if (options.throwOnRead) throw new Error('bloqueado');
          return options.stored ?? null;
        },
      },
      document: {
        documentElement: {
          dataset,
          setAttribute(name: string, value: string) {
            attributes[name] = value;
          },
        },
      },
      window: options.noMatchMedia
        ? {}
        : { matchMedia: (query: string) => ({ matches: query.includes('light') ? (options.prefersLight ?? false) : false }) },
    };
    runInNewContext(buildBootScript('tmu.theme'), sandbox, { timeout: 1000 });
    return { dataset, attributes, reads };
  }

  it('el script completo lee la clave dada y escribe las dos marcas con el mismo valor', () => {
    const { dataset, attributes, reads } = runScript({ stored: 'light', prefersLight: false });
    expect(reads).toEqual(['tmu.theme']);
    expect(dataset.theme).toBe('light');
    expect(attributes['data-mantine-color-scheme']).toBe('light');
  });

  it('el script completo con el almacenamiento bloqueado sigue al sistema', () => {
    const claro = runScript({ throwOnRead: true, prefersLight: true });
    expect(claro.dataset.theme).toBe('light');
    expect(claro.attributes['data-mantine-color-scheme']).toBe('light');
    const oscuro = runScript({ throwOnRead: true, prefersLight: false });
    expect(oscuro.dataset.theme).toBe('dark');
  });

  it('el script completo con un valor extraño y sin preferencia sigue al sistema (oscuro por defecto)', () => {
    expect(runScript({ stored: 'otro', prefersLight: false }).dataset.theme).toBe('dark');
    expect(runScript({ stored: 'otro', noMatchMedia: true }).dataset.theme).toBe('dark');
  });

  it('el script no escribe nada en el almacenamiento (solo lee)', () => {
    expect(buildBootScript('tmu.theme')).not.toMatch(/setItem|removeItem|sessionStorage|cookie/);
  });
});
