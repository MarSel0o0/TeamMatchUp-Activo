import type { Transition, Variants } from 'motion/react';

/**
 * Vocabulario de movimiento del producto.
 *
 * Todo lo que se mueve usa estas curvas: movimiento con masa que frena al
 * llegar, nunca lineal. Cada animación tiene un motivo (jerarquía, secuencia,
 * respuesta a una acción o cambio de estado); ninguna existe solo por adorno.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_FLUID = [0.32, 0.72, 0, 1] as const;

export const SPRING: Transition = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 120, damping: 20 };

/** Contenedor que escalona la entrada de sus hijos. */
export const stagger = (gap = 0.07, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Entrada pesada: sube, se enfoca y aparece. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};

/** Variante corta para filas de listas largas: sin blur, que cuesta repintar. */
export const riseRow: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Transición de página: la vista nueva sube, la anterior se desvanece. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: EASE_OUT, staggerChildren: 0.06 },
  },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.22, ease: EASE_FLUID } },
};
