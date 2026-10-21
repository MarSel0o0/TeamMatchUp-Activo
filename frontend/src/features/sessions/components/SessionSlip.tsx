import { Ban, LogOut, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { playerPath } from '@/app/routes';
import { formatHour, WEEK_DAYS } from '@/domain/availability';
import type { PlaySession } from '@/domain/types';
import { GameMark } from '@/shared/components/GameMark';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Stamp } from '@/shared/components/Stamp';
import { SENDING_TEXT } from '@/shared/utils/copy';
import './sessionSlip.css';

/** Escritura de la agenda sobre una sesión. */
export type SessionAction = 'join' | 'leave' | 'cancel';

interface SessionSlipProps {
  session: PlaySession;
  currentUserId: string;
  onJoin: (sessionId: string) => void;
  onLeave: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  /** Hay una escritura de la agenda en curso: todos los botones quedan deshabilitados. */
  busy?: boolean;
  /** Escritura en curso sobre esta sesión: su botón dice "Enviando…" (RF-20). */
  pendingAction?: SessionAction | null;
}

/**
 * Una sesión publicada, con sus jugadores y los cupos que quedan libres.
 *
 * La acción que se ofrece depende de dónde está el usuario en esa sesión: si la
 * organiza, si ya está anotado o si todavía puede sumarse.
 */
export function SessionSlip({
  session,
  currentUserId,
  onJoin,
  onLeave,
  onCancel,
  busy = false,
  pendingAction = null,
}: SessionSlipProps) {
  const isHost = session.hostId === currentUserId;
  const isSigned = session.participants.some((participant) => participant.id === currentUserId);
  const openSlots = Math.max(0, session.slots - session.participants.length);

  return (
    <article className="session">
      <header className="session__head">
        <div className="grow">
          <h3 className="sheet-title">{session.title}</h3>
          <p className="note num">
            {WEEK_DAYS[session.day].label} · {formatHour(session.startHour)}–
            {formatHour((session.startHour + session.durationHours) % 24)}
          </p>
        </div>
        <GameMark gameId={session.gameId} />
      </header>

      {session.notes ? <p className="session__notes">{session.notes}</p> : null}

      <div className="session__meter" aria-hidden="true">
        {Array.from({ length: session.slots }, (_, index) => (
          <span key={index} data-on={index < session.participants.length || undefined} />
        ))}
      </div>

      <ul className="session__signatures">
        {session.participants.map((participant, index) => (
          <li key={participant.id} style={{ animationDelay: `${index * 50}ms` }}>
            <Monogram name={participant.displayName} color={participant.avatarColor} size="sm" />
            <span className="session__name">
              <Link to={playerPath(participant.id, session.gameId)}>{participant.displayName}</Link>
            </span>
            {participant.id === session.hostId ? (
              <span className="session__host">organiza</span>
            ) : null}
          </li>
        ))}
        {Array.from({ length: openSlots }, (_, index) => (
          <li key={`open-${index}`} className="session__open">
            <span className="session__open-line" />
            <span className="note note--faint">cupo libre</span>
          </li>
        ))}
      </ul>

      <footer className="session__foot">
        {isSigned ? (
          <Stamp tone="pen" pressKey={`${session.id}-${session.participants.length}`} announce>
            {isHost ? 'La organizas' : 'Estás dentro'}
          </Stamp>
        ) : openSlots === 0 ? (
          <Stamp tone="sealed" pressKey={session.participants.length}>
            Cupos llenos
          </Stamp>
        ) : (
          <span className="note note--faint num">
            {session.participants.length}/{session.slots} jugadores
          </span>
        )}

        {isHost ? (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => onCancel(session.id)}
            disabled={busy}
          >
            {pendingAction === 'cancel' ? <span className="btn__spin" /> : <Icon as={Ban} size={13} />}
            {pendingAction === 'cancel' ? SENDING_TEXT : 'Cancelar sesión'}
          </button>
        ) : isSigned ? (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onLeave(session.id)}
            disabled={busy}
          >
            {pendingAction === 'leave' ? <span className="btn__spin" /> : <Icon as={LogOut} size={13} />}
            {pendingAction === 'leave' ? SENDING_TEXT : 'Salir'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--pen btn--sm"
            onClick={() => onJoin(session.id)}
            disabled={busy || openSlots === 0}
          >
            {pendingAction === 'join' ? <span className="btn__spin" /> : <Icon as={UserPlus} size={13} />}
            {pendingAction === 'join' ? SENDING_TEXT : openSlots === 0 ? 'Sin cupos' : 'Unirme'}
          </button>
        )}
      </footer>
    </article>
  );
}
