// Identificador recibido en las rutas de usuario: ruta, decodificación, `me`, formato y
// propiedad (RF-5, RF-6, RF-10, RF-18, RF-20; plan §2.1). Puras, sin Express ni Mongoose.
import { MESSAGES } from "../utils/errors.ts";

// Formato del identificador: vive en `domain/userId.ts` (spec 004, P-17). Se reexporta para
// no cambiar los imports existentes; `INVALID_ID_MESSAGE` no se reexporta.
export { OBJECT_ID_PATTERN, SELF_ALIAS, resolveUserTarget } from "../domain/userId.ts";
export type { UserTarget } from "../domain/userId.ts";

export const USER_TARGET_MESSAGES = {
  invalidId: MESSAGES.invalidId,
  forbidden: MESSAGES.forbidden,
  userNotFound: "usuario no encontrado",
} as const;

export type UserRoute =
  | { kind: "list" }
  | { kind: "user"; rawSegment: string }
  | { kind: "availability"; rawSegment: string }
  | { kind: "games"; rawSegment: string; rawGame: string };

// Reproduce el emparejamiento de Express 5 (`strict: false`, `caseSensitive: false`):
// segmento `[^/]+`, una `/` final opcional y `availability` sin distinguir mayúsculas.
const USER_PATH = /^\/([^/]+)(?:\/(availability))?\/?$/i;
// Spec 004 (plan, sección 1, T9): resumen por juego `/:id/games/:gameId`, solo GET/HEAD.
const GAMES_PATH = /^\/([^/]+)\/games\/([^/]+)\/?$/i;
const USER_METHODS: ReadonlySet<string> = new Set(["GET", "PATCH", "DELETE"]);
const AVAILABILITY_METHODS: ReadonlySet<string> = new Set(["GET", "PUT"]);

// `path` es `request.path` del router, sin decodificar. `HEAD` se trata como `GET`.
export function matchUserRoute(method: string, path: string): UserRoute | null {
  const verb = method === "HEAD" ? "GET" : method;
  if (path === "/" || path === "//") return verb === "GET" ? { kind: "list" } : null;
  const games = GAMES_PATH.exec(path);
  if (games !== null) {
    const [, rawSegment, rawGame] = games;
    if (rawSegment === undefined || rawGame === undefined) return null;
    return verb === "GET" ? { kind: "games", rawSegment, rawGame } : null;
  }
  const match = USER_PATH.exec(path);
  if (match === null) return null;
  const [, rawSegment, availability] = match;
  if (rawSegment === undefined) return null;
  if (availability === undefined) {
    return USER_METHODS.has(verb) ? { kind: "user", rawSegment } : null;
  }
  return AVAILABILITY_METHODS.has(verb) ? { kind: "availability", rawSegment } : null;
}

// Igual que Express 5 con los parámetros; `null` si la codificación está mal formada.
export function decodeSegment(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}
