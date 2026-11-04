// Validación pura del reemplazo de la disponibilidad (RF-13, RF-14, RNF-3, RNF-4).
// Sin Express ni Mongoose.
import { readField, type Validation } from "./credentials.ts";

// "<día>-<hora>": día 0..6, hora 0..23, sin ceros a la izquierda, signos ni espacios.
// Sin la bandera `m`, `$` solo coincide al final del texto: "2-20\n" no es un bloque.
export const TIME_BLOCK_PATTERN = /^[0-6]-(?:[0-9]|1[0-9]|2[0-3])$/;

export const AVAILABILITY_MESSAGES = {
  blocksMissing: "faltan los bloques",
  blocksNotList: "los bloques deben ser una lista",
  blockInvalid: "hay un bloque horario con formato inválido",
} as const;

// Un valor que no es texto nunca es un bloque; el texto no se recorta (Definiciones).
export function isTimeBlock(value: unknown): value is string {
  return typeof value === "string" && TIME_BLOCK_PATTERN.test(value);
}

// Solo se lee `blocks`; cualquier otro campo se ignora (RF-13). Un cuerpo que no es objeto
// (o es lista) no trae campos: "faltan los bloques" (RF-14).
export function validateAvailability(body: unknown): Validation<string[]> {
  const blocks = readField(body, "blocks");
  if (blocks === undefined) return { ok: false, error: AVAILABILITY_MESSAGES.blocksMissing };
  if (!Array.isArray(blocks)) return { ok: false, error: AVAILABILITY_MESSAGES.blocksNotList };
  if (!blocks.every(isTimeBlock)) return { ok: false, error: AVAILABILITY_MESSAGES.blockInvalid };
  // Set conserva el orden de primera aparición; sin tope de elementos (RF-13).
  return { ok: true, value: [...new Set(blocks)] };
}
