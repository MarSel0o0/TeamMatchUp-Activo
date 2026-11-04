import { motion } from 'motion/react';
import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { SPRING } from '@/shared/motion/presets';
import { nextTabIndex } from '@/shared/utils/tabKeys';
import './gameTabs.css';

interface GameTabsProps {
  games: GameId[];
  value: GameId;
  onChange: (gameId: GameId) => void;
  label?: string;
  /**
   * Con `idBase` y `panelId`, patrón de pestañas accesibles (spec 008, RNF-2; plan 4.3): cada
   * pestaña lleva `id={idBase}-tab-{juego}` y `aria-controls={panelId}`, solo la elegida entra
   * en el orden de tabulación y las flechas, Inicio y Fin eligen y enfocan otra pestaña. Sin
   * ellas, el marcado y el comportamiento son los de siempre (perfil y coincidencias).
   */
  idBase?: string;
  panelId?: string;
}

/**
 * Selector de juego segmentado. La píldora activa se desliza con resorte hasta
 * el juego elegido y toma su tinta. El cambio no recarga la página; solo
 * relanza la consulta del juego elegido.
 */
export function GameTabs({ games, value, onChange, label = 'Juego', idBase, panelId }: GameTabsProps) {
  // Un layoutId por instancia: dos selectores en pantalla no comparten píldora.
  const pillId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const accessible = idBase !== undefined && panelId !== undefined;

  // Activación automática: la tecla elige la pestaña y le pasa el foco (plan 4.3, plan 5).
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, games.length);
    if (next === null) return;
    event.preventDefault();
    onChange(games[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {games.map((gameId, index) => {
        const game = getGame(gameId);
        const selected = gameId === value;

        return (
          <button
            key={gameId}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            className="tabs__tab"
            onClick={() => onChange(gameId)}
            {...(accessible
              ? {
                  id: `${idBase}-tab-${gameId}`,
                  'aria-controls': panelId,
                  tabIndex: selected ? 0 : -1,
                  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index),
                }
              : {})}
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
