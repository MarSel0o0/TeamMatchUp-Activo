import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import type { GameId, MatchCandidate, MatchFilters } from '@/domain/types';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { GameTabs } from '@/shared/components/GameTabs';
import { EmptyState, ErrorState, SkeletonList } from '@/shared/components/States';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { MatchCard } from '../components/MatchCard';
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

  // El texto de búsqueda se retrasa para no consultar en cada tecla; el resto de
  // los filtros se aplica de inmediato.
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const appliedFilters = useMemo<MatchFilters>(
    () => ({ ...filters, gameId: activeGame ?? 'lol', search: debouncedSearch }),
    [filters, activeGame, debouncedSearch],
  );

  const matchesQuery = useMatches(appliedFilters, activeGame !== null);
  const candidates = matchesQuery.data ?? [];
  const viewerBlocks = availabilityQuery.data ?? [];

  const proposeSession = (candidate: MatchCandidate) => {
    // La agenda recibe el contexto y abre el formulario con el mejor bloque en común.
    navigate(ROUTES.schedule, {
      state: {
        gameId: candidate.gameId,
        withUser: candidate.user.displayName,
        suggestedBlock: candidate.sharedBlocks[0] ?? null,
      },
    });
  };

  if (accountsQuery.isPending) return <SkeletonList rows={3} height={140} />;

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="🔗"
        title="Primero vincula un juego"
        description="Necesitamos conocer tu rango y tus horarios para recomendarte jugadores compatibles."
        action={
          <Link className="btn btn--primary" to={ROUTES.settings}>
            Ir a configuración
          </Link>
        }
      />
    );
  }

  return (
    <>
      <header className="row-between">
        <div>
          <h1 className="page-title">Coincidencias</h1>
          <p className="page-subtitle">
            Jugadores con un rango cercano al tuyo y horarios que se traslapan con los que
            declaraste.
          </p>
        </div>
        {matchesQuery.isFetching ? <span className="spinner" aria-label="Actualizando" /> : null}
      </header>

      <GameTabs
        games={accounts.map((account) => account.gameId)}
        value={activeGame ?? accounts[0].gameId}
        onChange={setActiveGame}
      />

      {viewerBlocks.length === 0 ? (
        <p className="alert alert--info">
          No has marcado horarios, así que ningún jugador puede traslaparse contigo.{' '}
          <Link to={ROUTES.settings}>Marca tu disponibilidad</Link> para ver resultados útiles.
        </p>
      ) : null}

      <div className="matches-layout">
        <MatchFiltersPanel
          filters={filters}
          onChange={setFilters}
          resultCount={candidates.length}
        />

        <section className="matches-results">
          {matchesQuery.isPending ? (
            <SkeletonList rows={3} height={190} />
          ) : matchesQuery.isError ? (
            <ErrorState error={matchesQuery.error} onRetry={() => matchesQuery.refetch()} />
          ) : candidates.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="Ningún jugador cumple estos filtros"
              description="Prueba ampliando la diferencia de rango o bajando las horas en común exigidas."
              action={
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setFilters({ gameId: filters.gameId, ...DEFAULT_FILTERS })}
                >
                  Restablecer filtros
                </button>
              }
            />
          ) : (
            candidates.map((candidate) => (
              <MatchCard
                key={candidate.account.id}
                candidate={candidate}
                viewerBlocks={viewerBlocks}
                onInvite={proposeSession}
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}
