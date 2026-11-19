// Reglas y textos de la verificación con Steam (spec 013, RF-3, RF-6, RF-20, RF-22; plan, 4.1,
// 4.2 y 5.6). Los textos van en español, en minúscula inicial y sin punto final, como los de la
// 004. Los de RF-8 («esta cuenta ya está verificada por otro usuario»), RF-9 («Steam no está
// disponible por ahora, intenta más tarde») y RF-23 («la cuenta ya no existe en Steam») ya
// existen en `ACCOUNT_ERRORS` (spec 012) y se reutilizan sin copiarlos.
import { isPlainObject } from "./sessionRules.ts";

export const STEAM_ERRORS = {
  /** RF-22: el servidor no tiene la clave de Steam. */
  notConfigured: "Steam no está configurado en este servidor",
  /** RF-3: ya hay una cuenta de CS2 verificada; para cambiarla hay que desvincularla antes. */
  alreadyVerified: "ya tienes una cuenta de CS2 verificada; desvincúlala antes de verificar otra",
  /** RF-6: texto literal de la spec; lo ve el usuario en el perfil (RF-20). */
  verificationFailed: "no se pudo verificar con Steam, vuelve a intentarlo",
} as const;

const MAX_KEYS = 40;
const MAX_KEY_LENGTH = 64;
const MAX_VALUE_LENGTH = 2048;

export type CompleteBody = { ok: true; query: Record<string, string> } | { ok: false };

/**
 * Cuerpo de `POST /api/steam/complete`: `{ query }` con lo que trajo la dirección de vuelta
 * (RF-6: cualquier otra forma no es una respuesta de Steam). Cada clave y valor es texto acotado
 * (como mucho 40 claves, de 64 caracteres, con valores de 2048); de ahí solo se conservan
 * `attempt` y los `openid.*`. Una consulta vacía es válida: es el regreso sin respuesta (RF-5).
 */
export function parseCompleteBody(body: unknown): CompleteBody {
  if (!isPlainObject(body)) return { ok: false };
  const query: unknown = body["query"];
  if (!isPlainObject(query)) return { ok: false };

  const entries = Object.entries(query);
  if (entries.length > MAX_KEYS) return { ok: false };
  const kept: [string, string][] = [];
  for (const [key, value] of entries) {
    if (key.length > MAX_KEY_LENGTH) return { ok: false };
    if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) return { ok: false };
    if (key === "attempt" || key.startsWith("openid.")) kept.push([key, value]);
  }
  return { ok: true, query: Object.fromEntries(kept) };
}
