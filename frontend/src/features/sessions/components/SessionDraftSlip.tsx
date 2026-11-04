import { AlertCircle, PenLine } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GRID_HOURS, WEEK_DAYS, formatHour } from '@/domain/availability';
import { GAME_LIST } from '@/domain/games';
import { PROPOSAL_DEFAULTS } from '@/domain/proposal';
import {
  NOTES_MAX_LENGTH,
  SESSION_ERRORS,
  TITLE_MAX_LENGTH,
  isValidSessionTitle,
} from '@/domain/sessionRules';
import type { GameId, WeekDay } from '@/domain/types';
import { Slip } from '@/shared/components/Slip';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { TextField } from '@/shared/components/TextField';
import { useCodePointLimit } from '@/shared/hooks/useCodePointLimit';
import { SENDING_TEXT } from '@/shared/utils/copy';
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
  /** La agenda abre la sesión recién anotada para que el sello caiga sobre ella. */
  onCreated?: (sessionId: string) => void;
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
  onCreated,
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

    if (!isValidSessionTitle(title)) {
      setError(SESSION_ERRORS.title);
      return;
    }

    sending.current = true;
    try {
      const created = await createSession.mutateAsync({
        gameId,
        title,
        notes,
        day,
        startHour,
        durationHours,
        slots,
      });
      onCreated?.(created.id);
      onClose();
    } catch {
      // El error se muestra con `MutationNotice` desde el estado de la escritura (RF-9).
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
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="create-session-form"
            className="btn btn--pen"
            disabled={createSession.isPending}
          >
            {createSession.isPending ? <span className="btn__spin" /> : <Icon as={PenLine} size={14} />}
            {createSession.isPending ? SENDING_TEXT : 'Anotar sesión'}
          </button>
        </>
      }
    >
      <form id="create-session-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <p className="notice notice--error" role="alert">
            <Icon as={AlertCircle} size={15} />
            {error}
          </p>
        ) : null}
        <MutationNotice error={createSession.error} />

        <ol className="draft">
          <li className="draft__row">
        <TextField
          label="Título"
          placeholder="Ej.: Ranked flex, buscamos dos"
          value={title}
          onValueChange={setTitle}
          maxCodePoints={TITLE_MAX_LENGTH}
        />
          </li>

          <li className="draft__row">
        <div className="field">
          <label className="label" htmlFor="session-game">
            Juego
          </label>
          <select
            id="session-game"
            className="select"
            value={gameId}
            onChange={(event) => setGameId(event.target.value as GameId)}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
          </li>

          <li className="draft__row">
        <div className="draft__pair">
          <div className="field grow">
            <label className="label" htmlFor="session-day">
              Día
            </label>
            <select
              id="session-day"
              className="select"
              value={day}
              onChange={(event) => setDay(Number(event.target.value) as WeekDay)}
            >
              {WEEK_DAYS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field grow">
            <label className="label" htmlFor="session-hour">
              Hora de inicio
            </label>
            <select
              id="session-hour"
              className="select"
              value={startHour}
              onChange={(event) => setStartHour(Number(event.target.value))}
            >
              {GRID_HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </div>
        </div>
          </li>

          <li className="draft__row">
        <div className="draft__pair">
          <div className="field grow">
            <label className="label" htmlFor="session-duration">
              Duración (horas)
            </label>
            <select
              id="session-duration"
              className="select"
              value={durationHours}
              onChange={(event) => setDurationHours(Number(event.target.value))}
            >
              {[1, 2, 3, 4].map((hours) => (
                <option key={hours} value={hours}>
                  {hours}
                </option>
              ))}
            </select>
          </div>

          <div className="field grow">
            <label className="label" htmlFor="session-slots">
              Cupos
            </label>
            <select
              id="session-slots"
              className="select"
              value={slots}
              onChange={(event) => setSlots(Number(event.target.value))}
            >
              {[2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
        </div>
          </li>

          <li className="draft__row">
        <div className="field">
          <label className="label" htmlFor="session-notes">
            Notas (opcional)
          </label>
          <textarea
            id="session-notes"
            className="textarea"
            placeholder="Requisitos, tono de la sesión, canal de voz…"
            value={notes}
            {...notesLimit}
          />
        </div>
          </li>
        </ol>
      </form>
    </Slip>
  );
}
