import { Gamepad2 } from 'lucide-react';
import { playerTabs } from '@/domain/playerSheet';
import type { GameAccount, GameId } from '@/domain/types';
import { GameSummaryPanel } from '@/features/profile/components/GameSummaryPanel';
import type { GameProfileSummary } from '@/services/api';
import { GameTabs } from '@/shared/components/GameTabs';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import {
  PLAYER_GAMES_TABS_LABEL,
  PLAYER_GAMES_TITLE,
  PLAYER_NO_GAMES_TEXT,
} from '@/shared/utils/copy';
import type { SheetLoadable } from '../hooks';

/** Ids fijos del patrón de pestañas: solo hay una sección de juegos por página (plan 4.3). */
const TABS_ID_BASE = 'player-games';
const PANEL_ID = 'player-games-panel';
const TITLE_ID = 'player-games-title';

interface PlayerGamesSectionProps {
  accounts: SheetLoadable<GameAccount[]>;
  /** Error de la consulta de cuentas, para el mensaje de `Failure` (007 RF-9). */
  accountsError: unknown;
  onRetryAccounts: () => void;
  /** Pestaña vigente (`usePlayerTab`); `null` mientras las cuentas no están listas o sin cuentas. */
  tab: GameId | null;
  onSelectTab: (gameId: GameId) => void;
  summary: SheetLoadable<GameProfileSummary>;
  summaryError: unknown;
  onRetrySummary: () => void;
  /** RF-19: se vuelven a pedir usuario y cuentas; el panel muestra carga (RF-8). */
  rechecking: boolean;
}

/**
 * Sección de juegos de la ficha (spec 008, RF-4, RF-5, RF-8, RF-10, RF-16 a RF-19, RF-27;
 * plan 4.2.2).
 * - Cuentas cargando → esqueleto en toda la sección; con error → `Failure` cuyo "Reintentar"
 *   repite solo las cuentas (RF-18).
 * - Sin cuentas → "Este jugador no ha vinculado ningún juego" en lugar de pestañas y panel
 *   (RF-10).
 * - Con cuentas → pestañas accesibles en el orden LoL, R6, CS2 y el panel del juego elegido,
 *   sin acciones y con la etiqueta del identificador. El panel muestra carga mientras llega el
 *   resumen o durante RF-19, y su error (incluido el 404 que queda tras RF-19, Pregunta 3) con
 *   un "Reintentar" que repite solo el resumen.
 */
export function PlayerGamesSection({
  accounts,
  accountsError,
  onRetryAccounts,
  tab,
  onSelectTab,
  summary,
  summaryError,
  onRetrySummary,
  rechecking,
}: PlayerGamesSectionProps) {
  return (
    <section className="sheet" aria-labelledby={TITLE_ID}>
      <div className="sheet__head">
        <h2 id={TITLE_ID} className="sheet-title grow">
          {PLAYER_GAMES_TITLE}
        </h2>
      </div>
      <GamesBody
        accounts={accounts}
        accountsError={accountsError}
        onRetryAccounts={onRetryAccounts}
        tab={tab}
        onSelectTab={onSelectTab}
        summary={summary}
        summaryError={summaryError}
        onRetrySummary={onRetrySummary}
        rechecking={rechecking}
      />
    </section>
  );
}

function GamesBody({
  accounts,
  accountsError,
  onRetryAccounts,
  tab,
  onSelectTab,
  summary,
  summaryError,
  onRetrySummary,
  rechecking,
}: PlayerGamesSectionProps) {
  if (accounts.state === 'loading') {
    return (
      <div className="sheet__body" aria-busy="true">
        <SheetSkeleton rows={3} height={56} />
      </div>
    );
  }
  if (accounts.state === 'failed') {
    return <Failure error={accountsError} onRetry={onRetryAccounts} />;
  }

  const tabs = playerTabs(accounts.value);
  if (tabs.length === 0 || tab === null) {
    return <Blank icon={Gamepad2} title={PLAYER_NO_GAMES_TEXT} />;
  }

  return (
    <>
      <div className="ficha__tabs">
        <GameTabs
          games={tabs}
          value={tab}
          onChange={onSelectTab}
          label={PLAYER_GAMES_TABS_LABEL}
          idBase={TABS_ID_BASE}
          panelId={PANEL_ID}
        />
      </div>
      <div
        role="tabpanel"
        id={PANEL_ID}
        aria-labelledby={`${TABS_ID_BASE}-tab-${tab}`}
        tabIndex={0}
        className="player-panel"
      >
        {rechecking || summary.state === 'loading' ? (
          <div className="sheet__body" aria-busy="true">
            <SheetSkeleton rows={3} height={56} />
          </div>
        ) : summary.state === 'failed' ? (
          <Failure error={summaryError} onRetry={onRetrySummary} />
        ) : (
          <GameSummaryPanel summary={summary.value} showHandleLabel />
        )}
      </div>
    </>
  );
}
