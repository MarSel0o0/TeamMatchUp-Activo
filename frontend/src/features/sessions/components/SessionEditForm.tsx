import type { FormEvent, KeyboardEvent, Ref } from 'react';
import { AlertCircle } from 'lucide-react';
import { WEEK_DAYS, formatHour } from '@/domain/availability';
import { getGame } from '@/domain/games';
import {
  slotOptions,
  slotRange,
  startHourOptions,
  type EditFormValues,
} from '@/domain/sessionDetail';
import { NOTES_MAX_LENGTH, TITLE_MAX_LENGTH } from '@/domain/sessionRules';
import type { PlaySession, WeekDay } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import { TextField } from '@/shared/components/TextField';
import { useCodePointLimit } from '@/shared/hooks/useCodePointLimit';
import { DISCARD_LABEL, SAVE_CHANGES_LABEL, SENDING_TEXT } from '@/shared/utils/copy';
import './sessionDraftSlip.css';

interface SessionEditFormProps {
  /** La sesión que se muestra (juego, hora guardada y rango de cupos salen de ella). */
  session: PlaySession;
  values: EditFormValues;
  onChange: (patch: Partial<EditFormValues>) => void;
  message: string | null;
  /** Guardado en curso: «Guardar cambios» queda `disabled` con «Enviando…» y «Descartar» bloqueado. */
  saving: boolean;
  /** Nueva lectura en curso: «Guardar cambios» queda bloqueado; «Descartar» funciona. */
  rereading: boolean;
  onSubmit: (origin: 'button' | 'titleEnter') => void;
  onDiscard: () => void;
  titleRef: Ref<HTMLInputElement>;
  saveRef: Ref<HTMLButtonElement>;
}

/**
 * Formulario de edición de la sesión, en la página (spec 009, RF-6, RF-22; plan 5.5). Las
 * comprobaciones las hace `checkEditForm` en el controlador; aquí solo se dibuja y se avisa.
 */
export function SessionEditForm({
  session,
  values,
  onChange,
  message,
  saving,
  rereading,
  onSubmit,
  onDiscard,
  titleRef,
  saveRef,
}: SessionEditFormProps) {
  const notesLimit = useCodePointLimit<HTMLTextAreaElement>({
    value: values.notes,
    onValueChange: (notes) => onChange({ notes }),
    max: NOTES_MAX_LENGTH,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit('button');
  };

  // Intro en «Título» envía el formulario y el foco vuelve a ese campo (RNF-2, caso 7).
  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onSubmit('titleEnter');
  };

  return (
    <section className="sheet session-detail__sheet">
      <form id="edit-session-form" onSubmit={handleSubmit} noValidate>
        {message ? (
          <p className="notice notice--error" role="alert">
            <Icon as={AlertCircle} size={15} />
            {message}
          </p>
        ) : null}

        <ol className="draft">
          <li className="draft__row">
            <TextField
              ref={titleRef}
              label="Título"
              value={values.title}
              onValueChange={(title) => onChange({ title })}
              maxCodePoints={TITLE_MAX_LENGTH}
              onKeyDown={handleTitleKeyDown}
            />
          </li>

          <li className="draft__row">
            <div className="field">
              <span className="label">Juego</span>
              <p className="note">{getGame(session.gameId).name}</p>
            </div>
          </li>

          <li className="draft__row">
            <div className="draft__pair">
              <div className="field grow">
                <label className="label" htmlFor="edit-day">
                  Día
                </label>
                <select
                  id="edit-day"
                  className="select"
                  value={values.day}
                  onChange={(event) => onChange({ day: Number(event.target.value) as WeekDay })}
                >
                  {WEEK_DAYS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field grow">
                <label className="label" htmlFor="edit-hour">
                  Hora de inicio
                </label>
                <select
                  id="edit-hour"
                  className="select"
                  value={values.startHour}
                  onChange={(event) => onChange({ startHour: Number(event.target.value) })}
                >
                  {startHourOptions(session.startHour).map((hour) => (
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
                <label className="label" htmlFor="edit-duration">
                  Duración (horas)
                </label>
                <select
                  id="edit-duration"
                  className="select"
                  value={values.durationHours}
                  onChange={(event) => onChange({ durationHours: Number(event.target.value) })}
                >
                  {[1, 2, 3, 4].map((hours) => (
                    <option key={hours} value={hours}>
                      {hours}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field grow">
                <label className="label" htmlFor="edit-slots">
                  Cupos
                </label>
                <select
                  id="edit-slots"
                  className="select"
                  value={values.slots}
                  onChange={(event) => onChange({ slots: Number(event.target.value) })}
                >
                  {slotOptions(slotRange(session)).map((count) => (
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
              <label className="label" htmlFor="edit-notes">
                Notas (opcional)
              </label>
              <textarea
                id="edit-notes"
                className="textarea"
                placeholder="Requisitos, tono de la sesión, canal de voz…"
                value={values.notes}
                {...notesLimit}
              />
            </div>
          </li>
        </ol>

        <div className="session-detail__actions">
          <button
            type="button"
            className="btn"
            onClick={saving ? undefined : onDiscard}
            aria-disabled={saving ? true : undefined}
          >
            {DISCARD_LABEL}
          </button>
          <button
            ref={saveRef}
            type="submit"
            className="btn btn--pen"
            disabled={saving}
            aria-disabled={rereading ? true : undefined}
            onClick={rereading ? (event) => event.preventDefault() : undefined}
          >
            {saving ? <span className="btn__spin" /> : null}
            {saving ? SENDING_TEXT : SAVE_CHANGES_LABEL}
          </button>
        </div>
      </form>
    </section>
  );
}
