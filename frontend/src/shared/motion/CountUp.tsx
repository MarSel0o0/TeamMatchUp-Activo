import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

/**
 * Número que cuenta hasta su valor al aparecer, y que vuelve a contar desde el
 * valor anterior cuando cambia.
 *
 * El texto lo escribe la animación directo en el nodo: contar con `useState`
 * re-renderizaría el árbol sesenta veces por segundo. Por eso el span no tiene
 * hijos de React que puedan pisar lo escrito.
 */
export function CountUp({ value, duration = 1.1, className, suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const shown = useRef(0);

  useLayoutEffect(() => {
    if (ref.current && !ref.current.textContent) {
      ref.current.textContent = `${reduce ? value : 0}${suffix}`;
    }
  }, [reduce, value, suffix]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;

    if (reduce) {
      node.textContent = `${value}${suffix}`;
      shown.current = value;
      return;
    }

    const controls = animate(shown.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        shown.current = latest;
        node.textContent = `${Math.round(latest)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [value, inView, reduce, duration, suffix]);

  return <span ref={ref} className={className} data-num aria-label={`${value}${suffix}`} />;
}
