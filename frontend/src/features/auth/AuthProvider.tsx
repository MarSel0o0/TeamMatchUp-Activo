import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate, type Location, type NavigateFunction } from 'react-router-dom';
import { ROUTES, isProtectedPath } from '@/app/routes';
import { api, isSessionCleared } from '@/services/api';
import { clearCsrfIfOwn } from '@/services/http/csrfStorage';
import { onUnauthorized } from '@/services/http/sessionEvents';
import { abortAllRequests, currentEpoch } from '@/services/http/transport';
import { NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import type { Credentials, RegisterPayload, User } from '@/domain/types';
import { AuthContext, type AuthContextValue, type SessionStatus } from './AuthContext';
import { announce, startWatching } from './crossTabSession';

/** Estado de sesión de esta pestaña; `user` solo existe en `authenticated` (P16). */
type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; message: string };

/**
 * Estado de sesión de la aplicación (RF-3 a RF-9, RF-33; plan 3.4).
 *
 * Al cargar hace la consulta de sesión (con el plazo de 30 s del transporte y
 * fuera de TanStack Query, para que no haya reintentos ni caché). Limpiar la
 * sesión del cliente cancela lo que vuela, vacía la memoria de datos y olvida al
 * usuario; este proveedor es el único que navega por una regla de sesión.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<Session>({ status: 'checking' });

  // El manejador del 401 vive fuera de React: lee el estado actual desde referencias.
  const sessionRef = useRef<Session>(session);
  const locationRef = useRef<Location>(location);
  const navigateRef = useRef<NavigateFunction>(navigate);
  // Token de intento: la respuesta de un intento viejo de la consulta de sesión se ignora.
  const attemptRef = useRef(0);

  useEffect(() => {
    locationRef.current = location;
    navigateRef.current = navigate;
  }, [location, navigate]);

  const applySession = useCallback((next: Session) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  /** Limpiar la sesión del cliente (definición de la spec; plan 3.4). */
  const clearClientSession = useCallback(
    ({ deleteCsrf }: { deleteCsrf: boolean }) => {
      // Solo el estado con usuario pasa a "sin sesión"; `checking` y `error` se quedan como están.
      // Se aplica y se pinta antes de vaciar la memoria: si no, vaciarla avisa a las consultas de
      // la vista aún montada, que se repintan con el usuario viejo, vuelven a estar habilitadas
      // y se relanzan (una segunda tanda de 401 que borraba el aviso y la ruta de origen, RF-7, RF-8).
      if (sessionRef.current.status === 'authenticated') {
        flushSync(() => applySession({ status: 'anonymous' }));
      }
      abortAllRequests();
      void queryClient.cancelQueries();
      queryClient.clear();
      if (deleteCsrf) clearCsrfIfOwn();
    },
    [queryClient, applySession],
  );

  /** Consulta de sesión (RF-5). No cambia el estado a `checking`: lo hace quien la pide. */
  const startCheck = useCallback(() => {
    attemptRef.current += 1;
    const attempt = attemptRef.current;

    api.auth.me().then(
      (restored) => {
        if (attempt !== attemptRef.current) return;
        if (restored !== null) {
          applySession({ status: 'authenticated', user: restored });
          return;
        }
        // 401: sin sesión, sin RF-7 ni error. Un comprobante propio ya no sirve.
        clearClientSession({ deleteCsrf: true });
        applySession({ status: 'anonymous' });
      },
      (error: unknown) => {
        if (attempt !== attemptRef.current) return;
        if (isSessionCleared(error)) {
          // Otra limpieza canceló la consulta: se repite para no quedar en "Cargando…".
          startCheck();
          return;
        }
        applySession({
          status: 'error',
          message: error instanceof Error && error.message ? error.message : NO_MESSAGE_TEXT,
        });
      },
    );
  }, [applySession, clearClientSession]);

  useEffect(() => {
    startCheck();
    return () => {
      // StrictMode monta dos veces: la primera consulta queda como intento viejo.
      attemptRef.current += 1;
    };
  }, [startCheck]);

  const retry = useCallback(() => {
    applySession({ status: 'checking' });
    startCheck();
  }, [applySession, startCheck]);

  /**
   * Pone al usuario como usuario de la sesión y navega en el mismo lote (RF-8, RF-33).
   * El comprobante ya se guardó al iniciar sesión; después de él, el aviso a las otras
   * pestañas (RF-24).
   */
  const enter = useCallback(
    (signedIn: User, redirectTo: string) => {
      queryClient.clear();
      applySession({ status: 'authenticated', user: signedIn });
      announce('login');
      navigateRef.current(redirectTo, { replace: true });
    },
    [queryClient, applySession],
  );

  const login = useCallback(
    async (credentials: Credentials, redirectTo: string) => {
      const signedIn = await api.auth.login(credentials);
      enter(signedIn, redirectTo);
    },
    [enter],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      // Un error del registro llega al formulario con su mensaje (RF-9).
      await api.auth.register(payload);

      // Después, el inicio de sesión: a él no se le aplica RF-9 (RF-4).
      let signedIn: User;
      try {
        signedIn = await api.auth.login({ email: payload.email, password: payload.password });
      } catch {
        navigateRef.current(ROUTES.login, {
          replace: true,
          state: { email: payload.email, notice: 'registered' },
        });
        return;
      }
      enter(signedIn, ROUTES.home);
    },
    [enter],
  );

  const logout = useCallback(async () => {
    try {
      // Espera la respuesta o los 30 s; si falla, se limpia igual (RF-6).
      await api.auth.logout();
    } catch {
      // Sin el comprobante toda operación protegida respondería 401: se limpia de todos modos.
    }
    // Primero se borra el comprobante propio y después se avisa a las otras pestañas (RF-24).
    clearClientSession({ deleteCsrf: true });
    announce('logout');
    navigateRef.current(ROUTES.login, { replace: true });
  }, [clearClientSession]);

  const setUser = useCallback(
    (user: User) => {
      if (sessionRef.current.status === 'authenticated') applySession({ status: 'authenticated', user });
    },
    [applySession],
  );

  // RF-7: un 401 en una operación protegida (plan 3.4).
  useEffect(
    () =>
      onUnauthorized((epoch) => {
        // Otro 401 ya limpió la sesión: un solo aviso y una sola entrada de login.
        if (epoch !== currentEpoch()) return;

        const { pathname } = locationRef.current;
        const from = isProtectedPath(pathname) ? pathname : undefined;

        if (sessionRef.current.status === 'authenticated') {
          clearClientSession({ deleteCsrf: true });
          navigateRef.current(ROUTES.login, { replace: true, state: { from, notice: 'expired' } });
        } else {
          // Sin usuario de sesión: es RF-25, login sin aviso.
          navigateRef.current(ROUTES.login, { replace: true, state: { from } });
        }
      }),
    [clearClientSession],
  );

  // RF-24: otra pestaña inició o cerró sesión (plan 3.7). Nunca borra el comprobante
  // guardado (D1): el nuevo, si lo hay, es el de la otra pestaña.
  useEffect(
    () =>
      startWatching(() => {
        const signedIn = sessionRef.current.status === 'authenticated';
        const { pathname } = locationRef.current;
        // En `checking`, `error` o sin usuario solo cancela y vacía la memoria de datos;
        // "Reintentar" sigue aplicando RF-5.
        clearClientSession({ deleteCsrf: false });
        if (signedIn && isProtectedPath(pathname)) {
          navigateRef.current(ROUTES.login, {
            replace: true,
            state: { from: pathname, notice: 'otherTab' },
          });
        }
      }),
    [clearClientSession],
  );

  const status: SessionStatus = session.status;
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session.status === 'authenticated' ? session.user : null,
      sessionError: session.status === 'error' ? session.message : null,
      retry,
      login,
      register,
      logout,
      setUser,
    }),
    [status, session, retry, login, register, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
