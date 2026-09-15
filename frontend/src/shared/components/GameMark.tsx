import { getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import './gameMark.css';

interface GameMarkProps {
  gameId: GameId;
  full?: boolean;
}

/** Chip con la tinta del juego. El color solo aparece donde el juego es el dato. */
export function GameMark({ gameId, full = false }: GameMarkProps) {
  const game = getGame(gameId);

  return (
    <span className="game-mark" style={{ color: game.accent }}>
      <span className="game-mark__ink" style={{ background: game.accent }} />
      {full ? game.name : game.shortName}
    </span>
  );
}
