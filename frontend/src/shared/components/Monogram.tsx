import './monogram.css';

interface MonogramProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

/** Iniciales escritas en la casilla de identidad del formulario. */
export function Monogram({ name, color, size = 'md', title }: MonogramProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={`monogram monogram--${size}`}
      style={{ color, borderColor: color }}
      title={title ?? name}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
