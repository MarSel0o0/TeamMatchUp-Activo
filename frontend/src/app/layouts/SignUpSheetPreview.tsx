import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { GAMES } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { EASE_OUT } from '@/shared/motion/presets';
import './signUpSheetPreview.css';

interface PreviewLine {
  hour: string;
  gameId: GameId;
  signed: string[];
  slots: number;
}

/**
 * Salas de una noche de muestra.
 *
 * Es una demostración del formato, no un dato: los nombres están etiquetados
 * como muestra para que nadie los confunda con actividad real de la plataforma.
 */
const SAMPLE: PreviewLine[] = [
  { hour: '20:00', gameId: 'lol', signed: ['C. Torres', 'D. Ayala', 'V. Oliva'], slots: 5 },
  { hour: '21:00', gameId: 'cs2', signed: ['M. Zamorano', 'R. Pizarro'], slots: 5 },
  { hour: '22:00', gameId: 'r6', signed: ['B. Estupiñán', 'P. Herrera', 'J. Rojas', 'K. Méndez', 'S. Valenzuela'], slots: 5 },
  { hour: '23:00', gameId: 'lol', signed: ['I. Soto'], slots: 5 },
];

const initials = (name: string) =>
  name
    .replace('.', '')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

export function SignUpSheetPreview() {
  return (
    <figure className="preview">
      <div className="preview__head">
        <span className="preview__day">Jueves</span>
        <span className="label">Salas abiertas</span>
      </div>

      <motion.ul
        className="preview__lines"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      >
        {SAMPLE.map((line) => {
          const game = GAMES[line.gameId];
          return (
            <motion.li
              key={line.hour}
              className="preview__line"
              style={{ '--game': game.accent } as CSSProperties}
              variants={{
                hidden: { opacity: 0, x: -16 },
                show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT } },
              }}
            >
              <span className="preview__hour num">{line.hour}</span>
              <span className="preview__game">{game.shortName}</span>
              <span className="preview__avatars" title={line.signed.join(', ')}>
                {line.signed.map((name, index) => (
                  <span key={name} className="preview__avatar" style={{ zIndex: 10 - index }}>
                    {initials(name)}
                  </span>
                ))}
              </span>
              <span className="preview__slots" aria-label={`${line.signed.length} de ${line.slots} cupos`}>
                {Array.from({ length: line.slots }, (_, slot) => (
                  <span key={slot} className="preview__pip" data-on={slot < line.signed.length || undefined} />
                ))}
              </span>
            </motion.li>
          );
        })}
      </motion.ul>

      <figcaption className="preview__caption">
        Muestra del formato. Ninguno de estos nombres es actividad real.
      </figcaption>
    </figure>
  );
}
