// Intentos de verificación con Steam (spec 013, RF-1, RF-5, RF-6, RF-7, D11; plan, 4.1, 4.2 y
// P13-1 a P13-5). Escribe en la base; las reglas de vencimiento y de dueño son puras y viven en
// `domain/steamAttempt.ts`.
// - `openAttempt` reemplaza el intento anterior del usuario (D11) con un `upsert` atómico.
// - `consumeAttempt` es de un solo uso: borra por `_id`, usuario y hash, así que de dos peticiones
//   simultáneas solo una gana, y un intento anulado por otro nuevo ya no coincide (P13-4).
// - `findAttempt` no distingue de quién es: eso lo decide `attemptStatus`, y un intento ajeno
//   nunca se consume (P13-5).
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { attemptExpiry } from "../domain/steamAttempt.ts";
import { SteamAttempt } from "../models/steamAttempt.ts";

/** El token de `openAttempt` mide 43 caracteres; cualquier otro tamaño se descarta sin consultar. */
const MAX_TOKEN_LENGTH = 256;
/** Dos aperturas simultáneas del mismo usuario pueden chocar en el `upsert`: se reintenta. */
const MAX_OPEN_ATTEMPTS = 5;

/** Intento abierto tal como lo leen las rutas (compatible con `AttemptView` del dominio). */
export interface AttemptRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface OpenedAttempt {
  /** Token en claro: solo existe aquí y en la dirección de vuelta; la base guarda su hash. */
  token: string;
  expiresAt: Date;
}

/** SHA-256 en hexadecimal (P13-2). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

/** Abre un intento de `userId` válido por 10 minutos y anula el que tuviera (RF-1, D11). */
export async function openAttempt(userId: string, now: Date): Promise<OpenedAttempt> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = attemptExpiry(now);
  for (let attempt = 1; ; attempt += 1) {
    try {
      await SteamAttempt.findOneAndUpdate(
        { user: userId },
        { $set: { tokenHash: hashToken(token), expiresAt } },
        { upsert: true },
      );
      return { token, expiresAt };
    } catch (error) {
      // Dos `upsert` simultáneos pueden intentar insertar el mismo usuario: el perdedor reintenta
      // y ahora actualiza el documento del ganador.
      if (!isDuplicateKeyError(error) || attempt >= MAX_OPEN_ATTEMPTS) throw error;
    }
  }
}

/** Intento abierto con ese token, de cualquier usuario, o `null` (RF-6). No lo modifica. */
export async function findAttempt(token: string): Promise<AttemptRecord | null> {
  if (typeof token !== "string" || token === "" || token.length > MAX_TOKEN_LENGTH) return null;
  const found = await SteamAttempt.findOne({ tokenHash: hashToken(token) }).lean();
  if (found === null) return null;
  return {
    id: found._id.toString(),
    userId: found.user.toString(),
    tokenHash: found.tokenHash,
    expiresAt: found.expiresAt,
  };
}

/** Usa el intento: `true` solo para quien lo borra; `false` si ya no existe o fue reemplazado. */
export async function consumeAttempt(attempt: AttemptRecord): Promise<boolean> {
  const deleted = await SteamAttempt.findOneAndDelete({
    _id: attempt.id,
    user: attempt.userId,
    tokenHash: attempt.tokenHash,
  });
  return deleted !== null;
}

/** Descarta el intento propio con ese token (RF-5, RF-7); el de otro usuario nunca se borra. */
export async function discardAttempt(userId: string, token: string): Promise<void> {
  await SteamAttempt.deleteOne({ user: userId, tokenHash: hashToken(token) });
}
