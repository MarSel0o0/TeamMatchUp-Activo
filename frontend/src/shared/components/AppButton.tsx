import { Button } from '@mantine/core';
import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonTone = 'default' | 'pen' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** `pen` = primario (volt), `quiet` = discreto, `danger` = peligro. */
  tone?: ButtonTone;
  size?: ButtonSize;
  /** A todo el ancho. */
  block?: boolean;
  /**
   * Bloqueado (spec 017, RF-8): se ve como deshabilitado pero sigue en el orden de Tab, conserva el
   * foco y no hace nada al activarlo (`aria-disabled="true"`). No es `disabled`.
   */
  blocked?: boolean;
}

/**
 * Botón de la interfaz (M1): el `Button` de la librería con el aspecto de `theme/components/button.css`.
 * El icono, el texto y el indicador son hijos directos, como siempre; «Enviando…» lo pone el llamador
 * (el `loading` de la librería oculta el texto, DT-12). Con una escritura en curso, el llamador pasa
 * `disabled` y cambia el icono por `<Spinner />`.
 */
export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { tone = 'default', size = 'md', block = false, blocked = false, onClick, children, ...rest },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <Button
      ref={ref}
      variant={tone}
      size={size}
      fullWidth={block}
      aria-disabled={blocked ? true : undefined}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Button>
  );
});

interface ButtonLinkProps extends Omit<LinkProps, 'color' | 'className' | 'children' | 'ref'> {
  tone?: ButtonTone;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Enlace con el aspecto de un botón (M2): sigue siendo un enlace (rol de enlace, navegación sin recargar).
 * Reenvía el resto de propiedades del enlace (`aria-label`, `state`, `replace`…).
 */
export function ButtonLink({ to, tone = 'default', size = 'md', block = false, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Button component={Link} to={to} variant={tone} size={size} fullWidth={block} className={className} {...rest}>
      {children}
    </Button>
  );
}
