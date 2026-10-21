import { AlertCircle, Ban, LogOut, Pencil, UserPlus } from 'lucide-react';
import type { Ref } from 'react';
import { detailActions } from '@/domain/sessionDetail';
import type { PlaySession } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import {
  CANCEL_SESSION_LABEL,
  EDIT_SESSION_LABEL,
  JOIN_SESSION_LABEL,
  LEAVE_SESSION_LABEL,
  NO_SLOTS_LABEL,
  SAVED_NOTICE_TEXT,
  SENDING_TEXT,
} from '@/shared/utils/copy';

export type ZoneAction = 'join' | 'leave' | 'save';

interface SessionActionsZoneProps {
  session: PlaySession;
  currentUserId: string;
  /** Acción en curso: su botón queda `disabled` con «Enviando…» (RF-10). */
  pending: ZoneAction | null;
  /** Nueva lectura en curso: los botones quedan bloqueados con `aria-disabled` (RF-11). */
  rereading: boolean;
  message: string | null;
  /** «Cambios guardados.» tras guardar (RF-7). */
  savedNotice: boolean;
  /** El formulario de edición está abierto: «Editar sesión» se oculta. */
  formOpen: boolean;
  /** Hay una acción o una nueva lectura en curso: «Editar sesión» queda bloqueado (RF-11). */
  blocked: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onCancel: () => void;
  joinRef: Ref<HTMLButtonElement>;
  leaveRef: Ref<HTMLButtonElement>;
  editRef: Ref<HTMLButtonElement>;
  cancelRef: Ref<HTMLButtonElement>;
  messageRef: Ref<HTMLParagraphElement>;
}

/**
 * Zona de acciones del detalle (spec 009, plan 5.3): «Unirme» o «Sin cupos» (un solo botón, el
 * mismo nodo) para quien no está inscrito, y «Salir» para quien lo está. «Editar sesión» y «Cancelar sesión» para el anfitrión.
 */
export function SessionActionsZone({
  session,
  currentUserId,
  pending,
  rereading,
  message,
  savedNotice,
  formOpen,
  blocked,
  onJoin,
  onLeave,
  onEdit,
  onCancel,
  joinRef,
  leaveRef,
  editRef,
  cancelRef,
  messageRef,
}: SessionActionsZoneProps) {
  const actions = detailActions(session, currentUserId);
  const joinBlocked = actions.kind === 'join' && actions.blocked;

  return (
    <div className="session-detail__actions">
      {actions.kind === 'host' && !formOpen ? (
        <button
          key="edit"
          ref={editRef}
          type="button"
          className="btn"
          onClick={blocked ? undefined : onEdit}
          aria-disabled={blocked ? true : undefined}
        >
          <Icon as={Pencil} size={14} />
          {EDIT_SESSION_LABEL}
        </button>
      ) : null}

      {actions.kind === 'host' ? (
        <button
          key="cancel"
          ref={cancelRef}
          type="button"
          className="btn btn--danger"
          onClick={blocked ? undefined : onCancel}
          aria-disabled={blocked ? true : undefined}
        >
          <Icon as={Ban} size={14} />
          {CANCEL_SESSION_LABEL}
        </button>
      ) : null}

      {actions.kind === 'join' ? (
        <button
          key="join"
          ref={joinRef}
          type="button"
          className="btn btn--pen"
          onClick={joinBlocked || rereading ? undefined : onJoin}
          disabled={pending === 'join'}
          aria-disabled={joinBlocked || rereading ? true : undefined}
        >
          {pending === 'join' ? <span className="btn__spin" /> : <Icon as={UserPlus} size={14} />}
          {pending === 'join' ? SENDING_TEXT : joinBlocked ? NO_SLOTS_LABEL : JOIN_SESSION_LABEL}
        </button>
      ) : null}

      {actions.kind === 'leave' ? (
        <button
          key="leave"
          ref={leaveRef}
          type="button"
          className="btn"
          onClick={rereading ? undefined : onLeave}
          disabled={pending === 'leave'}
          aria-disabled={rereading ? true : undefined}
        >
          {pending === 'leave' ? <span className="btn__spin" /> : <Icon as={LogOut} size={14} />}
          {pending === 'leave' ? SENDING_TEXT : LEAVE_SESSION_LABEL}
        </button>
      ) : null}

      {savedNotice ? (
        <p className="notice" role="status">
          {SAVED_NOTICE_TEXT}
        </p>
      ) : null}

      {message ? (
        <p ref={messageRef} className="notice notice--error" role="alert" tabIndex={-1}>
          <Icon as={AlertCircle} size={15} />
          {message}
        </p>
      ) : null}
    </div>
  );
}
