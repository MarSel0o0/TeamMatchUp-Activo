import { motion } from 'motion/react';
import { useId } from 'react';
import { getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { SPRING } from '@/shared/motion/presets';
import './gameTabs.css';

interface GameTabsProps {
  games: GameId[];
  value: GameId;
  onChange: (gameId: GameId) => void;
  label?: string;
}

/**
 * Selector de juego segmentado. La píldora activa se desliza con resorte hasta
 * el juego elegido y toma su tinta. El cambio no recarga la página; solo
 * relanza la consulta del juego elegido.
 */
export function GameTabs({ games, value, onChange, label = 'Juego' }: GameTabsProps) {
  // Un layoutId por instancia: dos selectores en pantalla no comparten píldora.
  const pillId = useId();

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {games.map((gameId) => {
        const game = getGame(gameId);
        const selected = gameId === value;

        return (
          <button
            key={gameId}
            type="button"
            role="tab"
            aria-selected={selected}
            className="tabs__tab"
            onClick={() => onChange(gameId)}
          >
            {selected ? (
              <motion.span
                layoutId={pillId}
                className="tabs__pill"
                style={{ background: game.accent }}
                transition={SPRING}
              />
            ) : null}
            <span className="tabs__dot" style={{ background: game.accent }} />
            <span className="tabs__name">{game.name}</span>
          </button>
        );
      })}
    </div>
  );
}
