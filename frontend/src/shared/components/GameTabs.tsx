import { getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import './gameTabs.css';

interface GameTabsProps {
  games: GameId[];
  value: GameId;
  onChange: (gameId: GameId) => void;
  /** Etiqueta accesible del grupo de pestañas. */
  label?: string;
}

/**
 * Selector de juego. El cambio ocurre sin recargar la página: solo actualiza el
 * estado y deja que la consulta correspondiente se refresque.
 */
export function GameTabs({ games, value, onChange, label = 'Juego' }: GameTabsProps) {
  return (
    <div className="game-tabs" role="tablist" aria-label={label}>
      {games.map((gameId) => {
        const game = getGame(gameId);
        const selected = gameId === value;
        return (
          <button
            key={gameId}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`game-tabs__tab${selected ? ' is-active' : ''}`}
            style={selected ? { borderColor: game.accent, color: game.accent } : undefined}
            onClick={() => onChange(gameId)}
          >
            <span className="game-tabs__dot" style={{ background: game.accent }} />
            {game.name}
          </button>
        );
      })}
    </div>
  );
}
