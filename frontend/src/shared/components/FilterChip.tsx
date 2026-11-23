import { UnstyledButton } from '@mantine/core';
import type { CSSProperties, ReactNode } from 'react';

interface FilterChipProps {
  /** Estado pulsado (`aria-pressed`): el filtro está aplicado. */
  pressed: boolean;
  onClick: () => void;
  /** Tinta del juego (`GameDefinition.inkVar`): punto, borde y tinte del chip pulsado. Sin ella, el volt. */
  inkVar?: string;
  /** Con punto de color antes del texto (los chips de un juego). */
  dot?: boolean;
  children: ReactNode;
}

/**
 * Chip de filtro (M12): un botón de la librería con estado pulsado y el aspecto de `theme/components/chip.css`. No es
 * el `Chip` de la librería (una casilla o un botón de opción): conserva el rol de botón con `aria-pressed`
 * (RF-14, DT-11).
 */
export function FilterChip({ pressed, onClick, inkVar, dot = false, children }: FilterChipProps) {
  return (
    <UnstyledButton
      type="button"
      className="tmu-chip"
      aria-pressed={pressed}
      onClick={onClick}
      style={inkVar ? ({ '--chip-ink': inkVar } as CSSProperties) : undefined}
    >
      {dot ? <span className="tmu-chip__dot" /> : null}
      {children}
    </UnstyledButton>
  );
}
