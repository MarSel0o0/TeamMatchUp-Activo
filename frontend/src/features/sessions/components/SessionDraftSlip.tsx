import { AlertCircle, PenLine } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { GRID_HOURS, WEEK_DAYS, formatHour } from '@/domain/availability';
import { GAME_LIST } from '@/domain/games';
import { resolveDraftFocus, type DraftFocusTarget } from '@/domain/draftFocus';
import { PROPOSAL_DEFAULTS } from '@/domain/proposal';
import {
  NOTES_MAX_LENGTH,
  SESSION_ERRORS,
  TITLE_MAX_LENGTH,
  isValidSessionTitle,
} from '@/domain/sessionRules';
import type { GameId, WeekDay } from '@/domain/types';
import { AppButton } from '@/shared/components/AppButton';
import { Notice } from '@/shared/components/Notice';
import { SelectField } from '@/shared/components/SelectField';
import { TextAreaField } from '@/shared/components/TextAreaField';
import { Spinner } from '@/shared/components/Spinner';
import { Slip } from '@/shared/components/Slip';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { TextField } from '@/shared/components/TextField';
import { useCodePointLimit } from '@/shared/hooks/useCodePointLimit';
import { SENDING_TEXT } from '@/shared/utils/copy';
import { agendaStore } from '../agendaStore';
import { useCreateSession } from '../hooks';
import './sessionDraftSlip.css';

export interface SessionDraft {
  gameId: GameId;
  day: WeekDay;
  startHour: number;
  title?: string;
  /** Duración que trae una propuesta (RF-30); sin ella, 2 horas. */
  durationHours?: number;
}

const DEFAULT_DURATION_HOURS = 2;

interface SessionDraftSlipProps {
  open: boolean;
  draft: SessionDraft;
  /** Juegos que el usuario tiene vinculados; no se publica en otros. */
  availableGames: GameId[];
  onClose: () => void;
}

