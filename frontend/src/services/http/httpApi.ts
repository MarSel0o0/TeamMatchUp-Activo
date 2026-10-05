import { STORAGE_KEYS } from '@/config/env';
import type {
  AuthSession,
  Credentials,
  GameAccount,
  GameId,
  MatchCandidate,
  MatchFilters,
  PlaySession,
  RegisterPayload,
  TimeBlock,
  User,
} from '@/domain/types';
import type {
  ApiContract,
  CreateSessionPayload,
  GameProfileSummary,
  LinkAccountPayload,
  UpdateProfilePayload,
} from '../apiContract';
import { request } from './httpClient';

/**
 * Implementación del contrato contra el servidor Express.
 *
 * Los endpoints listados aquí son el contrato que el backend debe cumplir; hoy
 * no se ejecutan porque `VITE_API_URL` viene vacío y la app usa el mock, pero
 * al definir esa variable la interfaz empieza a consumir estas rutas sin más
 * cambios.
 */
export const httpApi: ApiContract = {
  auth: {
    async login(credentials: Credentials): Promise<AuthSession> {
      const session = await request<AuthSession>('/auth/login', {
        method: 'POST',
        body: credentials,
      });
      localStorage.setItem(STORAGE_KEYS.token, session.token);
      return session;
    },

    async register(payload: RegisterPayload): Promise<AuthSession> {
      const session = await request<AuthSession>('/auth/register', {
        method: 'POST',
        body: payload,
      });
      localStorage.setItem(STORAGE_KEYS.token, session.token);
      return session;
    },

    async me(): Promise<User | null> {
      if (!localStorage.getItem(STORAGE_KEYS.token)) return null;
      try {
        return await request<User>('/auth/me');
      } catch {
        localStorage.removeItem(STORAGE_KEYS.token);
        return null;
      }
    },

    async logout(): Promise<void> {
      try {
        await request<void>('/auth/logout', { method: 'POST' });
      } finally {
        localStorage.removeItem(STORAGE_KEYS.token);
      }
    },
  },

  profile: {
    updateProfile: (payload: UpdateProfilePayload) =>
      request<User>('/profile', { method: 'PATCH', body: payload }),

    getAccounts: () => request<GameAccount[]>('/profile/accounts'),

    linkAccount: (payload: LinkAccountPayload) =>
      request<GameAccount>('/profile/accounts', { method: 'POST', body: payload }),

    unlinkAccount: (accountId: string) =>
      request<void>(`/profile/accounts/${accountId}`, { method: 'DELETE' }),

    syncAccount: (accountId: string) =>
      request<GameAccount>(`/profile/accounts/${accountId}/sync`, { method: 'POST' }),

    getAvailability: () => request<TimeBlock[]>('/profile/availability'),

    saveAvailability: (blocks: TimeBlock[]) =>
      request<TimeBlock[]>('/profile/availability', { method: 'PUT', body: { blocks } }),

    getGameSummary: (gameId: GameId) =>
      request<GameProfileSummary>(`/profile/games/${gameId}`),
  },

  matches: {
    list: (filters: MatchFilters) =>
      request<MatchCandidate[]>('/matches', {
        query: {
          game: filters.gameId,
          maxRankDistance: filters.maxRankDistance,
          minSharedHours: filters.minSharedHours,
          onlyVerified: filters.onlyVerified,
          search: filters.search || undefined,
        },
      }),
  },

  sessions: {
    list: (gameId: GameId | 'all') =>
      request<PlaySession[]>('/sessions', { query: { game: gameId } }),

    create: (payload: CreateSessionPayload) =>
      request<PlaySession>('/sessions', { method: 'POST', body: payload }),

    join: (sessionId: string) =>
      request<PlaySession>(`/sessions/${sessionId}/join`, { method: 'POST' }),

    leave: (sessionId: string) =>
      request<PlaySession>(`/sessions/${sessionId}/leave`, { method: 'POST' }),

    cancel: (sessionId: string) => request<void>(`/sessions/${sessionId}`, { method: 'DELETE' }),
  },
};
