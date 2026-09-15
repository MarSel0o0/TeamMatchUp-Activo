import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { parseBlock } from '@/domain/availability';
import { GAME_LIST } from '@/domain/games';
import type { GameId, WeekDay } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { EmptyState, ErrorState, SkeletonList } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { pluralize } from '@/shared/utils/format';
import { CreateSessionModal, type SessionDraft } from '../components/CreateSessionModal';
import { SessionCard } from '../components/SessionCard';
import { WeekCalendar } from '../components/WeekCalendar';
import { useCancelSession, useJoinSession, useLeaveSession, useSessions } from '../hooks';
import './schedulePage.css';

/** Contexto que la vista de coincidencias envía al proponer una sesión. */
interface ScheduleLocationState {
  gameId?: GameId;
  withUser?: string;
  suggestedBlock?: string | null;
}

export default function SchedulePage() {
  useDocumentTitle('Agenda de sesiones');

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
  const availableGames = accounts.map((account) => account.gameId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft | null>(null);

  // Si la sesión seleccionada desaparece (se canceló o cambió el filtro) se limpia.
  useEffect(() => {
    if (selectedId && !sessions.some((session) => session.id === selectedId)) {
      setSelectedId(null);
    }
  }, [sessions, selectedId]);

  // Llegada desde "Proponer sesión" en coincidencias: abre el formulario con el
  // juego y el mejor bloque en común ya seleccionados.
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
  const mySessions = sessions.filter((session) =>
    session.participants.some((participant) => participant.id === user?.id),
  );

  const openDraft = (day: WeekDay, startHour: number) => {
    if (availableGames.length === 0) return;
    setDraft({
      gameId: gameFilter === 'all' ? availableGames[0] : gameFilter,
      day,
      startHour,
    });
  };

  const busy = joinSession.isPending || leaveSession.isPending || cancelSession.isPending;

  if (!user) return null;

  return (
    <>
      <header className="row-between">
        <div>
          <h1 className="page-title">Agenda de sesiones</h1>
          <p className="page-subtitle">
            Publica un bloque para jugar o súmate al de otro jugador. Los bloques con tu
            disponibilidad aparecen resaltados.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => openDraft(0, 20)}
          disabled={availableGames.length === 0}
        >
          Publicar sesión
        </button>
      </header>

      {availableGames.length === 0 ? (
        <p className="alert alert--info">
          Necesitas al menos un juego vinculado para publicar sesiones.{' '}
          <Link to={ROUTES.settings}>Vincula una cuenta</Link>.
        </p>
      ) : null}

      <div className="schedule-filters">
        <button
          type="button"
          className={`btn btn--sm${gameFilter === 'all' ? ' btn--primary' : ' btn--ghost'}`}
          onClick={() => setGameFilter('all')}
        >
          Todos los juegos
        </button>
        {GAME_LIST.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`btn btn--sm${gameFilter === game.id ? ' btn--primary' : ' btn--ghost'}`}
            onClick={() => setGameFilter(game.id)}
          >
            {game.name}
          </button>
        ))}
        {sessionsQuery.isFetching ? <span className="spinner" aria-label="Actualizando" /> : null}
      </div>

      <div className="schedule-layout">
        <section className="card card--calendar">
          {sessionsQuery.isPending ? (
            <SkeletonList rows={1} height={420} />
          ) : sessionsQuery.isError ? (
            <ErrorState error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
          ) : (
            <WeekCalendar
              sessions={sessions}
              availability={availabilityQuery.data ?? []}
              selectedSessionId={selectedId}
              onSelectSession={setSelectedId}
              onSelectSlot={openDraft}
            />
          )}
        </section>

        <aside className="schedule-side">
          <div className="card">
            <div className="card__header">
              <h2 className="section-title">
                {selected ? 'Sesión seleccionada' : 'Mis sesiones'}
              </h2>
              {selected ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setSelectedId(null)}
                >
                  Ver las mías
                </button>
              ) : (
                <span className="badge">{mySessions.length}</span>
              )}
            </div>

            {selected ? (
              <SessionCard
                session={selected}
                currentUserId={user.id}
                onJoin={(id) => joinSession.mutate(id)}
                onLeave={(id) => leaveSession.mutate(id)}
                onCancel={(id) => cancelSession.mutate(id)}
                busy={busy}
              />
            ) : mySessions.length === 0 ? (
              <EmptyState
                icon="🗓️"
                title="No estás en ninguna sesión"
                description="Haz clic en un bloque del calendario para publicar la tuya, o súmate a una existente."
              />
            ) : (
              <div className="stack">
                {mySessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    currentUserId={user.id}
                    onJoin={(id) => joinSession.mutate(id)}
                    onLeave={(id) => leaveSession.mutate(id)}
                    onCancel={(id) => cancelSession.mutate(id)}
                    busy={busy}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <span className="faint">
              {pluralize(sessions.length, 'sesión publicada', 'sesiones publicadas')} en esta vista.
            </span>
          </div>
        </aside>
      </div>

      {draft ? (
        <CreateSessionModal
          open
          draft={draft}
          availableGames={availableGames}
          onClose={() => setDraft(null)}
        />
      ) : null}
    </>
  );
}
