// Identificador recibido en las rutas de usuario: ruta, decodificación, `me`, formato y
// propiedad (RF-5, RF-6, RF-10, RF-18, RF-20; plan §2.1). Puras, sin Express ni Mongoose.
import { MESSAGES } from "../utils/errors.ts";

export const SELF_ALIAS = "me";
// Sin la bandera `m`, `$` solo coincide al final del texto: un `\n` final no es válido.
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const USER_TARGET_MESSAGES = {
  invalidId: MESSAGES.invalidId,
  forbidden: MESSAGES.forbidden,
  userNotFound: "usuario no encontrado",
} as const;

export type UserRoute =
  | { kind: "list" }
  | { kind: "user"; rawSegment: string }
  | { kind: "availability"; rawSegment: string };

export type UserTarget = { ok: true; id: string; own: boolean } | { ok: false; error: string };

// Reproduce el emparejamiento de Express 5 (`strict: false`, `caseSensitive: false`):
// segmento `[^/]+`, una `/` final opcional y `availability` sin distinguir mayúsculas.
const USER_PATH = /^\/([^/]+)(?:\/(availability))?\/?$/i;
const USER_METHODS: ReadonlySet<string> = new Set(["GET", "PATCH", "DELETE"]);
const AVAILABILITY_METHODS: ReadonlySet<string> = new Set(["GET", "PUT"]);

// `path` es `request.path` del router, sin decodificar. `HEAD` se trata como `GET`.
export function matchUserRoute(method: string, path: string): UserRoute | null {
  const verb = method === "HEAD" ? "GET" : method;
  if (path === "/" || path === "//") return verb === "GET" ? { kind: "list" } : null;
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

// Pasos 2 a 4 del orden de RF-18/RF-20. El 403 (escrituras ajenas) y el 404 (lecturas) los
// decide el controlador. Los identificadores se comparan por valor, en minúsculas (D7).
export function resolveUserTarget(decoded: string, sessionUserId: string): UserTarget {
  const sessionId = sessionUserId.toLowerCase();
  if (decoded === SELF_ALIAS) return { ok: true, id: sessionId, own: true };
  if (!OBJECT_ID_PATTERN.test(decoded)) {
    return { ok: false, error: USER_TARGET_MESSAGES.invalidId };
  }
  const id = decoded.toLowerCase();
  return { ok: true, id, own: id === sessionId };
}
