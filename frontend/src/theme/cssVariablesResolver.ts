import type { CSSVariablesResolver } from '@mantine/core';

/**
 * Variables de color de la librería apuntando a tokens (spec 017, RF-2; plan 3.3). `MantineProvider`
 * las mezcla con las que genera por defecto y las nuestras ganan. Como los tokens ya cambian con
 * `data-theme`, el mismo valor sirve para los dos esquemas.
 */
const colors = {
  '--mantine-color-body': 'var(--bg)',
  '--mantine-color-text': 'var(--ink)',
  '--mantine-color-bright': 'var(--ink)',
  '--mantine-color-error': 'var(--danger)',
  '--mantine-color-placeholder': 'var(--placeholder)',
  '--mantine-color-anchor': 'var(--accent-text)',
  '--mantine-color-dimmed': 'var(--ink-3)',
  '--mantine-color-default': 'var(--surface-sunk)',
  '--mantine-color-default-hover': 'var(--fill-2)',
  '--mantine-color-default-color': 'var(--ink)',
  '--mantine-color-default-border': 'var(--line-strong)',
  '--mantine-color-disabled': 'var(--fill-1)',
  '--mantine-color-disabled-color': 'var(--ink-3)',
  '--mantine-color-disabled-border': 'var(--line)',
  '--mantine-primary-color-contrast': 'var(--volt-ink)',
} as const;

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: { ...colors },
  light: { ...colors },
  dark: { ...colors },
});
