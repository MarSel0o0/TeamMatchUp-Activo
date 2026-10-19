import type {
  Credentials,
  GameAccount,
  GameId,
  MatchCandidate,
  PlaySession,
  RegisterPayload,
  TimeBlock,
  User,
} from '@/domain/types';
import { BAD_CREDENTIALS_TEXT, NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import type {
  ApiContract,
  CreateSessionPayload,
  GameProfileSummary,
  LinkAccountPayload,
  UpdateProfilePayload,
} from '../apiContract';
import { saveCsrf } from './csrfStorage';
import { ApiError, CSRF_HEADER, request, requestWithHeaders } from './httpClient';

/**
 * Implementación del contrato contra el servidor Express (plan, sección 4).
 *
 * La sesión viaja en una cookie `HttpOnly` que el código de la página nunca ve;
 * lo único que la interfaz guarda es el comprobante anti-CSRF que el servidor
 * entrega en la cabecera de la respuesta del inicio de sesión (RF-2, RF-3).
 */
export const httpApi: ApiContract = {
  auth: {
    async login(credentials: Credentials): Promise<User> {
      const { body, headers } = await requestWithHeaders<User>('/auth/login', {
        method: 'POST',
        body: credentials,
        protectedCall: false,
        unauthorizedMessage: BAD_CREDENTIALS_TEXT,
      });
      const csrf = headers.get(CSRF_HEADER);
      if (csrf === null || csrf === '') {
        // Sin comprobante la cookie no serviría: se trata como error sin mensaje (plan 3.2).
        throw new ApiError(NO_MESSAGE_TEXT, 200, undefined, false);
      }
      saveCsrf(csrf);
      return body;
    },

    register: (payload: RegisterPayload) =>
      request<User>('/users', { method: 'POST', body: payload, protectedCall: false }),

    async me(): Promise<User | null> {
      try {
        return await request<User>('/auth/me', { protectedCall: false });
      } catch (error) {
        // Solo el 401 significa "sin sesión"; cualquier otro fallo lo decide el proveedor (RF-5).
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },

    async logout(): Promise<void> {
      await request<unknown>('/auth/logout', { method: 'POST', protectedCall: false });
    },
  },

  profile: {
    updateProfile: (payload: UpdateProfilePayload) =>
      request<User>('/users/me', { method: 'PATCH', body: payload }),

    getAccounts: () => request<GameAccount[]>('/accounts', { query: { user: 'me' } }),

    linkAccount: (payload: LinkAccountPayload) =>
      request<GameAccount>('/accounts', { method: 'POST', body: payload }),

    unlinkAccount: (accountId: string) =>
      request<void>(`/accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' }),

    syncAccount: (accountId: string) =>
      request<GameAccount>(`/accounts/${encodeURIComponent(accountId)}/sync`, { method: 'POST' }),

    getAvailability: () => request<TimeBlock[]>('/users/me/availability'),

    getAvailabilityOf: (userId: string) =>
      request<TimeBlock[]>(`/users/${encodeURIComponent(userId)}/availability`),

    saveAvailability: (blocks: TimeBlock[]) =>
      request<TimeBlock[]>('/users/me/availability', { method: 'PUT', body: { blocks } }),

    getGameSummary: (gameId: GameId) =>
      request<GameProfileSummary>(`/users/me/games/${encodeURIComponent(gameId)}`),
  },

  matches: {
    // Los cuatro filtros se envían siempre, aunque valgan lo mismo que el valor por
    // defecto del servidor; la búsqueda vacía se omite.
    list: (filters) =>
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
      request<PlaySession>(`/sessions/${encodeURIComponent(sessionId)}/join`, { method: 'POST' }),

    leave: (sessionId: string) =>
      request<PlaySession>(`/sessions/${encodeURIComponent(sessionId)}/leave`, { method: 'POST' }),

    cancel: (sessionId: string) =>
      request<void>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  },
};
