// Modelo `GameAccount` (spec 004, plan sección 5). RF-4, RF-5, RF-37, DP-29, DP-32, DP-33.
// - Índice único `{ user, gameId }` (RF-5) y concurrencia optimista (DP-29).
// - `matches` y `readingNumber` son internos: no salen en ninguna respuesta (DP-32, DP-33).
// - `toJSON` en lista blanca (`toGameAccountJson`). Spec 012: `verified` y `origins` se derivan
//   de `verification` y no se guardan (P12-1, P12-2); `simulated` ya no existe; el
//   identificador real (`verification.externalId`) y `handleKey` no salen nunca (RNF-3).
// - Spec 014 (plan, §3.2, P14-4, P14-5): cuentas verificadas con Riot admiten `currentRank: null`
//   (sin clasificar o rango pendiente), `pendingBlocks` (solo en JSON si no vacío),
//   `MatchRecordFields.rankDelta` opcional, `RankSnapshotFields.canonicalTier` interno,
//   `lastSuccessfulSyncAt` interno y `riotLpBaseline` interno (nunca en JSON).
// - Spec 015 (plan, §2, P15-1, P15-2): cuentas de CS2 verificadas con Steam guardan `premier`
//   (interno) con el estado de su rango Premier de Leetify; sin rating (`unrated` o
//   `unavailable`) admiten `currentRank: null` y el JSON dice `premierStatus`.
// - El esquema repite las validaciones como red de seguridad; los mensajes que ve el cliente
//   salen de `domain/accountRules.ts` (P-9).
import { Schema, model } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";
import { GAME_IDS } from "../domain/games.ts";
import type { GameId } from "../domain/games.ts";
import type { PremierStatus } from "../domain/leetify.ts";
import { canonicalHandle } from "../domain/rankSimulator.ts";
import type { PendingBlock } from "../domain/riotChallenge.ts";
import type { RiotLpBaseline } from "../domain/riotLpDelta.ts";
import { SOURCE_IDS, blockOrigins } from "../domain/sources.ts";
import type { BlockOrigins, SourceId } from "../domain/sources.ts";

/** Máximo de partidas guardadas por cuenta (RF-15). */
const MAX_STORED_MATCHES = 20;

/** Bloques de una cuenta verificada con Riot que pueden quedar pendientes (spec 014, D80, D82). */
export const PENDING_BLOCKS: readonly PendingBlock[] = ["rank", "matches", "profile"];

/** Estados del rango Premier de una cuenta de CS2 verificada con Steam (spec 015, plan, §1). */
export const PREMIER_STATUSES: readonly PremierStatus[] = ["rated", "unrated", "unavailable"];

/** Lo que el cliente sabe de una cuenta sin rating: no se expone `rated`, lo dice `currentRank` (P15-2). */
export type PremierStatusJson = Exclude<PremierStatus, "rated">;

export interface RankSnapshotFields {
  tier: string;
  division?: string;
  points: number;
  normalized: number;
  recordedAt: Date;
  /** Tier normalizado a la escala de la spec 004 (RF-36, D48). Interno: nunca sale en JSON. */
  canonicalTier?: string;
}

export interface MatchRecordFields {
  matchId: string;
  gameId: GameId;
  playedAt: Date;
  result: "win" | "loss";
  summary: string;
  durationMinutes: number;
  /** Opcional en partidas reales de Riot sin variación fiable (spec 014, RF-12, RF-30). */
  rankDelta?: number;
}

