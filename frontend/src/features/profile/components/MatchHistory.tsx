import type { MatchRecord } from '@/domain/types';
import { timeAgo } from '@/shared/utils/format';
import './matchHistory.css';

/** Resumen de las últimas partidas de una cuenta. */
export function MatchHistory({ matches }: { matches: MatchRecord[] }) {
  if (matches.length === 0) {
    return <p className="faint">Todavía no hemos registrado partidas recientes en esta cuenta.</p>;
  }

  return (
    <ul className="match-history">
      {matches.map((match) => (
        <li key={match.id} className={`match-history__item is-${match.result}`}>
          <span className="match-history__result">{match.result === 'win' ? 'V' : 'D'}</span>
          <div className="match-history__body">
            <span>{match.summary}</span>
            <span className="faint">
              {timeAgo(match.playedAt)} · {match.durationMinutes} min
            </span>
          </div>
          <span className={`match-history__delta${match.rankDelta >= 0 ? ' is-up' : ' is-down'}`}>
            {match.rankDelta >= 0 ? '+' : ''}
            {match.rankDelta}
          </span>
        </li>
      ))}
    </ul>
  );
}
