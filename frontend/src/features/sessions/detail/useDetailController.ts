import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import { queryKeys } from '@/app/providers/queryKeys';
import {
  checkEditForm,
  classifyResponse,
  detailRole,
  editFormInitial,
  rebaseEditForm,
  toEditPayload,
  type EditFormValues,
  type Outcome,
  type ResponseInfo,
} from '@/domain/sessionDetail';
import type { PlaySession } from '@/domain/types';
import { ApiError, isSessionCleared } from '@/services/api';
import { NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import { applySessionToAgenda, removeSessionFromAgenda } from '../agendaCache';
import {
  rereadSession,
  useCancelSession,
  useJoinSession,
  useLeaveSession,
  useSessionDetail,
  useUpdateSession,
  useSessionVisit,
} from '../hooks';
import { resolveFocus, type FocusAction, type FocusTarget } from './focusRule';

/** Qué respuesta dio la lectura, para `classifyResponse` (RF-12, RF-13). */
function responseInfo(error: unknown): ResponseInfo {
  return error instanceof ApiError
    ? { ok: false, status: error.status, hasMessage: error.hasMessage }
    : { ok: false, status: 0, hasMessage: false };
}

export interface InFlight {
  action: FocusAction;
  origin: 'button' | 'titleEnter';
}

export interface EditForm {
  values: EditFormValues;
}

export type DetailScreen = 'loading' | 'session' | 'empty' | 'pageError' | 'none';

/**
 * Controlador del detalle de sesión (spec 009, plan 4.1 y 4.3): la lectura de esta visita, qué
 * pantalla toca y el foco. El foco no se aplica con `focus()` directo: se pide con `focusRequest`
 * y un `useLayoutEffect` lo aplica tras el render, cuando el destino ya existe.
 */
export function useDetailController(rawId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const userId = useSessionUserId();
  const visit = useSessionVisit();
  const query = useSessionDetail(rawId, visit);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [focusRequest, setFocusRequest] = useState<{ target: FocusTarget } | null>(null);
  const targets = useRef<Partial<Record<FocusTarget, HTMLElement | null>>>({});
  const focusRef = useCallback(
    <T extends HTMLElement>(target: FocusTarget) =>
      (element: T | null) => {
        targets.current[target] = element;
      },
    [],
  );

  // Al reintentar, la consulta sin datos vuelve a «pending» y borra su error; el error sigue
  // visible mientras espera (RF-13), así que se recuerda el último.
  const lastError = useRef<{ error: unknown } | null>(null);
  useEffect(() => {
    if (query.isError) lastError.current = { error: query.error };
    else if (query.data) lastError.current = null;
  }, [query.isError, query.error, query.data]);
  const shownError = query.isError
    ? { error: query.error }
    : query.isPending && query.isFetching
      ? lastError.current
      : null;

  // Mensaje del rechazo que se está mostrando, por si la lectura obliga a moverlo a la zona.
  const messageRef = useRef<string | null>(null);
  const [emptied, setEmptied] = useState(false);
  const [inFlight, setInFlight] = useState<InFlight | null>(null);
  const [rereading, setRereading] = useState(false);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  // Guardas síncronas: un doble clic en la misma tarea no envía dos veces (RF-11).
  const busy = useRef(false);
  const joinSession = useJoinSession();
  const leaveSession = useLeaveSession();
  const updateSession = useUpdateSession();
  const cancelSession = useCancelSession();
  const [dialogOpen, setDialogOpenState] = useState(false);
  const dialogOpenRef = useRef(false);
  const setDialogOpen = (open: boolean) => {
    dialogOpenRef.current = open;
    setDialogOpenState(open);
  };
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [form, setFormState] = useState<EditForm | null>(null);
  const formRef = useRef<EditForm | null>(null);
  const setForm = (next: EditForm | null | ((current: EditForm | null) => EditForm | null)) => {
    const value = typeof next === 'function' ? next(formRef.current) : next;
    formRef.current = value;
    setFormState(value);
  };
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const outcome: Outcome | null = shownError
    ? classifyResponse('load', responseInfo(shownError.error))
    : null;
  const screen: DetailScreen = emptied
    ? 'empty'
    : query.data
    ? 'session'
    : outcome === 'empty'
      ? 'empty'
      : outcome === 'pageError'
        ? 'pageError'
        : outcome === 'session'
          ? 'none'
          : 'loading';

  // Cada resultado nuevo de la lectura (abrir, «Reintentar») mueve el foco una vez (RNF-2, punto c).
  // Cambiar los datos con `setQueryData` (sumarse, salir, nueva lectura) no es un resultado nuevo.
  const resultKey = screen === 'pageError' ? `pageError:${query.errorUpdatedAt}` : screen;
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (screen === 'loading' || screen === 'none' || query.isFetching) return;
    if (announced.current === resultKey) return;
    announced.current = resultKey;
    const target = resolveFocus('loadDone', {
      load: screen === 'session' ? 'success' : screen,
    });
    if (target !== null) setFocusRequest({ target });
  }, [screen, resultKey, query.isFetching]);

  // La agenda no queda más vieja que esta lectura (R17) ni conserva una sesión que ya no existe (R8).
  const reflected = useRef<string | null>(null);
  const firstData = query.data !== undefined;
  useEffect(() => {
    if (userId === null) return;
    const key = firstData ? 'data' : screen === 'empty' ? 'empty' : null;
    if (key === null || reflected.current === key) return;
    reflected.current = key;
    if (firstData && query.data) applySessionToAgenda(queryClient, userId, query.data);
    else removeSessionFromAgenda(queryClient, userId, rawId);
    // Solo la primera lectura de la visita se refleja aquí; las siguientes lo hacen con su acción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstData, screen, userId, queryClient, rawId]);

  useLayoutEffect(() => {
    if (focusRequest === null) return;
    targets.current[focusRequest.target]?.focus();
  }, [focusRequest]);

  // «Reintentar» (RF-13): sin efecto mientras espera, también con doble pulsación en la misma tarea.
  const retrying = useRef(false);
  const retryBusy = shownError !== null && query.isFetching && !query.data;
  useEffect(() => {
    if (!query.isFetching) retrying.current = false;
  }, [query.isFetching]);
  const retry = () => {
    if (retrying.current || query.isFetching) return;
    retrying.current = true;
    void query.refetch();
  };

  const detailKey = queryKeys.sessionDetail(userId, visit, rawId);

  const goEmpty = () => {
    setEmptied(true);
    setForm(null);
    setDialogOpen(false);
    removeSessionFromAgenda(queryClient, userId, rawId);
    setFocusRequest({ target: resolveFocus('empty', {}) ?? 'emptyTitle' });
  };

  // Nueva lectura tras un rechazo (RF-21): sin estado de carga; las acciones siguen bloqueadas.
  const reread = async (action: FocusAction, origin: InFlight['origin']) => {
    setRereading(true);
    let fresh: PlaySession | null = null;
    let info: ResponseInfo = { ok: true };
    try {
      fresh = await rereadSession(rawId);
    } catch (error) {
      if (isSessionCleared(error)) return;
      info = responseInfo(error);
    }
    if (!mountedRef.current) return;
    setRereading(false);
    const result = classifyResponse('reread', info);
    if (result === 'empty') {
      goEmpty();
    } else if (result === 'success' && fresh !== null) {
      queryClient.setQueryData(detailKey, fresh);
      applySessionToAgenda(queryClient, userId, fresh);
      const roleAfter = userId === null ? 'outsider' : detailRole(fresh, userId);
      if (roleAfter !== 'host' && (formRef.current !== null || dialogOpenRef.current)) {
        // Regla defensiva (D18, D22): ya no organiza; el formulario y la ventana se cierran y su
        // mensaje pasa a la zona.
        setZoneMessage((current) => messageRef.current ?? current);
        setForm(null);
        setFormMessage(null);
        setDialogOpen(false);
        setDialogMessage(null);
      } else if (formRef.current !== null) {
        const fresher = fresh;
        setForm((current) =>
          current === null ? null : { values: rebaseEditForm(current.values, fresher) },
        );
      }
      const target = resolveFocus('rereadArrived', { action, origin, roleAfter });
      if (target !== null) setFocusRequest({ target });
    }
  };

  // Join y salir muestran el mensaje en la zona de acciones; guardar, en el formulario (4.2).
  const showMessage = (action: FocusAction, text: string) => {
    messageRef.current = text;
    if (action === 'save') setFormMessage(text);
    else if (action === 'cancel') setDialogMessage(text);
    else setZoneMessage(text);
  };

  // Acción con petición (sumarse, salir, guardar): plan 4.2. La agenda se actualiza en el `onSuccess` del
  // propio `useMutation`, aunque esta vista ya no esté montada (R16).
  const run = async (
    action: 'join' | 'leave' | 'save' | 'cancel',
    origin: InFlight['origin'],
    call: () => Promise<PlaySession | void>,
  ) => {
    if (busy.current || rereading || inFlight !== null) return;
    busy.current = true;
    setZoneMessage(null);
    setFormMessage(null);
    setDialogMessage(null);
    setSavedNotice(false);
    messageRef.current = null;
    if (action === 'cancel') {
      // Q25: el botón queda deshabilitado y el foco pasa al título de la ventana.
      const inFlightTarget = resolveFocus('cancelInFlight', {});
      if (inFlightTarget !== null) setFocusRequest({ target: inFlightTarget });
    }
    setInFlight({ action, origin });
    let result: PlaySession | null = null;
    let failure: unknown = null;
    let info: ResponseInfo = { ok: true };
    try {
      result = (await call()) ?? null;
    } catch (error) {
      if (isSessionCleared(error)) {
        busy.current = false;
        return;
      }
      failure = error;
      info = responseInfo(error);
    }
    busy.current = false;
    if (!mountedRef.current) return; // R16: sin foco, mensaje ni redirección
    setInFlight(null);
    const text =
      failure instanceof ApiError && failure.hasMessage ? failure.message : NO_MESSAGE_TEXT;
    switch (classifyResponse('action', info)) {
      case 'success': {
        if (result !== null) queryClient.setQueryData(detailKey, result);
        if (action === 'cancel') {
          // 204: la agenda ya perdió la tarjeta (`onSuccess`); se sustituye la entrada del historial (4.5).
          navigate(ROUTES.schedule, { replace: true, state: { focus: 'panelTitle' } });
          break;
        }
        if (action === 'save') {
          setForm(null);
          setSavedNotice(true);
        }
        const target =
          action === 'save'
            ? resolveFocus('saveOk', { isHost: true })
            : resolveFocus('joinLeaveOk', { action });
        if (target !== null) setFocusRequest({ target });
        break;
      }
      case 'empty':
        goEmpty();
        break;
      case 'messageOnly': {
        showMessage(action, text);
        const target = resolveFocus('actionEnded', { action, origin });
        if (target !== null) setFocusRequest({ target });
        break;
      }
      case 'messageAndReread': {
        showMessage(action, text);
        const target = resolveFocus('actionEnded', { action, origin });
        if (target !== null) setFocusRequest({ target });
        await reread(action, origin);
        break;
      }
      default:
        break; // 'session': la 007 lleva a login
    }
  };

  const blocked = inFlight !== null || rereading;
  const session = query.data ?? null;

  const openForm = () => {
    if (blocked || session === null) return;
    setForm({ values: editFormInitial(session) });
    setSavedNotice(false);
    setFocusRequest({ target: 'titleField' });
  };

  const discard = () => {
    if (inFlight?.action === 'save') return;
    setForm(null);
    setFormMessage(null);
    const target = resolveFocus('formClosed', { isHost: true });
    if (target !== null) setFocusRequest({ target });
  };

  const openDialog = () => {
    if (blocked) return;
    setDialogOpen(true); // no oculta «Cambios guardados.» (R3); el foco inicial lo pone la ventana
  };

  const closeDialog = () => {
    if (inFlight?.action === 'cancel') return;
    setDialogOpen(false);
    setDialogMessage(null);
    const target = resolveFocus('dialogClosed', { isHost: true });
    if (target !== null) setFocusRequest({ target });
  };

  const confirmCancel = () =>
    void run('cancel', 'button', () => cancelSession.mutateAsync(session?.id ?? rawId));

  const changeForm = (patch: Partial<EditFormValues>) =>
    setForm((current) => (current === null ? null : { values: { ...current.values, ...patch } }));

  const submitForm = (origin: InFlight['origin']) => {
    if (blocked || form === null || session === null) return;
    const checked = checkEditForm(form.values, session);
    if (!checked.ok) {
      setFormMessage(checked.error);
      const target = resolveFocus('clientCheckFailed', { action: 'save', origin });
      if (target !== null) setFocusRequest({ target });
      return;
    }
    const payload = toEditPayload(form.values);
    void run('save', origin, () => updateSession.mutateAsync({ sessionId: rawId, payload }));
  };

  const join = () => void run('join', 'button', () => joinSession.mutateAsync(rawId));
  const leave = () => void run('leave', 'button', () => leaveSession.mutateAsync(rawId));

  return {
    join,
    leave,
    openForm,
    discard,
    openDialog,
    closeDialog,
    confirmCancel,
    dialogOpen,
    dialogMessage,
    changeForm,
    submitForm,
    form,
    formMessage,
    savedNotice,
    blocked,
    inFlight,
    rereading,
    zoneMessage,
    error: shownError?.error ?? null,
    screen,
    session,
    retry,
    retryBusy,
    focusRef,
    mountedRef,
  };
}
