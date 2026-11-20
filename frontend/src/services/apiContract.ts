import type {
  Credentials,
  GameAccount,
  GameId,
  MatchCandidate,
  MatchFilters,
  MatchRecord,
  PlaySession,
  PublicUser,
  RegisterPayload,
  RiotChallenge,
  RiotConfirmResult,
  SyncAccountResult,
  TimeBlock,
  User,
  WeekDay,
} from '@/domain/types';

export interface LinkAccountPayload {
  gameId: GameId;
  handle: string;
  region: string;
}

/** Datos para pedir un desafío de verificación con Riot Games (spec 014, RF-1). */
export interface CreateRiotChallengePayload {
  riotId: string;
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

/** Los seis campos que edita la sesión (spec 009, D-16). */
export type SessionEditFields = Pick<
  CreateSessionPayload,
  'title' | 'notes' | 'day' | 'startHour' | 'durationHours' | 'slots'
>;

/** Edición parcial de la 006 (RF-7): el formulario envía siempre los seis campos. */
export type SessionEditPayload = Partial<SessionEditFields>;

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  timezone?: string;
  avatarColor?: string;
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
 * Resultado de completar la verificación con Steam (spec 013, RF-4, RF-5). Los demás desenlaces
 * (RF-6, RF-8, RF-9) llegan como error con el texto del servidor. `notice` es el aviso de que
 * Leetify no respondió al verificar (spec 015, RF-15).
 */
export type SteamCompleteResult =
  | { outcome: 'verified'; account: GameAccount; notice?: string }
  | { outcome: 'cancelled' };

/**
 * Contrato que la interfaz consume. Existen dos implementaciones
 * intercambiables —el backend simulado en memoria y el cliente HTTP contra
 * Express— y la aplicación elige una u otra según la configuración. Cualquier
 * endpoint nuevo se declara primero aquí.
 */
export interface ApiContract {
  auth: {
    /** Inicia sesión y guarda el comprobante anti-CSRF; devuelve al usuario. */
    login(credentials: Credentials): Promise<User>;
    /** Crea la cuenta; no abre sesión (spec 002). */
    register(payload: RegisterPayload): Promise<User>;
    /** Consulta la sesión vigente; `null` solo si el servidor responde 401. */
    me(): Promise<User | null>;
    logout(): Promise<void>;
  };
  profile: {
    updateProfile(payload: UpdateProfilePayload): Promise<User>;
    getAccounts(): Promise<GameAccount[]>;
    linkAccount(payload: LinkAccountPayload): Promise<GameAccount>;
    unlinkAccount(accountId: string): Promise<void>;
    /** Fuerza una relectura del rango desde la fuente externa del juego. */
    syncAccount(accountId: string): Promise<SyncAccountResult>;
    getAvailability(): Promise<TimeBlock[]>;
    /** Horas marcadas por otro jugador; las usa "Proponer" (plan 3.11, R-6). */
    getAvailabilityOf(userId: string): Promise<TimeBlock[]>;
    saveAvailability(blocks: TimeBlock[]): Promise<TimeBlock[]>;
    getGameSummary(gameId: GameId): Promise<GameProfileSummary>;
  };
  /**
   * Lecturas de otro jugador (spec 008, plan 4.5). `userId` admite `me`; los datos de otro
   * jugador llegan sin correo (el propio, con él).
   */
  users: {
    /** `GET /api/users/:id`. */
    get(userId: string): Promise<PublicUser>;
    /** `GET /api/accounts?user=:id`; usuario inexistente → `[]`. */
    listAccounts(userId: string): Promise<GameAccount[]>;
    /** `GET /api/users/:id/games/:gameId`. */
    getGameSummary(userId: string, gameId: GameId): Promise<GameProfileSummary>;
  };
  /** Verificación de la cuenta de CS2 con Steam (spec 013): `/api/steam`. */
  steam: {
    /** `GET /api/steam`: ¿la instancia tiene Steam configurado? (RF-22). */
    status(): Promise<{ available: boolean }>;
    /** `POST /api/steam/start`: abre el intento y devuelve la página de inicio de sesión de Steam (RF-1). */
    start(): Promise<{ url: string }>;
    /** `POST /api/steam/complete`: completa la verificación con lo que trajo la dirección de vuelta (RF-4). */
    complete(query: Record<string, string>): Promise<SteamCompleteResult>;
    /**
     * Vuelta de Steam **sin sesión** (RF-7, D11): pide al servidor que descarte el intento de ese
     * token (`POST /api/steam/complete` con solo `{ attempt }`). Nunca rechaza ni avisa de sesión
     * vencida: su resultado no cambia lo que se muestra.
     */
    abandon(attempt: string): Promise<void>;
  };
  /** Verificación de la cuenta de LoL con Riot Games (spec 014): `/api/riot`. */
  riot: {
    /** `GET /api/riot`: ¿la instancia tiene Riot Games configurado? (RF-38). */
    status(): Promise<{ available: boolean }>;
    /** `GET /api/riot/challenges/current`: recupera el desafío abierto del usuario o `null` (RF-45). */
    currentChallenge(): Promise<RiotChallenge | null>;
    /** `POST /api/riot/challenges`: crea un desafío con ícono de inicio (RF-1). */
    createChallenge(payload: CreateRiotChallengePayload): Promise<RiotChallenge>;
    /** `POST /api/riot/challenges/:id/confirm`: comprueba el ícono y verifica la cuenta (RF-7, RF-27). */
    confirmChallenge(challengeId: string): Promise<RiotConfirmResult>;
  };
  matches: {
    list(filters: MatchFilters): Promise<MatchCandidate[]>;
  };
  sessions: {
    list(gameId: GameId | 'all'): Promise<PlaySession[]>;
    create(payload: CreateSessionPayload): Promise<PlaySession>;
    /** `GET /api/sessions/:id`. */
    get(sessionId: string): Promise<PlaySession>;
    /** `PUT /api/sessions/:id`: edición parcial; solo quien organiza. */
    update(sessionId: string, payload: SessionEditPayload): Promise<PlaySession>;
    join(sessionId: string): Promise<PlaySession>;
    leave(sessionId: string): Promise<PlaySession>;
    cancel(sessionId: string): Promise<void>;
  };
}
