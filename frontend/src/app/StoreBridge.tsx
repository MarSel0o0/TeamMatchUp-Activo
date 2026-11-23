import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { queryClient } from '@/app/providers/queryClient';
import { isSchedulePath } from '@/app/routes';
import { authStore } from '@/features/auth/authStore';
import { watchAgendaResponses } from '@/features/sessions/agendaResponses';
import { agendaStore } from '@/features/sessions/agendaStore';

/**
 * Pieza sin interfaz dentro de la navegación y fuera de `SessionGate` (spec 016, RF-1, RF-2,
 * RF-6, RF-7, RF-15, RF-24, RF-30; plan 2). Entrega a los almacenes la ruta y la navegación, y
 * los pone en marcha. Los efectos corren en este orden.
 */
export function StoreBridge() {
  const location = useLocation();
  const navigate = useNavigate();

  // Efecto 1: ruta y navegación actuales; entrar o salir de /agenda.
  useEffect(() => {
    authStore.getState().attachRouter({ pathname: () => location.pathname, navigate });
    agendaStore.getState().routeChanged(isSchedulePath(location.pathname));
  }, [location, navigate]);

  // Efecto 2: consulta de sesión, aviso de 401 y aviso entre pestañas.
  useEffect(() => authStore.getState().start(), []);

  // Efecto 3: respuestas del servidor a las listas de la agenda (RF-24 a RF-26).
  useEffect(
    () =>
      watchAgendaResponses(queryClient.getQueryCache(), {
        currentUserId: () => {
          const { session } = authStore.getState();
          return session.status === 'authenticated' ? session.user.id : null;
        },
        onResponse: (filter, ids) => agendaStore.getState().listResponded(filter, ids),
      }),
    [],
  );

  return null;
}
