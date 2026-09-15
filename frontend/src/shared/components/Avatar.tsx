interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

/** Iniciales sobre el color asignado al usuario. */
export function Avatar({ name, color, size = 'md', title }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={`avatar${size === 'md' ? '' : ` avatar--${size}`}`}
      style={{ background: color }}
      title={title ?? name}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
