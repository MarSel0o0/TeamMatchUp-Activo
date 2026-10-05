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

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  /** Zona horaria IANA declarada por el usuario, ej. `America/Santiago`. */
  timezone: string;
  createdAt: string;
}

/** Fotografía del rango de una cuenta en un instante dado. */
export interface RankSnapshot {
  /** Nombre del tier tal como lo muestra el juego, ej. `Platinum`. */
  tier: string;
  /** División dentro del tier cuando el juego la usa (LoL: IV..I). */
  division?: string;
  /** Puntos internos del juego (LP en LoL, CS Rating en CS2, MMR en R6). */
  points?: number;
  /** Rango normalizado 0-100 para poder comparar entre juegos distintos. */
  normalized: number;
  recordedAt: string;
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
  /** La plataforma pudo leer el rango desde la fuente externa. */
  verified: boolean;
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
  user: User;
  gameId: GameId;
  account: GameAccount;
  /** Distancia de rango normalizada (0 = idéntico, 100 = extremos opuestos). */
  rankDistance: number;
  /** Bloques horarios en común con el usuario autenticado. */
  sharedBlocks: TimeBlock[];
  /** Puntaje final 0-100 con el que se ordena el listado. */
  score: number;
}

export type SessionStatus = 'open' | 'full' | 'cancelled';

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

export interface AuthSession {
  token: string;
  user: User;
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
