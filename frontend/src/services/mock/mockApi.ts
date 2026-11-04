import { env, STORAGE_KEYS } from '@/config/env';
import { parseBlock } from '@/domain/availability';
import { GAMES } from '@/domain/games';
import {
  NOTES_MAX_LENGTH,
  SESSION_ERRORS,
  codePointLength,
  isPlainObject,
  isValidSessionTitle,
  trimText,
  validateSessionEdit,
} from '@/domain/sessionRules';
import { compareSessions } from '@/domain/sessionList';
import { buildMatches, type CandidateInput, type MatchCriteria } from '@/domain/matching';
import type {
  Credentials,
  GameAccount,
  GameId,
  MatchCandidate,
  MatchFilters,
  MatchRecord,
  PlaySession,
  PublicUser,
  RankSnapshot,
  RegisterPayload,
  TimeBlock,
  User,
  WeekDay,
} from '@/domain/types';
import { BAD_CREDENTIALS_TEXT, NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import type {
  ApiContract,
  CreateSessionPayload,
  SessionEditPayload,
  GameProfileSummary,
  LinkAccountPayload,
  UpdateProfilePayload,
} from '../apiContract';
import { readCsrf, saveCsrf } from '../http/csrfStorage';
import { ApiError, CSRF_HEADER } from '../http/httpClient';
import { execute, type HeaderReader, type RawResponse } from '../http/transport';
import { resolveMockSessionId } from './mockSessionTarget';
import { resolveMockUserTarget } from './mockUserTarget';
import { createSeedDatabase, matchJson, snapshotJson, type MockDatabase } from './seed';
import { canonicalHandle, readAccountState } from './simulatedProvider';

/* -------------------------------------------------------------------------- */
/* Base simulada y sesión del "servidor"                                       */
/* -------------------------------------------------------------------------- */

/**
 * Sesión del servidor simulado (RF-19, plan 3.9). Representa a la vez la cookie
 * del navegador y la sesión del servidor: hay una por navegador, como con el
 * servidor real. La interfaz no la lee nunca; lo único que guarda de la sesión es
 * el comprobante anti-CSRF (`csrfStorage`).
 */
interface MockSession {
  userId: string;
  csrf: string;
}

/**
 * La base guardada: la semilla más lo que solo conoce el "servidor" (la interfaz no lo lee
 * nunca): la sesión y el número de la última lectura del proveedor simulado de cada cuenta
 * (`readings`, por id de cuenta; ausente = 0, como una cuenta recién leída).
 */
type StoredDatabase = MockDatabase & {
  session: MockSession | null;
  readings: Record<string, number>;
};

function isSession(value: unknown): value is MockSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<MockSession>;
  return typeof candidate.userId === 'string' && typeof candidate.csrf === 'string';
}

function isReadings(value: unknown): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => Number.isInteger(entry))
  );
}

function normalizeDatabase(
  raw: MockDatabase & { session?: unknown; readings?: unknown },
): StoredDatabase {
  return {
    ...raw,
    session: isSession(raw.session) ? raw.session : null,
    readings: isReadings(raw.readings) ? raw.readings : {},
  };
}

function save(next: StoredDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(next));
  } catch {
    // Sin almacenamiento la sesión sigue funcionando, solo no sobrevive al recargar.
  }
}

/** La base guardada, o `null` si no hay, está corrupta o el almacenamiento está bloqueado. */
function readStoredDatabase(): StoredDatabase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.mockDb);
    if (raw) return normalizeDatabase(JSON.parse(raw) as MockDatabase);
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se usa la semilla o la memoria.
  }
  return null;
}

let database: StoredDatabase =
  readStoredDatabase() ?? normalizeDatabase(createSeedDatabase());
save(database);

/**
 * Vuelve a leer la base guardada antes de atender cada petición: la sesión es una
 * por navegador, así que lo que otra pestaña escribió (iniciar o cerrar sesión)
 * vale también aquí. Sin almacenamiento se sigue con la memoria de esta pestaña.
 */
function refreshDatabase(): void {
  const stored = readStoredDatabase();
  if (stored) database = stored;
}

/** Escribe en el almacenamiento el estado actual tras una escritura. */
function persist(): void {
  save(database);
}

/** Borra la base simulada (que hace de servidor, con su sesión) y vuelve al estado inicial. */
export function resetMockDatabase(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.mockDb);
  } catch {
    // Sin almacenamiento solo se reinicia la memoria.
  }
  database = normalizeDatabase(createSeedDatabase());
  save(database);
}

/* -------------------------------------------------------------------------- */
/* Respuestas crudas y autorización                                            */
/* -------------------------------------------------------------------------- */

/** Lo que el servidor simulado responde: estado, cuerpo y, en el login, el comprobante. */
interface Reply {
  status: number;
  body?: unknown;
  csrf?: string;
}

const reply = (status: number, body?: unknown): Reply => ({ status, body });

/** Error del servidor: el cuerpo es `{ error }`, igual que el real. */
const fail = (status: number, error: string): Reply => ({ status, body: { error } });

