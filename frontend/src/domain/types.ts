/**
 * Tipos del dominio de TeamMatchUp.
 *
 * Esta capa no conoce React ni el transporte HTTP: describe el vocabulario del
 * problema (usuarios, cuentas de juego, rangos, disponibilidad, coincidencias y
 * sesiones). Tanto el backend simulado como el futuro cliente HTTP contra
 * Express deben producir exactamente estas formas.
 */

export type GameId = 'lol' | 'r6' | 'cs2';

/** Día de la semana, 0 = lunes ... 6 = domingo. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Bloque horario de una hora, codificado como `"<día>-<hora>"` (ej. `"2-20"` =
 * miércoles a las 20:00). Se usa un string para poder guardarlo en un Set y
 * comparar disponibilidades con operaciones de conjuntos.
 */
export type TimeBlock = string;

/** Lo que el servidor muestra de cualquier jugador: nunca incluye el correo. */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  /** Zona horaria IANA declarada por el usuario, ej. `America/Santiago`. */
  timezone: string;
  createdAt: string;
}

/** El usuario de la sesión: lo público más su correo. */
export interface User extends PublicUser {
  email: string;
}

/** Fotografía del rango de una cuenta en un instante dado. */
export interface RankSnapshot {
  /** Nombre del tier tal como lo muestra el juego, ej. `Platinum`. */
  tier: string;
  /** División dentro del tier cuando el juego la usa (LoL: IV..I). */
  division?: string;
  /** Puntos internos del juego (LP en LoL, CS Rating en CS2, MMR en R6). */
  points: number;
  /** Rango normalizado 0-100 para poder comparar entre juegos distintos. */
  normalized: number;
  recordedAt: string;
}

/** Fuente real que puede verificar una cuenta (spec 012; backend `domain/sources.ts`). */
export type SourceId = 'steam' | 'riot';

/**
 * Quien entrega un dato de rango sin verificar la cuenta: Leetify, para el rango Premier de CS2
 * (spec 015, RF-6; backend `DATA_SOURCE_IDS`).
 */
export type DataSourceId = SourceId | 'leetify';

/** `simulated` o la fuente real de la que vino un dato (spec 012, RF-5; spec 015, RF-6). */
export type Origin = 'simulated' | DataSourceId;

/** Origen de cada bloque de datos de una cuenta (spec 012, RF-5). */
export interface BlockOrigins {
  identity: Origin;
  rank: Origin;
  matches: Origin;
  profile: Origin;
}

/** Datos de perfil que entrega la fuente real; todos opcionales (spec 012, RF-22). */
export interface AccountProfile {
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  level?: number;
  iconId?: number;
  hoursTotal?: number;
  hoursRecent?: number;
  isPrivate?: boolean;
}

/** Bloques de una cuenta verificada con Riot que pueden quedar pendientes (spec 014, RF-27). */
export type PendingBlock = 'rank' | 'matches' | 'profile';

export interface GameAccount {
  id: string;
  userId: string;
  gameId: GameId;
  /** Identificador dentro del juego (Riot ID, Ubisoft ID, SteamID...). */
  handle: string;
  region: string;
  /** Puede ser `null` en cuentas verificadas con Riot sin clasificar o con rango pendiente (spec 014, RF-13, RF-27). */
  currentRank: RankSnapshot | null;
  /** Historial de variación del rango, de más antiguo a más reciente. */
  rankHistory: RankSnapshot[];
  lastSyncedAt: string;
  /** Verificada con una fuente real; ya no la decide el simulador (spec 012, RF-1, RF-2). */
  verified: boolean;
  /** Fuente con la que se verificó; solo presente si `verified` (spec 012, RF-5). */
  verifiedWith?: SourceId;
  verifiedAt?: string;
  /** Origen de cada bloque de datos (spec 012, RF-5, RF-6). */
  origins: BlockOrigins;
  profile?: AccountProfile;
  /** Bloques que faltan por leer tras una verificación parcial con Riot (spec 014, RF-27). */
  pendingBlocks?: PendingBlock[];
  /**
   * Solo en CS2 verificada con Steam y sin rating: «sin rango Premier» o «rango no disponible»
   * (spec 015, RF-7, RF-8). Con rating no viene.
   */
  premierStatus?: PremierStatus;
}

