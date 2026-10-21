import { formatRange } from '@/domain/availability';
import { sharedHours } from '@/domain/playerSheet';
import type { TimeBlock } from '@/domain/types';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Failure, SheetSkeleton } from '@/shared/components/States';
import {
  HOUR_UNIT,
  NO_SHARED_HOURS_TEXT,
  SHARED_HOURS_SUFFIX,
  SHARED_HOURS_TITLE,
  ZONES_DIFFER_NOTE,
} from '@/shared/utils/copy';
import { pluralize } from '@/shared/utils/format';
import type { SheetLoadable } from '../hooks';

const TITLE_ID = 'player-hours-title';

interface SharedHoursBlockProps {
  /** Horas del usuario de la sesión (consulta propia de la ficha). */
  mine: SheetLoadable<TimeBlock[]>;
  mineError: unknown;
  onRetryMine: () => void;
  /** Horas del jugador de la ficha. */
  theirs: SheetLoadable<TimeBlock[]>;
  theirsError: unknown;
  onRetryTheirs: () => void;
  /** RF-22: zonas horarias distintas tal como están guardadas (`zonesDiffer`). */
  zonesDiffer: boolean;
}

/**
 * Horas en común del bloque de cruce (spec 008, RF-6, RF-8, RF-18, RF-22, RNF-5; plan 4.2 (3)).
 * - Total con `pluralize` y lista de tramos con `groupBlocks` + `formatRange` (vía
 *   `sharedHours`), como la fila de coincidencias (Pregunta 6, P53); sin tramos, el texto de
 *   coincidencias desde `copy.ts` (Pregunta 7, P59).
 * - Grilla `HoursSheet` de solo lectura con las horas propias y los bloques en común
 *   destacados, dentro de un recuadro con desplazamiento horizontal propio (RNF-5).
 * - La nota de RF-22 no depende de las disponibilidades: sale de las zonas de los dos usuarios.
 * - Carga mientras llega cualquiera de las dos disponibilidades; un `Failure` con
 *   "Reintentar" por cada una que falla, que repite solo esa petición (RF-18).
 */
export function SharedHoursBlock({
  mine,
  mineError,
  onRetryMine,
  theirs,
  theirsError,
  onRetryTheirs,
  zonesDiffer,
}: SharedHoursBlockProps) {
  const loading = mine.state === 'loading' || theirs.state === 'loading';

  return (
    <div className="player-hours stack-sm" role="group" aria-labelledby={TITLE_ID}>
      <h3 id={TITLE_ID} className="label">
        {SHARED_HOURS_TITLE}
      </h3>
      {zonesDiffer ? <p className="notice">{ZONES_DIFFER_NOTE}</p> : null}
      {mine.state === 'failed' ? <Failure error={mineError} onRetry={onRetryMine} /> : null}
      {theirs.state === 'failed' ? <Failure error={theirsError} onRetry={onRetryTheirs} /> : null}
      {loading ? (
        <div aria-busy="true">
          <SheetSkeleton rows={2} height={40} />
        </div>
      ) : mine.state === 'ready' && theirs.state === 'ready' ? (
        <SharedHoursContent mine={mine.value} theirs={theirs.value} />
      ) : null}
    </div>
  );
}

function SharedHoursContent({ mine, theirs }: { mine: TimeBlock[]; theirs: TimeBlock[] }) {
  const shared = sharedHours(mine, theirs);

  return (
    <>
      <p className="player-hours__total">
        <strong className="num">{pluralize(shared.total, HOUR_UNIT.one, HOUR_UNIT.other)}</strong>
        {` ${SHARED_HOURS_SUFFIX}`}
      </p>
      {shared.ranges.length ? (
        <ul className="ficha__ranges">
          {shared.ranges.map((range) => (
            <li key={`${range.day}-${range.startHour}`} className="num">
              {formatRange(range)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="note player-hours__empty">{NO_SHARED_HOURS_TEXT}</p>
      )}
      <div className="player-grid">
        <HoursSheet value={mine} compareWith={shared.blocks} readOnly />
      </div>
    </>
  );
}
