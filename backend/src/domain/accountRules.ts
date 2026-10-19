// Validación pura y mensajes exactos de las cuentas de juego (spec 004, RF-2, RF-6, RF-7,
// RF-13 formato, RF-22, RF-38, RF-40, DP-6, DP-10, DP-19, DP-23, DP-35; plan, secciones 2
// y 7). Sin Express, Mongoose ni reloj.
import { INVALID_ID_MESSAGE, OBJECT_ID_PATTERN, resolveUserTarget } from "./userId.ts";
import { GAMES, isGameId } from "./games.ts";
import type { GameId } from "./games.ts";
import { canonicalHandle } from "./rankSimulator.ts";

/**
 * Textos exactos de la sección 7.2 del plan propios de esta spec (DP-6): minúscula inicial y
 * sin punto final, salvo `Riot ID`, `Ubisoft ID` y `SteamID64`. Los 401 y el 500 no son
 * suyos. El 403 (`MESSAGES.forbidden`) y el 404 de usuario (`USER_TARGET_MESSAGES.userNotFound`)
 * tampoco: viven en `utils/` y `services/`, que `domain/` no puede importar (P-17, P-23).
 */
export const ACCOUNT_ERRORS = {
  invalidId: INVALID_ID_MESSAGE,
  invalidGame: "juego no válido",
  invalidHandle: {
    lol: "Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres antes de # y 2 a 5 letras o dígitos después",
    r6: "Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto, guion o guion bajo",
    cs2: "SteamID64 no válido: son 17 dígitos que empiezan por 7656119",
  } satisfies Record<GameId, string>,
  invalidRegion: (gameId: GameId): string => `región no válida para ${GAMES[gameId].name}`,
  duplicate: "ya tienes una cuenta vinculada en este juego",
  handleNotEditable:
    "el identificador del juego no se puede editar: desvincula la cuenta y vuelve a vincularla",
  accountNotFound: "cuenta no encontrada",
  noAccountForGame: "el jugador no tiene una cuenta vinculada en este juego",
} as const;

export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };

function fail(error: string): { ok: false; status: 400; error: string } {
  return { ok: false, status: 400, error };
}

/** Mismo formato que las rutas de usuario de la spec 003 (`OBJECT_ID_PATTERN`). */
export function isValidId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

/** Texto no vacío tras quitar los espacios de los extremos, o `null`. */
function trimmedText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Cuerpo que no es objeto plano (ausente, `null`, arreglo, primitivo) se trata como `{}`. */
function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return {};
  // Comprobado arriba: es un objeto no nulo que no es arreglo.
  return body as Record<string, unknown>;
}

/** Pliega solo `A`-`Z` a `a`-`z`; el resto de caracteres queda igual (DP-35). */
function asciiLower(text: string): string {
  return text.replace(/[A-Z]/g, (letter) => String.fromCharCode(letter.charCodeAt(0) + 32));
}

/**
 * Grafía de la lista del juego si coincide sin espacios en los extremos y sin distinguir
 * mayúsculas ASCII (DP-35). El plegado de Unicode daría por válida «KR» con el signo de kelvin (U+212A).
 */
export function normalizeRegion(gameId: GameId, value: unknown): string | null {
  const trimmed = trimmedText(value);
  if (trimmed === null) return null;
  const wanted = asciiLower(trimmed);
  return GAMES[gameId].regions.find((region) => asciiLower(region) === wanted) ?? null;
}

/** Orden juego → identificador → región; primer error y nada más (RF-6). Ignora el resto (RF-7). */
export function validateLinkPayload(
  body: unknown,
): RuleResult<{ gameId: GameId; handle: string; region: string }> {
  const fields = asObject(body);
  const gameId = fields.gameId;
  if (!isGameId(gameId)) return fail(ACCOUNT_ERRORS.invalidGame);
  const handle = trimmedText(fields.handle);
  if (handle === null || !GAMES[gameId].handlePattern.test(handle)) {
    return fail(ACCOUNT_ERRORS.invalidHandle[gameId]);
  }
  const region = normalizeRegion(gameId, fields.region);
  if (region === null) return fail(ACCOUNT_ERRORS.invalidRegion(gameId));
  return { ok: true, value: { gameId, handle, region } };
}

/**
 * RF-22 antes que RF-38. Nunca lee `gameId` del cuerpo (RF-7). Cuerpo vacío, que no es
 * objeto o solo con campos ignorados → `{}` (RF-40). Devuelve la región normalizada si vino.
 */
export function validateAccountEdit(
  account: { gameId: GameId; handle: string },
  body: unknown,
): RuleResult<{ region?: string }> {
  const fields = asObject(body);
  if ("handle" in fields) {
    const handle = fields.handle;
    if (typeof handle !== "string" || canonicalHandle(handle) !== canonicalHandle(account.handle)) {
      return fail(ACCOUNT_ERRORS.handleNotEditable);
    }
  }
  if ("region" in fields) {
    const region = normalizeRegion(account.gameId, fields.region);
    if (region === null) return fail(ACCOUNT_ERRORS.invalidRegion(account.gameId));
    return { ok: true, value: { region } };
  }
  return { ok: true, value: {} };
}

/**
 * Filtros de `GET /api/accounts` (RF-2, DP-10): primero `user`, después `game`. Un valor
 * repetido llega como arreglo (parser `simple` de Express 5) y es inválido. `user=me` y el
 * formato se resuelven como en las rutas de usuario (`resolveUserTarget`).
 */
export function parseAccountFilters(
  query: Record<string, unknown>,
  sessionUserId: string,
): RuleResult<{ userId?: string; gameId?: GameId }> {
  let userId: string | undefined;
  if (Object.hasOwn(query, "user")) {
    const user = query.user;
    if (typeof user !== "string" || user === "") return fail(ACCOUNT_ERRORS.invalidId);
    const target = resolveUserTarget(user, sessionUserId);
    if (!target.ok) return fail(ACCOUNT_ERRORS.invalidId);
    userId = target.id;
  }
  let gameId: GameId | undefined;
  if (Object.hasOwn(query, "game")) {
    const game = query.game;
    if (!isGameId(game)) return fail(ACCOUNT_ERRORS.invalidGame);
    gameId = game;
  }
  return {
    ok: true,
    value: {
      ...(userId === undefined ? {} : { userId }),
      ...(gameId === undefined ? {} : { gameId }),
    },
  };
}
