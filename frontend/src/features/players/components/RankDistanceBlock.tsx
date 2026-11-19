import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { GAMES } from '@/domain/games';
import { LEETIFY_HIDDEN_DISTANCE_TEXT, isLeetifyRank } from '@/domain/premierDisplay';
import type { DistanceView } from '@/domain/playerSheet';
import { LeetifyAttribution } from '@/shared/components/LeetifyAttribution';
import { OriginTag } from '@/shared/components/OriginTag';
import { Failure, SheetSkeleton } from '@/shared/components/States';
import {
  NO_DATA_TEXT,
  RANK_DISTANCE_TITLE,
  linkAccountForDistanceText,
  rankDistanceText,
} from '@/shared/utils/copy';

const TITLE_ID = 'player-distance-title';

interface RankDistanceBlockProps {
  /** Lo decide `distanceView` (cuentas propias de la ficha y resumen del juego elegido). */
  view: DistanceView;
  ownAccountsError: unknown;
  onRetryOwnAccounts: () => void;
  summaryError: unknown;
  onRetrySummary: () => void;
}

/**
 * Distancia de rango del bloque de cruce (spec 008, RF-6, RF-8, RF-13, RF-17, RF-18, RF-27;
 * plan 4.2 (3)). Solo se monta con juego elegido (RF-10, P16).
 * - Valor: "Δ n pts", como la fila de coincidencias, con la Etiqueta de datos simulados si
 *   la cuenta del jugador de la ficha lleva la marca (RF-27). Si su rango es de Leetify, la
 *   etiqueta enlaza a su perfil; sin rating, el texto de estado (spec 015, RF-6, RF-7, RF-8).
 * - Si cualquiera de los dos rangos es de Leetify, no hay cifra: un texto que lo dice, con la
 *   atribución si el rango de Leetify es del jugador o su etiqueta si no (spec 015, RF-25, D31).
 * - RF-13: el texto "Vincula tu cuenta de <juego>…" es el enlace a Configuración.
 * - RF-17: "Sin datos" desde `copy.ts` (P62).
 * - Carga mientras llegan las cuentas propias o el resumen (también al cambiar de pestaña);
 *   error de cualquiera de las dos con su "Reintentar", que repite solo esa petición (P19).
 */
export function RankDistanceBlock({
  view,
  ownAccountsError,
  onRetryOwnAccounts,
  summaryError,
  onRetrySummary,
}: RankDistanceBlockProps) {
  return (
    <div className="player-distance stack-sm" role="group" aria-labelledby={TITLE_ID}>
      <h3 id={TITLE_ID} className="label">
        {RANK_DISTANCE_TITLE}
      </h3>
      <DistanceBody
        view={view}
        ownAccountsError={ownAccountsError}
        onRetryOwnAccounts={onRetryOwnAccounts}
        summaryError={summaryError}
        onRetrySummary={onRetrySummary}
      />
    </div>
  );
}

function DistanceBody({
  view,
  ownAccountsError,
  onRetryOwnAccounts,
  summaryError,
  onRetrySummary,
}: RankDistanceBlockProps) {
  switch (view.kind) {
    case 'loading':
      return (
        <div aria-busy="true">
          <SheetSkeleton rows={1} height={32} />
        </div>
      );
    case 'failed':
      return view.source === 'ownAccounts' ? (
        <Failure error={ownAccountsError} onRetry={onRetryOwnAccounts} />
      ) : (
        <Failure error={summaryError} onRetry={onRetrySummary} />
      );
    case 'noOwnAccount':
      return (
        <p className="note">
          <Link to={ROUTES.settings}>{linkAccountForDistanceText(GAMES[view.gameId].shortName)}</Link>
        </p>
      );
    case 'noData':
      return <p className="note">{NO_DATA_TEXT}</p>;
    case 'noPremier':
      return (
        <p className="note">
          {view.text}{' '}
          {isLeetifyRank(view.origin) ? (
            <LeetifyAttribution handle={view.handle} />
          ) : (
            <OriginTag origin={view.origin} />
          )}
        </p>
      );
    case 'leetifyHidden':
      return (
        <p className="note">
          {LEETIFY_HIDDEN_DISTANCE_TEXT}{' '}
          {isLeetifyRank(view.origin) ? (
            <LeetifyAttribution handle={view.handle} />
          ) : (
            <OriginTag origin={view.origin} />
          )}
        </p>
      );
    case 'value':
      return (
        <p className="player-distance__value">
          <strong className="num">{rankDistanceText(view.points)}</strong>
          {/* Con un rango de Leetify la cifra no se muestra (`leetifyHidden`, RF-25): aquí el origen nunca es Leetify. */}
          <OriginTag origin={view.origin} />
        </p>
      );
  }
}