const MESSAGES = {
  emailMissing: 'falta el correo',
  passwordMissing: 'falta la contraseña',
  emailTaken: 'ya existe una cuenta con ese correo',
  usernameTaken: 'ese nombre de usuario ya está en uso',
  notLoggedIn: 'sesión no iniciada',
  invalidToken: 'token inválido',
  // Spec 004 (`ACCOUNT_ERRORS` de `backend/src/domain/accountRules.ts`, DP-6) y spec 002.
  invalidGame: 'juego no válido',
  invalidHandle: {
    lol: 'Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres antes de # y 2 a 5 letras o dígitos después',
    r6: 'Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto, guion o guion bajo',
    cs2: 'SteamID64 no válido: son 17 dígitos que empiezan por 7656119',
  } satisfies Record<GameId, string>,
  invalidRegion: (gameId: GameId): string => `región no válida para ${GAMES[gameId].name}`,
  duplicateAccount: 'ya tienes una cuenta vinculada en este juego',
  accountNotFound: 'cuenta no encontrada',
  noAccountForGame: 'el jugador no tiene una cuenta vinculada en este juego',
  forbidden: 'no tienes permiso para esta operación',
  // Spec 003 (`PROFILE_MESSAGES` y `AVAILABILITY_MESSAGES` del backend).
  displayNameType: 'el nombre visible debe ser un texto',
  displayNameEmpty: 'el nombre visible no puede estar vacío',
  displayNameTooLong: 'el nombre visible no puede superar 40 caracteres',
  bioType: 'la biografía debe ser un texto',
  bioTooLong: 'la biografía no puede superar 200 caracteres',
  timezoneType: 'la zona horaria debe ser un texto',
  timezoneInvalid: 'la zona horaria no es válida',
  avatarColorType: 'el color de avatar debe ser un texto',
  avatarColorFormat: 'el color de avatar debe tener la forma #RRGGBB',
  blocksMissing: 'faltan los bloques',
  blocksNotList: 'los bloques deben ser una lista',
  blockInvalid: 'hay un bloque horario con formato inválido',
  // Lectura de la disponibilidad de otro jugador (spec 003, RF-12 y RF-20; `USER_TARGET_MESSAGES`).
  invalidId: 'id con formato inválido',
  userNotFound: 'usuario no encontrado',
  // Spec 005 (`MATCH_ERRORS` de `backend/src/domain/matchQuery.ts`, DP5-2, DP5-3 y DP5-17):
  // minúscula inicial y sin punto final; los rótulos entre « » conservan su mayúscula. El del
  // filtro de verificadas conserva «rango verificado»: excepción al RF-16 de la spec 007 aprobada
  // por el usuario el 2026-10-19 (R21); es el literal del servidor y la interfaz nunca lo muestra.
  matchMaxRankDistance:
    'filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100',
  matchMinSharedHours:
    'filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168',
  matchOnlyVerified: 'filtro «Solo cuentas con rango verificado» no válido: usa true o false',
  matchSearch: 'filtro «Buscar jugador» no válido',
  matchNoAccount: 'no tienes una cuenta vinculada en este juego',
  // Spec 006 (`SESSION_ERRORS` de `backend/src/domain/sessionRules.ts`): mayúscula inicial y
  // punto final. Solo los que puede provocar el contrato de la interfaz (sin editar).
  sessionGame: 'Juego no válido.',
  sessionNoAccount: 'No tienes una cuenta vinculada en este juego.',
  sessionTitle: 'El título debe tener entre 3 y 60 caracteres.',
  sessionNotes: 'Las notas deben ser texto de hasta 160 caracteres.',
  sessionDay: 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).',
  sessionStartHour: 'Hora de inicio no válida: usa un entero de 0 a 23.',
  sessionDuration: 'Duración no válida: usa un entero de 1 a 4 horas.',
  sessionSlots: 'Cupos no válidos: usa un entero de 2 a 6.',
  sessionNotFound: 'Sesión no encontrada.',
  sessionNotHostCancel: 'Solo quien organiza puede cancelar la sesión.',
  sessionAlreadyJoined: 'Ya estás inscrito en esta sesión.',
  sessionFull: 'Esta sesión ya no admite jugadores.',
  sessionHostLeave: 'Eres quien organiza: cancela la sesión en lugar de salir.',
  sessionNotJoined: 'No estás inscrito en esta sesión.',
} as const;

function toRaw(result: Reply): RawResponse {
  const csrf = result.csrf;
  const headers: HeaderReader | undefined =
    csrf === undefined
      ? undefined
      : { get: (name) => (name.toLowerCase() === CSRF_HEADER.toLowerCase() ? csrf : null) };
  return {
    status: result.status,
    text: result.body === undefined ? '' : JSON.stringify(result.body),
    headers,
  };
}

function newCsrf(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

type AuthResult = { user: User } | { denied: Reply };

/**
 * Pasos de la spec 002 (RF-10, RF-11, RF-22; spec 004, RF-44): sin sesión,
 * "sesión no iniciada"; con comprobante ausente o distinto, o con el usuario ya
 * eliminado, "token inválido".
 */
function authorize(csrfSent: string | null): AuthResult {
  const session = database.session;
  if (session === null) return { denied: fail(401, MESSAGES.notLoggedIn) };
  if (csrfSent === null || csrfSent === '' || csrfSent !== session.csrf) {
    return { denied: fail(401, MESSAGES.invalidToken) };
  }
  const user = database.users.find((candidate) => candidate.id === session.userId);
  if (!user) return { denied: fail(401, MESSAGES.invalidToken) };
  return { user };
}

type Handler = (csrfSent: string | null) => Reply;

/** Atiende una operación que exige sesión (comprobante y usuario vigentes). */
function asUser(handle: (user: User) => Reply): Handler {
  return (csrfSent) => {
    const result = authorize(csrfSent);
    return 'user' in result ? handle(result.user) : result.denied;
  };
}

const delay = () => new Promise((resolve) => setTimeout(resolve, env.mockLatency));

/**
 * Cada operación construye una respuesta cruda y la entrega al mismo `execute` que
 * el cliente HTTP (plan 3.3): plazo, descarte, clasificación de errores y 401 son
 * idénticos en los dos modos. El comprobante se lee al enviar (antes de la
 * espera), como la cabecera de una petición real; la autorización y los cambios
 * se resuelven al llegar al "servidor", tras la latencia.
 */
function serve<T>(handle: Handler, protectedCall: boolean) {
  return execute<T>(
    async () => {
      const csrfSent = readCsrf();
      await delay();
      refreshDatabase();
      return toRaw(handle(csrfSent));
    },
    { protectedCall },
  );
}

/** Operación protegida: su 401 es sesión vencida (RF-7). Devuelve solo el cuerpo. */
async function protectedOperation<T>(handle: (user: User) => Reply): Promise<T> {
  const { body } = await serve<T>(asUser(handle), true);
  return body;
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

const userRef = (user: User) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarColor: user.avatarColor,
});

