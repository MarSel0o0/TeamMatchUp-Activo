import type { LucideIcon } from 'lucide-react';

interface IconProps {
  as: LucideIcon;
  size?: number;
  className?: string;
  /** Solo cuando el icono comunica algo que el texto no dice. */
  label?: string;
}

/**
 * Único punto por el que entran iconos.
 *
 * Fija el trazo y los remates en todo el producto: la esquina recta del mundo de
 * formulario, no la punta redondeada por defecto de la librería.
 */
export function Icon({ as: Glyph, size = 16, className, label }: IconProps) {
  return (
    <Glyph
      size={size}
      className={className}
      strokeWidth={1.5}
      absoluteStrokeWidth
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
