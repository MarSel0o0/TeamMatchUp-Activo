import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración de React Query (RF-5, RF-20; plan 3.8).
 *
 * - Sin reintentos: reintentar un plazo de 30 s multiplicaría la espera y repetir
 *   lecturas "por detrás" choca con RF-20; las vistas ya ofrecen "Reintentar".
 * - `staleTime: 0`: los datos (cuentas de otros, coincidencias, sesiones) son
 *   compartidos entre jugadores y deben leerse de nuevo al montar la vista.
 * - Sin refresco al enfocar ni al reconectar: las lecturas ocurren solo cuando
 *   el jugador las provoca.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
