import { getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';

interface GameBadgeProps {
  gameId: GameId;
  full?: boolean;
}

/** Etiqueta con el color propio del juego. */
export function GameBadge({ gameId, full = false }: GameBadgeProps) {
  const game = getGame(gameId);
  return (
    <span
      className="badge"
      style={{
        background: `${game.accent}22`,
        color: game.accent,
        borderColor: 'transparent',
      }}
    >
      {full ? game.name : game.shortName}
    </span>
  );
}