/* -------------------------------------------------------------------------- */
/* Cuentas de juego (spec 004) y perfil (spec 003)                              */
/* -------------------------------------------------------------------------- */

/** Máximo de partidas guardadas por cuenta y de las que entrega el resumen (spec 004, RF-15). */
const MAX_STORED_MATCHES = 20;
const RECENT_MATCHES = 8;

/** Compara por puntos de código Unicode (`compareCodePoints` del servidor). */
function compareCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i) ?? 0;
    const cb = b.codePointAt(j) ?? 0;
    if (ca !== cb) return ca < cb ? -1 : 1;
    i += ca > 0xffff ? 2 : 1;
    j += cb > 0xffff ? 2 : 1;
  }
  if (i < a.length) return 1;
  if (j < b.length) return -1;
  return 0;
}

/** Más reciente primero; a igual fecha, identificador mayor primero (spec 004, RF-28). */
function compareMatches(a: MatchRecord, b: MatchRecord): number {
  const byDate = Date.parse(b.playedAt) - Date.parse(a.playedAt);
  if (byDate !== 0) return byDate;
  return compareCodePoints(b.id, a.id);
}

/**
 * Unión de partidas (spec 004, RF-15 y RF-28; `mergeMatches` del servidor): sin repetidos
 * (se conserva la guardada), en el orden de `compareMatches`, 20 como máximo, y la partida
 * principal de la lectura siempre queda entre ellas.
 */
function mergeMatches(
  saved: readonly MatchRecord[],
  incoming: readonly MatchRecord[],
  mainMatchId: string,
): MatchRecord[] {
  const savedIds = new Set(saved.map((match) => match.id));
  const all = [...saved, ...incoming.filter((match) => !savedIds.has(match.id))].sort(compareMatches);
  const first = all.slice(0, MAX_STORED_MATCHES);
  const main = all.find((match) => match.id === mainMatchId);
  if (main === undefined || first.includes(main)) return first;
  const others = all.filter((match) => match !== main).slice(0, MAX_STORED_MATCHES - 1);
  return [main, ...others].sort(compareMatches);
}

/** Se añade una fotografía al historial solo si cambió el tier, la división o los puntos (DP-9). */
function shouldAppendSnapshot(previous: RankSnapshot, next: RankSnapshot): boolean {
  return (
    previous.tier !== next.tier || previous.division !== next.division || previous.points !== next.points
  );
}

/** Porcentaje de victorias redondeado; 0 si no hay partidas (spec 004, DP-11). */
function winRateOf(matches: readonly MatchRecord[]): number {
  if (matches.length === 0) return 0;
  const wins = matches.filter((match) => match.result === 'win').length;
  return Math.round((wins * 100) / matches.length);
}

/**
 * Resumen por juego de una cuenta (spec 004, RF-12 y RF-37): las 8 primeras partidas en el
 * orden guardado, su tasa de victorias y la tendencia respecto de la primera lectura. Lo usan
 * el resumen propio y el de otro jugador (spec 008, plan 4.5).
 */
function gameSummaryOf(account: GameAccount): GameProfileSummary {
  const recentMatches = (database.matchHistory[account.id] ?? []).slice(0, RECENT_MATCHES);
  const first = account.rankHistory[0];
  return {
    account,
    recentMatches,
    winRate: winRateOf(recentMatches),
    trend: first === undefined ? 0 : account.currentRank.normalized - first.normalized,
  };
}

const isKnownGame = (value: unknown): value is GameId =>
  typeof value === 'string' && Object.hasOwn(GAMES, value);

/** Minúsculas solo para `A`-`Z` (spec 004, DP-35). */
const asciiLower = (text: string): string =>
  text.replace(/[A-Z]/g, (letter) => String.fromCharCode(letter.charCodeAt(0) + 32));

/** Grafía de la lista del juego si coincide sin espacios en los extremos y sin distinguir mayúsculas ASCII. */
function normalizeRegion(gameId: GameId, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const wanted = asciiLower(value.trim());
  if (wanted === '') return null;
  return GAMES[gameId].regions.find((region) => asciiLower(region) === wanted) ?? null;
}

/**
 * Zona horaria válida (spec 003, RF-16): `UTC` o un nombre `Área/Lugar` de la base IANA
 * que no sea de `Etc`. El servidor compara con su copia de `zone.tab`; aquí se apoya en
 * `Intl` (que conoce la base IANA del navegador) y exige la grafía con mayúscula inicial
 * en cada tramo, porque `Intl` también acepta `america/santiago`.
 */
