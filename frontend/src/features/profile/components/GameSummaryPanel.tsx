import { formatRank } from '@/domain/games';
import { readNormalized, readWinRate } from '@/domain/playerSheet';
import type { RankSnapshot } from '@/domain/types';
import type { GameProfileSummary } from '@/services/api';
import { DemoTag } from '@/shared/components/DemoTag';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { RankScale } from '@/shared/components/RankScale';
import { CountUp } from '@/shared/motion/CountUp';
import {
  FIRST_READING_LABEL,
  NO_DATA_TEXT,
  READINGS_UNIT,
  RECENT_MATCHES_TITLE,
  SCALE_POSITION_LABEL,
  WIN_RATE_SUFFIX,
} from '@/shared/utils/copy';
import { pluralize } from '@/shared/utils/format';
import { AccountRow } from './AccountRow';
import { MatchLedger } from './MatchLedger';

interface GameSummaryPanelProps {
  summary: GameProfileSummary;
  /** Sin `onSync` el panel no tiene acciones (ficha de otro jugador; spec 008, RF-4). */
  onSync?: (accountId: string) => void;
  /** La cuenta se está resincronizando (RF-20 de la 007). */
  syncing?: boolean;
  /** Error de la última resincronización; solo se muestra si hay `onSync`. */
  syncError?: unknown;
  /** Etiqueta de formato junto al identificador (spec 008, RF-4). */
  showHandleLabel?: boolean;
}

/**
 * Panel de un juego: cuenta, posición en la escala con la primera lectura y la diferencia
 * desde ella, y últimas partidas con la tasa de victorias. Lo comparten el perfil y la ficha
 * de jugador (spec 008, RF-4, RF-16, RF-17, RF-27; plan 4.2), con la Etiqueta de datos
 * simulados en los mismos sitios que la 007 la pone en el perfil.
 */
export function GameSummaryPanel({
  summary,
  onSync,
  syncing = false,
  syncError,
  showHandleLabel = false,
}: GameSummaryPanelProps) {
  // Defensivo (RF-14): el servidor no entrega cuentas sin rango ni sin tasa de victorias, pero si
  // llegara una no se muestra ni se calcula ningún valor derivado: aparece "Sin datos".
  const currentRank: RankSnapshot | null | undefined = summary.account.currentRank;
  const firstRank: RankSnapshot | undefined = summary.account.rankHistory[0];
  // Sin un normalizado finito no se dibuja la escala ni se llama a `rankGainSinceFirst`, que
  // `RankScale` usa con el rango vigente (spec 008, RF-17; P52).
  const hasRank = currentRank != null && readNormalized(summary.account) !== null;
  const winRate = readWinRate(summary);

  return (
    <div className="ficha__game">
      <div>
        {onSync ? <MutationNotice error={syncError} padded /> : null}
        <AccountRow
          account={summary.account}
          onSync={onSync}
          syncing={syncing}
          showHandleLabel={showHandleLabel}
        />

        <div className="ficha__scale">
          <div className="line-between">
            <span className="label">{SCALE_POSITION_LABEL}</span>
            <span>
              <span className="note note--faint">
                {pluralize(
                  summary.account.rankHistory.length,
                  READINGS_UNIT.one,
                  READINGS_UNIT.other,
                )}
              </span>
              {summary.account.simulated ? (
                <>
                  {' · '}
                  <DemoTag />
                </>
              ) : null}
            </span>
          </div>
          {hasRank ? (
            <>
              <RankScale
                gameId={summary.account.gameId}
                history={summary.account.rankHistory}
                current={currentRank}
              />
              <p className="note note--faint">
                {FIRST_READING_LABEL}{' '}
                {firstRank ? formatRank(summary.account.gameId, firstRank) : NO_DATA_TEXT}
              </p>
            </>
          ) : (
            <p className="note note--faint">{NO_DATA_TEXT}</p>
          )}
        </div>
      </div>

      <div className="ficha__matches">
        <div className="line-between">
          <h3 className="sheet-title">{RECENT_MATCHES_TITLE}</h3>
          <span className="ficha__winrate">
            {winRate !== null ? (
              <>
                <CountUp value={winRate} suffix="%" />{` ${WIN_RATE_SUFFIX}`}
              </>
            ) : (
              NO_DATA_TEXT
            )}
          </span>
        </div>
        <MatchLedger matches={summary.recentMatches} simulated={summary.account.simulated} />
      </div>
    </div>
  );
}
