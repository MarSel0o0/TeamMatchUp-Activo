// Modelo `RiotChallenge`: desafío de verificación de League of Legends por ícono de invocador
// (spec 014, RF-1, RF-4, RF-10, RF-19, RF-21, RF-28, RF-43, RF-45, RF-48, RNF-3; D86, D87, D100;
// plan, §§2.2, 3.1 y P14-1).
// - Conserva durante 24 h los desafíos vencidos, anulados y completados para el límite de 5/hora
//   (RF-21) y el 409 "este desafío ya se completó" (RF-48).
// - Un índice TTL sobre `deleteAt` con `expireAfterSeconds: 0` borra cada desafío 24 h después de
//   vencer, anularse o cerrarse, lo que ocurra primero (D87, P14-1).
// - Lista blanca en `toRiotChallengeJson` y en `toJSON`: `puuid` nunca sale en ninguna respuesta
//   (RNF-3).
import { Schema, model } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";
import { GAMES } from "../domain/games.ts";
import { remainingSeconds } from "../domain/riotChallenge.ts";

export type RiotChallengeStatus = "open" | "completed" | "cancelled";

export const RIOT_CHALLENGE_STATUSES: readonly RiotChallengeStatus[] = [
  "open",
  "completed",
  "cancelled",
];

export interface RiotChallengeFields {
  user: Types.ObjectId;
  /** Identificador interno de Riot (PUUID). Nunca sale en ninguna respuesta (RNF-3). */
  puuid: string;
  /** Forma exacta del Riot ID devuelta por Riot al pedir el desafío (D86). */
  riotId: string;
  region: string;
  iconId: number;
  status: RiotChallengeStatus;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  /** Instante de borrado automático TTL: 24 h desde vencer, anularse o cerrarse (D87, P14-1). */
  deleteAt: Date;
}

export type RiotChallengeDocument = HydratedDocument<RiotChallengeFields>;

export interface RiotChallengeJson {
  id: string;
  iconId: number;
  expiresAt: Date;
  remainingSeconds: number;
  riotId: string;
  region: string;
}

const integer = {
  validator: (value: number) => Number.isInteger(value),
  message: "{PATH} debe ser un entero",
};

/**
 * Serializa un desafío en lista blanca para las respuestas de RF-1 y RF-45 (D76, D100, RNF-3).
 * Nunca incluye `puuid`, `user`, `status`, `attempts`, `createdAt`, `deleteAt`, `_id` ni `__v`.
 */
export function toRiotChallengeJson(
  challenge: Pick<RiotChallengeDocument, "_id" | "iconId" | "expiresAt" | "riotId" | "region">,
  now: Date,
): RiotChallengeJson {
  return {
    id: challenge._id.toString(),
    iconId: challenge.iconId,
    expiresAt: challenge.expiresAt,
    remainingSeconds: remainingSeconds(challenge.expiresAt, now),
    riotId: challenge.riotId,
    region: challenge.region,
  };
}

const RiotChallengeSchema = new Schema<RiotChallengeFields>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    puuid: { type: String, required: true },
    riotId: { type: String, required: true },
    region: { type: String, required: true, enum: GAMES.lol.regions },
    iconId: { type: Number, required: true, min: 0, max: 28, validate: integer },
    status: { type: String, required: true, enum: RIOT_CHALLENGE_STATUSES, default: "open" },
    attempts: { type: Number, required: true, default: 0, min: 0, validate: integer },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    deleteAt: { type: Date, required: true },
  },
  {
    // Defensa en profundidad para RNF-3: incluso `doc.toJSON()` directo nunca expone `puuid`.
    toJSON: {
      transform: (doc: RiotChallengeDocument) => ({
        id: doc._id.toString(),
        iconId: doc.iconId,
        expiresAt: doc.expiresAt,
        riotId: doc.riotId,
        region: doc.region,
      }),
    },
  },
);

// Recuperar desafío abierto (RF-45), contar los de la última hora (RF-21) y anular abiertos (RF-4, RF-29).
RiotChallengeSchema.index({ user: 1, createdAt: -1 });
// Desafíos abiertos para la misma cuenta de Riot: exclusión de íconos (RF-19) y espera sin libres (RF-43).
RiotChallengeSchema.index({ puuid: 1, status: 1, expiresAt: 1 });
// P14-1 / RF-28 / D87: borrado automático 24 h después de vencer, anularse o cerrarse, lo que ocurra primero.
RiotChallengeSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

export const RiotChallenge = model<RiotChallengeFields>("RiotChallenge", RiotChallengeSchema);
