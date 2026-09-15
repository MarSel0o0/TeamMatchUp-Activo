import { useCallback, useEffect, useRef, useState } from 'react';
import { GRID_HOURS, WEEK_DAYS, formatHour, toBlock } from '@/domain/availability';
import type { TimeBlock, WeekDay } from '@/domain/types';
import './availabilityGrid.css';

interface AvailabilityGridProps {
  value: TimeBlock[];
  onChange?: (blocks: TimeBlock[]) => void;
  /** Bloques de otro usuario, resaltados para visualizar el traslape. */
  compareWith?: TimeBlock[];
  readOnly?: boolean;
}

/**
 * Grilla semanal de disponibilidad.
 *
 * Soporta pintado por arrastre (se mantiene presionado y se recorren celdas) y
 * también teclado, porque cada celda es un botón real: así la vista sigue siendo
 * usable sin mouse.
 */
export function AvailabilityGrid({
  value,
  onChange,
  compareWith,
  readOnly = false,
}: AvailabilityGridProps) {
  const selected = new Set(value);
  const shared = compareWith ? new Set(compareWith) : null;

  // `paintMode` recuerda si el arrastre actual agrega o quita bloques, para que
  // el gesto completo sea coherente con la celda donde empezó.
  const paintMode = useRef<'add' | 'remove' | null>(null);
  const [isPainting, setIsPainting] = useState(false);

  const applyBlock = useCallback(
    (block: TimeBlock, mode: 'add' | 'remove') => {
      if (!onChange) return;
      const next = new Set(value);
      if (mode === 'add') next.add(block);
      else next.delete(block);
      onChange([...next]);
    },
    [onChange, value],
  );

  useEffect(() => {
    if (!isPainting) return;
    const stop = () => {
      paintMode.current = null;
      setIsPainting(false);
    };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [isPainting]);

  const startPainting = (block: TimeBlock) => {
    if (readOnly) return;
    const mode = selected.has(block) ? 'remove' : 'add';
    paintMode.current = mode;
    setIsPainting(true);
    applyBlock(block, mode);
  };

  const continuePainting = (block: TimeBlock) => {
    if (readOnly || !paintMode.current) return;
    applyBlock(block, paintMode.current);
  };

  const toggle = (block: TimeBlock) => {
    if (readOnly) return;
    applyBlock(block, selected.has(block) ? 'remove' : 'add');
  };

  return (
    <div className={`availability${readOnly ? ' is-readonly' : ''}`}>
      <div className="availability__grid" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
        <span />
        {WEEK_DAYS.map((day) => (
          <span key={day.value} className="availability__day">
            {day.short}
          </span>
        ))}

        {GRID_HOURS.map((hour) => (
          <Row
            key={hour}
            hour={hour}
            selected={selected}
            shared={shared}
            readOnly={readOnly}
            onStart={startPainting}
            onEnter={continuePainting}
            onToggle={toggle}
          />
        ))}
      </div>

      <div className="availability__legend">
        <span className="row">
          <i className="availability__swatch is-selected" /> Tu disponibilidad
        </span>
        {compareWith ? (
          <span className="row">
            <i className="availability__swatch is-shared" /> Horario en común
          </span>
        ) : null}
        {!readOnly ? (
          <span className="faint">Haz clic o arrastra sobre la grilla para marcar tus bloques.</span>
        ) : null}
      </div>
    </div>
  );
}

interface RowProps {
  hour: number;
  selected: Set<TimeBlock>;
  shared: Set<TimeBlock> | null;
  readOnly: boolean;
  onStart: (block: TimeBlock) => void;
  onEnter: (block: TimeBlock) => void;
  onToggle: (block: TimeBlock) => void;
}

function Row({ hour, selected, shared, readOnly, onStart, onEnter, onToggle }: RowProps) {
  return (
    <>
      <span className="availability__hour">{formatHour(hour)}</span>
      {WEEK_DAYS.map((day) => {
        const block = toBlock(day.value as WeekDay, hour);
        const isSelected = selected.has(block);
        const isShared = Boolean(shared?.has(block));

        return (
          <button
            key={block}
            type="button"
            className={`availability__cell${isSelected ? ' is-selected' : ''}${
              isShared ? ' is-shared' : ''
            }`}
            aria-pressed={isSelected}
            aria-label={`${day.label} ${formatHour(hour)}${isShared ? ' (horario en común)' : ''}`}
            disabled={readOnly}
            onMouseDown={() => onStart(block)}
            onMouseEnter={() => onEnter(block)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggle(block);
              }
            }}
          />
        );
      })}
    </>
  );
}
