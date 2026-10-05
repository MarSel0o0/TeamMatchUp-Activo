import { Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { GRID_HOURS, WEEK_DAYS, formatHour } from '@/domain/availability';
import { getGame } from '@/domain/games';
import type { PlaySession, TimeBlock, WeekDay } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import { withAlpha } from '@/shared/utils/ink';
import { layoutWeek } from './layout';
import './weekCalendar.css';

interface WeekCalendarProps {
  sessions: PlaySession[];
  /** Horas propias: se iluminan para saber dónde puedes comprometerte. */
  availability: TimeBlock[];
  selectedSessionId: string | null;
  currentUserId: string;
  onSelectSession: (sessionId: string) => void;
  onSelectSlot: (day: WeekDay, hour: number) => void;
}

/**
 * La semana.
 *
 * Siete columnas de día, las horas en el margen y las sesiones publicadas
 * ocupando sus bloques con la tinta de su juego. Un bloque vacío dentro de tus
 * horas ofrece anotar una sesión ahí mismo.
 */
export function WeekCalendar({
  sessions,
  availability,
  selectedSessionId,
  currentUserId,
  onSelectSession,
  onSelectSlot,
}: WeekCalendarProps) {
  const openHours = new Set(availability);
  const positioned = layoutWeek(sessions);

  return (
    <div className="week">
      <div className="week__grid">
        <span className="week__corner" />
        {WEEK_DAYS.map((day) => (
          <span key={day.value} className="week__day">
            {day.short}
          </span>
        ))}

        {GRID_HOURS.map((hour, rowIndex) => (
          <Row
            key={hour}
            hour={hour}
            rowIndex={rowIndex}
            openHours={openHours}
            onSelectSlot={onSelectSlot}
          />
        ))}

        {positioned.map(({ session, day, rowIndex, span, column, columns }, order) => {
          const game = getGame(session.gameId);
          const selected = session.id === selectedSessionId;
          const signed = session.participants.some(
            (participant) => participant.id === currentUserId,
          );

          return (
            <button
              key={session.id}
              type="button"
              className="week__session"
              data-selected={selected || undefined}
              data-signed={signed || undefined}
              style={{
                gridColumn: day + 2,
                gridRow: `${rowIndex + 2} / span ${span}`,
                // Reparto horizontal entre las sesiones que se pisan.
                width: `calc(100% / ${columns})`,
                marginLeft: `calc(${column} * 100% / ${columns})`,
                background: `linear-gradient(160deg, ${withAlpha(game.accent, 0.26)}, ${withAlpha(game.accent, 0.1)})`,
                borderColor: withAlpha(game.accent, 0.5),
                '--game': game.accent,
                '--i': order,
              } as CSSProperties}
              onClick={() => onSelectSession(session.id)}
              aria-label={`${session.title}, ${WEEK_DAYS[session.day].label} ${formatHour(
                session.startHour,
              )}, ${session.participants.length} de ${session.slots} jugadores`}
              title={`${session.title} · ${formatHour(session.startHour)}–${formatHour(
                (session.startHour + session.durationHours) % 24,
              )}`}
            >
              <span className="week__session-title">{session.title}</span>
              <span className="week__session-meta num">
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
  openHours: Set<string>;
  onSelectSlot: (day: WeekDay, hour: number) => void;
}

function Row({ hour, rowIndex, openHours, onSelectSlot }: RowProps) {
  return (
    <>
      <span className="week__hour" style={{ gridRow: rowIndex + 2 }}>
        {formatHour(hour)}
      </span>
      {WEEK_DAYS.map((day) => {
        const isOpen = openHours.has(`${day.value}-${hour}`);
        return (
          <button
            key={`${day.value}-${hour}`}
            type="button"
            className="week__slot"
            data-open={isOpen || undefined}
            style={{ gridColumn: day.value + 2, gridRow: rowIndex + 2 }}
            onClick={() => onSelectSlot(day.value, hour)}
            aria-label={`Anotar una sesión el ${day.label} a las ${formatHour(hour)}`}
          >
            <Icon as={Plus} size={12} />
          </button>
        );
      })}
    </>
  );
}
