import { CalendarPlus, Link2, NotebookPen } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useIsPresent } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { resolveAfterListFocus, resolveDraftFocus, type DraftOpener } from '@/domain/draftFocus';
import { GAME_LIST } from '@/domain/games';
import type { DraftAccounts, ProposalAccounts } from '@/domain/agendaRules';
import type { GameId, WeekDay } from '@/domain/types';
import { classifyResponse } from '@/domain/sessionDetail';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { AppButton } from '@/shared/components/AppButton';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { Notice } from '@/shared/components/Notice';
import { Spinner } from '@/shared/components/Spinner';
import { FilterChip } from '@/shared/components/FilterChip';
import { Blank, Failure, SheetSkeleton, Working } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Magnetic } from '@/shared/motion/Magnetic';
import { ApiError, isSessionCleared } from '@/services/api';
import { LOADING_TEXT, NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import { pluralize } from '@/shared/utils/format';
import { CancelSessionDialog } from '../components/CancelSessionDialog';
import { SessionDraftSlip } from '../components/SessionDraftSlip';
import { SessionSlip, type SessionAction } from '../components/SessionSlip';
import { WeekCalendar } from '../components/WeekCalendar';
import { markAgendaStale } from '../agendaCache';
import { agendaStore, useAgendaStore } from '../agendaStore';
import { useCancelSession, useJoinSession, useLeaveSession, useSessions } from '../hooks';
import './schedulePage.css';

export default function SchedulePage() {
  useDocumentTitle('Agenda');

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();

  // Filtro, sesión abierta, borrador y propuesta viven en el almacén de la agenda (spec 016).
  const gameFilter = useAgendaStore((state) => state.filter);
  const open = useAgendaStore((state) => state.open);
  const draft = useAgendaStore((state) => state.draft);
  const proposal = useAgendaStore((state) => state.proposal);
  const sessionsQuery = useSessions(gameFilter);
  const joinSession = useJoinSession();
  const leaveSession = useLeaveSession();
  const cancelSession = useCancelSession();

  const accounts = accountsQuery.data ?? [];
  const myGames = accounts.map((account) => account.gameId);

  // Error retenido (plan 5.3, P1): con una sesión por confirmar y un filtro cuya lista no llegó,
  // semana y panel siguen mostrando el error mientras corre «Reintentar» (RF-25).
  const [lastFailure, setLastFailure] = useState<{ filter: GameId | 'all'; error: unknown } | null>(
    null,
  );
  useEffect(() => {
    setLastFailure(null);
  }, [gameFilter]);
  useEffect(() => {
    if (sessionsQuery.isError) setLastFailure({ filter: gameFilter, error: sessionsQuery.error });
    else if (sessionsQuery.isSuccess && !sessionsQuery.isPlaceholderData) setLastFailure(null);
  }, [
    sessionsQuery.isError,
    sessionsQuery.error,
    sessionsQuery.isSuccess,
    sessionsQuery.isPlaceholderData,
    gameFilter,
  ]);
  // `fetchStatus !== 'idle'` cuenta también la pausa de TanStack con «Sin conexión» ya activado:
  // «Reintentar» queda esperando red y sigue siendo un reintento en curso (T9b, D-016-3).
  const retained =
    open?.pending === true &&
    lastFailure !== null &&
    lastFailure.filter === gameFilter &&
    sessionsQuery.fetchStatus !== 'idle' &&
    !sessionsQuery.isError;
  const listError: { error: unknown } | null = sessionsQuery.isError
    ? { error: sessionsQuery.error }
    : retained
      ? { error: lastFailure.error }
      : null;
  // «Lista que se ve» (Definiciones de la spec).
  const visible =
    retained && (sessionsQuery.isPending || sessionsQuery.isPlaceholderData)
      ? undefined
      : sessionsQuery.data;
  const sessions = visible ?? [];

  // Borrador al salir de la agenda (T9b, D-016-2, R4): el almacén lo pone en `null` al salir
  // (RF-30), pero la papeleta sigue pintada con una copia local hasta que termina la animación de
  // salida de la vista, como antes de la spec 016. La copia solo se toma si el borrador estaba
  // abierto al empezar la salida y desaparece con la página; al volver se monta una página nueva.
  const isPresent = useIsPresent();
  const [exitDraft, setExitDraft] = useState<typeof draft>(null);
  if (!isPresent && draft !== null && exitDraft === null) setExitDraft(draft);
  if (isPresent && exitDraft !== null) setExitDraft(null);
  const slipDraft = draft ?? exitDraft;

  // Cancelar con confirmación (spec 009, RF-19, RF-23; plan 4.2 y 4.4): una sola ventana para todas las tarjetas.
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const panelTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogConfirmRef = useRef<HTMLButtonElement>(null);
  const cancelButtons = useRef(new Map<string, HTMLButtonElement>());
  // Foco de «Anotar una sesión» (spec 017, RF-12, RF-22; plan 5.4): de dónde se abrió el borrador, el botón de la
  // cabecera y el seguimiento de la primera respuesta de la lista tras volver el foco a un bloque. Reglas puras en
  // `domain/draftFocus.ts`; nada de esto toca el almacén de la 016.
  const headerButtonRef = useRef<HTMLButtonElement>(null);
  const draftOpener = useRef<{ kind: DraftOpener; slot?: string } | null>(null);
  const draftWasOpen = useRef(false);
  const afterList = useRef<{ slot: string; dataAt: number; errorAt: number; lastFocused: EventTarget | null } | null>(
    null,
  );
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

  const selected = open ? (visible?.find((session) => session.id === open.id) ?? null) : null;
  const showOpen = selected !== null || open?.pending === true;

  // RF-27: la sesión abierta confirmada se cierra si deja de estar en la lista que se ve.
  useEffect(() => {
    agendaStore
      .getState()
      .visibleListChanged(visible ? visible.map((session) => session.id) : null);
  }, [visible]);

  // RF-13 y RF-29: entradas de las reglas, tal como las tiene la interfaz.
  const draftAccounts: DraftAccounts = accountsQuery.data
    ? { received: true, games: myGames }
    : { received: false };
  const proposalAccounts: ProposalAccounts =
    accountsQuery.isPending || accountsQuery.isFetching
      ? { status: 'loading' }
      : accountsQuery.isError
        ? { status: 'failed' }
        : { status: 'loaded', games: myGames };
  const signedIn = user !== null;
  const cancelDialogOpen = confirmFor !== null;
  const draftOpen = draft !== null;
  const gamesKey = myGames.join(',');
  // RF-28: la regla se aplica al llegar la propuesta y cada vez que cambia una de sus entradas.
  useEffect(() => {
    if (proposal === null) return;
    agendaStore
      .getState()
      .resolveProposal({ signedIn, accounts: proposalAccounts, cancelDialogOpen });
    // `proposalAccounts` se resume en su estado y sus juegos (plan 4.4).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal, signedIn, proposalAccounts.status, gamesKey, cancelDialogOpen, draftOpen]);

  const mine = sessions.filter((session) =>
    session.participants.some((participant) => participant.id === user?.id),
  );

  const openDraft = (day: WeekDay, startHour: number, kind: 'slot' | 'header' = 'slot') => {
    if (myGames.length === 0) return;
    draftOpener.current = kind === 'slot' ? { kind, slot: `${day}-${startHour}` } : { kind };
    agendaStore.getState().openDraft({ day, startHour }, draftAccounts);
    // Si la regla no lo abrió, no queda un origen que se le atribuya a otro borrador.
    if (agendaStore.getState().draft === null) draftOpener.current = null;
  };

  // Abrir y cerrar el borrador (RF-12, RF-22). Al cerrarlo, el foco vuelve al control que lo abrió, o a «Anotar
  // sesión» si lo abrió una propuesta, o al título del panel si ya no existe; si se cierra porque la vista cambia
  // (la página sale), no se devuelve a ningún control.
  useLayoutEffect(() => {
    const isOpen = draft !== null;
    if (isOpen && !draftWasOpen.current) {
      draftWasOpen.current = true;
      if (draftOpener.current === null) draftOpener.current = { kind: 'proposal' };
      return;
    }
    if (isOpen || !draftWasOpen.current) return;
    draftWasOpen.current = false;
    const opener = draftOpener.current;
    draftOpener.current = null;
    if (!isPresent) return;
    const slotElement =
      opener?.slot !== undefined ? document.querySelector<HTMLElement>(`[data-slot="${opener.slot}"]`) : null;
    const headerElement = headerButtonRef.current;
    const target = resolveDraftFocus('closed', {
      opener: opener?.kind,
      slotFocusable: slotElement !== null,
      headerFocusable: headerElement !== null && !headerElement.disabled,
    });
    if (target === 'slotBlock' && slotElement !== null && opener?.slot !== undefined) {
      slotElement.focus();
      afterList.current = {
        slot: opener.slot,
        dataAt: sessionsQuery.dataUpdatedAt,
        errorAt: sessionsQuery.errorUpdatedAt,
        lastFocused: slotElement,
      };
    } else if (target === 'headerButton') headerElement?.focus();
    else if (target === 'panelTitle') panelTitleRef.current?.focus();
    // Solo al cerrar: las demás entradas se leen en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, isPresent]);

  // Primera respuesta de la lista tras volver el foco a un bloque: si el foco seguía en él y la semana ya no lo
  // muestra (por ejemplo, por el error de la lista), el foco va al título del panel. Solo vale para esa primera
  // respuesta, aunque no actúe (`resolveAfterListFocus`).
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (afterList.current !== null) afterList.current.lastFocused = event.target;
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
  useEffect(() => {
    const tracking = afterList.current;
    if (tracking === null) return;
    if (sessionsQuery.dataUpdatedAt === tracking.dataAt && sessionsQuery.errorUpdatedAt === tracking.errorAt) return;
    afterList.current = null;
    const last = tracking.lastFocused;
    const focusWasOnBlock = last instanceof HTMLElement && last.dataset.slot === tracking.slot;
    const blockStillShown = document.querySelector(`[data-slot="${tracking.slot}"]`) !== null;
    if (resolveAfterListFocus({ focusWasOnBlock, blockStillShown, alreadyEvaluated: false }) === 'panelTitle') {
      panelTitleRef.current?.focus();
    }
  }, [sessionsQuery.dataUpdatedAt, sessionsQuery.errorUpdatedAt]);

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
      agendaStore.getState().sessionCancelled(sessionId);
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
          <AppButton
            ref={headerButtonRef}
            type="button"
            tone="pen" size="lg"
            onClick={() => openDraft(0, 20, 'header')}
            disabled={myGames.length === 0}
          >
            Anotar sesión
            <span className="tmu-btn__orb">
              <Icon as={CalendarPlus} size={17} />
            </span>
          </AppButton>
        </Magnetic>
      </header>

      {accountsQuery.isError ? (
        <Failure
          error={accountsQuery.error}
          onRetry={() => accountsQuery.refetch()}
          role="alert"
        />
      ) : accountsQuery.isSuccess && myGames.length === 0 ? (
        <Notice tone="pen">
          <Icon as={Link2} size={15} />
          Necesitas al menos un juego vinculado para anotar sesiones.{' '}
          <Link to={ROUTES.settings}>Vincula una cuenta</Link>.
        </Notice>
      ) : null}

      <div className="agenda__filters">
        <FilterChip pressed={gameFilter === 'all'} onClick={() => agendaStore.getState().setFilter('all')}>
          Todos los juegos
        </FilterChip>
        {GAME_LIST.map((game) => (
          <FilterChip
            key={game.id}
            pressed={gameFilter === game.id}
            inkVar={game.inkVar}
            dot
            onClick={() => agendaStore.getState().setFilter(game.id)}
          >
            {game.name}
          </FilterChip>
        ))}
        {sessionsQuery.fetchStatus !== 'idle' ? (
          <Spinner label="Actualizando" />
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
            {listError ? (
              <Failure error={listError.error} onRetry={() => sessionsQuery.refetch()} />
            ) : sessionsQuery.isPending ? (
              <SheetSkeleton rows={8} height={34} />
            ) : (
              <WeekCalendar
                sessions={sessions}
                availability={availabilityQuery.data ?? []}
                selectedSessionId={selected?.id ?? null}
                currentUserId={user.id}
                onSelectSession={(id) => agendaStore.getState().selectSession(id)}
                onSelectSlot={openDraft}
              />
            )}
          </div>
        </section>

        <aside className="agenda__side">
          <div className="sheet">
            <div className="sheet__head">
              <h2 ref={panelTitleRef} className="sheet-title grow" tabIndex={-1}>
                {showOpen ? 'Sesión abierta' : 'Mis sesiones'}
              </h2>
              {showOpen ? (
                <AppButton
                  type="button"
                  tone="quiet" size="sm"
                  onClick={() => agendaStore.getState().showMine()}
                >
                  Ver las mías
                </AppButton>
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
              ) : open?.pending && listError ? (
                <Failure
                  error={listError.error}
                  onRetry={() => sessionsQuery.refetch()}
                  retryLabel="Reintentar la sesión abierta"
                />
              ) : open?.pending ? (
                <Working label={LOADING_TEXT} />
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

      {slipDraft ? (
        <SessionDraftSlip
          open
          draft={slipDraft}
          availableGames={myGames}
          onClose={() => agendaStore.getState().closeDraft()}
        />
      ) : null}
    </>
  );
}
