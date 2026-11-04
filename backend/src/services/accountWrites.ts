// Escrituras de las cuentas de juego (spec 004, plan, secciones 6.4 y 8). RF-5, RF-11, RF-29,
// RF-39, RF-45, RF-46, RF-47, DP-29.
// - `updateOwnedAccount`: existencia (404) → propiedad (403) → `apply` (400 con su texto) →
//   una sola escritura con `save()` y concurrencia optimista. Ante `VersionError` se relee y
//   se vuelve a aplicar (máx. `maxAttempts`); un documento borrado entretanto da 404 y
//   `save()` nunca lo recrea. Cualquier otro error llega al `errorHandler` (500).
// - `linkAccount`: crear la cuenta (un solo insert), comprobar que el usuario existe y
//   compensar con `deleteOne` si no existe o si algo lanza (P-19). El usuario no se escribe
//   nunca (RF-46). Si el usuario se eliminó entretanto, 404 "usuario no encontrado" (RF-47;
//   R3 del plan: aceptado). Dos vinculaciones simultáneas del mismo juego chocan en el
//   índice único `{ user, gameId }` y la perdedora responde el 400 de RF-5.
import mongoose from "mongoose";
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import type { AccountState } from "../domain/accountState.ts";
import type { GameId } from "../domain/games.ts";
import type { SimulatedMatch } from "../domain/rankSimulator.ts";
import { GameAccount } from "../models/gameAccount.ts";
import type { GameAccountDocument, MatchRecordFields } from "../models/gameAccount.ts";
import { User } from "../models/user.ts";
import { MESSAGES } from "../utils/errors.ts";
import { USER_TARGET_MESSAGES } from "./userTarget.ts";

export type WriteResult =
  | { ok: true; account: GameAccountDocument }
  | { ok: false; status: 400 | 403 | 404; error: string };

/** Cambia la cuenta en memoria; devuelve el texto del 400 si los datos no valen, o `null`. */
export type ApplyChange = (account: GameAccountDocument) => string | null;

export interface LinkData {
  gameId: GameId;
  handle: string;
  region: string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

// La partida del dominio (`id`) se guarda como `matchId` (P-11).
export function toMatchRecord(match: SimulatedMatch): MatchRecordFields {
  const { id, gameId, playedAt, result, summary, durationMinutes, rankDelta } = match;
  return { matchId: id, gameId, playedAt, result, summary, durationMinutes, rankDelta };
}

export async function linkAccount(userId: string, data: LinkData, state: AccountState): Promise<WriteResult> {
  let account: GameAccountDocument;
  try {
    account = await GameAccount.create({
      user: userId,
      gameId: data.gameId,
      handle: data.handle,
      region: data.region,
      currentRank: state.currentRank,
      rankHistory: state.rankHistory,
      matches: state.matches.map(toMatchRecord),
      readingNumber: state.readingNumber,
      lastSyncedAt: state.lastSyncedAt,
      verified: state.verified,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, status: 400, error: ACCOUNT_ERRORS.duplicate };
    throw error; // → errorHandler (500)
  }
  try {
    if ((await User.exists({ _id: userId })) === null) {
      // Usuario eliminado entretanto (RF-47): no queda ninguna cuenta suya.
      await GameAccount.deleteOne({ _id: account._id });
      return { ok: false, status: 404, error: USER_TARGET_MESSAGES.userNotFound };
    }
  } catch (error) {
    await GameAccount.deleteOne({ _id: account._id }); // 500 sin cuenta a medias (RF-46)
    throw error; // → errorHandler (500)
  }
  return { ok: true, account };
}

export async function updateOwnedAccount(
  accountId: string,
  userId: string,
  apply: ApplyChange,
  maxAttempts = 5,
): Promise<WriteResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const account = await GameAccount.findById(accountId);
    if (account === null) return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
    if (!account.user.equals(userId)) return { ok: false, status: 403, error: MESSAGES.forbidden };
    const error = apply(account);
    if (error !== null) return { ok: false, status: 400, error };
    try {
      await account.save();
      return { ok: true, account };
    } catch (saveError) {
      if (saveError instanceof mongoose.Error.VersionError) continue; // otra escritura ganó: releer
      if (saveError instanceof mongoose.Error.DocumentNotFoundError) {
        return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound }; // desvinculada en medio
      }
      throw saveError; // → errorHandler (500)
    }
  }
  throw new Error(`no se pudo escribir la cuenta ${accountId} tras ${maxAttempts} intentos`);
}
