import { flushSync } from 'react-dom';
import { useStore } from 'zustand';
import { queryClient } from '@/app/providers/queryClient';
import { api, isSessionCleared } from '@/services/api';
import { clearCsrfIfOwn } from '@/services/http/csrfStorage';
import { onUnauthorized } from '@/services/http/sessionEvents';
import { abortAllRequests, currentEpoch } from '@/services/http/transport';
import { agendaStore } from '@/features/sessions/agendaStore';
import { announce, startWatching } from './crossTabSession';
import { createAuthStore, type AuthState } from './createAuthStore';

/**
 * Instancia única del almacén de la sesión iniciada, con las dependencias reales
 * (spec 016, RF-1, RF-21, RF-22, RNF-6; plan 2). Las herramientas de depuración solo
 * existen en desarrollo.
 */
export const authStore = createAuthStore(
  {
    api: api.auth,
    isSessionCleared,
    queryCache: queryClient,
    abortAllRequests,
    currentEpoch,
    clearCsrfIfOwn,
    announce,
    startWatching,
    onUnauthorized,
    flushSync,
    resetAgenda: () => agendaStore.getState().reset(),
  },
  { name: 'TeamMatchUp · sesión iniciada', enabled: import.meta.env.DEV },
);

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}
