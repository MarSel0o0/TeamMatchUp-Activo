import { Tabs } from '@mantine/core';
import { motion } from 'motion/react';
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { getGame, isGameId } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { SPRING } from '@/shared/motion/presets';

interface GameTabsProps {
  games: GameId[];
  value: GameId;
  onChange: (gameId: GameId) => void;
  /** Nombre accesible del grupo de pestañas. */
  label?: string;
  /**
   * Base de los identificadores del patrón de pestañas accesibles: cada pestaña lleva `{idBase}-tab-{juego}` y
   * controla el panel `{idBase}-panel-{juego}` (spec 008, RNF-2; spec 017, RF-13).
   */
  idBase: string;
  /** Clase de un contenedor opcional de la lista de pestañas (por ejemplo, `ficha__tabs`). */
  listWrapperClassName?: string;
  /** Clase del panel del juego elegido. */
  panelClassName?: string;
  /** Contenido del panel del juego elegido: una parada más del recorrido con Tab, con su indicador de foco. */
  children: ReactNode;
}

/**
 * Pestañas de juego con su panel (M11): `Tabs` de la librería con la píldora que se desliza con resorte
 * (`motion`) y toma la tinta del juego (`GameDefinition.inkVar`). Una sola parada de Tab para el grupo (la pestaña
 * elegida), flechas circulares, Inicio y Fin con activación automática, y el panel como siguiente parada. El cambio de
 * juego no recarga la página; solo relanza la consulta del juego elegido. La raíz no genera caja
 * (`display: contents`): la disposición de la vista no cambia.
 */
export function GameTabs({
  games,
  value,
  onChange,
  label = 'Juego',
  idBase,
  listWrapperClassName,
  panelClassName,
  children,
}: GameTabsProps) {
  // Un layoutId por instancia: dos selectores en pantalla no comparten píldora.
  const pillId = useId();

  // La librería mueve el foco con Inicio y Fin pero no elige la pestaña; las flechas sí la eligen. Aquí, como en
  // la ficha de siempre, Inicio y Fin también eligen (la librería les pasa el foco justo después).
  const selectWithHomeEnd = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Home') onChange(games[0]);
    else if (event.key === 'End') onChange(games[games.length - 1]);
  };

  const list = (
    <Tabs.List aria-label={label}>
      {games.map((gameId) => {
        const game = getGame(gameId);
        const selected = gameId === value;
        return (
          <Tabs.Tab key={gameId} value={gameId} onKeyDown={selectWithHomeEnd}>
            {selected ? (
              <motion.span
                layoutId={pillId}
                className="tmu-tabs__pill"
                style={{ background: game.inkVar }}
                transition={SPRING}
              />
            ) : null}
            <span className="tmu-tabs__dot" style={{ background: game.inkVar }} />
            <span className="tmu-tabs__name">{game.name}</span>
          </Tabs.Tab>
        );
      })}
    </Tabs.List>
  );

  return (
    <Tabs
      id={idBase}
      value={value}
      onChange={(next) => {
        if (next !== null && isGameId(next)) onChange(next);
      }}
      variant="game"
    >
      {listWrapperClassName ? <div className={listWrapperClassName}>{list}</div> : list}
      <Tabs.Panel value={value} tabIndex={0} className={panelClassName}>
        {children}
      </Tabs.Panel>
    </Tabs>
  );
}
