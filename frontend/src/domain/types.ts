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

/** `simulated` o la fuente real de la que vino un dato (spec 012, RF-5). */
export type Origin = 'simulated' | SourceId;

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

export interface GameAccount {
  id: string;
  userId: string;
  gameId: GameId;
  /** Identificador dentro del juego (Riot ID, Ubisoft ID, SteamID...). */
  handle: string;
  region: string;
  currentRank: RankSnapshot;
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
  rankDelta: number;
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
