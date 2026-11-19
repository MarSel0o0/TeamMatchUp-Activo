// Verificar una cuenta de juego con una fuente real (spec 012, RF-1, RF-8, RF-10, RF-11,
// RF-13; plan, sección 3.2, P12-3, riesgo R1). Lo llaman las rutas de verificación de las specs
// 013 (Steam) y 014 (Riot) una vez que la fuente confirmó la identidad: este servicio no sabe
// cómo se demostró el control de la cuenta, solo qué pasa en la base cuando se demostró.
// - Exclusividad: la primera verificación gana; la carrera la resuelve el índice único parcial
//   `{ gameId, verification.externalId }` (409), no una comprobación previa.
// - Una sola cuenta por usuario y juego (spec 004, RF-5): si el usuario ya tenía una cuenta
//   vinculada a mano, esa misma cuenta pasa a verificada (RF-13).
// - Sin transacciones: si falla el borrado final (RF-11), la cuenta queda verificada y las
//   ajenas sin verificar siguen vinculadas hasta la próxima verificación (R1; aceptado).
import mongoose from "mongoose";
import { initialState } from "../domain/accountState.ts";
import { GAMES } from "../domain/games.ts";
import type { GameId } from "../domain/games.ts";
import { canonicalHandle } from "../domain/rankSimulator.ts";
import type { PendingBlock } from "../domain/riotChallenge.ts";
import type { RiotMatchRecord, RiotRankSnapshot } from "../domain/riotData.ts";
import type { RiotLpBaseline } from "../domain/riotLpDelta.ts";
import type { SourceId } from "../domain/sources.ts";
import { verifiedState } from "../domain/verification.ts";
import type { RealData } from "../domain/verification.ts";
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import { GameAccount } from "../models/gameAccount.ts";
import type {
  AccountProfileFields,
  GameAccountDocument,
  MatchRecordFields,
} from "../models/gameAccount.ts";
import { User } from "../models/user.ts";
import { simulatedRankProvider } from "./rankProvider.ts";
import { toAccountState, toMatchRecord } from "./accountWrites.ts";
import { cancelOpenChallengesForUsers } from "./riotChallenges.ts";
import { USER_TARGET_MESSAGES } from "./userTarget.ts";

/** Estado ya calculado para cuentas verificadas con Riot Games (spec 014, plan §5.2). */
export interface RiotVerifyState {
  currentRank: RiotRankSnapshot | null;
  rankHistory: RiotRankSnapshot[];
  matches: RiotMatchRecord[];
  profile: AccountProfileFields;
  pendingBlocks: PendingBlock[];
  lastSuccessfulSyncAt: Date | null;
  riotLpBaseline: RiotLpBaseline | null;
}

export interface VerifyInput {
  /** Usuario de la sesión; nunca un identificador enviado por el cliente (constitución, 5). */
  userId: string;
  gameId: GameId;
  /** Identificador visible verificado (Riot ID, SteamID64). */
  handle: string;
  /**
   * Región de la cuenta. Si falta, una cuenta existente conserva la suya y una nueva toma la
   * primera región del juego.
   */
  region?: string;
  verification: { source: SourceId; externalId: string };
  /** Lo que la fuente entregó al verificar (fuentes genéricas 012/013). */
  real?: RealData;
  /** Estado completo o parcial de Riot Games ya calculado por `applyRiotReading` (spec 014). */
  riotState?: RiotVerifyState;
  now: Date;
}

export type VerifyResult =
  | { ok: true; account: GameAccountDocument }
  | { ok: false; status: 404 | 409; error: string };

const MAX_ATTEMPTS = 5;

const TAKEN: VerifyResult = { ok: false, status: 409, error: ACCOUNT_ERRORS.verifiedElsewhere };

