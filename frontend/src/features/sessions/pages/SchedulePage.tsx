import { CalendarPlus, Link2, NotebookPen } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { GRID_HOURS } from '@/domain/availability';
import { GAME_LIST, isGameId } from '@/domain/games';
import { PROPOSAL_DEFAULTS, type Proposal } from '@/domain/proposal';
import type { GameId, WeekDay } from '@/domain/types';
import { classifyResponse } from '@/domain/sessionDetail';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { Blank, Failure, SheetSkeleton } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Magnetic } from '@/shared/motion/Magnetic';
import { ApiError, isSessionCleared } from '@/services/api';
import { NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import { pluralize } from '@/shared/utils/format';
import { CancelSessionDialog } from '../components/CancelSessionDialog';
import { SessionDraftSlip, type SessionDraft } from '../components/SessionDraftSlip';
import { SessionSlip, type SessionAction } from '../components/SessionSlip';
import { WeekCalendar } from '../components/WeekCalendar';
import { markAgendaStale } from '../agendaCache';
import { useCancelSession, useJoinSession, useLeaveSession, useSessions } from '../hooks';
import './schedulePage.css';

/**
 * Propuesta que trae el estado de la navegación al llegar desde «Proponer» (RF-29, RF-30), o
 * `null` si no hay o no tiene la forma esperada. El estado del historial es un dato de fuera:
 * se valida antes de abrir nada.
 */
function readProposal(state: unknown): Proposal | null {
  if (typeof state !== 'object' || state === null || !('proposal' in state)) return null;
  const raw = state.proposal;
  if (typeof raw !== 'object' || raw === null) return null;
  const { gameId, day, startHour, durationHours, title } = raw as Record<string, unknown>;
  if (typeof gameId !== 'string' || !isGameId(gameId)) return null;
  if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) return null;
  if (typeof startHour !== 'number' || !GRID_HOURS.includes(startHour)) return null;
  if (typeof durationHours !== 'number' || !Number.isInteger(durationHours)) return null;
  if (durationHours < 1 || durationHours > 4) return null;
  if (typeof title !== 'string') return null;
  return {
    gameId,
    day: day as WeekDay,
    startHour,
    durationHours,
    title,
    ...PROPOSAL_DEFAULTS,
  };
}

