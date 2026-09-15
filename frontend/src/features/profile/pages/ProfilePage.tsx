import { CalendarClock, Link2, PenLine } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { formatRange, groupBlocks } from '@/domain/availability';
import { formatRank } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { GameTabs } from '@/shared/components/GameTabs';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { RankScale } from '@/shared/components/RankScale';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { pluralize, timeAgo } from '@/shared/utils/format';
import { AccountRow } from '../components/AccountRow';
import { MatchLedger } from '../components/MatchLedger';
import { useAccounts, useAvailability, useGameSummary, useSyncAccount } from '../hooks';
import './profilePage.css';

export default function ProfilePage() {
  useDocumentTitle('Mi ficha');

  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();
  const syncAccount = useSyncAccount();

  // Memorizado: sin esto el arreglo cambia de identidad en cada render y el
  // efecto que fija el juego activo se dispararía en bucle.
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  useEffect(() => {
    if (accounts.length === 0) {
      setActiveGame(null);
      return;
    }
    if (!activeGame || !accounts.some((account) => account.gameId === activeGame)) {
      setActiveGame(accounts[0].gameId);
    }
  }, [accounts, activeGame]);

  // Cambiar de juego solo relanza esta consulta: la página no se recarga.
  const summaryQuery = useGameSummary(activeGame);
  const availability = availabilityQuery.data ?? [];

  if (!user) return null;

  return (
    <>
      <header className="ficha sheet sheet--punched">
        <div className="ficha__head">
          <Monogram name={user.displayName} color={user.avatarColor} size="lg" />
          <div className="grow">
            <h1 className="doc-title">{user.displayName}</h1>
            <p className="note">
              @{user.username} · {user.timezone} · se inscribió {timeAgo(user.createdAt)}
            </p>
            {user.bio ? <p className="ficha__bio">{user.bio}</p> : null}
          </div>
          <Link className="btn" to={ROUTES.settings}>
            <Icon as={PenLine} size={14} />
            Editar ficha
          </Link>
        </div>

        <dl className="ficha__totals">
          <div>
            <dt className="label">Juegos vinculados</dt>
            <dd className="num">{accounts.length}</dd>
          </div>
          <div>
            <dt className="label">Cuentas verificadas</dt>
            <dd className="num">
              {accounts.filter((account) => account.verified).length} de {accounts.length}
            </dd>
          </div>
          <div>
            <dt className="label">Horas declaradas</dt>
            <dd className="num">{availability.length} por semana</dd>
          </div>
        </dl>
      </header>

      <section className="sheet">
        <div className="sheet__head">
          <h2 className="sheet-title grow">Mis juegos</h2>
          <Link className="btn btn--sm" to={ROUTES.settings}>
            <Icon as={Link2} size={13} />
            Vincular otra cuenta
          </Link>
        </div>

        {accountsQuery.isPending ? (
          <div className="sheet__body">
            <SheetSkeleton rows={3} height={56} />
          </div>
        ) : accountsQuery.isError ? (
          <Failure error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
        ) : accounts.length === 0 ? (
          <Blank
            icon={Link2}
            title="No has vinculado ninguna cuenta"
            description="Vincula al menos un juego para que podamos leer tu rango y cruzarlo con el de otros."
            action={
              <Link className="btn btn--pen" to={ROUTES.settings}>
                Vincular una cuenta
              </Link>
            }
          />
        ) : (
          <>
            <div className="ficha__tabs">
              <GameTabs
                games={accounts.map((account) => account.gameId)}
                value={activeGame ?? accounts[0].gameId}
                onChange={setActiveGame}
                label="Juegos vinculados"
              />
            </div>

            {summaryQuery.isPending ? (
              <div className="sheet__body">
                <SheetSkeleton rows={3} height={56} />
              </div>
            ) : summaryQuery.isError ? (
              <Failure error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
            ) : summaryQuery.data ? (
              <div className="ficha__game">
                <div>
                  <AccountRow
                    account={summaryQuery.data.account}
                    onSync={(accountId) => syncAccount.mutate(accountId)}
                    syncing={syncAccount.isPending}
                  />

                  <div className="ficha__scale">
                    <div className="line-between">
                      <span className="label">Posición en la escala del juego</span>
                      <span className="note note--faint">
                        {pluralize(
                          summaryQuery.data.account.rankHistory.length,
                          'lectura registrada',
                          'lecturas registradas',
                        )}
                      </span>
                    </div>
                    <RankScale
                      gameId={summaryQuery.data.account.gameId}
                      history={summaryQuery.data.account.rankHistory}
                      current={summaryQuery.data.account.currentRank}
                    />
                    <p className="note note--faint">
                      Primera lectura:{' '}
                      {formatRank(
                        summaryQuery.data.account.gameId,
                        summaryQuery.data.account.rankHistory[0],
                      )}
                    </p>
                  </div>
                </div>

                <div className="ficha__matches">
                  <div className="line-between">
                    <h3 className="sheet-title">Últimas partidas</h3>
                    <span
                      className="num ficha__winrate"
                      data-good={summaryQuery.data.winRate >= 50 || undefined}
                    >
                      {summaryQuery.data.winRate}% ganadas
                    </span>
                  </div>
                  <MatchLedger matches={summaryQuery.data.recentMatches} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="sheet">
        <div className="sheet__head">
          <h2 className="sheet-title grow">Mis horas</h2>
          <Link className="btn btn--sm" to={ROUTES.settings}>
            <Icon as={CalendarClock} size={13} />
            Editar horas
          </Link>
        </div>

        {availabilityQuery.isPending ? (
          <div className="sheet__body">
            <SheetSkeleton rows={2} height={40} />
          </div>
        ) : availability.length === 0 ? (
          <Blank
            icon={CalendarClock}
            title="No has marcado horas"
            description="Sin horas declaradas no podemos cruzar tu disponibilidad con la de nadie."
            action={
              <Link className="btn btn--pen" to={ROUTES.settings}>
                Marcar mis horas
              </Link>
            }
          />
        ) : (
          <div className="sheet__body">
            <ul className="ficha__ranges">
              {groupBlocks(availability).map((range) => (
                <li key={`${range.day}-${range.startHour}`} className="num">
                  {formatRange(range)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
