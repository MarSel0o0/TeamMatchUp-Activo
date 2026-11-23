import { AlertCircle, CalendarClock, CheckCircle2, Link2, PenLine } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { formatRange, groupBlocks } from '@/domain/availability';
import type { GameId } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { readRiotNotice } from '@/features/riot/notice';
import { readSteamNotice } from '@/features/steam/notice';
import { ButtonLink } from '@/shared/components/AppButton';
import { GameTabs } from '@/shared/components/GameTabs';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Notice } from '@/shared/components/Notice';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { CountUp } from '@/shared/motion/CountUp';
import { JOINED_TEXT } from '@/shared/utils/copy';
import { timeAgo } from '@/shared/utils/format';
import { GameSummaryPanel } from '../components/GameSummaryPanel';
import { useAccounts, useAvailability, useGameSummary, useSyncAccount } from '../hooks';
import './profilePage.css';

export default function ProfilePage() {
  useDocumentTitle('Mi ficha');

  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();
  const syncAccount = useSyncAccount();
  // Spec 013, RF-20 y spec 014, RF-7/RF-27: los avisos de verificación llegan en el estado de
  // navegación y duran hasta que el usuario sale de esta página.
  const location = useLocation();
  const steamNotice = readSteamNotice(location.state);
  const riotNotice = readRiotNotice(location.state);

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

  // Un solo envío por doble clic, aunque el estado de la escritura aún no se haya pintado (RF-20).
  const syncing = useRef(false);
  const handleSync = (accountId: string) => {
    if (syncing.current) return;
    syncing.current = true;
    syncAccount.mutate(accountId, { onSettled: () => (syncing.current = false) });
  };

  // Cambiar de juego solo relanza esta consulta: la página no se recarga.
  const summaryQuery = useGameSummary(activeGame);
  const availability = availabilityQuery.data ?? [];
  const summary = summaryQuery.data;
  const syncNotice =
    syncAccount.isSuccess && summary && syncAccount.data.id === summary.account.id
      ? syncAccount.data.syncNotice
      : undefined;
  const syncError =
    syncAccount.isError && summary && syncAccount.variables === summary.account.id
      ? syncAccount.error
      : null;

  if (!user) return null;

  return (
    <>
      {steamNotice ? (
        <Notice
          tone={steamNotice.tone === 'error' ? 'error' : 'pen'}
          role={steamNotice.tone === 'error' ? 'alert' : 'status'}
        >
          <Icon as={steamNotice.tone === 'error' ? AlertCircle : CheckCircle2} size={15} />
          {steamNotice.text}
        </Notice>
      ) : null}

      {steamNotice?.extra ? (
        <Notice tone="error" role="alert">
          <Icon as={AlertCircle} size={15} />
          {steamNotice.extra}
        </Notice>
      ) : null}

      {riotNotice ? (
        <Notice
          tone={riotNotice.tone === 'error' ? 'error' : 'pen'}
          role={riotNotice.tone === 'error' ? 'alert' : 'status'}
        >
          <Icon as={riotNotice.tone === 'error' ? AlertCircle : CheckCircle2} size={15} />
          {riotNotice.text}
        </Notice>
      ) : null}

      <header className="ficha sheet sheet--punched">
        <div className="ficha__head">
          <Monogram name={user.displayName} color={user.avatarColor} size="lg" />
          <div className="grow">
            <h1 className="doc-title">{user.displayName}</h1>
            <p className="note">
              @{user.username} · {user.timezone}{` · ${JOINED_TEXT} `}{timeAgo(user.createdAt)}
            </p>
            {user.bio ? <p className="ficha__bio">{user.bio}</p> : null}
          </div>
          <ButtonLink to={ROUTES.settings}>
            <Icon as={PenLine} size={14} />
            Editar ficha
          </ButtonLink>
        </div>

        <dl className="ficha__totals">
          <div>
            <dt className="label">Juegos vinculados</dt>
            <dd>
              <CountUp value={accounts.length} />
            </dd>
          </div>
          <div>
            <dt className="label">Cuentas verificadas</dt>
            <dd>
              <CountUp value={accounts.filter((account) => account.verified).length} />
              <span className="ficha__of"> / {accounts.length}</span>
            </dd>
          </div>
          <div>
            <dt className="label">Horas declaradas</dt>
            <dd>
              <CountUp value={availability.length} />
              <span className="ficha__of"> h/sem</span>
            </dd>
          </div>
        </dl>
      </header>

      <section className="sheet">
        <div className="sheet__head">
          <h2 className="sheet-title grow">Mis juegos</h2>
          <ButtonLink size="sm" to={ROUTES.settings}>
            <Icon as={Link2} size={13} />
            Vincular otra cuenta
          </ButtonLink>
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
              <ButtonLink tone="pen" to={ROUTES.settings}>
                Vincular una cuenta
              </ButtonLink>
            }
          />
        ) : (
          <GameTabs
            games={accounts.map((account) => account.gameId)}
            value={activeGame ?? accounts[0].gameId}
            onChange={setActiveGame}
            label="Juegos vinculados"
            idBase="profile-games"
            listWrapperClassName="ficha__tabs"
          >
            {summaryQuery.isPending ? (
              <div className="sheet__body">
                <SheetSkeleton rows={3} height={56} />
              </div>
            ) : summaryQuery.isError ? (
              <Failure error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
            ) : summary ? (
              <GameSummaryPanel
                summary={summary}
                onSync={handleSync}
                syncing={syncAccount.isPending && syncAccount.variables === summary.account.id}
                syncError={syncError}
                syncNotice={syncNotice}
                offerSteamVerify
                offerRiotVerify
                owner={user}
              />
            ) : null}
          </GameTabs>
        )}
      </section>

      <section className="sheet">
        <div className="sheet__head">
          <h2 className="sheet-title grow">Mis horas</h2>
          <ButtonLink size="sm" to={ROUTES.settings}>
            <Icon as={CalendarClock} size={13} />
            Editar horas
          </ButtonLink>
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
              <ButtonLink tone="pen" to={ROUTES.settings}>
                Marcar mis horas
              </ButtonLink>
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
