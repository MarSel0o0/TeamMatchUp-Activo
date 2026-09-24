import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { EASE_FLUID } from '@/shared/motion/presets';
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
 * Panel modal.
 *
 * Se reserva para la única tarea que sí interrumpe (anotar una sesión nueva),
 * porque exige foco protegido sobre un bloque horario concreto. Entra con
 * resorte desde abajo y el fondo se desenfoca.
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

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="slip__backdrop"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_FLUID }}
        >
          <motion.div
            className="slip sheet sheet--punched"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <header className="sheet__head">
              <h2 className="sheet-title grow">{title}</h2>
              <div className="line">
                {reference ? <span className="slip__ref num">{reference}</span> : null}
                <button type="button" className="slip__close" onClick={onClose} aria-label="Cerrar">
                  <Icon as={X} size={16} />
                </button>
              </div>
            </header>

            <div className="slip__body">{children}</div>

            {footer ? <footer className="slip__foot">{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
