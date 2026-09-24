import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';

interface MagneticProps {
  children: ReactNode;
  /** Fracción del desplazamiento del puntero que sigue el contenido. */
  strength?: number;
  className?: string;
}

/**
 * El contenido se deja atraer por el puntero y vuelve con resorte al soltarlo.
 * Solo en la acción principal de cada pantalla: si todo es magnético, nada lo es.
 */
export function Magnetic({ children, strength = 0.28, className }: MagneticProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * strength);
    y.set((event.clientY - rect.top - rect.height / 2) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={className}
      style={{ x: springX, y: springY, display: 'inline-flex' }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}
