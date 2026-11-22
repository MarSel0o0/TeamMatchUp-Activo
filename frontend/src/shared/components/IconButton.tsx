import { ActionIcon } from '@mantine/core';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type IconButtonVariant = 'toggle' | 'bar';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'aria-label'> {
  /** Nombre accesible (obligatorio: el botón no tiene texto). */
  label: string;
  variant: IconButtonVariant;
  children: ReactNode;
}

/**
 * Botón de icono sin texto (M3): el `ActionIcon` de la librería con el aspecto de
 * `theme/components/icon-button.css`. El nombre accesible es obligatorio y el título emergente, el
 * `title` que pase el llamador (RF-18).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant, children, ...rest },
  ref,
) {
  return (
    <ActionIcon ref={ref} variant={variant} aria-label={label} {...rest}>
      {children}
    </ActionIcon>
  );
});