function isDuplicateKeyError(error: unknown): error is mongoose.mongo.MongoServerError {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

/** El choque fue con el índice de la verificación, no con `{ user, gameId }`. */
function collidedOnVerification(error: mongoose.mongo.MongoServerError): boolean {
  const pattern: unknown = error.keyPattern;
  return typeof pattern === "object" && pattern !== null && "verification.externalId" in pattern;
}

async function isTakenByOtherUser(
  gameId: GameId,
  externalId: string,
  userId: string,
): Promise<boolean> {
  const taken = await GameAccount.exists({
    gameId,
    "verification.externalId": externalId,
    user: { $ne: userId },
  });
  return taken !== null;
}

function toRiotMatchRecord(match: RiotMatchRecord): MatchRecordFields {
  const { id, gameId, playedAt, result, summary, durationMinutes, rankDelta } = match;
  return rankDelta === undefined
    ? { matchId: id, gameId, playedAt, result, summary, durationMinutes }
    : { matchId: id, gameId, playedAt, result, summary, durationMinutes, rankDelta };
}

// Aplica la verificación a una cuenta existente (RF-8, RF-13). `handleKey` lo recalcula
// `pre("validate")` al guardar.
function convert(account: GameAccountDocument, input: VerifyInput): void {
  if (input.riotState !== undefined) {
    const state = input.riotState;
    account.verification = { ...input.verification, verifiedAt: input.now };
    account.handle = input.handle;
    if (input.region !== undefined) account.region = input.region;
    account.currentRank = state.currentRank;
    account.rankHistory = state.rankHistory;
    account.matches = state.matches.map(toRiotMatchRecord);
    account.lastSyncedAt = input.now;
    account.profile = state.profile;
    if (state.pendingBlocks.length > 0) {
      account.pendingBlocks = [...state.pendingBlocks];
    } else {
      account.set("pendingBlocks", undefined);
    }
    account.lastSuccessfulSyncAt = state.lastSuccessfulSyncAt;
    account.riotLpBaseline = state.riotLpBaseline;
    return;
  }
  if (input.real === undefined) {
    throw new Error("verifyAccount requiere `real` o `riotState`");
  }
  const next = verifiedState(toAccountState(account), input.real, input.now);
  account.currentRank = next.currentRank;
  account.rankHistory = next.rankHistory;
  account.matches = next.matches.map(toMatchRecord);
  account.lastSyncedAt = next.lastSyncedAt;
  account.handle = input.handle;
  if (input.region !== undefined) account.region = input.region;
  account.verification = { ...input.verification, verifiedAt: input.now };
  if (input.real.profile !== undefined) account.profile = input.real.profile;
}

// Cuenta nueva ya verificada: para Riot usa `riotState`; para fuentes genéricas (012/013) la base
// es la lectura simulada número 0 (spec 004, RF-4) y la fuente reemplaza los bloques que entrega.
async function createVerified(input: VerifyInput): Promise<GameAccountDocument> {
  const region = input.region ?? GAMES[input.gameId].regions[0];
  if (region === undefined) throw new Error(`el juego ${input.gameId} no tiene regiones`);
  if (input.riotState !== undefined) {
    const state = input.riotState;
    return GameAccount.create({
      user: input.userId,
      gameId: input.gameId,
      handle: input.handle,
      region,
      currentRank: state.currentRank,
      rankHistory: state.rankHistory,
      matches: state.matches.map(toRiotMatchRecord),
      readingNumber: 0,
      lastSyncedAt: input.now,
      verification: { ...input.verification, verifiedAt: input.now },
      profile: state.profile,
      ...(state.pendingBlocks.length > 0 ? { pendingBlocks: [...state.pendingBlocks] } : {}),
      lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
      ...(state.riotLpBaseline === null ? {} : { riotLpBaseline: state.riotLpBaseline }),
    });
  }
  if (input.real === undefined) {
    throw new Error("verifyAccount requiere `real` o `riotState`");
  }
  const base = initialState(
    simulatedRankProvider.read({
      gameId: input.gameId,
      canonicalHandle: canonicalHandle(input.handle),
      readingNumber: 0,
      now: input.now,
    }),
    input.now,
  );
  const state = verifiedState(base, input.real, input.now);
  return GameAccount.create({
    user: input.userId,
    gameId: input.gameId,
    handle: input.handle,
    region,
    currentRank: state.currentRank,
    rankHistory: state.rankHistory,
    matches: state.matches.map(toMatchRecord),
    readingNumber: state.readingNumber,
    lastSyncedAt: state.lastSyncedAt,
    verification: { ...input.verification, verifiedAt: input.now },
    ...(input.real.profile === undefined ? {} : { profile: input.real.profile }),
  });
}

/**
 * Cuentas sin verificar de otros usuarios con el mismo juego e identificador (spec 012, RF-11).
 * En LoL, además anula los desafíos abiertos de Riot de esos usuarios (spec 014, RF-29, D89) y
 * devuelve sus identificadores.
 */
export async function unlinkUnverifiedElsewhere(
  account: GameAccountDocument,
  at: Date,
): Promise<string[]> {
  const filter = {
    gameId: account.gameId,
    handleKey: account.handleKey,
    user: { $ne: account.user },
    verification: { $exists: false },
  };
  if (account.gameId !== "lol") {
    await GameAccount.deleteMany(filter);
    return [];
  }
  const doomed = await GameAccount.find(filter, { user: 1 }).lean();
  await GameAccount.deleteMany(filter);
  if (doomed.length === 0) return [];
  const userIds = Array.from(new Set(doomed.map((doc) => doc.user.toString())));
  await cancelOpenChallengesForUsers(userIds, at);
  return userIds;
}

export async function verifyAccount(input: VerifyInput): Promise<VerifyResult> {
  const { userId, gameId, verification } = input;

  // RF-10: otro usuario ya verificó esta cuenta real. El índice único cubre la carrera.
  if (await isTakenByOtherUser(gameId, verification.externalId, userId)) return TAKEN;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const own = await GameAccount.findOne({ user: userId, gameId });
    let account: GameAccountDocument;

    if (own !== null) {
      convert(own, input);
      try {
        await own.save();
      } catch (error) {
        if (error instanceof mongoose.Error.VersionError) continue; // otra escritura ganó: releer
        if (error instanceof mongoose.Error.DocumentNotFoundError) continue; // desvinculada en medio
        if (isDuplicateKeyError(error) && collidedOnVerification(error)) {
          if (await isTakenByOtherUser(gameId, verification.externalId, userId)) return TAKEN;
          continue;
        }
        throw error;
      }
      account = own;
    } else {
      try {
        account = await createVerified(input);
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        if (
          collidedOnVerification(error) &&
          (await isTakenByOtherUser(gameId, verification.externalId, userId))
        ) {
          return TAKEN;
        }
        continue; // alta simultánea del mismo usuario: ahora existe y se convierte
      }
      if ((await User.exists({ _id: userId })) === null) {
        // Usuario eliminado entretanto (spec 004, RF-47): no queda ninguna cuenta suya.
        await GameAccount.deleteOne({ _id: account._id });
        return { ok: false, status: 404, error: USER_TARGET_MESSAGES.userNotFound };
      }
    }

    await unlinkUnverifiedElsewhere(account, input.now); // RF-11 + spec 014 RF-29/D89
    return { ok: true, account };
  }
  throw new Error(`no se pudo verificar la cuenta de ${userId} en ${gameId} tras ${MAX_ATTEMPTS} intentos`);
}
