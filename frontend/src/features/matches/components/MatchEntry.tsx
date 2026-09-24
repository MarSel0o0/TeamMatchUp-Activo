import { CalendarPlus, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useState } from 'react';
import { formatRange, groupBlocks } from '@/domain/availability';
import { formatRank, getGame } from '@/domain/games';
import { scoreLabel } from '@/domain/matching';
import type { MatchCandidate } from '@/domain/types';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Stamp } from '@/shared/components/Stamp';
import { CountUp } from '@/shared/motion/CountUp';
import { EASE_OUT, EASE_FLUID } from '@/shared/motion/presets';
import { pluralize, timeAgo } from '@/shared/utils/format';
import './matchEntry.css';

interface MatchEntryProps {
  candidate: MatchCandidate;
  /** Disponibilidad propia, para dibujar el traslape al desplegar la fila. */
  viewerBlocks: string[];
  onPropose?: (candidate: MatchCandidate) => void;
}

/**
 * Fila de un jugador recomendado.
 *
 * Es una fila, no una tarjeta: el ojo baja por la columna de afinidad y compara,
 * que es exactamente lo que el usuario vino a hacer. Al filtrar, las filas se
 * reacomodan deslizándose a su nueva posición en vez de saltar.
 */
export const MatchEntry = forwardRef<HTMLElement, MatchEntryProps>(function MatchEntry(
  { candidate, viewerBlocks, onPropose },
  ref,
) {
  const [open, setOpen] = useState(false);
  const game = getGame(candidate.gameId);
  const ranges = groupBlocks(candidate.sharedBlocks);

  return (
    <motion.article
      ref={ref}
      className="entry"
      data-open={open || undefined}
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
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
          <span className="entry__rank" style={{ color: game.accent }}>
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

        <ScoreRing score={candidate.score} label={scoreLabel(candidate.score)} />

        <div className="entry__actions">
          {onPropose ? (
            <button type="button" className="btn btn--pen btn--sm" onClick={() => onPropose(candidate)}>
              <Icon as={CalendarPlus} size={13} />
              Proponer
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--sm entry__toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Ocultar horas' : 'Ver horas en común'}
          >
            <Icon as={ChevronDown} size={14} />
            <span className="entry__toggle-text">{open ? 'Ocultar' : 'Horas'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="entry__drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_FLUID }}
          >
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

              {ranges.length ? (
                <ul className="entry__overlap">
                  {ranges.map((range) => (
                    <li key={`${range.day}-${range.startHour}`} className="num">
                      {formatRange(range)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note note--faint">Sin horas en común esta semana.</p>
              )}

              <HoursSheet value={viewerBlocks} compareWith={candidate.sharedBlocks} readOnly compact />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
});

/** Afinidad como anillo que se llena: la columna que el ojo recorre para comparar. */
function ScoreRing({ score, label }: { score: number; label: string }) {
  const tone = score >= 75 ? 'var(--volt)' : score >= 50 ? 'var(--ink)' : 'var(--ink-3)';

  return (
    <div className="entry__score" title={`Afinidad ${score} de 100: ${label}`}>
      <svg viewBox="0 0 44 44" className="entry__ring" aria-hidden="true">
        <circle cx="22" cy="22" r="18" className="entry__ring-track" />
        <motion.circle
          cx="22"
          cy="22"
          r="18"
          className="entry__ring-value"
          style={{ stroke: tone }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.1 }}
        />
      </svg>
      <CountUp value={score} className="entry__score-value" />
      <span className="entry__score-label">{label}</span>
    </div>
  );
}