/** Última lectura completa de rango y partidas de Riot para RF-30 (P14-4). Interno: nunca sale en JSON. */
export type RiotLpBaselineFields = RiotLpBaseline;

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
  /**
   * Puede ser `null` solo en cuentas verificadas con Riot sin clasificar o con rango pendiente
   * (spec 014) y en cuentas verificadas con Steam sin rango Premier o con el rango no disponible
   * (spec 015).
   */
  currentRank: RankSnapshotFields | null;
  rankHistory: RankSnapshotFields[];
  matches: MatchRecordFields[];
  readingNumber: number;
  lastSyncedAt: Date;
  verification?: VerificationFields;
  profile?: AccountProfileFields;
  /** Bloques pendientes de leer tras una verificación parcial con Riot (RF-27, P14-5). */
  pendingBlocks?: PendingBlock[];
  /** Última lectura completa de Riot para la espera mínima (RF-7, RF-27, RF-53). Interno. */
  lastSuccessfulSyncAt?: Date | null;
  /** Referencia de última lectura completa para variación de LP (RF-30, P14-4). Interno. */
  riotLpBaseline?: RiotLpBaselineFields | null;
  /**
   * Estado del rango Premier de Leetify; solo en cuentas de CS2 verificadas con Steam (spec 015,
   * RF-7, RF-8, RF-20, P15-1). Sin él, la cuenta es anterior a la spec 015 o no está verificada
   * (RF-22). Interno: nunca sale en JSON.
   */
  premier?: PremierStatus;
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
  currentRank: RankSnapshotJson | null;
  rankHistory: RankSnapshotJson[];
  lastSyncedAt: Date;
  verified: boolean;
  origins: BlockOrigins;
  verifiedWith?: SourceId;
  verifiedAt?: Date;
  profile?: AccountProfileFields;
  pendingBlocks?: PendingBlock[];
  /** Solo si la cuenta de CS2 no tiene rating: «sin rango Premier» o «rango no disponible» (P15-2). */
  premierStatus?: PremierStatusJson;
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
    canonicalTier: { type: String },
  },
  { _id: false },
);

const RiotLpBaselineSchema = new Schema<RiotLpBaselineFields>(
  {
    tier: { type: String, default: null },
    division: { type: String },
    points: { type: Number, validate: integer },
    matchIds: { type: [String], default: [] },
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
    rankDelta: { type: Number },
  },
  { _id: false },
);

// La división se omite si falta (nunca `division: undefined`); `canonicalTier` es interno.
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
// `pendingBlocks` solo sale cuando no está vacío (spec 014, §3.2, P14-5). `premierStatus` solo
// sale sin rating, y `premier` nunca (spec 015, P15-2). Una CS2 verificada con Steam sin `premier`
// (anterior a la 015, sin migrar) dice `unavailable` (RF-8).
export function toGameAccountJson(account: GameAccountDocument): GameAccountJson {
  const verification = account.verification ?? undefined;
  const profile = account.profile ?? undefined;
  const pendingBlocks = account.pendingBlocks;
  const premier = account.premier;
  return {
    id: account._id.toString(),
    userId: account.user.toString(),
    gameId: account.gameId,
    handle: account.handle,
    region: account.region,
    currentRank: account.currentRank == null ? null : toRankSnapshotJson(account.currentRank),
    rankHistory: account.rankHistory.map(toRankSnapshotJson),
    lastSyncedAt: account.lastSyncedAt,
    verified: verification !== undefined,
    origins: blockOrigins(verification),
    ...(verification === undefined
      ? {}
      : { verifiedWith: verification.source, verifiedAt: verification.verifiedAt }),
    ...(profile === undefined ? {} : { profile: toProfileJson(profile) }),
    ...(pendingBlocks !== undefined && pendingBlocks.length > 0
      ? { pendingBlocks: [...pendingBlocks] }
      : {}),
    ...(premier === "unrated" || premier === "unavailable"
      ? { premierStatus: premier }
      : premier === undefined && account.gameId === "cs2" && verification?.source === "steam"
        ? { premierStatus: "unavailable" as const } // sin migrar (RF-8, plan §12.2)
        : {}),
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
    currentRank: {
      type: RankSnapshotSchema,
      // Sin rango solo en cuentas verificadas con Riot (spec 014) y con Steam sin rating (spec 015).
      required(this: GameAccountFields) {
        const source = this.verification?.source;
        if (source === "riot") return false;
        return !(source === "steam" && (this.premier === "unrated" || this.premier === "unavailable"));
      },
      default: null,
    },
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
    pendingBlocks: {
      type: [{ type: String, enum: PENDING_BLOCKS }],
      default: undefined,
    },
    lastSuccessfulSyncAt: { type: Date, default: undefined },
    riotLpBaseline: { type: RiotLpBaselineSchema, default: undefined },
    premier: { type: String, enum: PREMIER_STATUSES, default: undefined },
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

export const GameAccount = model<GameAccountFields>("GameAccount", GameAccountSchema);
