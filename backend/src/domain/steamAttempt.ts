// Intento de verificación con Steam (spec 013, RF-1, RF-6, D11; plan, sección 3). Funciones
// puras: el instante llega como parámetro; sin Express, Mongoose ni reloj.
// - Un intento vale 10 minutos desde que se abre (Definiciones de la spec). Quien lo guarda
//   (`models/steamAttempt.ts`) borra los vencidos con un índice TTL de Mongo, que puede tardar
//   hasta un minuto: por eso el vencimiento se decide aquí, con `now`, y no por su existencia.

/** 10 minutos (spec 013, Definiciones: «Intento de verificación»). */
export const ATTEMPT_TTL_MS = 10 * 60 * 1000;

export type AttemptStatus = "ok" | "foreign" | "expired";

/** Lo que `attemptStatus` necesita saber del intento guardado. */
export interface AttemptView {
  userId: string;
  expiresAt: Date;
}

/** Instante en que vence un intento abierto en `now` (RF-1). */
export function attemptExpiry(now: Date): Date {
  return new Date(now.getTime() + ATTEMPT_TTL_MS);
}

/**
 * Estado de un intento frente al usuario de la sesión (RF-6). Lo ajeno se mira primero: quien
 * abre la dirección de otro nunca se entera de si el intento de ese otro ya venció. Vence justo
 * en `expiresAt` (no antes).
 */
export function attemptStatus(attempt: AttemptView, sessionUserId: string, now: Date): AttemptStatus {
  if (attempt.userId !== sessionUserId) return "foreign";
  if (now.getTime() >= attempt.expiresAt.getTime()) return "expired";
  return "ok";
}
