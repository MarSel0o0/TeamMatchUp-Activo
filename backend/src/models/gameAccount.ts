// Modelo `GameAccount` (spec 004, plan sección 5). RF-4, RF-5, RF-37, DP-29, DP-32, DP-33.
// - Índice único `{ user, gameId }` (RF-5) y concurrencia optimista (DP-29).
// - `matches` y `readingNumber` son internos: no salen en ninguna respuesta (DP-32, DP-33).
// - `toJSON` en lista blanca (`toGameAccountJson`): `simulated: true` lo añade siempre la
//   serialización y no se guarda (RF-37, P-8).
// - El esquema repite las validaciones como red de seguridad; los mensajes que ve el cliente
//   salen de `domain/accountRules.ts` (P-9).
import { Schema, model } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";
import { GAME_IDS } from "../domain/games.ts";
import type { GameId } from "../domain/games.ts";

/** Máximo de partidas guardadas por cuenta (RF-15). */
const MAX_STORED_MATCHES = 20;

export interface RankSnapshotFields {
  tier: string;
  division?: string;
  points: number;
  normalized: number;
  recordedAt: Date;
}

export interface MatchRecordFields {
  matchId: string;
  gameId: GameId;
  playedAt: Date;
  result: "win" | "loss";
  summary: string;
  durationMinutes: number;
  rankDelta: number;
}

export interface GameAccountFields {
  user: Types.ObjectId;
  gameId: GameId;
  handle: string;
  region: string;
  currentRank: RankSnapshotFields;
  rankHistory: RankSnapshotFields[];
  matches: MatchRecordFields[];
  readingNumber: number;
  lastSyncedAt: Date;
  verified: boolean;
}

export type GameAccountDocument = HydratedDocument<GameAccountFields>;

export interface RankSnapshotJson {
  tier: string;
  division?: string;
  points: number;
  normalized: number;
  recordedAt: Date;
}

export interface GameAccountJson {
  id: string;
  userId: string;
  gameId: GameId;
  handle: string;
  region: string;
  currentRank: RankSnapshotJson;
  rankHistory: RankSnapshotJson[];
  lastSyncedAt: Date;
  verified: boolean;
  simulated: true;
}

const integer = {
  validator: (value: number) => Number.isInteger(value),
  message: "{PATH} debe ser un entero",
};

const RankSnapshotSchema = new Schema<RankSnapshotFields>(
  {
    tier: { type: String, required: true },
    division: { type: String },
    points: { type: Number, required: true, validate: integer },
    normalized: { type: Number, required: true, min: 0, max: 100 },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
);

// `matchId` y no `id`, para no chocar con el virtual `id` de Mongoose (P-11).
const MatchRecordSchema = new Schema<MatchRecordFields>(
  {
    matchId: { type: String, required: true },
    gameId: { type: String, required: true, enum: GAME_IDS },
    playedAt: { type: Date, required: true },
    result: { type: String, required: true, enum: ["win", "loss"] },
    summary: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    rankDelta: { type: Number, required: true },
  },
  { _id: false },
);

// La división se omite si falta (nunca `division: undefined`).
function toRankSnapshotJson(snapshot: RankSnapshotFields): RankSnapshotJson {
  const { tier, division, points, normalized, recordedAt } = snapshot;
  return division === undefined
    ? { tier, points, normalized, recordedAt }
    : { tier, division, points, normalized, recordedAt };
}

// Lista blanca: un campo nuevo del esquema no se expone salvo que se añada aquí.
export function toGameAccountJson(account: GameAccountDocument): GameAccountJson {
  return {
    id: account._id.toString(),
    userId: account.user.toString(),
    gameId: account.gameId,
    handle: account.handle,
    region: account.region,
    currentRank: toRankSnapshotJson(account.currentRank),
    rankHistory: account.rankHistory.map(toRankSnapshotJson),
    lastSyncedAt: account.lastSyncedAt,
    verified: account.verified,
    simulated: true,
  };
}

const GameAccountSchema = new Schema<GameAccountFields>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gameId: { type: String, required: true, enum: GAME_IDS },
    // Sin `trim` ni `lowercase`: el controlador guarda el identificador sin espacios en los
    // extremos y con sus mayúsculas (DP-19).
    handle: { type: String, required: true },
    region: { type: String, required: true },
    currentRank: { type: RankSnapshotSchema, required: true },
    rankHistory: { type: [RankSnapshotSchema], default: [] },
    matches: {
      type: [MatchRecordSchema],
      default: [],
      validate: {
        validator: (matches: readonly MatchRecordFields[]) => matches.length <= MAX_STORED_MATCHES,
        message: `una cuenta guarda como máximo ${MAX_STORED_MATCHES} partidas`,
      },
    },
    readingNumber: { type: Number, required: true, default: 0, min: 0, validate: integer },
    lastSyncedAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  {
    optimisticConcurrency: true,
    toJSON: { transform: (doc: GameAccountDocument) => toGameAccountJson(doc) },
  },
);

GameAccountSchema.index({ user: 1, gameId: 1 }, { unique: true });

export const GameAccount = model<GameAccountFields>("GameAccount", GameAccountSchema);
