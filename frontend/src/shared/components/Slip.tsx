import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type ReactNode, type Ref, type RefObject } from 'react';
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
  /** Elemento que recibe el foco al abrir (spec 009, RNF-2); sin él el foco no se mueve. */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Título de la ventana como destino de foco (`tabIndex={-1}`). */
  titleRef?: Ref<HTMLHeadingElement>;
  /** Tab y Mayús+Tab recorren en círculo los botones de la ventana (RF-23). */
  trapFocus?: boolean;
  /** Mientras es verdadero, cerrar (Escape, fondo, botón) no hace nada. */
  closeLocked?: boolean;
}

/** Botones que recibe el recorrido de Tab: los bloqueados con `aria-disabled` cuentan. */
function focusableButtons(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled)'));
}

/**
 * Panel modal.
 *
 * Se reserva para la única tarea que sí interrumpe (anotar una sesión nueva),
 * porque exige foco protegido sobre un bloque horario concreto. Entra con
 * resorte desde abajo y el fondo se desenfoca.
 */
export function Slip({
  open,
  title,
  reference,
  onClose,
  children,
  footer,
  initialFocusRef,
  titleRef,
  trapFocus = false,
  closeLocked = false,
}: SlipProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) initialFocusRef?.current?.focus();
    // Solo al abrir: un cambio posterior de la referencia no mueve el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!closeLocked) onClose();
        return;
      }
      if (!trapFocus || event.key !== 'Tab' || dialogRef.current === null) return;
      const buttons = focusableButtons(dialogRef.current);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (first === undefined || last === undefined) return;
      const index = buttons.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey) {
        if (index <= 0) {
          event.preventDefault();
          last.focus();
        }
      } else if (index === -1 || index === buttons.length - 1) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose, trapFocus, closeLocked]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="slip__backdrop"
          onMouseDown={
            closeLocked
              ? undefined
              : (event) => {
                  // Sin esto el clic en el fondo lleva el foco al cuerpo después de cerrar (RNF-2).
                  event.preventDefault();
                  onClose();
                }
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_FLUID }}
        >
          <motion.div
            ref={dialogRef}
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
              <h2
                ref={titleRef}
                className="sheet-title grow"
                tabIndex={titleRef ? -1 : undefined}
              >
                {title}
              </h2>
              <div className="line">
                {reference ? <span className="slip__ref num">{reference}</span> : null}
                <button
                  type="button"
                  className="slip__close"
                  onClick={closeLocked ? undefined : onClose}
                  aria-disabled={closeLocked ? true : undefined}
                  aria-label="Cerrar"
                >
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
