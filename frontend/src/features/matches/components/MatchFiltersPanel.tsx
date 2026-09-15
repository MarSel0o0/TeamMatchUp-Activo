import type { MatchFilters } from '@/domain/types';
import './matchFilters.css';

interface MatchFiltersPanelProps {
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  resultCount: number;
}

/** Filtros de la vista de coincidencias; se aplican sin recargar la página. */
export function MatchFiltersPanel({ filters, onChange, resultCount }: MatchFiltersPanelProps) {
  const patch = (changes: Partial<MatchFilters>) => onChange({ ...filters, ...changes });

  return (
    <aside className="match-filters card">
      <div className="card__header">
        <h2 className="section-title">Filtros</h2>
        <span className="badge">{resultCount}</span>
      </div>

      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="filter-search">
            Buscar jugador
          </label>
          <input
            id="filter-search"
            className="input"
            type="search"
            placeholder="Nombre o usuario"
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="filter-rank">
            Diferencia máxima de rango
            <span className="match-filters__value">{filters.maxRankDistance} pts</span>
          </label>
          <input
            id="filter-rank"
            className="range"
            type="range"
            min={0}
            max={50}
            step={5}
            value={filters.maxRankDistance}
            onChange={(event) => patch({ maxRankDistance: Number(event.target.value) })}
          />
          <span className="field__hint">
            En la escala normalizada 0-100 que compara rangos entre juegos distintos.
          </span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="filter-overlap">
            Horas semanales en común
            <span className="match-filters__value">{filters.minSharedHours} h</span>
          </label>
          <input
            id="filter-overlap"
            className="range"
            type="range"
            min={0}
            max={12}
            step={1}
            value={filters.minSharedHours}
            onChange={(event) => patch({ minSharedHours: Number(event.target.value) })}
          />
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.onlyVerified}
            onChange={(event) => patch({ onlyVerified: event.target.checked })}
          />
          Solo cuentas con rango verificado
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() =>
            onChange({
              gameId: filters.gameId,
              maxRankDistance: 25,
              minSharedHours: 2,
              onlyVerified: false,
              search: '',
            })
          }
        >
          Restablecer filtros
        </button>
      </div>
    </aside>
  );
}
