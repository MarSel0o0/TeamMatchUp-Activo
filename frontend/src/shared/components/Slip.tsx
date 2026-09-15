import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './slip.css';

interface SlipProps {
  open: boolean;
  title: string;
  reference?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Papeleta: el formulario corto que se rellena aparte y se adjunta a la hoja.
 *
 * Se reserva para la única tarea que sí interrumpe —anotar una sesión nueva—,
 * porque exige foco protegido sobre un bloque horario concreto.
 */
export function Slip({ open, title, reference, onClose, children, footer }: SlipProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="slip__backdrop" onMouseDown={onClose}>
      <div
        className="slip sheet sheet--punched"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sheet__head">
          <h2 className="sheet-title grow">{title}</h2>
          <div className="line">
            {reference ? <span className="label">{reference}</span> : null}
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <Icon as={X} size={14} />
            </button>
          </div>
        </header>

        <div className="slip__body">{children}</div>

        {footer ? <footer className="slip__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
