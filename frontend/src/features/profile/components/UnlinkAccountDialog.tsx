import { Unlink } from 'lucide-react';
import type { Ref } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { Slip } from '@/shared/components/Slip';
import { Spinner } from '@/shared/components/Spinner';
import {
  SENDING_TEXT,
  UNLINK_DIALOG_BACK,
  UNLINK_DIALOG_BODY,
  UNLINK_DIALOG_CONFIRM,
} from '@/shared/utils/copy';

interface UnlinkAccountDialogProps {
  open: boolean;
  /** «¿Desvincular <identificador>?», calculado al abrir (`domain/unlinkDialog.ts`); no cambia mientras está abierta. */
  title: string;
  /** «Volver», cerrar, Escape y el fondo; sin efecto con la desvinculación en curso. */
  onClose: () => void;
  onConfirm: () => void;
  /** Desvinculación en curso (spec 007, RF-20). */
  pending: boolean;
  /** Error de la desvinculación: se muestra dentro de la ventana, con el aspecto de las alertas de las escrituras. */
  error: unknown;
  /** Título de la ventana como destino de foco por programa. */
  titleRef?: Ref<HTMLHeadingElement>;
  /** «Desvincular» de la ventana como destino de foco tras un error. */
  confirmRef?: Ref<HTMLButtonElement>;
}

/**
 * Ventana de desvincular una cuenta (M16; spec 017, RF-23 a RF-25): sustituye la confirmación nativa del navegador.
 * Mismo aspecto y estructura que `CancelSessionDialog`; el mensaje es la descripción accesible de la ventana.
 */
export function UnlinkAccountDialog({
  open,
  title,
  onClose,
  onConfirm,
  pending,
  error,
  titleRef,
  confirmRef,
}: UnlinkAccountDialogProps) {
  return (
    <Slip
      open={open}
      title={title}
      description={UNLINK_DIALOG_BODY}
      onClose={onClose}
      titleRef={titleRef}
      closeLocked={pending}
      footer={
        <>
          <AppButton
            type="button"
            data-autofocus
            onClick={pending ? undefined : onClose}
            aria-disabled={pending ? true : undefined}
          >
            {UNLINK_DIALOG_BACK}
          </AppButton>
          <AppButton ref={confirmRef} type="button" tone="danger" onClick={onConfirm} disabled={pending}>
            {pending ? <Spinner /> : <Icon as={Unlink} size={14} />}
            {pending ? SENDING_TEXT : UNLINK_DIALOG_CONFIRM}
          </AppButton>
        </>
      }
    >
      <MutationNotice error={error} />
    </Slip>
  );
}
