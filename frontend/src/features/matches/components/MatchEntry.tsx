import { CalendarPlus, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { playerPath } from '@/app/routes';
import { formatRange, groupBlocks } from '@/domain/availability';
import { formatRank, getGame } from '@/domain/games';
import { scoreLabel } from '@/domain/matching';
import { blockReason, buildProposal, type Proposal } from '@/domain/proposal';
import type { MatchCandidate, RankSnapshot } from '@/domain/types';
import { useAvailabilityOf } from '@/features/profile/hooks';
import { DemoTag } from '@/shared/components/DemoTag';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Stamp } from '@/shared/components/Stamp';
import { CountUp } from '@/shared/motion/CountUp';
import { EASE_OUT, EASE_FLUID } from '@/shared/motion/presets';
import {
  HOUR_UNIT,
  NO_DATA_TEXT,
  NO_SHARED_HOURS_TEXT,
  PROPOSAL_BLOCK_REASONS,
  rankDistanceText,
} from '@/shared/utils/copy';
import { pluralize, timeAgo } from '@/shared/utils/format';
import './matchEntry.css';

interface MatchEntryProps {
  candidate: MatchCandidate;
  /** Disponibilidad propia, para dibujar el traslape al desplegar la fila. */
  viewerBlocks: string[];
  /** La disponibilidad propia ya llegó; mientras no, "Proponer" no puede decidir su motivo. */
  viewerLoaded: boolean;
  /** Recibe la propuesta ya calculada (RF-29); la página navega a la agenda. */
  onPropose?: (proposal: Proposal) => void;
}

/**
 * Fila de un jugador recomendado.
 *
 * Es una fila, no una tarjeta: el ojo baja por la columna de afinidad y compara,
 * que es exactamente lo que el usuario vino a hacer. Al filtrar, las filas se
 * reacomodan deslizándose a su nueva posición en vez de saltar.
 */
export const MatchEntry = forwardRef<HTMLElement, MatchEntryProps>(function MatchEntry(
  { candidate, viewerBlocks, viewerLoaded, onPropose },
  ref,
) {
  const [open, setOpen] = useState(false);
  // "Proponer" (RF-29): las horas del candidato salen de su disponibilidad, no del cruce, para
  // distinguir "no ha marcado horas" de "no tienen horas en común". Hasta que llegan las dos
  // disponibilidades (o si alguna falla) el botón queda deshabilitado sin inventar un motivo.
  const theirsQuery = useAvailabilityOf(candidate.user.id);
  const theirs = theirsQuery.data;
  const reason = viewerLoaded && theirs !== undefined ? blockReason(viewerBlocks, theirs) : null;
  const proposal =
    viewerLoaded && theirs !== undefined
      ? buildProposal({
          gameId: candidate.gameId,
          displayName: candidate.user.displayName,
          mine: viewerBlocks,
          theirs,
        })
      : null;
  const reasonId = `propose-reason-${candidate.account.id}`;
  const game = getGame(candidate.gameId);
  const ranges = groupBlocks(candidate.sharedBlocks);
  // Defensivo (RF-14): el servidor no entrega cuentas sin rango, pero si llegara una no se
  // muestra ni se calcula ninguna distancia con él.
  const rank: RankSnapshot | null | undefined = candidate.account.currentRank;
  const simulated = candidate.account.simulated;

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
          <strong>
            <Link to={playerPath(candidate.user.id, candidate.gameId)}>{candidate.user.displayName}</Link>
          </strong>
          <span className="note note--faint">
            @{candidate.user.username}
            {candidate.user.bio ? ` · ${candidate.user.bio}` : ''}
          </span>
        </div>

        <div className="entry__col">
          <span className="label entry__inline-label">Rango</span>
          {rank ? (
            <>
              <span className="entry__rank" style={{ color: game.accent }}>
                {formatRank(candidate.gameId, rank)}
              </span>
              <span className="note note--faint num">{rankDistanceText(candidate.rankDistance)}</span>
              {simulated ? <DemoTag className="entry__demo" /> : null}
            </>
          ) : (
            <span className="note note--faint">{NO_DATA_TEXT}</span>
          )}
        </div>

        <div className="entry__col">
          <span className="label entry__inline-label">En común</span>
          <span className="num entry__hours">
            {pluralize(candidate.sharedBlocks.length, HOUR_UNIT.one, HOUR_UNIT.other)}
          </span>
          <span className="note note--faint">
            {ranges.length ? formatRange(ranges[0]) : 'sin traslape'}
          </span>
        </div>

        {rank ? (
          <ScoreRing
            score={candidate.score}
            label={scoreLabel(candidate.score)}
            simulated={simulated}
          />
        ) : (
          <span className="note note--faint">{NO_DATA_TEXT}</span>
        )}

        <div className="entry__actions">
          {onPropose ? (
            <button
              type="button"
              className="btn btn--pen btn--sm entry__propose"
              aria-disabled={proposal === null ? true : undefined}
              aria-describedby={reason !== null ? reasonId : undefined}
              onClick={() => {
                if (proposal !== null) onPropose(proposal);
              }}
            >
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

        {reason !== null ? (
          <span id={reasonId} className="note note--faint entry__reason">
            {PROPOSAL_BLOCK_REASONS[reason]}
          </span>
        ) : null}
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
                  <Stamp tone="sealed">Verificada</Stamp>
                ) : (
                  <Stamp tone="warn">Sin verificar</Stamp>
                )}
                {simulated ? <DemoTag className="entry__demo" /> : null}
                <span className="note note--faint">
                  Última lectura {timeAgo(candidate.account.lastSyncedAt)}
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
                <p className="note note--faint">{NO_SHARED_HOURS_TEXT}</p>
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
function ScoreRing({
  score,
  label,
  simulated,
}: {
  score: number;
  label: string;
  simulated: boolean;
}) {
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
      {simulated ? <DemoTag className="entry__demo" /> : null}
    </div>
  );
}
