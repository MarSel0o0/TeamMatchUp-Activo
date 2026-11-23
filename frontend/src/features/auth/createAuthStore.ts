import { createStore, type StoreApi } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { Credentials, RegisterPayload, User } from '@/domain/types';
import type { ApiContract } from '@/services/apiContract';
import { ROUTES, isProtectedPath } from '@/app/routes';
import { NO_MESSAGE_TEXT, type LoginNotice } from '@/shared/utils/copy';

/** Estado de sesión de esta pestaña; `user` solo existe en `authenticated` (RF-1). */
export type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; message: string };

export type SessionStatus = Session['status'];

/** Lo que el almacén deja en la navegación hacia login (spec 007, plan 3.6). */
export interface LoginState {
  from?: string;
  email?: string;
  notice?: LoginNotice;
}

export interface AuthState {
  session: Session;
  start(): () => void;
  retry(): void;
  login(credentials: Credentials, redirectTo: string): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  logout(): Promise<void>;
  setUser(user: User): void;
  attachRouter(access: RouterAccess): void;
}

export interface RouterAccess {
  pathname(): string;
  navigate(to: string, options: { replace: true; state?: LoginState }): void;
}

export interface AuthDeps {
  api: Pick<ApiContract['auth'], 'me' | 'login' | 'register' | 'logout'>;
  isSessionCleared(error: unknown): boolean;
  queryCache: { clear(): void; cancelQueries(): Promise<void> };
  abortAllRequests(): void;
  currentEpoch(): number;
  clearCsrfIfOwn(): void;
  announce(kind: 'login' | 'logout'): void;
  startWatching(onChange: () => void): () => void;
  onUnauthorized(handler: (epoch: number) => void): () => void;
  flushSync(update: () => void): void;
  resetAgenda(): void;
}

export interface AuthDevtools {
  name: string;
  enabled: boolean;
}

export type AuthStore = StoreApi<AuthState>;

const NOT_ATTACHED: RouterAccess = { pathname: () => '', navigate: () => {} };

/**
 * Almacén de la sesión iniciada de esta pestaña (spec 016, RF-1 a RF-8, RF-16; plan 3).
 *
 * Fábrica con todo lo de fuera inyectado (contrato de datos, memoria de datos, transporte, aviso
 * entre pestañas, `flushSync`, reinicio de la agenda): sin React ni red, se prueba en Node. Traslada
 * el comportamiento de `AuthProvider` sin rediseñarlo. El acceso a la navegación vive en el cierre,
 * no en el estado (RF-1: no es una copia de la sesión).
 */
