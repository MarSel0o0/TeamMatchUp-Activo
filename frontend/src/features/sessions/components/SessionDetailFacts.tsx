import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import { playerPath } from '@/app/routes';
import { detailRole, formatSessionRange, occupancy, openSlotCount } from '@/domain/sessionDetail';
import { getGame } from '@/domain/games';
import type { PlaySession } from '@/domain/types';
import { GameMark } from '@/shared/components/GameMark';
import { Monogram } from '@/shared/components/Monogram';
import { Stamp } from '@/shared/components/Stamp';
import {
  SESSION_FULL_TEXT,
  SESSION_HOST_TAG,
  SESSION_OPEN_SLOT_TEXT,
  SESSION_YOU_HOST_TEXT,
  SESSION_YOU_IN_TEXT,
  sessionOccupancyText,
} from '@/shared/utils/copy';
import './sessionSlip.css';

interface SessionDetailFactsProps {
  session: PlaySession;
  currentUserId: string;
  /** Destino de foco del título (`tabIndex={-1}`; RNF-2). */
  titleRef: Ref<HTMLHeadingElement>;
}

/**
 * Datos de la sesión de juego, solo lectura (spec 009, RF-3, RF-4, RF-18; plan 5.2). Todo el
 * contenido de otros usuarios va como texto de React, nunca como HTML (RNF-3).
 */
export function SessionDetailFacts({ session, currentUserId, titleRef }: SessionDetailFactsProps) {
  const role = detailRole(session, currentUserId);
  const { taken, total } = occupancy(session);
  const openSlots = openSlotCount(session);

  return (
    <>
      <header className="session-detail__head">
        <GameMark gameId={session.gameId} />
        <div className="session-detail__heading">
          <p className="note session-detail__game">{getGame(session.gameId).name}</p>
          <h1 ref={titleRef} className="doc-title session-detail__title" tabIndex={-1}>
            {session.title}
          </h1>
          <p className="note num">{formatSessionRange(session)}</p>
        </div>
      </header>

      <section className="sheet session-detail__sheet">
        {session.notes ? <p className="session__notes">{session.notes}</p> : null}

        <div className="session__meter" aria-hidden="true">
          {Array.from({ length: session.slots }, (_, index) => (
            <span key={index} data-on={index < session.participants.length || undefined} />
          ))}
        </div>

        <div className="session-detail__counts">
          <span className="note num">{sessionOccupancyText(taken, total)}</span>
          {session.status === 'full' ? <Stamp tone="sealed">{SESSION_FULL_TEXT}</Stamp> : null}
          {role === 'host' ? <Stamp tone="pen">{SESSION_YOU_HOST_TEXT}</Stamp> : null}
          {role === 'member' ? <Stamp tone="pen">{SESSION_YOU_IN_TEXT}</Stamp> : null}
        </div>

        <ul className="session__signatures">
          {session.participants.map((participant) => (
            <li key={participant.id}>
              <Monogram name={participant.displayName} color={participant.avatarColor} size="sm" />
              <span className="session__name">
                <Link to={playerPath(participant.id, session.gameId)}>
                  {participant.displayName}
                </Link>
              </span>
              {participant.id === session.hostId ? (
                <span className="session__host">{SESSION_HOST_TAG}</span>
              ) : null}
            </li>
          ))}
          {Array.from({ length: openSlots }, (_, index) => (
            <li key={`open-${index}`} className="session__open">
              <span className="session__open-line" />
              <span className="note note--faint">{SESSION_OPEN_SLOT_TEXT}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
