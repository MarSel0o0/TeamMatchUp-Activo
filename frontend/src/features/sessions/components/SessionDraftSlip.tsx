import { AlertCircle, PenLine } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { GRID_HOURS, WEEK_DAYS, formatHour } from '@/domain/availability';
import { GAME_LIST } from '@/domain/games';
import type { GameId, WeekDay } from '@/domain/types';
import { Slip } from '@/shared/components/Slip';
import { Icon } from '@/shared/components/Icon';
import { TextField } from '@/shared/components/TextField';
import { useCreateSession } from '../hooks';
import './sessionDraftSlip.css';

export interface SessionDraft {
  gameId: GameId;
  day: WeekDay;
  startHour: number;
  title?: string;
}

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
  const [notes, setNotes] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [slots, setSlots] = useState(5);
  const [error, setError] = useState<string | null>(null);

  // Al abrir el modal desde otra celda (o desde una coincidencia) el formulario
  // se reinicia con el bloque elegido.
  useEffect(() => {
    if (!open) return;
    setGameId(draft.gameId);
    setDay(draft.day);
    setStartHour(draft.startHour);
    setTitle(draft.title ?? '');
    setNotes('');
    setError(null);
  }, [open, draft]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Ponle un título a la sesión para que otros sepan de qué se trata.');
      return;
    }

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
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : 'No se pudo publicar la sesión.',
      );
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
            {createSession.isPending ? 'Anotando…' : 'Anotar sesión'}
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

        <ol className="draft">
          <li className="draft__row">
        <TextField
          label="Título"
          placeholder="Ej.: Ranked flex, buscamos dos"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={60}
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
            maxLength={160}
            placeholder="Requisitos, tono de la sesión, canal de voz…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
          </li>
        </ol>
      </form>
    </Slip>
  );
}
