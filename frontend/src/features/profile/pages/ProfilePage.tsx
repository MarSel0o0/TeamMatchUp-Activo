import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { formatRank, getGame } from '@/domain/games';
import { formatRange, groupBlocks } from '@/domain/availability';
import type { GameId } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { Avatar } from '@/shared/components/Avatar';
import { GameTabs } from '@/shared/components/GameTabs';
import { RankSparkline } from '@/shared/components/RankSparkline';
import { EmptyState, ErrorState, SkeletonList } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { pluralize, timeAgo } from '@/shared/utils/format';
import { AccountCard } from '../components/AccountCard';
import { MatchHistory } from '../components/MatchHistory';
import { useAccounts, useAvailability, useGameSummary, useSyncAccount } from '../hooks';
import './profilePage.css';

export default function ProfilePage() {
  useDocumentTitle('Mi perfil');

  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();
  const syncAccount = useSyncAccount();

  // Memorizado: sin esto el arreglo cambia de identidad en cada render y el
  // efecto que fija el juego activo se dispararía en bucle.
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  // El juego activo se fija en cuanto se conocen las cuentas, y se corrige si el
  // usuario desvincula justo el que estaba viendo.
  useEffect(() => {
    if (accounts.length === 0) {
      setActiveGame(null);
      return;
    }
    if (!activeGame || !accounts.some((account) => account.gameId === activeGame)) {
      setActiveGame(accounts[0].gameId);
    }
  }, [accounts, activeGame]);

  // El cambio de juego solo dispara esta consulta: la página no se recarga.
  const summaryQuery = useGameSummary(activeGame);
  const availability = availabilityQuery.data ?? [];

  if (!user) return null;

  return (
    <>
      <header className="profile-header card">
        <Avatar name={user.displayName} color={user.avatarColor} size="lg" />
        <div className="profile-header__info">
          <h1 className="page-title">{user.displayName}</h1>
          <p className="page-subtitle">
            @{user.username} · {user.timezone}
          </p>
          {user.bio ? <p className="muted profile-header__bio">{user.bio}</p> : null}
        </div>
        <Link className="btn btn--ghost" to={ROUTES.settings}>
          Editar perfil
        </Link>
      </header>

      <section className="profile-stats">
        <article className="panel">
          <span className="faint">Juegos vinculados</span>
          <strong className="profile-stats__value">{accounts.length}</strong>
        </article>
        <article className="panel">
          <span className="faint">Horas declaradas por semana</span>
          <strong className="profile-stats__value">{availability.length}</strong>
        </article>
        <article className="panel">
          <span className="faint">Cuentas verificadas</span>
          <strong className="profile-stats__value">
            {accounts.filter((account) => account.verified).length}/{accounts.length}
          </strong>
        </article>
        <article className="panel">
          <span className="faint">Miembro desde</span>
          <strong className="profile-stats__value">{timeAgo(user.createdAt)}</strong>
        </article>
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <h2 className="section-title">Mis juegos</h2>
            <p className="page-subtitle">
              Cambia de juego para ver tu rango y tus últimas partidas.
            </p>
          </div>
          <Link className="btn btn--ghost btn--sm" to={ROUTES.settings}>
            Vincular otra cuenta
          </Link>
        </div>

        {accountsQuery.isPending ? (
          <SkeletonList rows={2} height={110} />
        ) : accountsQuery.isError ? (
          <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
        ) : accounts.length === 0 ? (
          <EmptyState
            title="Aún no has vinculado ninguna cuenta"
            description="Vincula al menos un juego para que podamos leer tu rango y recomendarte jugadores."
            action={
              <Link className="btn btn--primary" to={ROUTES.settings}>
                Vincular una cuenta
              </Link>
            }
          />
        ) : (
          <div className="stack">
            <GameTabs
              games={accounts.map((account) => account.gameId)}
              value={activeGame ?? accounts[0].gameId}
              onChange={setActiveGame}
              label="Juegos vinculados"
            />

            {summaryQuery.isPending ? (
              <SkeletonList rows={2} height={120} />
            ) : summaryQuery.isError ? (
              <ErrorState error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
            ) : summaryQuery.data ? (
              <div className="profile-game">
                <div className="stack">
                  <AccountCard
                    account={summaryQuery.data.account}
                    onSync={(accountId) => syncAccount.mutate(accountId)}
                    syncing={syncAccount.isPending}
                  />

                  <div className="panel stack-sm">
                    <div className="row-between">
                      <span className="faint">Evolución del rango</span>
                      <span className="badge">
                        {summaryQuery.data.account.rankHistory.length} lecturas
                      </span>
                    </div>
                    <RankSparkline
                      history={summaryQuery.data.account.rankHistory}
                      color={getGame(summaryQuery.data.account.gameId).accent}
                    />
                    <span className="faint">
                      Rango más antiguo registrado:{' '}
                      {formatRank(
                        summaryQuery.data.account.gameId,
                        summaryQuery.data.account.rankHistory[0],
                      )}
                    </span>
                  </div>

                  <div className="panel row-between">
                    <span className="faint">Victorias en las últimas partidas</span>
                    <strong
                      style={{
                        color:
                          summaryQuery.data.winRate >= 50
                            ? 'var(--color-success)'
                            : 'var(--color-danger)',
                      }}
                    >
                      {summaryQuery.data.winRate}%
                    </strong>
                  </div>
                </div>

                <div className="stack">
                  <h3 className="section-title">Últimas partidas</h3>
                  <MatchHistory matches={summaryQuery.data.recentMatches} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <h2 className="section-title">Mi disponibilidad</h2>
            <p className="page-subtitle">
              {pluralize(availability.length, 'bloque declarado', 'bloques declarados')} en la
              semana.
            </p>
          </div>
          <Link className="btn btn--ghost btn--sm" to={ROUTES.settings}>
            Editar horarios
          </Link>
        </div>

        {availabilityQuery.isPending ? (
          <SkeletonList rows={1} height={60} />
        ) : availability.length === 0 ? (
          <EmptyState
            icon="🕒"
            title="No has marcado horarios"
            description="Sin bloques horarios no podemos cruzar tu disponibilidad con la de otros jugadores."
            action={
              <Link className="btn btn--primary" to={ROUTES.settings}>
                Marcar mis horarios
              </Link>
            }
          />
        ) : (
          <div className="profile-ranges">
            {groupBlocks(availability).map((range) => (
              <span key={`${range.day}-${range.startHour}`} className="badge badge--primary">
                {formatRange(range)}
              </span>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
