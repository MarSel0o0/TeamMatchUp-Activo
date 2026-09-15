import { Ban, LogOut, UserPlus } from 'lucide-react';
import { formatHour, WEEK_DAYS } from '@/domain/availability';
import type { PlaySession } from '@/domain/types';
import { GameMark } from '@/shared/components/GameMark';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Stamp } from '@/shared/components/Stamp';
import './sessionSlip.css';

interface SessionSlipProps {
  session: PlaySession;
  currentUserId: string;
  onJoin: (sessionId: string) => void;
  onLeave: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  busy?: boolean;
}

/**
 * Una sesión publicada, con sus firmas y los cupos que quedan en blanco.
 *
 * La acción que se ofrece depende de dónde está el usuario en esa hoja: si la
 * organiza, si ya firmó o si todavía puede anotarse.
 */
export function SessionSlip({
  session,
  currentUserId,
  onJoin,
  onLeave,
  onCancel,
  busy = false,
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

      <ul className="session__signatures">
        {session.participants.map((participant) => (
          <li key={participant.id}>
            <Monogram name={participant.displayName} color={participant.avatarColor} size="sm" />
            <span className="session__name">
              {participant.displayName}
              {participant.id === session.hostId ? ' · organiza' : ''}
            </span>
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
        {openSlots === 0 ? (
          <Stamp tone="sealed" pressKey={session.participants.length}>
            Cupos llenos
          </Stamp>
        ) : (
          <span className="note note--faint num">
            {session.participants.length}/{session.slots} firmados
          </span>
        )}

        {isHost ? (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => onCancel(session.id)}
            disabled={busy}
          >
            <Icon as={Ban} size={13} />
            Cancelar sesión
          </button>
        ) : isSigned ? (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onLeave(session.id)}
            disabled={busy}
          >
            <Icon as={LogOut} size={13} />
            Borrar mi firma
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--pen btn--sm"
            onClick={() => onJoin(session.id)}
            disabled={busy || openSlots === 0}
          >
            <Icon as={UserPlus} size={13} />
            {openSlots === 0 ? 'Sin cupos' : 'Firmar'}
          </button>
        )}
      </footer>
    </article>
  );
}
