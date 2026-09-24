import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import type { PointerEvent } from 'react';
import { EASE_OUT } from '@/shared/motion/presets';

/**
 * El cruce, dibujado.
 *
 * Tres condiciones (juego, rango, horario) llegan desde afuera y se encuentran;
 * solo la zona donde se cumplen las tres se enciende. Es la tesis del producto
 * en una figura, y responde al puntero inclinándose como un objeto físico.
 */
const R = 108;

const CIRCLES = [
  { id: 'juego', label: 'Mismo juego', cx: 156, cy: 160, from: { cx: 70, cy: 110 } },
  { id: 'rango', label: 'Rango similar', cx: 244, cy: 160, from: { cx: 330, cy: 110 } },
  { id: 'horario', label: 'Horas en común', cx: 200, cy: 236, from: { cx: 200, cy: 330 } },
] as const;

export function CrossingVisual() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-11, 11]), { stiffness: 120, damping: 18 });

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const reset = () => {
    px.set(0);
    py.set(0);
  };

  const travel = (index: number) => ({
    duration: 1.4,
    delay: 0.35 + index * 0.12,
    ease: EASE_OUT,
  });

  return (
    <div className="crossing" onPointerMove={handleMove} onPointerLeave={reset}>
      <motion.div className="crossing__stage" style={{ rotateX, rotateY }}>
        <svg viewBox="0 0 400 400" className="crossing__svg" role="img" aria-labelledby="crossing-title">
          <title id="crossing-title">
            Tres condiciones que se cruzan: mismo juego, rango similar y horas en común. El
            emparejamiento ocurre solo donde se cumplen las tres.
          </title>

          <defs>
            <radialGradient id="lens-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#dcfa72" />
              <stop offset="100%" stopColor="#b7dc2a" />
            </radialGradient>
            {CIRCLES.slice(0, 2).map((circle, index) => (
              <clipPath key={circle.id} id={`clip-${circle.id}`}>
                <motion.circle
                  r={R}
                  initial={reduce ? false : circle.from}
                  animate={{ cx: circle.cx, cy: circle.cy }}
                  transition={travel(index)}
                />
              </clipPath>
            ))}
          </defs>

          {/* Anillo de búsqueda: gira lento mientras la sala está abierta. */}
          <g className="crossing__orbit">
            <circle cx="200" cy="200" r="186" />
          </g>

          {CIRCLES.map((circle, index) => (
            <motion.circle
              key={circle.id}
              className={`crossing__ring crossing__ring--${circle.id}`}
              r={R}
              initial={reduce ? false : { ...circle.from, opacity: 0 }}
              animate={{ cx: circle.cx, cy: circle.cy, opacity: 1 }}
              transition={travel(index)}
            />
          ))}

          {/* Zona donde se cumplen las tres: el círculo del horario recortado
              por los otros dos. */}
          <g clipPath="url(#clip-juego)">
            <g clipPath="url(#clip-rango)">
              <motion.circle
                className="crossing__lens"
                r={R}
                fill="url(#lens-glow)"
                initial={reduce ? false : { ...CIRCLES[2].from, opacity: 0 }}
                animate={{ cx: CIRCLES[2].cx, cy: CIRCLES[2].cy, opacity: 1 }}
                transition={{ ...travel(2), opacity: { delay: 1.3, duration: 0.6 } }}
              />
            </g>
          </g>

          <motion.g
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.7, type: 'spring', stiffness: 260, damping: 16 }}
            style={{ transformOrigin: '200px 186px' }}
          >
            <text x="200" y="192" className="crossing__match">
              match
            </text>
          </motion.g>
        </svg>

        {CIRCLES.map((circle, index) => (
          <motion.span
            key={circle.id}
            className={`crossing__tag crossing__tag--${circle.id}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 + index * 0.12, duration: 0.6, ease: EASE_OUT }}
          >
            <span className="crossing__tag-dot" />
            {circle.label}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
