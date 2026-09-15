import { formatHour, WEEK_DAYS } from '@/domain/availability';
import { getGame } from '@/domain/games';
import type { PlaySession } from '@/domain/types';
import { Avatar } from '@/shared/components/Avatar';
import { GameBadge } from '@/shared/components/GameBadge';
import './sessionCard.css';

interface SessionCardProps {
  session: PlaySession;
  currentUserId: string;
  onJoin: (sessionId: string) => void;
  onLeave: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  busy?: boolean;
}

/** Detalle de una sesión publicada, con la acción que corresponde al usuario. */
export function SessionCard({
  session,
  currentUserId,
  onJoin,
  onLeave,
  onCancel,
  busy = false,
}: SessionCardProps) {
  const game = getGame(session.gameId);
  const isHost = session.hostId === currentUserId;
  const isParticipant = session.participants.some(
    (participant) => participant.id === currentUserId,
  );
  const isFull = session.participants.length >= session.slots;

  return (
    <article className="session-card" style={{ borderLeftColor: game.accent }}>
      <div className="row-between">
        <div className="stack-sm">
          <strong>{session.title}</strong>
          <span className="faint">
            {WEEK_DAYS[session.day].label} · {formatHour(session.startHour)}–
            {formatHour((session.startHour + session.durationHours) % 24)}
          </span>
        </div>
        <GameBadge gameId={session.gameId} />
      </div>

      {session.notes ? <p className="muted session-card__notes">{session.notes}</p> : null}

      <div className="row-between">
        <div className="session-card__participants">
          {session.participants.slice(0, 5).map((participant) => (
            <Avatar
              key={participant.id}
              name={participant.displayName}
              color={participant.avatarColor}
              size="sm"
              title={`${participant.displayName}${participant.id === session.hostId ? ' (organiza)' : ''}`}
            />
          ))}
          <span className="faint">
            {session.participants.length}/{session.slots} jugadores
          </span>
        </div>

        {isHost ? (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => onCancel(session.id)}
            disabled={busy}
          >
            Cancelar sesión
          </button>
        ) : isParticipant ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onLeave(session.id)}
            disabled={busy}
          >
            Salirme
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onJoin(session.id)}
            disabled={busy || isFull}
          >
            {isFull ? 'Sin cupos' : 'Sumarme'}
          </button>
        )}
      </div>

      <span className="faint">Organiza @{session.host.username}</span>
    </article>
  );
}
