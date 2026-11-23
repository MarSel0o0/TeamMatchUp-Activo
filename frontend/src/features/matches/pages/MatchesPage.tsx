import { AlertCircle, Link2, SearchX } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import type { Proposal } from '@/domain/proposal';
import type { GameId, MatchFilters, Origin } from '@/domain/types';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { agendaStore } from '@/features/sessions/agendaStore';
import { ApiError } from '@/services/api';
import { AppButton, ButtonLink } from '@/shared/components/AppButton';
import { GameTabs } from '@/shared/components/GameTabs';
import { Icon } from '@/shared/components/Icon';
import { Notice } from '@/shared/components/Notice';
import { Spinner } from '@/shared/components/Spinner';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { MatchEntry } from '../components/MatchEntry';
import { MatchFiltersPanel } from '../components/MatchFiltersPanel';
import { useMatches } from '../hooks';
import './matchesPage.css';

const DEFAULT_FILTERS: Omit<MatchFilters, 'gameId'> = {
  maxRankDistance: 25,
  minSharedHours: 2,
  onlyVerified: false,
  search: '',
};

export default function MatchesPage() {
  useDocumentTitle('Coincidencias');

  const navigate = useNavigate();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [filters, setFilters] = useState<MatchFilters>({ gameId: 'lol', ...DEFAULT_FILTERS });

  useEffect(() => {
    if (accounts.length === 0) {
      setActiveGame(null);
      return;
    }
    if (!activeGame || !accounts.some((account) => account.gameId === activeGame)) {
      setActiveGame(accounts[0].gameId);
    }
  }, [accounts, activeGame]);

  // El texto se retrasa para no consultar en cada tecla; el resto de los
  // criterios se aplica de inmediato.
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const appliedFilters = useMemo<MatchFilters>(
    () => ({ ...filters, gameId: activeGame ?? 'lol', search: debouncedSearch }),
    [filters, activeGame, debouncedSearch],
  );

  const matchesQuery = useMatches(appliedFilters, activeGame !== null);
  const candidates = matchesQuery.isError ? [] : (matchesQuery.data ?? []);
  const viewerBlocks = availabilityQuery.data ?? [];
  // Spec 015, RF-25: origen del rango propio en el juego activo, para ocultar la distancia si es
  // de Leetify. Sin cuenta propia del juego la lista no se pinta (sin cuentas sale el aviso de
  // vincular y sin juego activo la consulta no corre); el valor por defecto solo cubre ese caso,
  // y el origen del candidato se sigue comprobando en cada fila.
  const ownRankOrigin: Origin =
    accounts.find((account) => account.gameId === activeGame)?.origins.rank ?? 'simulated';
  // Spec 014, RF-33 y RF-44: cuenta de LoL verificada sin clasificar o con rango pendiente.
  // Spec 015, RF-10: en CS2 el mismo 409 dice que la cuenta no tiene rango Premier.
  const conflictMessage =
    matchesQuery.isError &&
    matchesQuery.error instanceof ApiError &&
    matchesQuery.error.status === 409 &&
    matchesQuery.error.hasMessage &&
    matchesQuery.error.message
      ? matchesQuery.error.message
      : null;
  const premierConflict = conflictMessage !== null && activeGame === 'cs2';

  // Una sola navegación por visita a la página: dos pulsaciones seguidas de "Proponer" no
  // dejan dos entradas en el historial (RF-29).
  const proposing = useRef(false);
  const proposeSession = (proposal: Proposal) => {
    if (proposing.current) return;
    proposing.current = true;
    const { gameId, day, startHour, durationHours, title } = proposal;
    agendaStore.getState().propose({ gameId, day, startHour, durationHours, title });
    navigate(ROUTES.schedule);
  };

  if (accountsQuery.isPending) {
    return <SheetSkeleton rows={4} height={80} />;
  }

  if (accounts.length === 0) {
    return (
      <Blank
        icon={Link2}
        title="Primero vincula un juego"
        description="Necesitamos tu rango y tus horas para saber con quién te cruzas."
        action={
          <ButtonLink tone="pen" to={ROUTES.settings}>
            Ir a configuración
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <div className="page-head__copy">
          <h1 className="doc-title">Coincidencias</h1>
          <p className="lead">
            Jugadores con un rango cercano al tuyo cuyas horas se cruzan con las que declaraste.
          </p>
        </div>
        {matchesQuery.isFetching ? (
          <Spinner label="Actualizando" />
        ) : null}
      </header>

      <GameTabs
        games={accounts.map((account) => account.gameId)}
        value={activeGame ?? accounts[0].gameId}
        onChange={setActiveGame}
        idBase="matches-games"
        panelClassName="matches__panel"
      >
        {availabilityQuery.isSuccess && viewerBlocks.length === 0 ? (
          <Notice tone="pen">
            No has marcado horas, así que nadie puede cruzarse contigo.{' '}
            <Link to={ROUTES.settings}>Marca tu disponibilidad</Link> para ver resultados reales.
          </Notice>
        ) : null}

        <div className="matches">
          <MatchFiltersPanel
            filters={filters}
            onChange={setFilters}
            resultCount={candidates.length}
            onReset={() => setFilters({ gameId: filters.gameId, ...DEFAULT_FILTERS })}
            disabled={premierConflict}
          />

          <section className="sheet sheet--punched">
            <div className="sheet__head">
              <h2 className="sheet-title grow">Jugadores compatibles</h2>
              <span className="label">Por afinidad</span>
            </div>

            {matchesQuery.isPending ? (
              <div className="sheet__body">
                <SheetSkeleton rows={5} height={62} />
              </div>
            ) : conflictMessage !== null ? (
              <div className="sheet__body">
                <Notice tone="pen" role="status">
                  <Icon as={AlertCircle} size={15} />
                  {conflictMessage}
                  {premierConflict ? (
                    <>
                      {' '}
                      <Link to={ROUTES.profile}>Ir a tu perfil</Link>
                    </>
                  ) : null}
                </Notice>
              </div>
            ) : matchesQuery.isError ? (
              <Failure error={matchesQuery.error} onRetry={() => matchesQuery.refetch()} />
            ) : candidates.length === 0 ? (
              <Blank
                icon={SearchX}
                title="Ningún jugador cumple estos criterios"
                description="Prueba ampliando la diferencia de rango o bajando las horas en común exigidas."
                action={
                  <AppButton
                    type="button"
                    onClick={() => setFilters({ gameId: filters.gameId, ...DEFAULT_FILTERS })}
                  >
                    Restablecer criterios
                  </AppButton>
                }
              />
            ) : (
              <div className="matches__list">
                <div className="matches__columns" aria-hidden="true">
                  <span />
                  <span className="label">Jugador</span>
                  <span className="label">Rango</span>
                  <span className="label">En común</span>
                  <span className="label">Afinidad</span>
                  <span />
                </div>
                {/* popLayout: las filas que salen dejan su hueco de inmediato y
                    las que quedan se deslizan a su nueva posición. */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {candidates.map((candidate) => (
                    <MatchEntry
                      key={candidate.account.id}
                      candidate={candidate}
                      viewerBlocks={viewerBlocks}
                      viewerLoaded={availabilityQuery.isSuccess}
                      ownRankOrigin={ownRankOrigin}
                      onPropose={proposeSession}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </GameTabs>
    </>
  );
}
