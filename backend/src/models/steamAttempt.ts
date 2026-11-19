// Modelo `SteamAttempt`: el intento de verificación con Steam abierto por un usuario (spec 013,
// RF-1, RF-6, D11, RNF-7; plan, P13-1 a P13-3).
// - Un documento por usuario: el índice único en `user` hace que abrir un intento nuevo anule el
//   anterior sin carreras (el servicio reemplaza con `upsert`).
// - Solo se guarda el hash SHA-256 del token (`tokenHash`): el token en claro viaja en la
//   dirección de vuelta y nunca llega a la base (P13-2).
// - El índice TTL sobre `expiresAt` hace que Mongo borre los vencidos sin tareas programadas
//   (RNF-7). Mongo lo revisa cada ~60 s, así que el vencimiento exacto lo decide el dominio
//   (`attemptStatus`), no la existencia del documento.
import { Schema, model } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";

export interface SteamAttemptFields {
  user: Types.ObjectId;
  /** SHA-256 en hexadecimal del token de la dirección de vuelta. */
  tokenHash: string;
  expiresAt: Date;
}

export type SteamAttemptDocument = HydratedDocument<SteamAttemptFields>;

const SteamAttemptSchema = new Schema<SteamAttemptFields>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

// RNF-7: expireAfterSeconds 0 = se borra cuando `expiresAt` pasa.
SteamAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SteamAttempt = model<SteamAttemptFields>("SteamAttempt", SteamAttemptSchema);
