import type {
  AuthSession,
  Credentials,
  GameAccount,
  GameId,
  MatchCandidate,
  MatchFilters,
  MatchRecord,
  PlaySession,
  RegisterPayload,
  TimeBlock,
  User,
  WeekDay,
} from '@/domain/types';

export interface LinkAccountPayload {
  gameId: GameId;
  handle: string;
  region: string;
}

export interface CreateSessionPayload {
  gameId: GameId;
  title: string;
  notes: string;
  day: WeekDay;
  startHour: number;
  durationHours: number;
  slots: number;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  timezone?: string;
}

/** Resumen que alimenta la vista de perfil para un juego concreto. */
export interface GameProfileSummary {
  account: GameAccount;
  recentMatches: MatchRecord[];
  winRate: number;
  /** Variación del rango normalizado en los últimos 30 días. */
  trend: number;
}

/**
 * Contrato que la interfaz consume. Existen dos implementaciones
 * intercambiables —el backend simulado en memoria y el cliente HTTP contra
 * Express— y la aplicación elige una u otra según la configuración. Cualquier
 * endpoint nuevo se declara primero aquí.
 */
export interface ApiContract {
  auth: {
    login(credentials: Credentials): Promise<AuthSession>;
    register(payload: RegisterPayload): Promise<AuthSession>;
    /** Restaura la sesión a partir del token guardado; `null` si no es válida. */
    me(): Promise<User | null>;
    logout(): Promise<void>;
  };
  profile: {
    updateProfile(payload: UpdateProfilePayload): Promise<User>;
    getAccounts(): Promise<GameAccount[]>;
    linkAccount(payload: LinkAccountPayload): Promise<GameAccount>;
    unlinkAccount(accountId: string): Promise<void>;
    /** Fuerza una relectura del rango desde la fuente externa del juego. */
    syncAccount(accountId: string): Promise<GameAccount>;
    getAvailability(): Promise<TimeBlock[]>;
    saveAvailability(blocks: TimeBlock[]): Promise<TimeBlock[]>;
    getGameSummary(gameId: GameId): Promise<GameProfileSummary>;
  };
  matches: {
    list(filters: MatchFilters): Promise<MatchCandidate[]>;
  };
  sessions: {
    list(gameId: GameId | 'all'): Promise<PlaySession[]>;
    create(payload: CreateSessionPayload): Promise<PlaySession>;
    join(sessionId: string): Promise<PlaySession>;
    leave(sessionId: string): Promise<PlaySession>;
    cancel(sessionId: string): Promise<void>;
  };
}
