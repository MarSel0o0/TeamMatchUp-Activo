import { useCallback, useEffect, useRef, useState } from 'react';
import { GRID_HOURS, WEEK_DAYS, formatHour, toBlock } from '@/domain/availability';
import type { TimeBlock, WeekDay } from '@/domain/types';
import './hoursSheet.css';

interface HoursSheetProps {
  value: TimeBlock[];
  onChange?: (blocks: TimeBlock[]) => void;
  /** Bloques de otra persona: se marcan como horario en común. */
  compareWith?: TimeBlock[];
  readOnly?: boolean;
  compact?: boolean;
}

/**
 * La hoja de horas.
 *
 * Siete columnas de día, las horas como filas numeradas contra el margen
 * troquelado. Se rellena arrastrando —como quien recorre una planilla con el
 * lápiz— y también con teclado, porque cada casilla es un botón real.
 */
export function HoursSheet({
  value,
  onChange,
  compareWith,
  readOnly = false,
  compact = false,
}: HoursSheetProps) {
  const marked = new Set(value);
  const shared = compareWith ? new Set(compareWith) : null;

  /** Recuerda si el trazo en curso rellena o borra, para que el gesto sea coherente. */
  const strokeMode = useRef<'fill' | 'clear' | null>(null);
  const [drawing, setDrawing] = useState(false);

  const apply = useCallback(
    (block: TimeBlock, mode: 'fill' | 'clear') => {
      if (!onChange) return;
      const next = new Set(value);
      if (mode === 'fill') next.add(block);
      else next.delete(block);
      onChange([...next]);
    },
    [onChange, value],
  );

  useEffect(() => {
    if (!drawing) return;
    const stop = () => {
      strokeMode.current = null;
      setDrawing(false);
    };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [drawing]);

  const startStroke = (block: TimeBlock) => {
    if (readOnly) return;
    const mode = marked.has(block) ? 'clear' : 'fill';
    strokeMode.current = mode;
    setDrawing(true);
    apply(block, mode);
  };

  const continueStroke = (block: TimeBlock) => {
    if (readOnly || !strokeMode.current) return;
    apply(block, strokeMode.current);
  };

  const toggle = (block: TimeBlock) => {
    if (readOnly) return;
    apply(block, marked.has(block) ? 'clear' : 'fill');
  };

  return (
    <div
      className={`hours${compact ? ' hours--compact' : ''}${readOnly ? ' hours--locked' : ''}`}
      // Con una segunda disponibilidad encima, lo saturado pasa a ser el
      // traslape: es el dato que la vista existe para mostrar. Sin comparación,
      // las horas propias son el contenido y se pintan enteras.
      data-compare={shared ? '' : undefined}
    >
      <div className="hours__grid">
        <span className="hours__corner" />
        {WEEK_DAYS.map((day) => (
          <span key={day.value} className="hours__day">
            {day.short}
          </span>
        ))}

        {GRID_HOURS.map((hour, rowIndex) => (
          <div key={hour} className="hours__row" role="row">
            <span className="hours__hour" data-band={rowIndex % 2 === 1 || undefined}>
              {formatHour(hour)}
            </span>
            {WEEK_DAYS.map((day) => {
              const block = toBlock(day.value as WeekDay, hour);
              const isMarked = marked.has(block);
              const isShared = Boolean(shared?.has(block));

              return (
                <button
                  key={block}
                  type="button"
                  className="hours__cell"
                  data-band={rowIndex % 2 === 1 || undefined}
                  data-marked={isMarked || undefined}
                  data-shared={isShared || undefined}
                  aria-pressed={readOnly ? undefined : isMarked}
                  aria-label={`${day.label} ${formatHour(hour)}${
                    isShared ? ', horario en común' : isMarked ? ', marcado' : ''
                  }`}
                  disabled={readOnly}
                  onMouseDown={() => startStroke(block)}
                  onMouseEnter={() => continueStroke(block)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggle(block);
                    }
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="hours__key">
        <span className="hours__key-item">
          <i className="hours__swatch" data-marked /> Tus horas
        </span>
        {compareWith ? (
          <span className="hours__key-item">
            <i className="hours__swatch" data-shared /> Horas en común
          </span>
        ) : null}
        {!readOnly ? (
          <span className="note note--faint">
            Arrastra sobre la hoja para marcar; vuelve a pasar para borrar.
          </span>
        ) : null}
      </div>
    </div>
  );
}
