import { AlertCircle } from 'lucide-react';
import { formatRank } from '@/domain/games';
import { LEETIFY_NO_HISTORY_TEXT, isLeetifyRank } from '@/domain/premierDisplay';
import { showsLeetifyMatches } from '@/domain/leetifyMatches';
import { showModeTabs } from '@/domain/matchModes';
import { isBlockPending } from '@/domain/riotDisplay';
import type { SteamProfileOwner } from '@/features/steam/components/SteamProfileBlock';
import { readNormalized, readWinRate } from '@/domain/playerSheet';
import type { RankSnapshot } from '@/domain/types';
import type { GameProfileSummary } from '@/services/api';
import { Icon } from '@/shared/components/Icon';
import { Notice } from '@/shared/components/Notice';
import { OriginTag } from '@/shared/components/OriginTag';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { RankScale } from '@/shared/components/RankScale';
import { CountUp } from '@/shared/motion/CountUp';
import {
  FIRST_READING_LABEL,
  NO_DATA_TEXT,
  READINGS_UNIT,
  RECENT_MATCHES_TITLE,
  RIOT_PENDING_LABEL,
  RIOT_UNRANKED_LABEL,
  SCALE_POSITION_LABEL,
  WIN_RATE_SUFFIX,
} from '@/shared/utils/copy';
import { pluralize } from '@/shared/utils/format';
import { AccountRow } from './AccountRow';
import { LeetifyMatchList } from './LeetifyMatchList';
import { MatchLedger } from './MatchLedger';
import { ModeMatchLedger } from './ModeMatchLedger';

interface GameSummaryPanelProps {
  summary: GameProfileSummary;
  /** Sin `onSync` el panel no tiene acciones (ficha de otro jugador; spec 008, RF-4). */
  onSync?: (accountId: string) => void;
  /** La cuenta se está resincronizando (RF-20 de la 007). */
  syncing?: boolean;
  /** Error de la última resincronización; solo se muestra si hay `onSync`. */
  syncError?: unknown;
  /** Aviso tras una resincronización parcial con Riot (spec 014, RF-53); solo si hay `onSync`. */
  syncNotice?: string | undefined;
  /** Etiqueta de formato junto al identificador (spec 008, RF-4). */
  showHandleLabel?: boolean;
  /** Ofrece «Verificar con Steam» en la cuenta de CS2 sin verificar (spec 013, RF-2): solo el perfil propio. */
  offerSteamVerify?: boolean;
  /** Ofrece «Verificar con Riot Games» en la cuenta de LoL sin verificar (spec 014, RF-39): solo el perfil propio. */
  offerRiotVerify?: boolean;
  /** Dueño de la cuenta (spec 013, RF-19): su avatar de TeamMatchUp es el respaldo del de Steam. */
  owner?: SteamProfileOwner;
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
  syncNotice,
  showHandleLabel = false,
  offerSteamVerify = false,
  offerRiotVerify = false,
  owner,
}: GameSummaryPanelProps) {
  // En cuentas verificadas con Riot el rango y las partidas pueden quedar pendientes (RF-27) o la
  // cuenta puede estar sin clasificar (RF-13); en el resto, falta defensiva → «Sin datos» (007 RF-14).
  const currentRank: RankSnapshot | null | undefined = summary.account.currentRank;
  const firstRank: RankSnapshot | undefined = summary.account.rankHistory[0];
  const rankPending = isBlockPending(summary.account, 'rank');
  const matchesPending = isBlockPending(summary.account, 'matches');
  const riotUnranked = summary.account.verifiedWith === 'riot' && !rankPending && currentRank == null;
  // Sin un normalizado finito no se dibuja la escala ni se llama a `rankGainSinceFirst`, que
  // `RankScale` usa con el rango vigente (spec 008, RF-17; P52).
  const hasRank = !rankPending && currentRank != null && readNormalized(summary.account) !== null;
  const winRate = readWinRate(summary);
  // Rango de Leetify (CS2 con Steam): nunca hay historial ni se muestra la posición en la escala,
  // así que la sección lleva solo el texto de RF-12; el texto de estado y la atribución ya van en
  // `AccountRow` (spec 015, RF-6, RF-7, RF-8, RF-12, D31).
  const fromLeetify = isLeetifyRank(summary.account.origins.rank);
  // Partidas de Leetify (CS2 con Steam): en vivo y sin tasa de victorias (spec 019, RF-2, RF-4).
  const leetifyMatches = showsLeetifyMatches(summary.account.origins.matches);

  return (
    <div className="ficha__game">
      <div>
        {onSync ? <MutationNotice error={syncError} padded /> : null}
        {onSync && syncNotice ? (
          <div className="sheet__body">
            <Notice tone="pen" role="status">
              <Icon as={AlertCircle} size={15} />
              {syncNotice}
            </Notice>
          </div>
        ) : null}
        <AccountRow
          account={summary.account}
          onSync={onSync}
          syncing={syncing}
          showHandleLabel={showHandleLabel}
          offerSteamVerify={offerSteamVerify}
          offerRiotVerify={offerRiotVerify}
          owner={owner}
        />

        <div className="ficha__scale">
          {/* Con Leetify, ni lecturas que contar ni posición en la escala: solo el texto (RF-12, D31). */}
          {fromLeetify ? (
            <p className="note note--faint">{LEETIFY_NO_HISTORY_TEXT}</p>
          ) : (
            <>
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
                  {' · '}
                  <OriginTag origin={summary.account.origins.rank} />
                </span>
              </div>
              {rankPending ? (
                <p className="note note--faint">{RIOT_PENDING_LABEL}</p>
              ) : riotUnranked ? (
                <p className="note note--faint">{RIOT_UNRANKED_LABEL}</p>
              ) : hasRank ? (
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
            </>
          )}
        </div>
      </div>

      <div className="ficha__matches">
        <div className="line-between">
          <h3 className="sheet-title">{RECENT_MATCHES_TITLE}</h3>
          {/* Con partidas de Leetify no hay tasa de victorias (spec 019, RF-4, D2). */}
          {!matchesPending && !leetifyMatches ? (
            <span className="ficha__winrate">
              {winRate !== null ? (
                <>
                  <CountUp value={winRate} suffix="%" />{` ${WIN_RATE_SUFFIX}`}
                </>
              ) : (
                NO_DATA_TEXT
              )}
            </span>
          ) : null}
        </div>
        {leetifyMatches ? (
          // Spec 019 (RF-1, RF-2, RF-10): se piden en vivo; el resto del panel no las espera.
          <LeetifyMatchList
            ownerId={summary.account.userId}
            gameId={summary.account.gameId}
            handle={summary.account.handle}
          />
        ) : !matchesPending && showModeTabs(summary.account.origins.matches, summary.recentMatches) ? (
          // Spec 020 (RF-5, RF-6): LoL con datos de Riot, por modo; `key` por cuenta reinicia la pestaña al cambiar de
          // cuenta o de juego (RF-6). Simuladas, CS2, R6, pendiente y vacío siguen con la lista de siempre (RF-16, RF-17).
          <ModeMatchLedger
            key={summary.account.id}
            matches={summary.recentMatches}
            origin={summary.account.origins.matches}
          />
        ) : (
          <MatchLedger
            matches={summary.recentMatches}
            origin={summary.account.origins.matches}
            pending={matchesPending}
          />
        )}
      </div>
    </div>
  );
}
