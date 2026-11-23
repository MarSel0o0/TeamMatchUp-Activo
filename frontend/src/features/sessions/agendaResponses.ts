import type { QueryCache } from '@tanstack/react-query';
import { GAME_IDS } from '@/domain/games';
import type { AgendaFilter } from '@/domain/agendaRules';

interface WatchOptions {
  /** Usuario de la sesión iniciada en este momento, o `null` si no hay. */
  currentUserId: () => string | null;
  onResponse: (filter: AgendaFilter, ids: readonly string[]) => void;
}

function isAgendaFilter(value: unknown): value is AgendaFilter {
  return value === 'all' || GAME_IDS.some((id) => id === value);
}

/** Identificadores de una lista de sesiones; `null` si los datos no tienen esa forma. */
function sessionIds(data: unknown): string[] | null {
  if (!Array.isArray(data)) return null;
  const ids: string[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null || !('id' in item)) return null;
    if (typeof item.id !== 'string') return null;
    ids.push(item.id);
  }
  return ids;
}

/**
 * Avisa de cada respuesta del servidor a una lista de la agenda del usuario actual (spec 016,
 * RF-24 a RF-26, D10, I-1; plan 4.3). Solo cuenta `success` sin `manual`: las escrituras locales
 * de la memoria (`setQueryData`) y los errores no son respuestas y no se reenvían.
 * Devuelve la función que retira la suscripción.
 */
export function watchAgendaResponses(queryCache: QueryCache, options: WatchOptions): () => void {
  return queryCache.subscribe((event) => {
    if (event.type !== 'updated') return;
    const { action } = event;
    if (action.type !== 'success' || action.manual) return;
    const key = event.query.queryKey;
    if (key[0] !== 'u' || key[2] !== 'sessions') return;
    const userId = options.currentUserId();
    if (userId === null || key[1] !== userId) return;
    const filter = key[3];
    if (!isAgendaFilter(filter)) return;
    const ids = sessionIds(action.data);
    if (ids === null) return;
    options.onResponse(filter, ids);
  });
}
