import { Loader } from '@mantine/core';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

/** Glifo del indicador: un `span` con el borde y el giro de `theme/components/loader.css`. */
const SpinGlyph = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<'span'> & { size?: unknown; variant?: unknown }>(
  function SpinGlyph({ className, size: _size, variant: _variant, ...rest }, ref) {
    return <span ref={ref} className={className ? `${className} tmu-spin` : 'tmu-spin'} {...rest} />;
  },
);

const LOADERS = { spin: SpinGlyph };

interface SpinnerProps {
  /** Solo cuando el indicador va solo (sin texto al lado), como «Actualizando»; no le da rol. */
  label?: string;
  className?: string;
}

/**
 * Indicador giratorio (spec 017, M15, RF-17): el `Loader` de la librería con un tipo propio. Mide 13 px
 * y toma el color del contenedor (`currentColor`); dentro de un botón, el del texto del botón.
 */
export function Spinner({ label, className }: SpinnerProps) {
  return <Loader loaders={LOADERS} type="spin" aria-label={label} className={className} />;
}
