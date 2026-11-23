import { ActionIcon, Badge, Button, Loader, NativeSelect, Skeleton, Slider, Switch, Tabs, Textarea, TextInput, createTheme } from '@mantine/core';
import { tokenPalettes } from './tokenPalettes';

/** Clases de los campos (texto, área, búsqueda y lista): el CSS está en `components/field.css`. */
const FIELD_CLASSES = {
  root: 'tmu-field',
  label: 'tmu-field__label',
  wrapper: 'tmu-field__wrapper',
  input: 'tmu-field__input',
  section: 'tmu-field__section',
  description: 'tmu-field__hint',
  error: 'tmu-field__error',
};

/** La pista y el error van bajo el campo (hoy se ven así), no entre la etiqueta y el campo. */
const FIELD_DEFAULTS = { inputWrapperOrder: ['label', 'input', 'description', 'error'] as ('label' | 'input' | 'description' | 'error')[] };

/**
 * Tema de la librería construido a partir de los tokens de `styles/tokens.css` (spec 017, RF-1, RF-2,
 * RF-4; plan 3.3). Ningún valor es un color literal: todo es una referencia `var(--token)`. Los
 * `components.*.extend` (clases, valores por defecto) los añade cada familia de componentes.
 */
export const mantineTheme = createTheme({
  primaryColor: 'volt',
  primaryShade: 6,
  colors: tokenPalettes,
  white: 'var(--surface)',
  black: 'var(--ink)',
  fontFamily: 'var(--face)',
  fontFamilyMonospace: 'var(--mono)',
  headings: { fontFamily: 'var(--face)' },
  radius: {
    xs: 'var(--r-sm)',
    sm: 'var(--r-sm)',
    md: 'var(--r-md)',
    lg: 'var(--r-lg)',
    xl: 'var(--r-xl)',
  },
  defaultRadius: 'md',
  spacing: {
    xs: 'var(--s2)',
    sm: 'var(--s3)',
    md: 'var(--s4)',
    lg: 'var(--s5)',
    xl: 'var(--s6)',
  },
  fontSizes: {
    xs: 'var(--t-micro)',
    sm: 'var(--t-small)',
    md: 'var(--t-base)',
    lg: 'var(--t-lead)',
    xl: 'var(--t-h3)',
  },
  shadows: {
    xs: 'var(--lift)',
    sm: 'var(--lift)',
    md: 'var(--lift)',
    lg: 'var(--lift-high)',
    xl: 'var(--lift-high)',
  },
  // Por defecto apunta a los nombres `blue` y `cyan`; ningún componente usa degradados.
  defaultGradient: { from: 'volt', to: 'volt', deg: 45 },
  respectReducedMotion: true,
  fontSmoothing: false,
  cursorType: 'pointer',
  focusClassName: 'tmu-focus',
  activeClassName: 'tmu-active',
  components: {
    Button: Button.extend({
      classNames: { root: 'tmu-btn', inner: 'tmu-btn__inner', label: 'tmu-btn__label' },
    }),
    ActionIcon: ActionIcon.extend({
      classNames: { root: 'tmu-icon-btn', icon: 'tmu-icon-btn__icon' },
    }),
    Loader: Loader.extend({ classNames: { root: 'tmu-loader' } }),
    Badge: Badge.extend({ classNames: { root: 'tmu-stamp', label: 'tmu-stamp__label' } }),
    Skeleton: Skeleton.extend({ classNames: { root: 'tmu-skeleton' } }),
    Switch: Switch.extend({
      classNames: {
        root: 'tmu-switch',
        body: 'tmu-switch__body',
        labelWrapper: 'tmu-switch__labelwrap',
        label: 'tmu-switch__label',
        track: 'tmu-switch__track',
        thumb: 'tmu-switch__thumb',
        input: 'tmu-switch__input',
      },
    }),
    Slider: Slider.extend({
      classNames: {
        root: 'tmu-slider',
        trackContainer: 'tmu-slider__trackcontainer',
        track: 'tmu-slider__track',
        bar: 'tmu-slider__bar',
        thumb: 'tmu-slider__thumb',
      },
    }),
    Tabs: Tabs.extend({
      classNames: {
        root: 'tmu-tabs',
        list: 'tmu-tabs__list',
        tab: 'tmu-tabs__tab',
        tabLabel: 'tmu-tabs__tablabel',
        panel: 'tmu-tabs__panel',
      },
    }),
    TextInput: TextInput.extend({ classNames: FIELD_CLASSES, defaultProps: FIELD_DEFAULTS }),
    Textarea: Textarea.extend({ classNames: FIELD_CLASSES, defaultProps: FIELD_DEFAULTS }),
    NativeSelect: NativeSelect.extend({ classNames: FIELD_CLASSES, defaultProps: FIELD_DEFAULTS }),
  },
});
