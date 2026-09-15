import { GAMES } from '@/domain/games';
import type { GameId } from '@/domain/types';
import './signUpSheetPreview.css';

interface PreviewLine {
  hour: string;
  gameId: GameId;
  signed: string[];
  slots: number;
}

/**
 * Fragmento de hoja firmada.
 *
 * Es una demostración del artefacto, no un dato: las firmas están etiquetadas
 * como muestra para que nadie las confunda con actividad real de la plataforma.
 */
const SAMPLE: PreviewLine[] = [
  { hour: '20:00', gameId: 'lol', signed: ['C. Torres', 'D. Ayala', 'V. Oliva'], slots: 5 },
  { hour: '21:00', gameId: 'cs2', signed: ['M. Zamorano', 'R. Pizarro'], slots: 5 },
  { hour: '22:00', gameId: 'r6', signed: ['B. Estupiñán', 'P. Herrera', 'J. Rojas', 'K. Méndez'], slots: 5 },
  { hour: '23:00', gameId: 'lol', signed: ['I. Soto'], slots: 5 },
];

export function SignUpSheetPreview() {
  return (
    <figure className="preview sheet sheet--punched">
      <div className="sheet__head">
        <h2 className="sheet-title">Jueves</h2>
        <span className="label">Bloques firmados</span>
      </div>

      <ul className="preview__lines">
        {SAMPLE.map((line, index) => {
          const game = GAMES[line.gameId];
          return (
            <li key={line.hour} className="preview__line" data-band={index % 2 === 1 || undefined}>
              <span className="preview__hour num">{line.hour}</span>
              <span className="preview__ink" style={{ background: game.accent }} />
              <span className="preview__signed">
                {line.signed.map((name) => (
                  <span key={name} className="preview__name">
                    {name}
                  </span>
                ))}
                {Array.from({ length: line.slots - line.signed.length }, (_, slot) => (
                  <span key={`open-${slot}`} className="preview__open" />
                ))}
              </span>
              <span className="preview__count num">
                {line.signed.length}/{line.slots}
              </span>
            </li>
          );
        })}
      </ul>

      <figcaption className="sheet__foot">
        <span>Muestra del formato. Ninguna de estas firmas es actividad real.</span>
      </figcaption>
    </figure>
  );
}
