import { AlertCircle, Ban } from 'lucide-react';
import { useRef, type Ref } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { Notice } from '@/shared/components/Notice';
import { Spinner } from '@/shared/components/Spinner';
import { Icon } from '@/shared/components/Icon';
import { Slip } from '@/shared/components/Slip';
import {
  CANCEL_DIALOG_BACK,
  CANCEL_DIALOG_BODY,
  CANCEL_DIALOG_CONFIRM,
  CANCEL_DIALOG_TITLE,
  SENDING_TEXT,
} from '@/shared/utils/copy';

interface CancelSessionDialogProps {
  open: boolean;
  /** «Volver», cerrar, Escape y el fondo; sin efecto con la cancelación en curso. */
  onClose: () => void;
  onConfirm: () => void;
  /** Cancelación en curso (RF-20). */
  pending: boolean;
  /** Mensaje del último intento fallido, tal como llegó. */
  message?: string | null;
  /** Título de la ventana como destino de foco para quien la monta (RNF-2). */
  titleRef?: Ref<HTMLHeadingElement>;
  /** «Sí, cancelar sesión» como destino de foco cuando llega un error (RNF-2, caso 14). */
  confirmRef?: Ref<HTMLButtonElement>;
}

/** La ventana de confirmación de cancelar una sesión, única para la agenda y el detalle (RF-23). */
export function CancelSessionDialog({
  open,
  onClose,
  onConfirm,
  pending,
  message,
  titleRef,
  confirmRef,
}: CancelSessionDialogProps) {
  const backRef = useRef<HTMLButtonElement>(null);
  const ownTitleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Slip
      open={open}
      title={CANCEL_DIALOG_TITLE}
      onClose={onClose}
      titleRef={titleRef ?? ownTitleRef}
      closeLocked={pending}
      footer={
        <>
          <AppButton
            ref={backRef}
            type="button"
            data-autofocus
            onClick={pending ? undefined : onClose}
            aria-disabled={pending ? true : undefined}
          >
            {CANCEL_DIALOG_BACK}
          </AppButton>
          <AppButton
            ref={confirmRef}
            type="button"
            tone="danger"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Spinner /> : <Icon as={Ban} size={14} />}
            {pending ? SENDING_TEXT : CANCEL_DIALOG_CONFIRM}
          </AppButton>
        </>
      }
    >
      <p className="note">{CANCEL_DIALOG_BODY}</p>
      {message ? (
        <Notice tone="error" role="alert">
          <Icon as={AlertCircle} size={15} />
          {message}
        </Notice>
      ) : null}
    </Slip>
  );
}
