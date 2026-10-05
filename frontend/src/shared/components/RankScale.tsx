import { motion } from 'motion/react';
import { getGame } from '@/domain/games';
import type { GameId, RankSnapshot } from '@/domain/types';
import { EASE_OUT } from '@/shared/motion/presets';
import { withAlpha } from '@/shared/utils/ink';
import './rankScale.css';

interface RankScaleProps {
  gameId: GameId;
  history: RankSnapshot[];
  current: RankSnapshot;
}

/**
 * Escala de rango del juego.
 *
 * Muestra dos cosas que una curva no dice: en qué punto de la escala completa
 * del juego está la cuenta (cada tier es una marca real) y cuánto se movió
 * desde la lectura más antigua. El tramo recorrido se dibuja desde la primera
 * lectura hasta la vigente y el marcador llega deslizándose.
 */
export function RankScale({ gameId, history, current }: RankScaleProps) {
  const game = getGame(gameId);
  const first = history[0] ?? current;
  const delta = current.normalized - first.normalized;
  const low = Math.min(first.normalized, current.normalized);
  const high = Math.max(first.normalized, current.normalized);

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
            title={tier}
          />
        ))}

        {/* Tramo recorrido entre la primera lectura y la vigente. */}
        <motion.span
          key={`${gameId}-span`}
          className="rank-scale__span"
          style={{
            left: `${low}%`,
            width: `${Math.max(high - low, 0.8)}%`,
            background: `linear-gradient(90deg, ${withAlpha(game.accent, 0.15)}, ${withAlpha(game.accent, 0.75)})`,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.15 }}
        />

        {history.length > 1 ? (
          <span
            className="rank-scale__past"
            style={{ left: `${first.normalized}%` }}
            title={`Lectura más antigua: ${first.tier}`}
          />
        ) : null}

        {/* El riel ocupa todo el ancho: un x de N% deja el marcador en el N% de
            la escala moviendo solo transform. */}
        <motion.span
          key={`${gameId}-now`}
          className="rank-scale__rail"
          initial={{ x: `${first.normalized}%` }}
          animate={{ x: `${current.normalized}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.2 }}
        >
          <span
            className="rank-scale__now"
            style={{
              background: game.accent,
              boxShadow: `0 0 0 4px ${withAlpha(game.accent, 0.2)}, 0 0 18px ${withAlpha(game.accent, 0.6)}`,
            }}
          />
        </motion.span>
      </div>

      <div className="rank-scale__ends">
        <span className="label">{game.tiers[0]}</span>
        <span className="rank-scale__delta num" data-up={delta >= 0 || undefined}>
          {delta >= 0 ? '▲ +' : '▼ −'}
          {Math.abs(delta)} pts desde la primera lectura
        </span>
        <span className="label">{game.tiers[game.tiers.length - 1]}</span>
      </div>
    </div>
  );
}
