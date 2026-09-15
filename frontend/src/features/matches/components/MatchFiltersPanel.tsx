import { Search } from 'lucide-react';
import type { MatchFilters } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import './matchFilters.css';

interface MatchFiltersPanelProps {
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  resultCount: number;
  onReset: () => void;
}

/** Casillas del formulario de búsqueda. Se aplican sin recargar la página. */
export function MatchFiltersPanel({
  filters,
  onChange,
  resultCount,
  onReset,
}: MatchFiltersPanelProps) {
  const patch = (changes: Partial<MatchFilters>) => onChange({ ...filters, ...changes });

  return (
    <aside className="filters sheet">
      <div className="sheet__head">
        <h2 className="sheet-title grow">Criterios</h2>
        <span className="num filters__count">{resultCount}</span>
      </div>

      <div className="sheet__body stack">
        <div className="field">
          <label className="label" htmlFor="filter-search">
            Buscar jugador
          </label>
          <div className="filters__search">
            <Icon as={Search} size={14} />
            <input
              id="filter-search"
              className="input"
              type="search"
              placeholder="Nombre o usuario"
              value={filters.search}
              onChange={(event) => patch({ search: event.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label className="label filters__dial" htmlFor="filter-rank">
            Diferencia máxima de rango
            <span className="num">{filters.maxRankDistance} pts</span>
          </label>
          <input
            id="filter-rank"
            className="slider"
            type="range"
            min={0}
            max={50}
            step={5}
            value={filters.maxRankDistance}
            onChange={(event) => patch({ maxRankDistance: Number(event.target.value) })}
          />
          <span className="field__hint">
            Sobre la escala normalizada 0-100 que permite comparar juegos con escalas distintas.
          </span>
        </div>

        <div className="field">
          <label className="label filters__dial" htmlFor="filter-overlap">
            Horas en común por semana
            <span className="num">{filters.minSharedHours} h</span>
          </label>
          <input
            id="filter-overlap"
            className="slider"
            type="range"
            min={0}
            max={12}
            step={1}
            value={filters.minSharedHours}
            onChange={(event) => patch({ minSharedHours: Number(event.target.value) })}
          />
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={filters.onlyVerified}
            onChange={(event) => patch({ onlyVerified: event.target.checked })}
          />
          Solo cuentas con rango verificado
        </label>

        <button type="button" className="btn btn--sm" onClick={onReset}>
          Restablecer criterios
        </button>
      </div>
    </aside>
  );
}
