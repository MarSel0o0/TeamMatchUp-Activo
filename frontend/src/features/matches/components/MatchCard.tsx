import { useState } from 'react';
import { formatRange, groupBlocks } from '@/domain/availability';
import { formatRank, getGame } from '@/domain/games';
import { scoreLabel } from '@/domain/matching';
import type { MatchCandidate } from '@/domain/types';
import { Avatar } from '@/shared/components/Avatar';
import { AvailabilityGrid } from '@/shared/components/AvailabilityGrid';
import { pluralize, timeAgo } from '@/shared/utils/format';
import './matchCard.css';

interface MatchCardProps {
  candidate: MatchCandidate;
  /** Disponibilidad propia, para dibujar el traslape al desplegar la tarjeta. */
  viewerBlocks: string[];
  onInvite?: (candidate: MatchCandidate) => void;
}

/** Tarjeta de un jugador recomendado. */
export function MatchCard({ candidate, viewerBlocks, onInvite }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const game = getGame(candidate.gameId);
  const label = scoreLabel(candidate.score);

  return (
    <article className="match-card">
      <header className="match-card__header">
        <Avatar name={candidate.user.displayName} color={candidate.user.avatarColor} />
        <div className="match-card__identity">
          <strong>{candidate.user.displayName}</strong>
          <span className="faint">@{candidate.user.username}</span>
        </div>

        <div className="match-card__score" title={`Puntaje de compatibilidad: ${candidate.score}/100`}>
          <span className="match-card__score-value">{candidate.score}</span>
          <span className="faint">{label}</span>
        </div>
      </header>

      <div className="match-card__meta">
        <span className="badge" style={{ background: `${game.accent}22`, color: game.accent, borderColor: 'transparent' }}>
          {formatRank(candidate.gameId, candidate.account.currentRank)}
        </span>
        <span className="badge">Δ rango {candidate.rankDistance} pts</span>
        <span className="badge badge--success">
          {pluralize(candidate.sharedBlocks.length, 'hora en común', 'horas en común')}
        </span>
        {candidate.account.verified ? (
          <span className="badge badge--primary">Verificado</span>
        ) : (
          <span className="badge badge--warning">Sin verificar</span>
        )}
      </div>

      {candidate.user.bio ? <p className="muted match-card__bio">{candidate.user.bio}</p> : null}

      <div className="match-card__ranges">
        {groupBlocks(candidate.sharedBlocks)
          .slice(0, 4)
          .map((range) => (
            <span key={`${range.day}-${range.startHour}`} className="badge">
              {formatRange(range)}
            </span>
          ))}
        {groupBlocks(candidate.sharedBlocks).length > 4 ? (
          <span className="faint">+{groupBlocks(candidate.sharedBlocks).length - 4} más</span>
        ) : null}
      </div>

      <footer className="match-card__footer">
        <span className="faint">Rango leído {timeAgo(candidate.account.lastSyncedAt)}</span>
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            {expanded ? 'Ocultar horarios' : 'Ver horarios'}
          </button>
          {onInvite ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onInvite(candidate)}>
              Proponer sesión
            </button>
          ) : null}
        </div>
      </footer>

      {expanded ? (
        <div className="match-card__grid">
          <AvailabilityGrid value={viewerBlocks} compareWith={candidate.sharedBlocks} readOnly />
        </div>
      ) : null}
    </article>
  );
}
