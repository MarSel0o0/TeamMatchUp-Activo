import { UserX } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import {
  distanceView,
  isOwnPlayerRef,
  playerPageState,
  proposeState,
  zonesDiffer,
} from '@/domain/playerSheet';
import type { Loadable, ProposeState } from '@/domain/playerSheet';
import type { GameAccount } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { GO_TO_MATCHES_LABEL, PLAYER_CROSS_TITLE, PLAYER_NOT_FOUND_TEXT } from '@/shared/utils/copy';
import { PlayerGamesSection } from '../components/PlayerGamesSection';
import { PlayerHeader } from '../components/PlayerHeader';
import { ProposeSessionAction } from '../components/ProposeSessionAction';
import { RankDistanceBlock } from '../components/RankDistanceBlock';
import { SharedHoursBlock } from '../components/SharedHoursBlock';
import {
  toLoadable,
  useOwnAccountsForSheet,
  useOwnAvailabilityForSheet,
  usePlayer,
  usePlayerAccounts,
  usePlayerAvailability,
  usePlayerSummary,
  usePlayerVisit,
} from '../hooks';
import { usePlayerTab } from '../usePlayerTab';
import { useSummaryRecheck } from '../useSummaryRecheck';
// Clases `ficha`, `ficha__*` del perfil, reutilizadas sin cambios (plan 1 y 4.2). Se importan
// aquí porque la ficha puede abrirse sin haber cargado antes la vista del perfil.
import '@/features/profile/pages/profilePage.css';
import './playerPage.css';

const CROSS_TITLE_ID = 'player-cross-title';
const NOT_READY: Loadable<GameAccount[]> = { state: 'loading' };
const PROPOSE_LOADING: ProposeState = { kind: 'loading' };

/**
 * Ficha de otro jugador, `/jugadores/:userId` (spec 008; plan 3.7 y 4).
 *
 * RF-15: la ficha propia (`me` exacto o el id propio sin distinguir mayúsculas) lleva al perfil
 * reemplazando la entrada del historial, antes de montar ninguna consulta.
 */
export default function PlayerPage() {
  const { userId: rawId = '' } = useParams();
  const { user } = useAuth();

  // `ProtectedRoute` garantiza la sesión; si se limpia (007 RF-7, RF-24) no se monta nada.
  if (!user) return null;
  if (isOwnPlayerRef(rawId, user.id)) return <Navigate to={ROUTES.profile} replace />;
  // Una ficha por identificador: otro jugador es otra visita (RF-26).
  return <PlayerSheet key={rawId} rawId={rawId} myZone={user.timezone} />;
}