export default function SchedulePage() {
  useDocumentTitle('Agenda');

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Cancelar con confirmación (spec 009, RF-19, RF-23; plan 4.2 y 4.4): una sola ventana para todas las tarjetas.
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const panelTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogConfirmRef = useRef<HTMLButtonElement>(null);
  const cancelButtons = useRef(new Map<string, HTMLButtonElement>());
  const [focusRequest, setFocusRequest] = useState<{
    target: 'panelTitle' | 'cancelButton' | 'dialogTitle' | 'dialogConfirm';
    sessionId?: string;
  } | null>(null);
  const cancelRef = useCallback(
    (sessionId: string) => (element: HTMLButtonElement | null) => {
      if (element) cancelButtons.current.set(sessionId, element);
      else cancelButtons.current.delete(sessionId);
    },
    [],
  );

  useLayoutEffect(() => {
    if (focusRequest === null) return;
    const element =
      focusRequest.target === 'panelTitle'
        ? panelTitleRef.current
        : focusRequest.target === 'dialogTitle'
          ? dialogTitleRef.current
          : focusRequest.target === 'dialogConfirm'
            ? dialogConfirmRef.current
            : (cancelButtons.current.get(focusRequest.sessionId ?? '') ?? null);
    element?.focus();
  }, [focusRequest]);

  // Llegada con `state.focus === 'panelTitle'` (cancelar desde el detalle, RF-8): el foco va al
  // título del panel una sola vez y la marca se borra sin tocar `proposal` (007, RF-30).
  const consumedFocus = useRef(false);
  useEffect(() => {
    const state = location.state as { focus?: unknown } | null;
    if (consumedFocus.current || state?.focus !== 'panelTitle') return;
    consumedFocus.current = true;
    setFocusRequest({ target: 'panelTitle' });
    navigate(location.pathname, { replace: true, state: { ...state, focus: undefined } });
  }, [location.pathname, location.state, navigate]);

  // Si la sesión abierta desaparece (se canceló, o cambió el filtro) se limpia.
  useEffect(() => {
    if (selectedId && !sessions.some((session) => session.id === selectedId)) {
      setSelectedId(null);
    }
  }, [sessions, selectedId]);

  // Llegada desde «Proponer» (RF-30). La propuesta se lee una sola vez y espera a las cuentas
  // del usuario de la sesión: el formulario nunca se abre con la lista de juegos vacía.
  const [proposal, setProposal] = useState<Proposal | null>(null);
  useEffect(() => {
    const arrived = readProposal(location.state);
    if (arrived) setProposal(arrived);
  }, [location.key, location.state]);

  const { pathname } = location;
  useEffect(() => {
    if (!proposal) return;
    // Con la sesión ya limpiada (401, RF-7) la propuesta se pierde sin tocar la navegación:
    // el aviso de sesión caducada lleva al acceso.
    if (!user) {
      setProposal(null);
      return;
    }
    if (accountsQuery.isPending || accountsQuery.isFetching) return;
    // Con la carga fallida el error se muestra arriba (RF-9) y la propuesta se descarta,
    // también si luego se reintenta; sin cuenta en el juego propuesto, la agenda queda
    // como si se hubiera abierto directamente.
    if (
      accountsQuery.isSuccess &&
      accountsQuery.data.some((account) => account.gameId === proposal.gameId)
    ) {
      setDraft({
        gameId: proposal.gameId,
        day: proposal.day,
        startHour: proposal.startHour,
        durationHours: proposal.durationHours,
        title: proposal.title,
      });
    }
    setProposal(null);
    navigate(pathname, { replace: true, state: null });
  }, [proposal, user, accountsQuery, navigate, pathname]);

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

  // Una sola escritura de la agenda a la vez, aunque el estado de la escritura aún no se haya
  // pintado: un doble clic envía una sola petición (RF-20).
  const sending = useRef(false);
  const runAction = (action: 'join' | 'leave', sessionId: string) => {
    if (sending.current) return;
    sending.current = true;
    // El aviso de un intento anterior deja de ser cierto al empezar otro.
    joinSession.reset();
    leaveSession.reset();
    const mutation = action === 'join' ? joinSession : leaveSession;
    mutation.mutate(sessionId, { onSettled: () => (sending.current = false) });
  };

  const sessionVisible = (sessionId: string) =>
    selected ? selected.id === sessionId : mine.some((session) => session.id === sessionId);

  const openCancelDialog = (sessionId: string) => {
    if (sending.current) return;
    cancelSession.reset();
    setDialogMessage(null);
    setConfirmFor(sessionId);
  };

  // Cierra sin enviar: el foco vuelve a «Cancelar sesión» de esa tarjeta si sigue ahí, y si no
  // al título del panel (RNF-2, puntos a y d; caso 6).
  const closeCancelDialog = () => {
    if (cancelSession.isPending || confirmFor === null) return;
    const sessionId = confirmFor;
    setConfirmFor(null);
    setDialogMessage(null);
    cancelSession.reset();
    setFocusRequest(
      sessionVisible(sessionId)
        ? { target: 'cancelButton', sessionId }
        : { target: 'panelTitle' },
    );
  };

  const confirmCancel = async () => {
    if (sending.current || confirmFor === null) return;
    const sessionId = confirmFor;
    sending.current = true;
    setDialogMessage(null);
    setFocusRequest({ target: 'dialogTitle' }); // Q25: el botón queda deshabilitado
    try {
      await cancelSession.mutateAsync(sessionId);
      // 204: el `onSuccess` ya quitó la tarjeta; la ventana se cierra sola.
      setConfirmFor(null);
      setFocusRequest({ target: 'panelTitle' });
    } catch (error) {
      if (isSessionCleared(error)) return;
      const hasMessage = error instanceof ApiError && error.hasMessage;
      const info = { ok: false as const, status: error instanceof ApiError ? error.status : 0, hasMessage };
      const outcome = classifyResponse('action', info);
      setDialogMessage(hasMessage ? error.message : NO_MESSAGE_TEXT);
      // La agenda vuelve a pedir sus sesiones tras un 404 o un rechazo con mensaje (RF-19).
      if (outcome === 'empty' || outcome === 'messageAndReread') markAgendaStale(queryClient, user?.id ?? null);
      setFocusRequest({ target: 'dialogConfirm' });
    } finally {
      sending.current = false;
    }
  };

  const pendingAction = (sessionId: string): SessionAction | null => {
    if (joinSession.isPending && joinSession.variables === sessionId) return 'join';
    if (leaveSession.isPending && leaveSession.variables === sessionId) return 'leave';
    if (cancelSession.isPending && cancelSession.variables === sessionId) return 'cancel';
    return null;
  };
  const actionError = joinSession.error ?? leaveSession.error;

  if (!user) return null;

  return (
    <>
      <header className="page-head">
        <div className="page-head__copy">
          <h1 className="doc-title">Agenda de la semana</h1>
          <p className="lead">
            Publica un bloque para jugar o súmate al de otro. Tus horas declaradas aparecen
            iluminadas.
          </p>
        </div>
        <Magnetic>
          <button
            type="button"
            className="btn btn--pen btn--lg"
            onClick={() => openDraft(0, 20)}
            disabled={myGames.length === 0}
          >
            Anotar sesión
            <span className="btn__orb">
              <Icon as={CalendarPlus} size={17} />
            </span>
          </button>
        </Magnetic>
      </header>

      {accountsQuery.isError ? (
        <Failure
          error={accountsQuery.error}
          onRetry={() => accountsQuery.refetch()}
          role="alert"
        />
      ) : accountsQuery.isSuccess && myGames.length === 0 ? (
        <p className="notice notice--pen">
          <Icon as={Link2} size={15} />
          Necesitas al menos un juego vinculado para anotar sesiones.{' '}
          <Link to={ROUTES.settings}>Vincula una cuenta</Link>.
        </p>
      ) : null}

      <div className="agenda__filters">
        <button
          type="button"
          className="chip"
          aria-pressed={gameFilter === 'all'}
          onClick={() => setGameFilter('all')}
        >
          Todos los juegos
        </button>
        {GAME_LIST.map((game) => (
          <button
            key={game.id}
            type="button"
            className="chip"
            aria-pressed={gameFilter === game.id}
            style={{ '--chip-ink': game.accent } as CSSProperties}
            onClick={() => setGameFilter(game.id)}
          >
            <span className="chip__dot" />
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
            <div className="grow stack-sm">
              <h2 className="sheet-title">Semana</h2>
              <div className="agenda__legend">
                <span>
                  <i className="agenda__swatch" /> Tus horas
                </span>
                <span>
                  <i className="agenda__swatch agenda__swatch--signed" /> Estás anotado
                </span>
              </div>
            </div>
            <span className="label">
              {pluralize(sessions.length, 'sesión publicada', 'sesiones publicadas')}
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
              <h2 ref={panelTitleRef} className="sheet-title grow" tabIndex={-1}>
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
              <MutationNotice error={actionError} />
              {selected ? (
                <SessionSlip
                  session={selected}
                  currentUserId={user.id}
                  onJoin={(id) => runAction('join', id)}
                  onLeave={(id) => runAction('leave', id)}
                  onCancel={openCancelDialog}
                  busy={busy}
                  pendingAction={pendingAction(selected.id)}
                  cancelButtonRef={cancelRef(selected.id)}
                />
              ) : mine.length === 0 ? (
                <Blank
                  icon={NotebookPen}
                  title="No estás en ninguna sesión"
                  description="Haz clic en un bloque de la semana para publicar la tuya, o abre una existente y súmate."
                />
              ) : (
                mine.map((session) => (
                  <SessionSlip
                    key={session.id}
                    session={session}
                    currentUserId={user.id}
                    onJoin={(id) => runAction('join', id)}
                    onLeave={(id) => runAction('leave', id)}
                    onCancel={openCancelDialog}
                    busy={busy}
                    pendingAction={pendingAction(session.id)}
                    cancelButtonRef={cancelRef(session.id)}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <CancelSessionDialog
        open={confirmFor !== null}
        onClose={closeCancelDialog}
        onConfirm={() => void confirmCancel()}
        pending={cancelSession.isPending}
        message={dialogMessage}
        titleRef={dialogTitleRef}
        confirmRef={dialogConfirmRef}
      />

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
