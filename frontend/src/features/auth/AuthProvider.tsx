import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Credentials, RegisterPayload, User } from '@/domain/types';
import { AuthContext, type AuthContextValue } from './AuthContext';

/**
 * Estado de sesión de la aplicación.
 *
 * Al montar intenta restaurar la sesión desde el token guardado, de modo que
 * recargar la página no obliga a iniciar sesión de nuevo. Al cerrar sesión se
 * limpia además la caché de React Query para que el siguiente usuario no vea
 * datos del anterior.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    api.auth
      .me()
      .then((restored) => {
        if (!cancelled) setUser(restored);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (credentials: Credentials) => {
      const session = await api.auth.login(credentials);
      queryClient.clear();
      setUser(session.user);
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const session = await api.auth.register(payload);
      queryClient.clear();
      setUser(session.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isRestoring,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      setUser,
    }),
    [user, isRestoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
