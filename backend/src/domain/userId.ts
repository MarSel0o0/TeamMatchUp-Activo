// Formato del identificador de usuario: alias `me`, patrón de ObjectId y propiedad
// (spec 003: RF-5, RF-6, RF-18, RF-20; spec 004: RF-2, RF-13 formato, RNF-7; plan 004,
// sección 2.1 y P-17). Movido tal cual desde `services/userTarget.ts`, que lo reexporta
// todo salvo `INVALID_ID_MESSAGE`. Puro y sin imports fuera de `domain/`.

export const SELF_ALIAS = "me";
// Sin la bandera `m`, `$` solo coincide al final del texto: un `\n` final no es válido.
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
// Única fuente del texto; `utils/errors.ts` toma de aquí `MESSAGES.invalidId`.
export const INVALID_ID_MESSAGE = "id con formato inválido";

export type UserTarget = { ok: true; id: string; own: boolean } | { ok: false; error: string };

// Pasos 2 a 4 del orden de RF-18/RF-20. El 403 (escrituras ajenas) y el 404 (lecturas) los
// decide el controlador. Los identificadores se comparan por valor, en minúsculas (D7).
export function resolveUserTarget(decoded: string, sessionUserId: string): UserTarget {
  const sessionId = sessionUserId.toLowerCase();
  if (decoded === SELF_ALIAS) return { ok: true, id: sessionId, own: true };
  if (!OBJECT_ID_PATTERN.test(decoded)) {
    return { ok: false, error: INVALID_ID_MESSAGE };
  }
  const id = decoded.toLowerCase();
  return { ok: true, id, own: id === sessionId };
}
