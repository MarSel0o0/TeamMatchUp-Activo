import { useEffect, useState, type ReactNode } from 'react';

type StampTone = 'sealed' | 'pen' | 'ok' | 'warn' | 'plain';

interface StampProps {
  children: ReactNode;
  tone?: StampTone;
  /** Cambia este valor para volver a estampar: reproduce la animación. */
  pressKey?: string | number;
  flat?: boolean;
  title?: string;
}

/**
 * Sello de goma.
 *
 * Marca los estados que en un formulario de papel se estamparían: rango
 * verificado, inscripción registrada, cupo lleno. Al montar —o cuando cambia
 * `pressKey`— el sello aterriza sobre el papel; es el único momento animado del
 * producto.
 */
export function Stamp({ children, tone = 'plain', pressKey, flat = false, title }: StampProps) {
  const [pressing, setPressing] = useState(true);

  useEffect(() => {
    setPressing(true);
    const timeout = setTimeout(() => setPressing(false), 460);
    return () => clearTimeout(timeout);
  }, [pressKey]);

  const classes = [
    'stamp',
    tone !== 'plain' ? `stamp--${tone}` : '',
    flat ? 'stamp--flat' : '',
    pressing ? 'stamp--pressing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}
