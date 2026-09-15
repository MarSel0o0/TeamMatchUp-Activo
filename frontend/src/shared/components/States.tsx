import { FileWarning, Inbox, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Filas de formulario en blanco mientras llega el contenido. */
export function SheetSkeleton({ rows = 4, height = 44 }: { rows?: number; height?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="skeleton"
          style={{
            height,
            marginBottom: 1,
            opacity: 1 - index * 0.13,
          }}
        />
      ))}
    </div>
  );
}

interface BlankProps {
  icon?: typeof Inbox;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vacío que enseña qué hacer, no que anuncia que no hay nada. */
export function Blank({ icon = Inbox, title, description, action }: BlankProps) {
  return (
    <div className="blank">
      <span className="blank__mark">
        <Icon as={icon} size={26} />
      </span>
      <div className="stack-sm">
        <strong className="sheet-title">{title}</strong>
        {description ? <span className="note note--faint">{description}</span> : null}
      </div>
      {action}
    </div>
  );
}

interface FailureProps {
  error: unknown;
  onRetry?: () => void;
}

export function Failure({ error, onRetry }: FailureProps) {
  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

  return (
    <div className="blank">
      <span className="blank__mark" style={{ color: 'var(--stamp)' }}>
        <Icon as={FileWarning} size={26} />
      </span>
      <div className="stack-sm">
        <strong className="sheet-title">No se pudo leer la hoja</strong>
        <span className="note note--faint">{message}</span>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          <Icon as={RotateCw} size={13} />
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function Working({ label = 'Leyendo…' }: { label?: string }) {
  return (
    <div className="blank" role="status">
      <span className="btn__spin" style={{ color: 'var(--pen)' }} />
      <span className="note">{label}</span>
    </div>
  );
}
