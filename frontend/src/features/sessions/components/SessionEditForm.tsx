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
import { AppButton } from '@/shared/components/AppButton';
import { Notice } from '@/shared/components/Notice';
import { SelectField } from '@/shared/components/SelectField';
import { TextAreaField } from '@/shared/components/TextAreaField';
import { Spinner } from '@/shared/components/Spinner';
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
          <Notice tone="error" role="alert">
            <Icon as={AlertCircle} size={15} />
            {message}
          </Notice>
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
              <SelectField
                id="edit-day"
                label="Día"
                value={values.day}
                onChange={(value) => onChange({ day: Number(value) as WeekDay })}
                options={WEEK_DAYS.map((option) => ({ value: option.value, label: option.label }))}
                className="grow"
              />

              <SelectField
                id="edit-hour"
                label="Hora de inicio"
                value={values.startHour}
                onChange={(value) => onChange({ startHour: Number(value) })}
                options={startHourOptions(session.startHour).map((hour) => ({ value: hour, label: formatHour(hour) }))}
                className="grow"
              />
            </div>
          </li>

          <li className="draft__row">
            <div className="draft__pair">
              <SelectField
                id="edit-duration"
                label="Duración (horas)"
                value={values.durationHours}
                onChange={(value) => onChange({ durationHours: Number(value) })}
                options={[1, 2, 3, 4].map((hours) => ({ value: hours, label: String(hours) }))}
                className="grow"
              />

              <SelectField
                id="edit-slots"
                label="Cupos"
                value={values.slots}
                onChange={(value) => onChange({ slots: Number(value) })}
                options={slotOptions(slotRange(session)).map((count) => ({ value: count, label: String(count) }))}
                className="grow"
              />
            </div>
          </li>

          <li className="draft__row">
            <TextAreaField
              id="edit-notes"
              label="Notas (opcional)"
              placeholder="Requisitos, tono de la sesión, canal de voz…"
              value={values.notes}
              limit={notesLimit}
            />
          </li>
        </ol>

        <div className="session-detail__actions">
          <AppButton
            type="button"
            onClick={saving ? undefined : onDiscard}
            aria-disabled={saving ? true : undefined}
          >
            {DISCARD_LABEL}
          </AppButton>
          <AppButton
            ref={saveRef}
            type="submit"
            tone="pen"
            disabled={saving}
            aria-disabled={rereading ? true : undefined}
            onClick={rereading ? (event) => event.preventDefault() : undefined}
          >
            {saving ? <Spinner /> : null}
            {saving ? SENDING_TEXT : SAVE_CHANGES_LABEL}
          </AppButton>
        </div>
      </form>
    </section>
  );
}
