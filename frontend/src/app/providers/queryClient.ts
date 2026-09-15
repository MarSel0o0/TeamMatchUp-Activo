import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración de React Query.
 *
 * Los datos de rango y coincidencias cambian con lentitud (el backend los
 * refresca de forma periódica), así que se mantienen frescos durante un minuto
 * y no se reconsultan al volver a la pestaña.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // No tiene sentido reintentar errores de autorización o validación.
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