/** Cuenta de CS2 sin rating de Leetify: sin rango Premier o rango no disponible (spec 015). */
export type PremierStatus = 'unrated' | 'unavailable';

/** Resultado de resincronizar una cuenta; añade aviso solo en resincronización parcial de Riot (spec 014, RF-53, O-1). */
export type SyncAccountResult = GameAccount & {
  syncNotice?: string;
};

/** Desafío de verificación de LoL con Riot Games (spec 014, RF-1, RF-45; nunca incluye `puuid`, RNF-3). */
export interface RiotChallenge {
  id: string;
  iconId: number;
  expiresAt: string;
  remainingSeconds: number;
  riotId: string;
  region: string;
}

/** Resultado de confirmar un desafío de Riot con éxito (spec 014, RF-7, RF-27). */
export interface RiotConfirmResult {
  outcome: 'verified';
  account: GameAccount;
  notice?: string;
}

export type MatchResult = 'win' | 'loss';

export interface MatchRecord {
  id: string;
  gameId: GameId;
  playedAt: string;
  result: MatchResult;
  /** Resumen corto y agnóstico del juego, ej. `Ahri · 8/2/11`. */
  summary: string;
  durationMinutes: number;
  /** Variación de puntos; opcional en partidas reales de Riot sin variación fiable (spec 014, RF-12, RF-30). */
  rankDelta?: number;
}

/** Resultado de una partida de CS2 tal como lo informa Leetify (spec 019, RF-3). */
export type LeetifyOutcome = 'win' | 'loss' | 'tie';

/** Partida reciente de CS2 que entrega Leetify, pedida en vivo y nunca guardada (spec 019). */
export interface LeetifyMatch {
  id: string;
  /** Fecha de término (ISO 8601). */
  finishedAt: string;
  /** Mapa tal como lo entrega Leetify, por ejemplo `de_mirage`. */
  map: string;
  outcome: LeetifyOutcome;
  /** Marcador en el orden que lo entrega Leetify. */
  score: [number, number];
}

/**
 * `GET /api/users/:id/games/:gameId/leetify-matches` (spec 019, plan §3). `available: false`
 * cuando Leetify falló (RF-7); una lista vacía disponible, sin partidas (RF-8).
 */
export interface LeetifyMatches {
  available: boolean;
  matches: LeetifyMatch[];
}

/** Usuario recomendado por el motor de coincidencias, para un juego concreto. */
export interface MatchCandidate {
  user: PublicUser;
  gameId: GameId;
  account: GameAccount;
  /** Distancia de rango normalizada (0 = idéntico, 100 = extremos opuestos). */
  rankDistance: number;
  /** Bloques horarios en común con el usuario autenticado. */
  sharedBlocks: TimeBlock[];
  /** Puntaje final 0-100 con el que se ordena el listado. */
  score: number;
}

export type SessionStatus = 'open' | 'full';

export interface PlaySession {
  id: string;
  gameId: GameId;
  hostId: string;
  host: Pick<User, 'id' | 'username' | 'displayName' | 'avatarColor'>;
  title: string;
  notes: string;
  day: WeekDay;
  startHour: number;
  durationHours: number;
  slots: number;
  participants: Pick<User, 'id' | 'username' | 'displayName' | 'avatarColor'>[];
  status: SessionStatus;
  createdAt: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends Credentials {
  username: string;
  displayName: string;
}

/** Filtros de la vista de coincidencias. */
export interface MatchFilters {
  gameId: GameId;
  /** Distancia máxima de rango aceptada (0-100). */
  maxRankDistance: number;
  /** Mínimo de horas semanales en común. */
  minSharedHours: number;
  /** Solo cuentas cuyo rango pudo verificarse contra la fuente externa. */
  onlyVerified: boolean;
  search: string;
}
