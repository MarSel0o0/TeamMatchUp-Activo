import { motion, type HTMLMotionProps } from 'motion/react';
import { rise, stagger } from './presets';

interface RevealProps extends HTMLMotionProps<'div'> {
  /** Escalona a los hijos que usen `variants={rise}` en vez de moverse en bloque. */
  group?: boolean;
  gap?: number;
  delay?: number;
}

/**
 * Entrada al entrar en pantalla, con IntersectionObserver por debajo (nunca un
 * listener de scroll). Se reproduce una sola vez: releer una sección no tiene
 * que volver a animarla.
 */
export function Reveal({ group = false, gap, delay, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={group ? stagger(gap, delay) : rise}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
