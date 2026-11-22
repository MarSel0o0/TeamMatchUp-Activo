import { useShallow } from 'zustand/react/shallow';
import type { Credentials, RegisterPayload, User } from '@/domain/types';
import { useAuthStore } from './authStore';
import type { SessionStatus } from './createAuthStore';

export interface AuthValue {
  status: SessionStatus;
  /** Usuario de la sesión; solo existe en `authenticated`. */
  user: User | null;
  /** Mensaje de la pantalla de error de la consulta de sesión (RF-2); solo en `error`. */
  sessionError: string | null;
  retry: () => void;
  login: (credentials: Credentials, redirectTo: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

/**
 * Fachada con la misma forma que tenía el contexto (spec 016, RF-1, RF-9): los consumidores
 * no cambian. Se lee del almacén con comparación superficial.
 */
export function useAuth(): AuthValue {
  return useAuthStore(
    useShallow((s): AuthValue => ({
      status: s.session.status,
      user: s.session.status === 'authenticated' ? s.session.user : null,
      sessionError: s.session.status === 'error' ? s.session.message : null,
      retry: s.retry,
      login: s.login,
      register: s.register,
      logout: s.logout,
      setUser: s.setUser,
    })),
  );
}
