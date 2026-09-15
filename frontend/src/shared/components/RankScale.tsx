import { getGame } from '@/domain/games';
import type { GameId, RankSnapshot } from '@/domain/types';
import './rankScale.css';

interface RankScaleProps {
  gameId: GameId;
  history: RankSnapshot[];
  current: RankSnapshot;
}

/**
 * Escala de rango del juego, dibujada como la regla graduada de un formulario.
 *
 * Muestra dos cosas que una curva no dice: en qué punto de la escala completa
 * del juego está la cuenta —cada tier es una marca real— y cuánto se movió desde
 * la lectura más antigua registrada.
 */
export function RankScale({ gameId, history, current }: RankScaleProps) {
  const game = getGame(gameId);
  const first = history[0] ?? current;
  const delta = current.normalized - first.normalized;

  return (
    <div className="rank-scale">
      <div
        className="rank-scale__track"
        role="img"
        aria-label={`${current.tier} en la escala de ${game.name}: ${current.normalized} de 100, ${
          delta >= 0 ? 'subió' : 'bajó'
        } ${Math.abs(delta)} puntos desde la lectura más antigua.`}
      >
        {game.tiers.map((tier, index) => (
          <span
            key={tier}
            className="rank-scale__tick"
            style={{ left: `${(index / (game.tiers.length - 1)) * 100}%` }}
            data-first={index === 0 || undefined}
            data-last={index === game.tiers.length - 1 || undefined}
          />
        ))}

        {/* Lectura más antigua: marca tenue, como una anotación anterior. */}
        {history.length > 1 ? (
          <span
            className="rank-scale__past"
            style={{ left: `${first.normalized}%` }}
            title={`Lectura más antigua: ${first.tier}`}
          />
        ) : null}

        <span
          className="rank-scale__now"
          style={{ left: `${current.normalized}%`, background: game.accent }}
        />
      </div>

      <div className="rank-scale__ends">
        <span className="label">{game.tiers[0]}</span>
        <span className="rank-scale__delta" data-up={delta >= 0 || undefined}>
          {delta >= 0 ? '+' : '−'}
          {Math.abs(delta)} pts desde la primera lectura
        </span>
        <span className="label">{game.tiers[game.tiers.length - 1]}</span>
      </div>
    </div>
  );
}
