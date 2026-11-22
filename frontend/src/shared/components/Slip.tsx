import { Modal } from '@mantine/core';
import { X } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { Icon } from './Icon';

interface SlipProps {
  open: boolean;
  title: string;
  reference?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Título de la ventana como destino de foco por programa (`tabIndex={-1}`). */
  titleRef?: Ref<HTMLHeadingElement>;
  /** Mientras es verdadero, cerrar (Escape, fondo, botón) no hace nada y el botón de cerrar queda bloqueado. */
  closeLocked?: boolean;
  /**
   * Mensaje que se liga a la ventana como su descripción accesible (`aria-describedby`); solo la ventana de
   * desvincular lo usa (RF-23). Las demás ventanas no tienen descripción accesible (RF-12).
   */
  description?: ReactNode;
}

/** Curva de la entrada: el resorte de siempre (`--spring`), con la salida más corta. */
const TRANSITION = {
  in: { opacity: 1, transform: 'translateY(0) scale(1)' },
  out: { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
  common: { transformOrigin: 'center' },
  transitionProperty: 'transform, opacity',
};

/**
 * Panel modal (M10, M16): el `Modal` de la librería (`Modal.Root` y sus piezas) con la superficie de panel con
 * bisel y filo volt de siempre (`slip sheet sheet--punched`, `theme/components/modal.css`).
 *  - Rol de ventana modal con el título como nombre; sin descripción salvo la de `description`.
 *  - Tab y Mayús+Tab no salen de la ventana. El foco inicial lo recibe el control que lleve `data-autofocus`
 *    («Volver», «Título»). La librería **no** devuelve el foco al cerrar (`returnFocus` apagado): lo hace cada vista
 *    con sus reglas puras (`domain/draftFocus.ts`, `domain/unlinkDialog.ts`, `sessions/detail/focusRule.ts`).
 *  - Escape, el botón de cerrar y pulsar fuera llaman a `onClose`, salvo con `closeLocked`. Pulsar fuera no deja el
 *    foco en el cuerpo de la página.
 *  - La página de detrás no se desplaza mientras está abierta (`lockScroll`) y vuelve a hacerlo al cerrarse.
 */
export function Slip({
  open,
  title,
  reference,
  onClose,
  children,
  footer,
  titleRef,
  closeLocked = false,
  description,
}: SlipProps) {
  return (
    <Modal.Root
      opened={open}
      onClose={closeLocked ? () => {} : onClose}
      closeOnEscape={!closeLocked}
      closeOnClickOutside={!closeLocked}
      trapFocus
      returnFocus={false}
      lockScroll
      centered
      zIndex="var(--z-modal)"
      transitionProps={{ transition: TRANSITION, duration: 280, timingFunction: 'var(--spring)' }}
      className="tmu-modal"
    >
      <Modal.Overlay
        blur={8}
        className="tmu-modal__overlay"
        // Sin esto, pulsar el fondo lleva el foco al cuerpo y la ventana (si no se cierra) lo pierde (RNF-2).
        onMouseDown={(event) => event.preventDefault()}
      />
      <Modal.Content classNames={{ content: 'slip sheet sheet--punched' }}>
        <Modal.Header className="sheet__head">
          <Modal.Title ref={titleRef} className="sheet-title grow" tabIndex={titleRef ? -1 : undefined}>
            {title}
          </Modal.Title>
          <div className="line">
            {reference ? <span className="slip__ref num">{reference}</span> : null}
            <Modal.CloseButton
              className="slip__close"
              aria-label="Cerrar"
              aria-disabled={closeLocked ? true : undefined}
              icon={<Icon as={X} size={16} />}
            />
          </div>
        </Modal.Header>

        <div className="slip__body">
          {description !== undefined ? (
            <Modal.Body className="slip__desc">
              <p className="note">{description}</p>
            </Modal.Body>
          ) : null}
          {children}
        </div>

        {footer ? <footer className="slip__foot">{footer}</footer> : null}
      </Modal.Content>
    </Modal.Root>
  );
}
