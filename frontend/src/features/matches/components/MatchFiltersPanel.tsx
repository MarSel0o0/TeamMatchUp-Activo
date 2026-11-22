import type { MatchFilters } from '@/domain/types';
import { AppButton } from '@/shared/components/AppButton';
import { SearchField } from '@/shared/components/SearchField';
import { SliderField } from '@/shared/components/SliderField';
import { SwitchField } from '@/shared/components/SwitchField';
import { CountUp } from '@/shared/motion/CountUp';
import './matchFilters.css';

interface MatchFiltersPanelProps {
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  resultCount: number;
  onReset: () => void;
  /** Todos los controles desactivados: CS2 sin rango Premier propio, no hay búsqueda posible (spec 015, RF-10). */
  disabled?: boolean;
}

/** Casillas del formulario de búsqueda. Se aplican sin recargar la página. */
export function MatchFiltersPanel({
  filters,
  onChange,
  resultCount,
  onReset,
  disabled = false,
}: MatchFiltersPanelProps) {
  const patch = (changes: Partial<MatchFilters>) => onChange({ ...filters, ...changes });

  return (
    <aside className="filters sheet">
      <div className="sheet__head">
        <h2 className="sheet-title grow">Criterios</h2>
        <span className="filters__count">
          <CountUp value={resultCount} />
          <span className="label">resultados</span>
        </span>
      </div>

      <div className="sheet__body stack">
        <SearchField
          id="filter-search"
          label="Buscar jugador"
          placeholder="Nombre o usuario"
          value={filters.search}
          disabled={disabled}
          onChange={(event) => patch({ search: event.target.value })}
        />

        <SliderField
          label="Diferencia máxima de rango"
          unit="pts"
          min={0}
          max={50}
          step={5}
          value={filters.maxRankDistance}
          disabled={disabled}
          onChange={(value) => patch({ maxRankDistance: value })}
          hint="Sobre la escala normalizada 0-100 que permite comparar juegos con escalas distintas."
        />

        <SliderField
          label="Horas en común por semana"
          unit="h"
          min={0}
          max={12}
          step={1}
          value={filters.minSharedHours}
          disabled={disabled}
          onChange={(value) => patch({ minSharedHours: value })}
        />

        <SwitchField
          label="Solo cuentas verificadas"
          checked={filters.onlyVerified}
          disabled={disabled}
          onChange={(event) => patch({ onlyVerified: event.target.checked })}
        />

        <AppButton type="button" size="sm" onClick={onReset} disabled={disabled}>
          Restablecer criterios
        </AppButton>
      </div>
    </aside>
  );
}