function isValidTimezone(trimmed: string): boolean {
  if (trimmed === 'UTC') return true;
  const segments = trimmed.split('/');
  if (segments.length < 2 || segments[0] === 'Etc') return false;
  if (!segments.every((segment) => /^[A-Z]/.test(segment))) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Validación del perfil (spec 003, RF-7, RF-8, RF-15 y RF-16; `validateProfileUpdate`):
 * orden nombre visible, biografía, zona horaria y color; primer error y no se guarda nada.
 * Solo omitir un campo lo conserva. Los textos se recortan y el color se guarda en minúsculas.
 */
function validateProfile(payload: UpdateProfilePayload): Checked<UpdateProfilePayload> {
  const rules: readonly (readonly [
    keyof UpdateProfilePayload,
    string,
    (trimmed: string) => Checked<string>,
  ])[] = [
    [
      'displayName',
      MESSAGES.displayNameType,
      (t) =>
        t === ''
          ? { ok: false, error: MESSAGES.displayNameEmpty }
          : t.length > 40
            ? { ok: false, error: MESSAGES.displayNameTooLong }
            : { ok: true, value: t },
    ],
    [
      'bio',
      MESSAGES.bioType,
      (t) => (t.length > 200 ? { ok: false, error: MESSAGES.bioTooLong } : { ok: true, value: t }),
    ],
    [
      'timezone',
      MESSAGES.timezoneType,
      (t) => (isValidTimezone(t) ? { ok: true, value: t } : { ok: false, error: MESSAGES.timezoneInvalid }),
    ],
    [
      'avatarColor',
      MESSAGES.avatarColorType,
      (t) =>
        /^#[0-9a-fA-F]{6}$/.test(t)
          ? { ok: true, value: t.toLowerCase() }
          : { ok: false, error: MESSAGES.avatarColorFormat },
    ],
  ];

  const update: UpdateProfilePayload = {};
  for (const [field, typeMessage, rule] of rules) {
    const raw: unknown = Object.hasOwn(payload, field) ? payload[field] : undefined;
    if (raw === undefined) continue;
    if (typeof raw !== 'string') return { ok: false, error: typeMessage };
    const checked = rule(raw.trim());
    if (!checked.ok) return checked;
    update[field] = checked.value;
  }
  return { ok: true, value: update };
}

/** Bloques de la disponibilidad (spec 003, RF-13 y RF-14): lista de bloques válidos, sin repetidos. */
function validateBlocks(blocks: unknown): Checked<TimeBlock[]> {
  if (blocks === undefined || blocks === null) return { ok: false, error: MESSAGES.blocksMissing };
  if (!Array.isArray(blocks)) return { ok: false, error: MESSAGES.blocksNotList };
  const valid = blocks.filter(
    (block): block is string => typeof block === 'string' && parseBlock(block) !== null,
  );
  if (valid.length !== blocks.length) return { ok: false, error: MESSAGES.blockInvalid };
  return { ok: true, value: [...new Set(valid)] };
}

/** Orden de la spec 004, RF-6: juego, identificador y región; primer error y nada más. */
function validateLink(
  payload: LinkAccountPayload,
): Checked<{ gameId: GameId; handle: string; region: string }> {
  const gameId: unknown = payload.gameId;
  if (!isKnownGame(gameId)) return { ok: false, error: MESSAGES.invalidGame };
  const handle = typeof payload.handle === 'string' ? payload.handle.trim() : '';
  if (handle === '' || !GAMES[gameId].handlePattern.test(handle)) {
    return { ok: false, error: MESSAGES.invalidHandle[gameId] };
  }
  const region = normalizeRegion(gameId, payload.region);
  if (region === null) return { ok: false, error: MESSAGES.invalidRegion(gameId) };
  return { ok: true, value: { gameId, handle, region } };
}

/* -------------------------------------------------------------------------- */
/* Coincidencias (spec 005) y sesiones (spec 006)                              */
/* -------------------------------------------------------------------------- */

/** Forma de los identificadores de sesión del simulado (`session-…`); el servidor exige un ObjectId. */

/** Entero dentro de [min, max] o `null` (`readJsonInteger` de la spec 006; `-0` pasa a 0). */
function readInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  const n = value + 0;
  return n >= min && n <= max ? n : null;
}

/**
 * Filtros de la consulta (spec 005, RF-5, RF-12, RF-14, RF-15 y RF-16; `parseMatchQuery`):
 * orden juego, distancia, horas, solo verificadas y búsqueda; primer error y nada más. La
 * interfaz solo envía filtros válidos, así que estos textos salen de una llamada directa.
 */
function validateMatchFilters(filters: MatchFilters): Checked<MatchCriteria> {
  const gameId: unknown = filters.gameId;
  if (!isKnownGame(gameId)) return { ok: false, error: MESSAGES.invalidGame };

  const maxRankDistance = readInteger(filters.maxRankDistance, 0, 100);
  if (maxRankDistance === null) return { ok: false, error: MESSAGES.matchMaxRankDistance };

  const minSharedHours = readInteger(filters.minSharedHours, 0, 168);
  if (minSharedHours === null) return { ok: false, error: MESSAGES.matchMinSharedHours };

  const onlyVerified: unknown = filters.onlyVerified;
  if (typeof onlyVerified !== 'boolean') return { ok: false, error: MESSAGES.matchOnlyVerified };

  const searchValue: unknown = filters.search;
  if (searchValue !== undefined && typeof searchValue !== 'string') {
    return { ok: false, error: MESSAGES.matchSearch };
  }
  const trimmed = (searchValue ?? '').trim();

  return {
    ok: true,
    value: {
      gameId,
      maxRankDistance,
      minSharedHours,
      onlyVerified,
      search: trimmed === '' ? null : trimmed,
    },
  };
}

