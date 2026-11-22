import { useStore } from 'zustand';
import { createAgendaStore, type AgendaState } from './createAgendaStore';

/**
 * Instancia única del almacén de la agenda (spec 016, RF-21, RF-22; plan 2). Las herramientas de
 * depuración solo existen en desarrollo.
 */
export const agendaStore = createAgendaStore({
  name: 'TeamMatchUp · agenda',
  enabled: import.meta.env.DEV,
});

export function useAgendaStore<T>(selector: (state: AgendaState) => T): T {
  return useStore(agendaStore, selector);
}
