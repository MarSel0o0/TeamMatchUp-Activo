import { CalendarPlus, Link2, NotebookPen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { parseBlock } from '@/domain/availability';
import { GAME_LIST } from '@/domain/games';
import type { GameId, WeekDay } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { Icon } from '@/shared/components/Icon';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { pluralize } from '@/shared/utils/format';
import { SessionDraftSlip, type SessionDraft } from '../components/SessionDraftSlip';
import { SessionSlip } from '../components/SessionSlip';
import { WeekCalendar } from '../components/WeekCalendar';
import { useCancelSession, useJoinSession, useLeaveSession, useSessions } from '../hooks';
import './schedulePage.css';

/** Contexto que envía la vista de coincidencias al proponer una sesión. */
interface ScheduleLocationState {
  gameId?: GameId;
  withUser?: string;
  suggestedBlock?: string | null;
}

export default function SchedulePage() {
  useDocumentTitle('Agenda');

  const { user } = useAuth();
  const location = useLocation();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();

  const [gameFilter, setGameFilter] = useState<GameId | 'all'>('all');
  const sessionsQuery = useSessions(gameFilter);
  const joinSession = useJoinSession();
  const leaveSession = useLeaveSession();
  const cancelSession = useCancelSession();

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const accounts = accountsQuery.data ?? [];
  const myGames = accounts.map((account) => account.gameId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft | null>(null);

  // Si la sesión abierta desaparece (se canceló, o cambió el filtro) se limpia.
  useEffect(() => {
    if (selectedId && !sessions.some((session) => session.id === selectedId)) {
      setSelectedId(null);
    }
  }, [sessions, selectedId]);

  // Llegada desde «Proponer sesión»: abre la papeleta con el juego y el mejor
  // bloque en común ya elegidos.
  useEffect(() => {
    const state = location.state as ScheduleLocationState | null;
    if (!state?.gameId) return;

    const block = state.suggestedBlock ? parseBlock(state.suggestedBlock) : null;
    setDraft({
      gameId: state.gameId,
      day: (block?.day ?? 0) as WeekDay,
      startHour: block?.hour ?? 20,
      title: state.withUser ? `Sesión con ${state.withUser}` : '',
    });
    window.history.replaceState({}, '');
  }, [location.state]);

  const selected = sessions.find((session) => session.id === selectedId) ?? null;
  const mine = sessions.filter((session) =>
    session.participants.some((participant) => participant.id === user?.id),
  );

  const openDraft = (day: WeekDay, startHour: number) => {
    if (myGames.length === 0) return;
    setDraft({
      gameId: gameFilter === 'all' ? myGames[0] : gameFilter,
      day,
      startHour,
    });
  };

  const busy = joinSession.isPending || leaveSession.isPending || cancelSession.isPending;

  if (!user) return null;

  return (
    <>
      <header className="line-between">
        <div className="stack-sm">
          <h1 className="doc-title">Agenda de la semana</h1>
          <p className="lead">
            Anota un bloque para jugar o firma el de otro. Tus horas declaradas aparecen sombreadas.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--pen"
          onClick={() => openDraft(0, 20)}
          disabled={myGames.length === 0}
        >
          <Icon as={CalendarPlus} size={15} />
          Anotar sesión
        </button>
      </header>

      {myGames.length === 0 ? (
        <p className="notice notice--pen">
          <Icon as={Link2} size={15} />
          Necesitas al menos un juego vinculado para anotar sesiones.{' '}
          <Link to={ROUTES.settings}>Vincula una cuenta</Link>.
        </p>
      ) : null}

      <div className="agenda__filters">
        <button
          type="button"
          className={`btn btn--sm${gameFilter === 'all' ? ' btn--pen' : ''}`}
          onClick={() => setGameFilter('all')}
        >
          Todos los juegos
        </button>
        {GAME_LIST.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`btn btn--sm${gameFilter === game.id ? ' btn--pen' : ''}`}
            onClick={() => setGameFilter(game.id)}
          >
            {game.name}
          </button>
        ))}
        {sessionsQuery.isFetching ? (
          <span className="btn__spin" style={{ color: 'var(--pen)' }} aria-label="Actualizando" />
        ) : null}
      </div>

      <div className="agenda">
        <section className="sheet sheet--punched">
          <div className="sheet__head">
            <h2 className="sheet-title grow">Hoja semanal</h2>
            <span className="label">
              {pluralize(sessions.length, 'sesión anotada', 'sesiones anotadas')}
            </span>
          </div>

          <div className="sheet__body">
            {sessionsQuery.isPending ? (
              <SheetSkeleton rows={8} height={34} />
            ) : sessionsQuery.isError ? (
              <Failure error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
            ) : (
              <WeekCalendar
                sessions={sessions}
                availability={availabilityQuery.data ?? []}
                selectedSessionId={selectedId}
                currentUserId={user.id}
                onSelectSession={setSelectedId}
                onSelectSlot={openDraft}
              />
            )}
          </div>
        </section>

        <aside className="agenda__side">
          <div className="sheet">
            <div className="sheet__head">
              <h2 className="sheet-title grow">
                {selected ? 'Sesión abierta' : 'Mis sesiones'}
              </h2>
              {selected ? (
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setSelectedId(null)}
                >
                  Ver las mías
                </button>
              ) : (
                <span className="num label">{mine.length}</span>
              )}
            </div>

            <div className="sheet__body stack">
              {selected ? (
                <SessionSlip
                  session={selected}
                  currentUserId={user.id}
                  onJoin={(id) => joinSession.mutate(id)}
                  onLeave={(id) => leaveSession.mutate(id)}
                  onCancel={(id) => cancelSession.mutate(id)}
                  busy={busy}
                />
              ) : mine.length === 0 ? (
                <Blank
                  icon={NotebookPen}
                  title="No has firmado ninguna sesión"
                  description="Haz clic en un bloque de la hoja para anotar la tuya, o abre una existente y firma."
                />
              ) : (
                mine.map((session) => (
                  <SessionSlip
                    key={session.id}
                    session={session}
                    currentUserId={user.id}
                    onJoin={(id) => joinSession.mutate(id)}
                    onLeave={(id) => leaveSession.mutate(id)}
                    onCancel={(id) => cancelSession.mutate(id)}
                    busy={busy}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {draft ? (
        <SessionDraftSlip
          open
          draft={draft}
          availableGames={myGames}
          onCreated={setSelectedId}
          onClose={() => setDraft(null)}
        />
      ) : null}
    </>
  );
}
