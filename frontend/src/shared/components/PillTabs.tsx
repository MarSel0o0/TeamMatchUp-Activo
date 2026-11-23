import { Tabs } from '@mantine/core';
import { motion } from 'motion/react';
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { SPRING } from '@/shared/motion/presets';

export interface PillTab<T extends string> {
  value: T;
  label: string;
}

interface PillTabsProps<T extends string> {
  tabs: readonly PillTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nombre accesible del grupo de pestañas. */
  label: string;
  /** Clase del panel de la pestaña elegida. */
  panelClassName?: string;
  /** Contenido del panel de la pestaña elegida: una parada más del recorrido con Tab, con su indicador de foco. */
  children: ReactNode;
}

/**
 * Pestañas genéricas con la píldora que se desliza con resorte (`motion`) y la tinta del acento (spec 020, RF-11):
 * `Tabs` de la librería con el mismo patrón que `GameTabs`. Una sola parada de Tab para el grupo (la pestaña
 * elegida), flechas circulares, Inicio y Fin con activación automática, y el panel como siguiente parada. Cambiar
 * de pestaña solo cambia el valor que recibe: no hace consultas. La raíz no genera caja (`display: contents`).
 */
export function PillTabs<T extends string>({ tabs, value, onChange, label, panelClassName, children }: PillTabsProps<T>) {
  // Un layoutId por instancia: dos grupos en pantalla no comparten píldora.
  const pillId = useId();

  const select = (next: string | null) => {
    const found = tabs.find((tab) => tab.value === next);
    if (found) onChange(found.value);
  };

  // La librería mueve el foco con Inicio y Fin pero no elige la pestaña; las flechas sí. Aquí, como en las
  // pestañas de juego, Inicio y Fin también eligen (la librería les pasa el foco justo después).
  const selectWithHomeEnd = (event: KeyboardEvent<HTMLButtonElement>) => {
    const first = tabs[0];
    const last = tabs[tabs.length - 1];
    if (event.key === 'Home' && first) onChange(first.value);
    else if (event.key === 'End' && last) onChange(last.value);
  };

  return (
    <Tabs value={value} onChange={select} variant="game">
      <Tabs.List aria-label={label} className="tmu-tabs__list--compact">
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.value} value={tab.value} onKeyDown={selectWithHomeEnd}>
            {tab.value === value ? (
              <motion.span
                layoutId={pillId}
                className="tmu-tabs__pill"
                style={{ background: 'var(--volt)' }}
                transition={SPRING}
              />
            ) : null}
            <span className="tmu-tabs__name">{tab.label}</span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value={value} tabIndex={0} className={panelClassName}>
        {children}
      </Tabs.Panel>
    </Tabs>
  );
}
