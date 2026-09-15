import { CalendarPlus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { formatRange, groupBlocks } from '@/domain/availability';
import { formatRank, getGame } from '@/domain/games';
import { scoreLabel } from '@/domain/matching';
import type { MatchCandidate } from '@/domain/types';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Stamp } from '@/shared/components/Stamp';
import { pluralize, timeAgo } from '@/shared/utils/format';
import './matchEntry.css';

interface MatchEntryProps {
  candidate: MatchCandidate;
  /** Disponibilidad propia, para dibujar el traslape al desplegar el asiento. */
  viewerBlocks: string[];
  onPropose?: (candidate: MatchCandidate) => void;
  band?: boolean;
}

/**
 * Asiento de un jugador recomendado.
 *
 * Es una línea de la hoja, no una tarjeta: el ojo baja por la columna de afinidad
 * y compara, que es exactamente lo que el usuario vino a hacer.
 */
export function MatchEntry({ candidate, viewerBlocks, onPropose, band }: MatchEntryProps) {
  const [open, setOpen] = useState(false);
  const game = getGame(candidate.gameId);
  const ranges = groupBlocks(candidate.sharedBlocks);

  return (
    <article className="entry" data-band={band || undefined} data-open={open || undefined}>
      <div className="entry__line">
        <Monogram name={candidate.user.displayName} color={candidate.user.avatarColor} />

        <div className="entry__who">
          <strong>{candidate.user.displayName}</strong>
          <span className="note note--faint">
            @{candidate.user.username}
            {candidate.user.bio ? ` · ${candidate.user.bio}` : ''}
          </span>
        </div>

        <div className="entry__col">
          <span className="label entry__inline-label">Rango</span>
          <span className="num" style={{ color: game.accent }}>
            {formatRank(candidate.gameId, candidate.account.currentRank)}
          </span>
          <span className="note note--faint num">Δ {candidate.rankDistance} pts</span>
        </div>

        <div className="entry__col">
          <span className="label entry__inline-label">En común</span>
          <span className="num entry__hours">
            {pluralize(candidate.sharedBlocks.length, 'hora', 'horas')}
          </span>
          <span className="note note--faint">
            {ranges.length ? formatRange(ranges[0]) : 'sin traslape'}
          </span>
        </div>

        <div className="entry__score">
          <span className="entry__score-value num">{candidate.score}</span>
          <span className="label">{scoreLabel(candidate.score)}</span>
        </div>

        <div className="entry__actions">
          {onPropose ? (
            <button type="button" className="btn btn--sm" onClick={() => onPropose(candidate)}>
              <Icon as={CalendarPlus} size={13} />
              Proponer sesión
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--quiet btn--sm entry__toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <Icon as={ChevronDown} size={13} />
            {open ? 'Ocultar horas' : 'Ver horas'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="entry__detail">
          <div className="entry__stamps">
            {candidate.account.verified ? (
              <Stamp tone="sealed">Rango verificado</Stamp>
            ) : (
              <Stamp tone="warn">Rango sin verificar</Stamp>
            )}
            <span className="note note--faint">
              Leído {timeAgo(candidate.account.lastSyncedAt)} desde {game.source}
            </span>
          </div>

          <HoursSheet value={viewerBlocks} compareWith={candidate.sharedBlocks} readOnly compact />

          {ranges.length ? (
            <p className="note note--faint num">
              Tramos en común: {ranges.map((range) => formatRange(range)).join('   ·   ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
