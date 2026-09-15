import type { RankSnapshot } from '@/domain/types';
import './rankSparkline.css';

interface RankSparklineProps {
  history: RankSnapshot[];
  color: string;
}

/**
 * Evolución del rango normalizado. Se dibuja como SVG inline para no arrastrar
 * una librería de gráficos por una curva de seis puntos.
 */
export function RankSparkline({ history, color }: RankSparklineProps) {
  if (history.length < 2) {
    return <p className="faint">Aún no hay suficiente historial para mostrar la evolución.</p>;
  }

  const width = 100;
  const height = 32;
  const values = history.map((snapshot) => snapshot.normalized);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const delta = values[values.length - 1] - values[0];

  return (
    <div className="sparkline">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Evolución del rango: ${delta >= 0 ? '+' : ''}${delta} puntos normalizados en ${history.length} lecturas`}
      >
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={`sparkline__delta${delta >= 0 ? ' is-up' : ' is-down'}`}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
      </span>
    </div>
  );
}
