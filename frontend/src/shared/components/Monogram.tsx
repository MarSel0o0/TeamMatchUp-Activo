import { withAlpha } from '@/shared/utils/ink';
import './monogram.css';

interface MonogramProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

/** Iniciales sobre un squircle teñido con el color del jugador. */
export function Monogram({ name, color, size = 'md', title }: MonogramProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={`monogram monogram--${size}`}
      style={{
        // Las iniciales llevan el tono del jugador mezclado con la tinta: con el color puro, un
        // avatar claro u oscuro quedaba por debajo de 4,5:1 (spec 008, RNF-5); al 35 % el peor
        // color posible da más de 5:1 en los dos temas.
        color: `color-mix(in srgb, ${color} 35%, var(--ink))`,
        background: `linear-gradient(145deg, ${withAlpha(color, 0.28)}, ${withAlpha(color, 0.08)})`,
        borderColor: withAlpha(color, 0.45),
      }}
      title={title ?? name}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