/** Lo público del jugador candidato (spec 005, DP5-10): nunca el correo. */
function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    bio: user.bio,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}

interface CreateInput {
  gameId: GameId;
  title: string;
  notes: string;
  day: WeekDay;
  startHour: number;
  durationHours: number;
  slots: number;
}

/**
 * Crear una sesión (spec 006, RF-6, RF-15 y RF-27; `validateCreatePayload`): primer fallo en el
 * orden juego, cuenta vinculada, título, notas, día, hora, duración y cupos. Un cuerpo que no es
 * objeto se trata como `{}`; solo se leen los siete campos propios.
 */
function validateCreateSession(
  payload: CreateSessionPayload,
  linkedGames: ReadonlySet<GameId>,
): Checked<CreateInput> {
  const body: unknown = payload;
  const fields: Record<string, unknown> =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const own = (key: string): unknown => (Object.hasOwn(fields, key) ? fields[key] : undefined);

  const gameId = own('gameId');
  if (!isKnownGame(gameId)) return { ok: false, error: MESSAGES.sessionGame };
  if (!linkedGames.has(gameId)) return { ok: false, error: MESSAGES.sessionNoAccount };

  // Una sola regla del título (spec 009, D-15): la misma que usa la interfaz y la edición.
  const rawTitle = own('title');
  if (typeof rawTitle !== 'string' || !isValidSessionTitle(rawTitle)) {
    return { ok: false, error: MESSAGES.sessionTitle };
  }
  const title = trimText(rawTitle);

  let notes = '';
  if (Object.hasOwn(fields, 'notes')) {
    const rawNotes = fields['notes'];
    notes = typeof rawNotes === 'string' ? trimText(rawNotes) : '';
    if (typeof rawNotes !== 'string' || codePointLength(notes) > NOTES_MAX_LENGTH) {
      return { ok: false, error: MESSAGES.sessionNotes };
    }
  }

  const day = readInteger(own('day'), 0, 6);
  if (day === null) return { ok: false, error: MESSAGES.sessionDay };
  const startHour = readInteger(own('startHour'), 0, 23);
  if (startHour === null) return { ok: false, error: MESSAGES.sessionStartHour };
  const durationHours = readInteger(own('durationHours'), 1, 4);
  if (durationHours === null) return { ok: false, error: MESSAGES.sessionDuration };
  const slots = readInteger(own('slots'), 2, 6);
  if (slots === null) return { ok: false, error: MESSAGES.sessionSlots };

  return {
    ok: true,
    value: { gameId, title, notes, day: day as WeekDay, startHour, durationHours, slots },
  };
}

/** Lleno cuando los inscritos alcanzan los cupos (spec 006, RF-11 y RF-13). */
const statusFor = (participantCount: number, slots: number): PlaySession['status'] =>
  participantCount >= slots ? 'full' : 'open';

/**
 * Vista de una sesión (spec 006, RF-4, RF-24 y RNF-1): anfitrión y participantes se resuelven
 * con los usuarios vigentes (solo los cuatro campos públicos); sin anfitrión, `null`; un
 * participante que ya no existe se omite. El estado sale tal como está guardado.
 */
function sessionView(session: PlaySession): PlaySession | null {
  const host = database.users.find((candidate) => candidate.id === session.hostId);
  if (host === undefined) return null;
  const participants = session.participants.flatMap((participant) => {
    const user = database.users.find((candidate) => candidate.id === participant.id);
    return user === undefined ? [] : [userRef(user)];
  });
  return { ...session, host: userRef(host), participants };
}

/** `session-<n>` con el mayor número usado + 1 (el formato que acepta `resolveMockSessionId`). */
function nextSessionId(): string {
  const used = database.sessions.map((session) => Number(session.id.slice('session-'.length)));
  return `session-${Math.max(0, ...used.filter(Number.isFinite)) + 1}`;
}

/** Sesión por id con el orden de la spec 006 (RF-20): formato (400) y existencia, también del anfitrión (404). */
function findSession(rawId: string): { session: PlaySession } | { denied: Reply } {
  const sessionId = resolveMockSessionId(rawId);
  if (sessionId === null) return { denied: fail(400, MESSAGES.invalidId) };
  const session = database.sessions.find((candidate) => candidate.id === sessionId);
  if (session === undefined || sessionView(session) === null) {
    return { denied: fail(404, MESSAGES.sessionNotFound) };
  }
  return { session };
}

/* -------------------------------------------------------------------------- */
/* Implementación del contrato                                                 */
/* -------------------------------------------------------------------------- */