function PlayerSheet({ rawId, myZone }: { rawId: string; myZone: string }) {
  const visit = usePlayerVisit();

  // Las 5 primeras consultas van en paralelo (plan 3.7; P63). Las dos disponibilidades y las
  // cuentas propias las muestra el bloque de cruce (T7) y las usa "Proponer sesión" (T8).
  const userQuery = usePlayer(visit, rawId, false);
  const accountsQuery = usePlayerAccounts(visit, rawId, false);
  const theirHoursQuery = usePlayerAvailability(visit, rawId, false);
  const ownAccountsQuery = useOwnAccountsForSheet(visit, false);
  const ownHoursQuery = useOwnAvailabilityForSheet(visit, false);

  const page = playerPageState(toLoadable(userQuery));
  const accounts = toLoadable(accountsQuery);

  // Pregunta 2 del plan: hasta que el usuario responde 200 no se decide pestaña (ni se corrige
  // la dirección ni se pide el resumen); así un id inexistente nunca enseña un instante de
  // "Este jugador no ha vinculado ningún juego" antes de "Este jugador no existe".
  const { tab, selectTab } = usePlayerTab(page === 'ready' ? accounts : NOT_READY);
  const summaryQuery = usePlayerSummary(visit, rawId, tab, false);
  const { rechecking } = useSummaryRecheck(summaryQuery, userQuery, accountsQuery, tab);
  const summary = toLoadable(summaryQuery);
  const ownAccounts = toLoadable(ownAccountsQuery);
  const ownHours = toLoadable(ownHoursQuery);
  const theirHours = toLoadable(theirHoursQuery);

  useDocumentTitle(page === 'ready' ? userQuery.data?.displayName : undefined);

  if (page === 'notFound') {
    // RF-9: estado vacío en lugar de toda la ficha (prevalece sobre 007 RF-9).
    return (
      <Blank
        icon={UserX}
        title={PLAYER_NOT_FOUND_TEXT}
        action={
          <Link className="btn btn--pen" to={ROUTES.matches}>
            {GO_TO_MATCHES_LABEL}
          </Link>
        }
      />
    );
  }

  if (page === 'failed') {
    // RF-18, RF-24: el error del usuario ocupa toda la ficha; "Reintentar" repite solo esa petición.
    return <Failure error={userQuery.error} onRetry={() => void userQuery.refetch()} />;
  }

  if (page === 'loading' || !userQuery.data) return <PlayerSheetLoading />;

  return (
    <>
      <PlayerHeader player={userQuery.data} />
      <PlayerGamesSection
        accounts={accounts}
        accountsError={accountsQuery.error}
        onRetryAccounts={() => void accountsQuery.refetch()}
        tab={tab}
        onSelectTab={selectTab}
        summary={summary}
        summaryError={summaryQuery.error}
        onRetrySummary={() => void summaryQuery.refetch()}
        rechecking={rechecking}
      />
      {/* Bloque "Cruce": distancia y horas en común (T7) y "Proponer sesión" (T8). */}
      <section className="sheet" aria-labelledby={CROSS_TITLE_ID}>
        <div className="sheet__head">
          <h2 id={CROSS_TITLE_ID} className="sheet-title grow">
            {PLAYER_CROSS_TITLE}
          </h2>
        </div>
        <div className="sheet__body stack player-cross">
          {/* RF-10, P16: sin juego elegido no hay distancia. */}
          {tab !== null ? (
            <RankDistanceBlock
              view={distanceView({
                gameId: tab,
                myAccounts: ownAccounts,
                // RF-8: al cambiar de pestaña o durante RF-19, la distancia también espera.
                theirAccount: rechecking
                  ? { state: 'loading' }
                  : summary.state === 'ready'
                    ? { state: 'ready', value: summary.value.account }
                    : summary,
              })}
              ownAccountsError={ownAccountsQuery.error}
              onRetryOwnAccounts={() => void ownAccountsQuery.refetch()}
              summaryError={summaryQuery.error}
              onRetrySummary={() => void summaryQuery.refetch()}
            />
          ) : null}
          <SharedHoursBlock
            mine={ownHours}
            mineError={ownHoursQuery.error}
            onRetryMine={() => void ownHoursQuery.refetch()}
            theirs={theirHours}
            theirsError={theirHoursQuery.error}
            onRetryTheirs={() => void theirHoursQuery.refetch()}
            zonesDiffer={zonesDiffer(userQuery.data.timezone, myZone)}
          />
          {/* RF-7, RF-10, RF-12, RF-23: los cuatro datos para proponer (plan 3.2 y 4.4). */}
          <ProposeSessionAction
            state={proposeState({
              gameId: tab,
              displayName: userQuery.data.displayName,
              theirAccounts: accounts,
              myAccounts: ownAccounts,
              myBlocks: ownHours,
              theirBlocks: theirHours,
            })}
          />
        </div>
      </section>
    </>
  );
}

/**
 * Pregunta 2 del plan: mientras obtener el usuario no responde 200, todas las secciones muestran
 * su estado de carga y "Proponer sesión" queda deshabilitado con el texto de carga de RF-23.
 */
function PlayerSheetLoading() {
  return (
    <>
      <section className="sheet" aria-busy="true">
        <div className="sheet__body">
          <SheetSkeleton rows={2} height={48} />
        </div>
      </section>
      <section className="sheet" aria-busy="true">
        <div className="sheet__body">
          <SheetSkeleton rows={3} height={56} />
        </div>
      </section>
      <section className="sheet" aria-labelledby={CROSS_TITLE_ID}>
        <div className="sheet__head">
          <h2 id={CROSS_TITLE_ID} className="sheet-title grow">
            {PLAYER_CROSS_TITLE}
          </h2>
        </div>
        <div className="sheet__body stack" aria-busy="true">
          <SheetSkeleton rows={2} height={40} />
          <ProposeSessionAction state={PROPOSE_LOADING} />
        </div>
      </section>
    </>
  );
}
