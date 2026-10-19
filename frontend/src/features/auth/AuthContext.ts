import { createContext } from 'react';
import type { Credentials, RegisterPayload, User } from '@/domain/types';

/**
 * Estado de la sesión de esta pestaña (RF-5):
 * - `checking`: la consulta de sesión está en curso; todavía no hay usuario.
 * - `authenticated`: hay usuario de la sesión.
 * - `anonymous`: no hay sesión (la consulta respondió 401 o se limpió la sesión).
 * - `error`: la consulta de sesión falló sin ser un 401; hay que reintentar.
 */
export type SessionStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

export interface AuthContextValue {
  status: SessionStatus;
  /** Usuario de la sesión; solo existe en `authenticated`. */
  user: User | null;
  /** Mensaje de la pantalla de error de la consulta de sesión (RF-5, RF-9); solo en `error`. */
  sessionError: string | null;
  /** Repite la consulta de sesión, sin límite de intentos (RF-5). */
  retry: () => void;
  /** Inicia sesión y navega a `redirectTo` con `replace` en el mismo lote (RF-8). */
  login: (credentials: Credentials, redirectTo: string) => Promise<void>;
  /** Registra, inicia sesión y lleva a Inicio; si el inicio falla, a login con aviso (RF-4). */
  register: (payload: RegisterPayload) => Promise<void>;
  /** Cierra sesión, limpia la sesión del cliente y navega a login (RF-6). */
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
