import './brandMark.css';

/**
 * Marca de TeamMatchUp: dos círculos que se cruzan y el traslape encendido.
 * Es el producto en un glifo: lo que importa es la zona en común.
 */
export function BrandMark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      className={`brand-mark${animated ? ' brand-mark--animated' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" className="brand-mark__tile" />
      <circle cx="13" cy="16" r="7" className="brand-mark__ring brand-mark__ring--a" />
      <circle cx="19" cy="16" r="7" className="brand-mark__ring brand-mark__ring--b" />
      <path d="M16 9.68A7 7 0 0 1 16 22.32A7 7 0 0 1 16 9.68Z" className="brand-mark__lens" />
    </svg>
  );
}