export const mockApi: ApiContract = {
  auth: {
    async login({ email, password }: Credentials): Promise<User> {
      const { body, headers } = await serve<User>((): Reply => {
        // Spec 002, RF-18 y RF-19: campos ausentes -> 400 sin consultar usuarios.
        if (email.trim() === '') return fail(400, MESSAGES.emailMissing);
        if (password === '') return fail(400, MESSAGES.passwordMissing);

        const user = database.users.find(
          (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
        );
        // RF-9: mismo código y mensaje si el correo no existe o la contraseña no coincide.
        if (!user || database.passwords[user.id] !== password) {
          return fail(401, BAD_CREDENTIALS_TEXT);
        }

        // RF-8: credencial y comprobante nuevos en cada inicio; reemplazan los anteriores.
        const csrf = newCsrf();
        database.session = { userId: user.id, csrf };
        persist();
        return { status: 200, body: user, csrf };
      }, false);

      // Igual que el cliente HTTP: el comprobante de la respuesta es lo único que se guarda.
      const csrf = headers.get(CSRF_HEADER);
      if (csrf === null || csrf === '') throw new ApiError(NO_MESSAGE_TEXT, 200, undefined, false);
      saveCsrf(csrf);
      return body;
    },

    async register(payload: RegisterPayload): Promise<User> {
      const { body } = await serve<User>((): Reply => {
        const email = payload.email.trim().toLowerCase();
        const username = payload.username.trim();

        // Spec 002, RF-3: 400 (no 409); si se repiten los dos, el mensaje del correo.
        if (database.users.some((user) => user.email.toLowerCase() === email)) {
          return fail(400, MESSAGES.emailTaken);
        }
        if (database.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
          return fail(400, MESSAGES.usernameTaken);
        }

        const user: User = {
          id: `user-${Date.now()}`,
          username,
          email,
          displayName: payload.displayName.trim() || username,
          avatarColor: '#6d5efc',
          bio: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago',
          createdAt: new Date().toISOString(),
        };

        database.users.push(user);
        database.passwords[user.id] = payload.password;
        database.availability[user.id] = [];
        persist();
        // Spec 002, caso límite: registrar no abre sesión por sí solo.
        return reply(201, user);
      }, false);
      return body;
    },

    async me(): Promise<User | null> {
      try {
        const { body } = await serve<User>(asUser((user) => reply(200, user)), false);
        return body;
      } catch (error) {
        // Solo el 401 significa "sin sesión"; cualquier otro fallo lo decide el proveedor (RF-5).
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },

    async logout(): Promise<void> {
      // Spec 002, RF-14: no revisa la credencial ni el comprobante; siempre cierra.
      await serve<unknown>((): Reply => {
        database.session = null;
        persist();
        return reply(200, { message: 'sesión cerrada' });
      }, false);
    },
  },

  profile: {
    updateProfile: (payload: UpdateProfilePayload) =>
      protectedOperation<User>((user) => {
        // Spec 003, RF-7 y RF-8: si algún campo no vale, 400 y no se guarda nada.
        const checked = validateProfile(payload);
        if (!checked.ok) return fail(400, checked.error);
        Object.assign(user, checked.value);
        persist();
        return reply(200, user);
      }),

    getAccounts: () =>
      protectedOperation<GameAccount[]>((user) =>
        reply(
          200,
          database.accounts.filter((account) => account.userId === user.id),
        ),
      ),

    linkAccount: (payload: LinkAccountPayload) =>
      protectedOperation<GameAccount>((user) => {
        // Spec 004, RF-6: datos inválidos -> 400 (no 422), antes de mirar si ya hay cuenta.
        const checked = validateLink(payload);
        if (!checked.ok) return fail(400, checked.error);
        const { gameId, handle, region } = checked.value;
        // Spec 004, RF-5: segunda cuenta en el mismo juego -> 400 (no 409).
        if (
          database.accounts.some((account) => account.userId === user.id && account.gameId === gameId)
        ) {
          return fail(400, MESSAGES.duplicateAccount);
        }

        // Lectura número 0 del proveedor simulado (spec 004, RF-4); sus fechas salen de `at`.
        const at = new Date();
        const reading = readAccountState({
          gameId,
          canonicalHandle: canonicalHandle(handle),
          readingNumber: 0,
          now: at,
        });
        const snapshot = snapshotJson(reading.snapshot);
        const account: GameAccount = {
          id: `account-${newCsrf()}`,
          userId: user.id,
          gameId,
          handle,
          region,
          currentRank: snapshot,
          rankHistory: [snapshot],
          lastSyncedAt: at.toISOString(),
          verified: reading.verified,
          simulated: true,
        };

        database.accounts.push(account);
        database.matchHistory[account.id] = mergeMatches([], reading.matches.map(matchJson), reading.mainMatchId);
        database.readings[account.id] = 0;
        persist();
        return reply(201, account);
      }),

    unlinkAccount: (accountId: string) =>
      protectedOperation<void>((user) => {
        // Spec 004, RF-9 y RF-11: existencia (404) y luego propiedad (403).
        const index = database.accounts.findIndex((account) => account.id === accountId);
        const account = database.accounts[index];
        if (account === undefined) return fail(404, MESSAGES.accountNotFound);
        if (account.userId !== user.id) return fail(403, MESSAGES.forbidden);

        database.accounts.splice(index, 1);
        delete database.matchHistory[accountId];
        delete database.readings[accountId];
        persist();
        return reply(204);
      }),

    syncAccount: (accountId: string) =>
      protectedOperation<GameAccount>((user) => {
        // Spec 004, RF-10 y RF-11: existencia (404) y luego propiedad (403).
        const account = database.accounts.find((candidate) => candidate.id === accountId);
        if (account === undefined) return fail(404, MESSAGES.accountNotFound);
        if (account.userId !== user.id) return fail(403, MESSAGES.forbidden);

        // Lectura siguiente del proveedor simulado (spec 004, RF-42): el rango se mueve como
        // mucho un escalón y llega al menos una partida nueva (la principal, con `at`).
        const at = new Date();
        const readingNumber = (database.readings[account.id] ?? 0) + 1;
        const reading = readAccountState({
          gameId: account.gameId,
          canonicalHandle: canonicalHandle(account.handle),
          readingNumber,
          now: at,
        });
        const snapshot = snapshotJson(reading.snapshot);
        if (shouldAppendSnapshot(account.currentRank, snapshot)) {
          account.rankHistory = [...account.rankHistory, snapshot];
        }
        account.currentRank = snapshot;
        account.lastSyncedAt = at.toISOString();
        account.verified = reading.verified;
        database.matchHistory[account.id] = mergeMatches(
          database.matchHistory[account.id] ?? [],
          reading.matches.map(matchJson),
          reading.mainMatchId,
        );
        database.readings[account.id] = readingNumber;
        persist();
        return reply(200, account);
      }),

    getAvailability: () =>
      protectedOperation<TimeBlock[]>((user) => reply(200, database.availability[user.id] ?? [])),

    getAvailabilityOf: (userId: string) =>
      protectedOperation<TimeBlock[]>((user) => {
        // Spec 003, RF-12 y RF-20: `me` (la propia), formato (400) y existencia (404); cualquiera
        // puede leer la de otro jugador. Formato del simulado: `user-<dígitos>` sin distinguir
        // mayúsculas (spec 008, RF-11; `resolveMockUserTarget`).
        const target = resolveMockUserTarget(userId, user.id);
        if (!target.ok) return fail(400, MESSAGES.invalidId);
        if (!database.users.some((candidate) => candidate.id === target.id)) {
          return fail(404, MESSAGES.userNotFound);
        }
        return reply(200, database.availability[target.id] ?? []);
      }),

    saveAvailability: (blocks: TimeBlock[]) =>
      protectedOperation<TimeBlock[]>((user) => {
        // Spec 003, RF-13 y RF-14: formato de cada bloque; sin repetidos, en orden de aparición.
        const checked = validateBlocks(blocks);
        if (!checked.ok) return fail(400, checked.error);
        database.availability[user.id] = checked.value;
        persist();
        return reply(200, checked.value);
      }),

    getGameSummary: (gameId: GameId) =>
      protectedOperation<GameProfileSummary>((user) => {
        // Spec 004, RF-13: juego (400) y luego cuenta en ese juego (404).
        if (!isKnownGame(gameId)) return fail(400, MESSAGES.invalidGame);
        const account = database.accounts.find(
          (candidate) => candidate.userId === user.id && candidate.gameId === gameId,
        );
        if (!account) return fail(404, MESSAGES.noAccountForGame);
        return reply(200, gameSummaryOf(account));
      }),
  },

  // Spec 008 (RF-11, plan 4.5): lecturas de otro jugador con los códigos, textos y orden del
  // servidor. `resolveMockUserTarget` hace de `resolveUserTarget` con la forma `user-<dígitos>`.
  users: {
    get: (userId: string) =>
      protectedOperation<PublicUser>((user) => {
        // Spec 003, RF-20: formato (400) y existencia (404); el correo solo si es el propio.
        const target = resolveMockUserTarget(userId, user.id);
        if (!target.ok) return fail(400, MESSAGES.invalidId);
        const found = database.users.find((candidate) => candidate.id === target.id);
        if (found === undefined) return fail(404, MESSAGES.userNotFound);
        return reply(200, target.own ? found : toPublicUser(found));
      }),

    listAccounts: (userId: string) =>
      protectedOperation<GameAccount[]>((user) => {
        // Spec 004, RF-2: filtro `user` (400 si no vale); usuario inexistente → `[]`; orden de creación.
        const target = resolveMockUserTarget(userId, user.id);
        if (!target.ok) return fail(400, MESSAGES.invalidId);
        return reply(
          200,
          database.accounts.filter((account) => account.userId === target.id),
        );
      }),

    getGameSummary: (userId: string, gameId: GameId) =>
      protectedOperation<GameProfileSummary>((user) => {
        // Spec 004, RF-13 y RF-29: id (400) → juego (400) → usuario (404) → cuenta (404).
        const target = resolveMockUserTarget(userId, user.id);
        if (!target.ok) return fail(400, MESSAGES.invalidId);
        if (!isKnownGame(gameId)) return fail(400, MESSAGES.invalidGame);
        if (!database.users.some((candidate) => candidate.id === target.id)) {
          return fail(404, MESSAGES.userNotFound);
        }
        const account = database.accounts.find(
          (candidate) => candidate.userId === target.id && candidate.gameId === gameId,
        );
        if (!account) return fail(404, MESSAGES.noAccountForGame);
        return reply(200, gameSummaryOf(account));
      }),
  },

  matches: {
    list: (filters: MatchFilters) =>
      protectedOperation<MatchCandidate[]>((user) => {
        // Spec 005, RF-16: sesión (ya resuelta) -> filtros (400) -> cuenta propia (404).
        const checked = validateMatchFilters(filters);
        if (!checked.ok) return fail(400, checked.error);
        const criteria = checked.value;

        const viewerAccount = database.accounts.find(
          (account) => account.userId === user.id && account.gameId === criteria.gameId,
        );
        if (!viewerAccount) return fail(404, MESSAGES.matchNoAccount);

        // Candidatos: cuentas de otros en el juego, con su dueño sin correo (spec 005, RF-3 y
        // DP5-10) y la marca de datos simulados que lleva toda cuenta del modo simulado.
        const candidates: CandidateInput<GameAccount>[] = database.accounts
          .filter((account) => account.gameId === criteria.gameId && account.userId !== user.id)
          .flatMap((account) => {
            const owner = database.users.find((candidate) => candidate.id === account.userId);
            if (!owner) return [];
            return [
              {
                user: toPublicUser(owner),
                account: { ...account, simulated: true },
                blocks: database.availability[owner.id] ?? [],
              },
            ];
          });

        const viewer = {
          userId: user.id,
          account: viewerAccount,
          blocks: database.availability[user.id] ?? [],
        };
        return reply(200, buildMatches(criteria, viewer, candidates));
      }),
  },

  sessions: {
    list: (gameId: GameId | 'all') =>
      protectedOperation<PlaySession[]>(() => {
        // Spec 006, RF-22: `all` o un juego exacto; cualquier otro valor, 400.
        const filter: unknown = gameId;
        if (filter !== 'all' && !isKnownGame(filter)) return fail(400, MESSAGES.sessionGame);
        const views = database.sessions
          .filter((session) => filter === 'all' || session.gameId === filter)
          .sort(compareSessions)
          .flatMap((session) => sessionView(session) ?? []);
        return reply(200, views);
      }),

    create: (payload: CreateSessionPayload) =>
      protectedOperation<PlaySession>((user) => {
        // Spec 006, RF-5, RF-6 y RF-27: quien organiza sale de la sesión, no del cuerpo.
        const linkedGames = new Set<GameId>(
          database.accounts
            .filter((account) => account.userId === user.id)
            .map((account) => account.gameId),
        );
        const checked = validateCreateSession(payload, linkedGames);
        if (!checked.ok) return fail(400, checked.error);

        const session: PlaySession = {
          id: nextSessionId(),
          ...checked.value,
          hostId: user.id,
          host: userRef(user),
          participants: [userRef(user)],
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        database.sessions.push(session);
        persist();
        return reply(201, sessionView(session));
      }),

    get: (sessionId: string) =>
      protectedOperation<PlaySession>(() => {
        // Spec 006, RF-3: formato -> existencia -> 200 con la vista.
        const found = findSession(sessionId);
        if ('denied' in found) return found.denied;
        return reply(200, sessionView(found.session));
      }),

    update: async (sessionId: string, payload: SessionEditPayload) => {
      // Spec 006, RF-7, RF-8, RF-20, RF-26 y RF-28: el cuerpo se revisa antes que la sesión.
      const handle = asUser((user) => {
        const found = findSession(sessionId);
        if ('denied' in found) return found.denied;
        const { session } = found;
        if (session.hostId !== user.id) return fail(403, SESSION_ERRORS.notHostEdit);
        const checked = validateSessionEdit(payload);
        if (!checked.ok) return fail(400, checked.error);
        const next = { ...session, ...checked.value };
        if (next.slots < session.participants.length) {
          return fail(400, SESSION_ERRORS.slotsBelowParticipants);
        }
        Object.assign(session, checked.value, {
          status: statusFor(session.participants.length, next.slots),
        });
        persist();
        return reply(200, sessionView(session));
      });
      const { body } = await serve<PlaySession>(
        (csrfSent) => (isPlainObject(payload) ? handle(csrfSent) : fail(400, SESSION_ERRORS.badJson)),
        true,
      );
      return body;
    },

    join: (sessionId: string) =>
      protectedOperation<PlaySession>((user) => {
        // Spec 006, RF-11, RF-12 y RF-20: formato -> existencia -> "ya inscrito" -> "llena".
        const found = findSession(sessionId);
        if ('denied' in found) return found.denied;
        const { session } = found;
        if (session.participants.some((participant) => participant.id === user.id)) {
          return fail(409, MESSAGES.sessionAlreadyJoined);
        }
        if (session.participants.length >= session.slots) {
          return fail(409, MESSAGES.sessionFull);
        }

        session.participants = [...session.participants, userRef(user)];
        session.status = statusFor(session.participants.length, session.slots);
        persist();
        return reply(200, sessionView(session));
      }),

    leave: (sessionId: string) =>
      protectedOperation<PlaySession>((user) => {
        // Spec 006, RF-13, RF-14 y RF-17: formato -> existencia -> anfitrión -> no inscrito.
        const found = findSession(sessionId);
        if ('denied' in found) return found.denied;
        const { session } = found;
        if (session.hostId === user.id) return fail(409, MESSAGES.sessionHostLeave);
        if (!session.participants.some((participant) => participant.id === user.id)) {
          return fail(409, MESSAGES.sessionNotJoined);
        }

        session.participants = session.participants.filter(
          (participant) => participant.id !== user.id,
        );
        session.status = statusFor(session.participants.length, session.slots);
        persist();
        return reply(200, sessionView(session));
      }),

    cancel: (sessionId: string) =>
      protectedOperation<void>((user) => {
        // Spec 006, RF-9, RF-10 y RF-20: formato -> existencia -> anfitrión; 204 sin cuerpo.
        const found = findSession(sessionId);
        if ('denied' in found) return found.denied;
        const { session } = found;
        if (session.hostId !== user.id) return fail(403, MESSAGES.sessionNotHostCancel);

        database.sessions = database.sessions.filter((candidate) => candidate.id !== session.id);
        persist();
        return reply(204);
      }),
  },
};
