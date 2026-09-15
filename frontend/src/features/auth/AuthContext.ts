import { createContext } from 'react';
import type { Credentials, RegisterPayload, User } from '@/domain/types';

export interface AuthContextValue {
  user: User | null;
  /** `true` mientras se restaura la sesión guardada al abrir la aplicación. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