export function createAuthStore(deps: AuthDeps, options: AuthDevtools): AuthStore {
  return createStore<AuthState>()(
    devtools((set, get) => {
      let router: RouterAccess = NOT_ATTACHED;
      // Número de intento: la respuesta de un intento viejo de la consulta de sesión se ignora.
      let attempt = 0;

      const setSession = (session: Session, action: string) => set({ session }, false, action);
      const isAuthenticated = () => get().session.status === 'authenticated';

      /** Limpiar la sesión del cliente (definición de la spec; plan 3.2). */
      const clearClientSession = ({ deleteCsrf }: { deleteCsrf: boolean }) => {
        deps.resetAgenda();
        // Solo el estado con usuario pasa a "sin sesión"; `checking` y `error` se quedan como están.
        // Se aplica y se pinta antes de vaciar la memoria: si no, vaciarla avisa a las consultas de
        // la vista aún montada, que se relanzan con el usuario viejo (defecto D-A2).
        if (isAuthenticated()) {
          deps.flushSync(() => setSession({ status: 'anonymous' }, 'auth/cleared'));
        }
        deps.abortAllRequests();
        void deps.queryCache.cancelQueries();
        deps.queryCache.clear();
        if (deleteCsrf) deps.clearCsrfIfOwn();
      };

      /** Consulta de sesión (RF-2). No cambia el estado a `checking`: lo hace quien la pide. */
      const check = (): void => {
        attempt += 1;
        const mine = attempt;
        deps.api.me().then(
          (restored) => {
            if (mine !== attempt) return;
            if (restored !== null) {
              setSession({ status: 'authenticated', user: restored }, 'auth/checked');
              return;
            }
            // 401: sin sesión, sin RF-7 ni error. Un comprobante propio ya no sirve.
            clearClientSession({ deleteCsrf: true });
            setSession({ status: 'anonymous' }, 'auth/checked');
          },
          (error: unknown) => {
            if (mine !== attempt) return;
            if (deps.isSessionCleared(error)) {
              // Otra limpieza canceló la consulta: se repite para no quedar en "Cargando…".
              check();
              return;
            }
            setSession(
              {
                status: 'error',
                message: error instanceof Error && error.message ? error.message : NO_MESSAGE_TEXT,
              },
              'auth/checked',
            );
          },
        );
      };

      /** Pone al usuario de la sesión y navega en el mismo paso (RF-3, RF-4, RF-16). */
      const enter = (user: User, to: string) => {
        deps.queryCache.clear();
        deps.resetAgenda();
        // Un solo pintado con el usuario y la ruta nueva (D-016-1): si no, la actualización del
        // almacén se pinta antes que la del router y `PublicOnlyRoute` redirige a Inicio entre
        // ambas, pisando el destino (React no agrupa los dos carriles).
        deps.flushSync(() => {
          setSession({ status: 'authenticated', user }, 'auth/login');
          deps.announce('login');
          router.navigate(to, { replace: true });
        });
      };

      /** RF-6: un 401 en una operación protegida. */
      const on401 = (epoch: number) => {
        // Otro 401 ya limpió la sesión: un solo aviso y una sola entrada de login.
        if (epoch !== deps.currentEpoch()) return;
        const pathname = router.pathname();
        const from = isProtectedPath(pathname) ? pathname : undefined;
        if (isAuthenticated()) {
          clearClientSession({ deleteCsrf: true });
          router.navigate(ROUTES.login, { replace: true, state: { from, notice: 'expired' } });
        } else {
          router.navigate(ROUTES.login, { replace: true, state: { from } });
        }
      };

      /** RF-7: otra pestaña inició o cerró sesión. Nunca borra el comprobante guardado. */
      const onOtherTab = () => {
        const signedIn = isAuthenticated();
        const pathname = router.pathname();
        clearClientSession({ deleteCsrf: false });
        if (signedIn && isProtectedPath(pathname)) {
          router.navigate(ROUTES.login, {
            replace: true,
            state: { from: pathname, notice: 'otherTab' },
          });
        }
      };

      return {
        session: { status: 'checking' },

        start: () => {
          check();
          const off401 = deps.onUnauthorized(on401);
          const offTabs = deps.startWatching(onOtherTab);
          return () => {
            // StrictMode monta dos veces: la primera consulta queda como intento viejo.
            attempt += 1;
            off401();
            offTabs();
          };
        },

        retry: () => {
          setSession({ status: 'checking' }, 'auth/retry');
          check();
        },

        login: async (credentials, redirectTo) => {
          const user = await deps.api.login(credentials);
          enter(user, redirectTo);
        },

        register: async (payload) => {
          // Un error del registro llega al formulario con su mensaje.
          await deps.api.register(payload);
          // Después, el inicio de sesión: a él no se le aplica esa regla (spec 007, RF-4).
          let user: User;
          try {
            user = await deps.api.login({ email: payload.email, password: payload.password });
          } catch {
            router.navigate(ROUTES.login, {
              replace: true,
              state: { email: payload.email, notice: 'registered' },
            });
            return;
          }
          enter(user, ROUTES.home);
        },

        logout: async () => {
          try {
            await deps.api.logout();
          } catch {
            // Sin el comprobante toda operación protegida respondería 401: se limpia de todos modos.
          }
          // Primero se borra el comprobante propio y después se avisa a las otras pestañas (RF-5).
          clearClientSession({ deleteCsrf: true });
          deps.announce('logout');
          router.navigate(ROUTES.login, { replace: true });
        },

        setUser: (user) => {
          if (isAuthenticated()) setSession({ status: 'authenticated', user }, 'auth/setUser');
        },

        attachRouter: (access) => {
          router = access;
        },
      };
    }, options),
  );
}
