// Modelo `GameAccount` (spec 004, plan sección 5). RF-4, RF-5, RF-37, DP-29, DP-32, DP-33.
// - Índice único `{ user, gameId }` (RF-5) y concurrencia optimista (DP-29).
// - `matches` y `readingNumber` son internos: no salen en ninguna respuesta (DP-32, DP-33).
// - `toJSON` en lista blanca (`toGameAccountJson`). Spec 012: `verified` y `origins` se derivan
//   de `verification` y no se guardan (P12-1, P12-2); `simulated` ya no existe; el
//   identificador real (`verification.externalId`) y `handleKey` no salen nunca (RNF-3).
// - El esquema repite las validaciones como red de seguridad; los mensajes que ve el cliente
//   salen de `domain/accountRules.ts` (P-9).
import { Schema, model } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";
import { GAME_IDS } from "../domain/games.ts";
import type { GameId } from "../domain/games.ts";
import { canonicalHandle } from "../domain/rankSimulator.ts";
import { SOURCE_IDS, blockOrigins } from "../domain/sources.ts";
import type { BlockOrigins, SourceId } from "../domain/sources.ts";
import { COLLECTIONS } from "./collections.ts";

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

/** Prueba de que el dueño controla la cuenta, dada por una fuente real (spec 012, RF-1). */
export interface VerificationFields {
  source: SourceId;
  /** Identificador estable de la fuente (SteamID64, PUUID de Riot). Nunca sale en una respuesta. */
  externalId: string;
  verifiedAt: Date;
}

/** Datos de perfil que entrega la fuente; todos opcionales (cada fuente trae los suyos). */
export interface AccountProfileFields {
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  level?: number;
  iconId?: number;
  hoursTotal?: number;
  hoursRecent?: number;
  isPrivate?: boolean;
}

export interface GameAccountFields {
  user: Types.ObjectId;
  gameId: GameId;
  handle: string;
  /** `canonicalHandle(handle)`, calculado al validar; sirve para RF-11 y RF-12 (P12-4). */
  handleKey: string;
  region: string;
  currentRank: RankSnapshotFields;
  rankHistory: RankSnapshotFields[];
  matches: MatchRecordFields[];
  readingNumber: number;
  lastSyncedAt: Date;
  verification?: VerificationFields;
  profile?: AccountProfileFields;
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
  origins: BlockOrigins;
  verifiedWith?: SourceId;
  verifiedAt?: Date;
  profile?: AccountProfileFields;
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

const VerificationSchema = new Schema<VerificationFields>(
  {
    source: { type: String, required: true, enum: SOURCE_IDS },
    externalId: { type: String, required: true },
    verifiedAt: { type: Date, required: true },
  },
  { _id: false },
);

const AccountProfileSchema = new Schema<AccountProfileFields>(
  {
    displayName: { type: String },
    avatarUrl: { type: String },
    country: { type: String },
    level: { type: Number },
    iconId: { type: Number },
    hoursTotal: { type: Number },
    hoursRecent: { type: Number },
    isPrivate: { type: Boolean },
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

// Solo los campos del perfil que existen (nunca `undefined`) y sin `_id`.
function toProfileJson(profile: AccountProfileFields): AccountProfileFields {
  const json: AccountProfileFields = {};
  if (profile.displayName !== undefined) json.displayName = profile.displayName;
  if (profile.avatarUrl !== undefined) json.avatarUrl = profile.avatarUrl;
  if (profile.country !== undefined) json.country = profile.country;
  if (profile.level !== undefined) json.level = profile.level;
  if (profile.iconId !== undefined) json.iconId = profile.iconId;
  if (profile.hoursTotal !== undefined) json.hoursTotal = profile.hoursTotal;
  if (profile.hoursRecent !== undefined) json.hoursRecent = profile.hoursRecent;
  if (profile.isPrivate !== undefined) json.isPrivate = profile.isPrivate;
  return json;
}

// Lista blanca: un campo nuevo del esquema no se expone salvo que se añada aquí.
// `verified` y `origins` se derivan de `verification` (spec 012, RF-1, RF-5, RF-22).
export function toGameAccountJson(account: GameAccountDocument): GameAccountJson {
  const verification = account.verification ?? undefined;
  const profile = account.profile ?? undefined;
  return {
    id: account._id.toString(),
    userId: account.user.toString(),
    gameId: account.gameId,
    handle: account.handle,
    region: account.region,
    currentRank: toRankSnapshotJson(account.currentRank),
    rankHistory: account.rankHistory.map(toRankSnapshotJson),
    lastSyncedAt: account.lastSyncedAt,
    verified: verification !== undefined,
    origins: blockOrigins(verification),
    ...(verification === undefined
      ? {}
      : { verifiedWith: verification.source, verifiedAt: verification.verifiedAt }),
    ...(profile === undefined ? {} : { profile: toProfileJson(profile) }),
  };
}

const GameAccountSchema = new Schema<GameAccountFields>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gameId: { type: String, required: true, enum: GAME_IDS },
    // Sin `trim` ni `lowercase`: el controlador guarda el identificador sin espacios en los
    // extremos y con sus mayúsculas (DP-19).
    handle: { type: String, required: true },
    // Se calcula en `pre("validate")`; `required` es la red de seguridad (P12-4).
    handleKey: { type: String, required: true },
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
    verification: { type: VerificationSchema },
    profile: { type: AccountProfileSchema },
  },
  {
    optimisticConcurrency: true,
    toJSON: { transform: (doc: GameAccountDocument) => toGameAccountJson(doc) },
  },
);

// Spec 012, P12-4: la clave de comparación sigue siempre al identificador.
GameAccountSchema.pre("validate", function (this: GameAccountDocument) {
  if (typeof this.handle === "string") this.handleKey = canonicalHandle(this.handle);
});

// Spec 012, RF-10 (P12-3): una cuenta real solo puede estar verificada por un usuario. Parcial:
// las cuentas sin verificar no tienen `verification` y pueden repetir identificador.
GameAccountSchema.index(
  { gameId: 1, "verification.externalId": 1 },
  { unique: true, partialFilterExpression: { "verification.externalId": { $type: "string" } } },
);
// Spec 012, RF-11 y RF-12: buscar las demás cuentas con el mismo identificador.
GameAccountSchema.index({ gameId: 1, handleKey: 1 });

GameAccountSchema.index({ user: 1, gameId: 1 }, { unique: true });

export const GameAccount = model<GameAccountFields>("GameAccount", GameAccountSchema, COLLECTIONS.gameAccounts);