/** Papeleta para anotar una sesión en un bloque horario concreto. */
export function SessionDraftSlip({
  open,
  draft,
  availableGames,
  onClose,
}: SessionDraftSlipProps) {
  const createSession = useCreateSession();

  const [gameId, setGameId] = useState<GameId>(draft.gameId);
  const [day, setDay] = useState<WeekDay>(draft.day);
  const [startHour, setStartHour] = useState(draft.startHour);
  const [title, setTitle] = useState(draft.title ?? '');
  const [notes, setNotes] = useState<string>(PROPOSAL_DEFAULTS.notes);
  const [durationHours, setDurationHours] = useState(draft.durationHours ?? DEFAULT_DURATION_HOURS);
  const [slots, setSlots] = useState<number>(PROPOSAL_DEFAULTS.slots);
  const [error, setError] = useState<string | null>(null);
  const notesLimit = useCodePointLimit<HTMLTextAreaElement>({
    value: notes,
    onValueChange: setNotes,
    max: NOTES_MAX_LENGTH,
  });
  // Un solo envío por doble clic, aunque el estado de la escritura aún no se haya pintado (RF-20).
  const sending = useRef(false);

  // Foco de la ventana (spec 017, RF-12; reglas puras en `domain/draftFocus.ts`): el título de la ventana al enviar
  // con el botón, y el elemento desde el que se envió tras un error.
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const titleFieldRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: DraftFocusTarget } | null>(null);
  useLayoutEffect(() => {
    if (focusRequest === null) return;
    // El botón de envío solo recibe el foco cuando ya no está deshabilitado.
    if (focusRequest.target === 'submitButton' && createSession.isPending) return;
    const element =
      focusRequest.target === 'dialogTitle'
        ? dialogTitleRef.current
        : focusRequest.target === 'submitButton'
          ? submitRef.current
          : focusRequest.target === 'titleField'
            ? titleFieldRef.current
            : null;
    element?.focus();
    setFocusRequest(null);
  }, [focusRequest, createSession.isPending]);

  // Al abrir el modal desde otra celda (o desde una coincidencia) el formulario
  // se reinicia con el bloque elegido.
  useEffect(() => {
    if (!open) return;
    setGameId(draft.gameId);
    setDay(draft.day);
    setStartHour(draft.startHour);
    setTitle(draft.title ?? '');
    setNotes(PROPOSAL_DEFAULTS.notes);
    setDurationHours(draft.durationHours ?? DEFAULT_DURATION_HOURS);
    setSlots(PROPOSAL_DEFAULTS.slots);
    setError(null);
  }, [open, draft]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setError(null);
    // Con Intro desde «Título» el envío no deshabilita ese campo: el foco sigue en él; con el botón, no.
    const origin = document.activeElement === titleFieldRef.current ? 'enter' : 'button';

    if (!isValidSessionTitle(title)) {
      setError(SESSION_ERRORS.title);
      setFocusRequest({ target: resolveDraftFocus('clientCheckFailed', { origin }) ?? 'titleField' });
      return;
    }

    sending.current = true;
    const started = resolveDraftFocus('submitStarted', { origin });
    if (started !== null) setFocusRequest({ target: started });
    // La visita a la agenda se lee al enviar (spec 016, RF-24): si al responder ya es otra, no vale.
    const agendaVisit = agendaStore.getState().visit;
    try {
      // Abrir la sesión creada lo hace el almacén desde el `onSuccess` (RF-24, DT-9).
      await createSession.mutateAsync({
        payload: { gameId, title, notes, day, startHour, durationHours, slots },
        agendaVisit,
      });
      onClose();
    } catch {
      // El error se muestra con `MutationNotice` desde el estado de la escritura (RF-9).
      setFocusRequest({ target: resolveDraftFocus('failed', { origin }) ?? 'titleField' });
    } finally {
      sending.current = false;
    }
  };

  const games = GAME_LIST.filter((game) => availableGames.includes(game.id));

  return (
    <Slip
      open={open}
      title="Anotar una sesión"
      reference={`${WEEK_DAYS[day].short} ${formatHour(startHour)}`}
      onClose={onClose}
      titleRef={dialogTitleRef}
      footer={
        <>
          <AppButton type="button" onClick={onClose}>
            Cancelar
          </AppButton>
          <AppButton
            ref={submitRef}
            type="submit"
            form="create-session-form"
            tone="pen"
            disabled={createSession.isPending}
          >
            {createSession.isPending ? <Spinner /> : <Icon as={PenLine} size={14} />}
            {createSession.isPending ? SENDING_TEXT : 'Anotar sesión'}
          </AppButton>
        </>
      }
    >
      <form id="create-session-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <Notice tone="error" role="alert">
            <Icon as={AlertCircle} size={15} />
            {error}
          </Notice>
        ) : null}
        <MutationNotice error={createSession.error} />

        <ol className="draft">
          <li className="draft__row">
        <TextField
          ref={titleFieldRef}
          data-autofocus
          label="Título"
          placeholder="Ej.: Ranked flex, buscamos dos"
          value={title}
          onValueChange={setTitle}
          maxCodePoints={TITLE_MAX_LENGTH}
        />
          </li>

          <li className="draft__row">
        <SelectField
          id="session-game"
          label="Juego"
          value={gameId}
          onChange={(value) => setGameId(value as GameId)}
          options={games.map((game) => ({ value: game.id, label: game.name }))}
        />
          </li>

          <li className="draft__row">
        <div className="draft__pair">
          <SelectField
            id="session-day"
            label="Día"
            value={day}
            onChange={(value) => setDay(Number(value) as WeekDay)}
            options={WEEK_DAYS.map((option) => ({ value: option.value, label: option.label }))}
            className="grow"
          />

          <SelectField
            id="session-hour"
            label="Hora de inicio"
            value={startHour}
            onChange={(value) => setStartHour(Number(value))}
            options={GRID_HOURS.map((hour) => ({ value: hour, label: formatHour(hour) }))}
            className="grow"
          />
        </div>
          </li>

          <li className="draft__row">
        <div className="draft__pair">
          <SelectField
            id="session-duration"
            label="Duración (horas)"
            value={durationHours}
            onChange={(value) => setDurationHours(Number(value))}
            options={[1, 2, 3, 4].map((hours) => ({ value: hours, label: String(hours) }))}
            className="grow"
          />

          <SelectField
            id="session-slots"
            label="Cupos"
            value={slots}
            onChange={(value) => setSlots(Number(value))}
            options={[2, 3, 4, 5, 6].map((count) => ({ value: count, label: String(count) }))}
            className="grow"
          />
        </div>
          </li>

          <li className="draft__row">
        <TextAreaField
          id="session-notes"
          label="Notas (opcional)"
          placeholder="Requisitos, tono de la sesión, canal de voz…"
          value={notes}
          limit={notesLimit}
        />
          </li>
        </ol>
      </form>
    </Slip>
  );
}
