import { GRID_HOURS, WEEK_DAYS, formatHour } from '@/domain/availability';
import { getGame } from '@/domain/games';
import type { PlaySession, TimeBlock, WeekDay } from '@/domain/types';
import { layoutWeek } from './layout';
import './weekCalendar.css';

interface WeekCalendarProps {
  sessions: PlaySession[];
  /** Disponibilidad propia: los bloques libres se sombrean de fondo. */
  availability: TimeBlock[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onSelectSlot: (day: WeekDay, hour: number) => void;
}

/**
 * Calendario semanal.
 *
 * Las sesiones se ubican en la celda de su hora de inicio, se extienden tantas
 * filas como dure la sesión y, cuando dos se pisan, comparten el ancho de la
 * columna del día. Hacer clic en una celda vacía abre el formulario con ese
 * bloque ya elegido.
 */
export function WeekCalendar({
  sessions,
  availability,
  selectedSessionId,
  onSelectSession,
  onSelectSlot,
}: WeekCalendarProps) {
  const availableBlocks = new Set(availability);
  const positioned = layoutWeek(sessions);

  return (
    <div className="week-calendar" role="grid" aria-label="Agenda semanal de sesiones">
      <div className="week-calendar__grid">
        <span />
        {WEEK_DAYS.map((day) => (
          <span key={day.value} className="week-calendar__day">
            {day.short}
          </span>
        ))}

        {GRID_HOURS.map((hour, rowIndex) => (
          <Row
            key={hour}
            hour={hour}
            rowIndex={rowIndex}
            availableBlocks={availableBlocks}
            onSelectSlot={onSelectSlot}
          />
        ))}

        {positioned.map(({ session, day, rowIndex, span, column, columns }) => {
          const game = getGame(session.gameId);
          const isSelected = session.id === selectedSessionId;

          return (
            <button
              key={session.id}
              type="button"
              className={`week-calendar__session${isSelected ? ' is-selected' : ''}`}
              style={{
                gridColumn: day + 2,
                gridRow: `${rowIndex + 2} / span ${span}`,
                // Reparto horizontal entre las sesiones que se solapan.
                width: `calc(100% / ${columns})`,
                marginLeft: `calc(${column} * 100% / ${columns})`,
                background: `${game.accent}26`,
                borderColor: game.accent,
              }}
              onClick={() => onSelectSession(session.id)}
              aria-label={`${session.title}, ${WEEK_DAYS[session.day].label} ${formatHour(session.startHour)}, ${session.participants.length} de ${session.slots} jugadores`}
              title={`${session.title} · ${formatHour(session.startHour)}–${formatHour((session.startHour + session.durationHours) % 24)}`}
            >
              <span className="week-calendar__session-title">{session.title}</span>
              <span className="week-calendar__session-meta">
                {game.shortName} · {session.participants.length}/{session.slots}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface RowProps {
  hour: number;
  rowIndex: number;
  availableBlocks: Set<string>;
  onSelectSlot: (day: WeekDay, hour: number) => void;
}

function Row({ hour, rowIndex, availableBlocks, onSelectSlot }: RowProps) {
  return (
    <>
      <span className="week-calendar__hour" style={{ gridRow: rowIndex + 2 }}>
        {formatHour(hour)}
      </span>
      {WEEK_DAYS.map((day) => (
        <button
          key={`${day.value}-${hour}`}
          type="button"
          className={`week-calendar__cell${
            availableBlocks.has(`${day.value}-${hour}`) ? ' is-available' : ''
          }`}
          style={{ gridColumn: day.value + 2, gridRow: rowIndex + 2 }}
          onClick={() => onSelectSlot(day.value, hour)}
          aria-label={`Publicar sesión el ${day.label} a las ${formatHour(hour)}`}
        />
      ))}
    </>
  );
}
