import { FileWarning, Inbox, RotateCw } from 'lucide-react';
import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { Icon } from './Icon';

/** Esqueleto con la forma del contenido mientras llega. */
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
  /** Destino de foco para el título (`tabIndex={-1}`); sin él el título no se enfoca. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Con `headingRef`, el nivel del encabezado del título (por defecto `h1`). */
  headingLevel?: 'h1' | 'h2' | 'h3';
}

/** Estado vacío que enseña qué hacer, no que anuncia que no hay nada. */
export function Blank({
  icon = Inbox,
  title,
  description,
  action,
  headingRef,
  headingLevel = 'h1',
}: BlankProps) {
  const Heading = headingLevel;
  return (
    <div className="blank">
      <span className="blank__mark">
        <Icon as={icon} size={26} />
      </span>
      <div className="stack-sm">
        {headingRef ? (
          <Heading ref={headingRef as never} className="sheet-title" tabIndex={-1}>
            {title}
          </Heading>
        ) : (
          <strong className="sheet-title">{title}</strong>
        )}
        {description ? <span className="note note--faint">{description}</span> : null}
      </div>
      {action}
    </div>
  );
}

interface FailureProps {
  error: unknown;
  onRetry?: () => void;
  /** Título; por defecto el de los errores de lectura de datos. */
  title?: string;
  /** Lleva el foco a "Reintentar" al mostrarse (RNF-7). */
  autoFocusRetry?: boolean;
  /** `alert` hace que un lector de pantalla lo anuncie al aparecer (RNF-7). */
  role?: 'alert';
  /** Destino de foco: el mensaje pasa a ser el encabezado `h1` (`tabIndex={-1}`) (spec 009, RF-13). */
  headingRef?: Ref<HTMLHeadingElement>;
  /** «Reintentar» con una lectura en curso: se ve bloqueado (`aria-disabled`) y no hace nada. */
  retryBusy?: boolean;
}

export function Failure({
  error,
  onRetry,
  title = 'No se pudieron cargar los datos',
  autoFocusRetry = false,
  role,
  headingRef,
  retryBusy = false,
}: FailureProps) {
  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocusRetry) retryRef.current?.focus();
  }, [autoFocusRetry]);

  return (
    <div className="blank" role={role}>
      <span className="blank__mark" style={{ color: 'var(--stamp)' }}>
        <Icon as={FileWarning} size={26} />
      </span>
      <div className="stack-sm">
        {headingRef ? (
          <h1 ref={headingRef} className="sheet-title" tabIndex={-1}>
            {message}
          </h1>
        ) : (
          <>
            <strong className="sheet-title">{title}</strong>
            <span className="note note--faint">{message}</span>
          </>
        )}
      </div>
      {onRetry ? (
        <button
          ref={retryRef}
          type="button"
          className="btn btn--sm"
          onClick={retryBusy ? undefined : onRetry}
          aria-disabled={retryBusy ? true : undefined}
        >
          {retryBusy ? <span className="btn__spin" /> : <Icon as={RotateCw} size={13} />}
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
