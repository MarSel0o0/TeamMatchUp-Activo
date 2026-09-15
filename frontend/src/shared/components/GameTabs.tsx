import { getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import './gameTabs.css';

interface GameTabsProps {
  games: GameId[];
  value: GameId;
  onChange: (gameId: GameId) => void;
  label?: string;
}

/**
 * Selector de juego, dibujado como las pestañas de un archivador: la hoja activa
 * queda al frente y su pestaña se une al papel de abajo. El cambio no recarga la
 * página; solo relanza la consulta del juego elegido.
 */
export function GameTabs({ games, value, onChange, label = 'Juego' }: GameTabsProps) {
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
            style={selected ? { color: game.accent, borderTopColor: game.accent } : undefined}
            onClick={() => onChange(gameId)}
          >
            {game.name}
          </button>
        );
      })}
    </div>
  );
}
