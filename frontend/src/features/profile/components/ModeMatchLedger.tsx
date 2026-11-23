import { useState } from 'react';
import { MATCH_MODE_LABELS, MATCH_MODE_TABS_LABEL } from '@/shared/utils/copy';
import { availableTabs, matchesForTab, resolveTab } from '@/domain/matchModes';
import type { MatchTab } from '@/domain/matchModes';
import type { MatchRecord, Origin } from '@/domain/types';
import { PillTabs } from '@/shared/components/PillTabs';
import { MatchLedger } from './MatchLedger';

interface ModeMatchLedgerProps {
  /** Las partidas guardadas de la cuenta, de la más reciente a la más antigua (spec 020, plan §5). */
  matches: MatchRecord[];
  /** Origen del bloque de partidas de la cuenta: su etiqueta va junto a la lista (spec 012, RF-6; spec 020, RF-18). */
  origin: Origin;
}

/**
 * Partidas de una cuenta de LoL con datos de Riot repartidas por modo (spec 020, RF-5 a RF-10): pestañas «Todas» y
 * una por modo con partidas, y debajo la lista con las 8 más recientes de la elegida. Es dueño de la pestaña
 * elegida: empieza en «Todas» (RF-6; quien lo usa le pone `key` por cuenta para que cambiar de cuenta o de juego la
 * reinicie) y vuelve a «Todas» si el modo elegido deja de tener partidas (RF-10). Cambiar de pestaña no hace
 * consultas: solo filtra lo que ya llegó (RF-9).
 */
export function ModeMatchLedger({ matches, origin }: ModeMatchLedgerProps) {
  const [selected, setSelected] = useState<MatchTab>('all');
  const available = availableTabs(matches);
  const tab = resolveTab(selected, available);
  // RF-10: si el modo elegido desapareció, se corrige el estado al pintar para que no reviva si el modo reaparece.
  if (tab !== selected) setSelected(tab);

  const tabs = available.map((value) => ({ value, label: MATCH_MODE_LABELS[value] }));

  return (
    <PillTabs tabs={tabs} value={tab} onChange={setSelected} label={MATCH_MODE_TABS_LABEL}>
      <MatchLedger matches={matchesForTab(matches, tab)} origin={origin} showMode={tab === 'all'} />
    </PillTabs>
  );
}
