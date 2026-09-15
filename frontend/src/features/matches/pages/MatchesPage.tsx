import { Link2, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import type { GameId, MatchCandidate, MatchFilters } from '@/domain/types';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { GameTabs } from '@/shared/components/GameTabs';
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
  const candidates = matchesQuery.data ?? [];
  const viewerBlocks = availabilityQuery.data ?? [];

  const proposeSession = (candidate: MatchCandidate) => {
    // La agenda recibe el contexto y abre la papeleta en el mejor bloque en común.
    navigate(ROUTES.schedule, {
      state: {
        gameId: candidate.gameId,
        withUser: candidate.user.displayName,
        suggestedBlock: candidate.sharedBlocks[0] ?? null,
      },
    });
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
          <Link className="btn btn--pen" to={ROUTES.settings}>
            Ir a configuración
          </Link>
        }
      />
    );
  }

  return (
    <>
      <header className="line-between">
        <div className="stack-sm">
          <h1 className="doc-title">Coincidencias</h1>
          <p className="lead">
            Jugadores con un rango cercano al tuyo cuyas horas se cruzan con las que declaraste.
          </p>
        </div>
        {matchesQuery.isFetching ? (
          <span className="btn__spin" style={{ color: 'var(--pen)' }} aria-label="Actualizando" />
        ) : null}
      </header>

      <GameTabs
        games={accounts.map((account) => account.gameId)}
        value={activeGame ?? accounts[0].gameId}
        onChange={setActiveGame}
      />

      {viewerBlocks.length === 0 ? (
        <p className="notice notice--pen">
          No has marcado horas, así que nadie puede cruzarse contigo.{' '}
          <Link to={ROUTES.settings}>Marca tu disponibilidad</Link> para ver resultados reales.
        </p>
      ) : null}

      <div className="matches">
        <MatchFiltersPanel
          filters={filters}
          onChange={setFilters}
          resultCount={candidates.length}
          onReset={() => setFilters({ gameId: filters.gameId, ...DEFAULT_FILTERS })}
        />

        <section className="sheet sheet--punched">
          <div className="sheet__head">
            <h2 className="sheet-title grow">Jugadores compatibles</h2>
            <span className="label">Ordenados por afinidad</span>
          </div>

          {matchesQuery.isPending ? (
            <div className="sheet__body">
              <SheetSkeleton rows={5} height={62} />
            </div>
          ) : matchesQuery.isError ? (
            <Failure error={matchesQuery.error} onRetry={() => matchesQuery.refetch()} />
          ) : candidates.length === 0 ? (
            <Blank
              icon={SearchX}
              title="Ningún jugador cumple estos criterios"
              description="Prueba ampliando la diferencia de rango o bajando las horas en común exigidas."
              action={
                <button
                  type="button"
                  className="btn"
                  onClick={() => setFilters({ gameId: filters.gameId, ...DEFAULT_FILTERS })}
                >
                  Restablecer criterios
                </button>
              }
            />
          ) : (
            <>
              <div className="matches__columns" aria-hidden="true">
                <span />
                <span className="label">Jugador</span>
                <span className="label">Rango</span>
                <span className="label">En común</span>
                <span className="label">Afinidad</span>
                <span />
              </div>
              {candidates.map((candidate, index) => (
                <MatchEntry
                  key={candidate.account.id}
                  candidate={candidate}
                  viewerBlocks={viewerBlocks}
                  onPropose={proposeSession}
                  band={index % 2 === 1}
                />
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}
