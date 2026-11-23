// Resincronizar una cuenta de CS2 verificada con Steam: perfil de Steam y rango Premier de
// Leetify (spec 015, RF-1, RF-9, RF-11, RF-16, RF-17, RF-18, RF-19, RNF-4, RNF-7; plan, §4.2,
// P15-6 y P15-8). Sale de `controllers/accounts.ts` para no engordar el controlador.
// - Orden: existencia y dueño → bloqueo por cuenta → espera mínima → Steam → Leetify (solo si
//   Steam respondió) → una sola escritura. El 403 y el 404 de la 004 ganan al 429 del bloqueo
//   (P15-13): un ajeno nunca sabe si hay una resincronización en curso. El bloqueo cubre desde
//   leer la espera hasta escribir, que es donde dos peticiones a la vez pasarían ambas (RF-19);
//   la cuenta se relee ya dentro, para que la espera se calcule con lo que dejó la anterior.
// - El id se pasa a minúsculas: el mismo ObjectId en mayúsculas y en minúsculas es una sola
//   cuenta y comparte el bloqueo (P15-13).
// - Si Steam falla, rige el RF-19 de la 012: 503/404 sin tocar la cuenta ni consultar Leetify.
// - Si Leetify falla y Steam respondió: 200 con el perfil al día, el rango sin cambios y
//   `syncNotice`; `lastSyncedAt` avanza, así la espera corre igual (RF-16, RF-17).
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import { LEETIFY_NOTICES, applyLeetifyReading, verifiedPremier } from "../domain/leetify.ts";
import type { LeetifyReading, PremierState } from "../domain/leetify.ts";
import { SOURCE_NAMES } from "../domain/sources.ts";
import { syncCooldown } from "../domain/syncCooldown.ts";
import { GameAccount, toGameAccountJson } from "../models/gameAccount.ts";
import type { GameAccountDocument, GameAccountJson } from "../models/gameAccount.ts";
import { MESSAGES } from "../utils/errors.ts";
import type { AccountLock } from "./accountLock.ts";
import { toSnapshot, updateOwnedAccount } from "./accountWrites.ts";
import type { LeetifyClient } from "./leetifyClient.ts";
import { SOURCE_TIMEOUT_MS, readPremierWithTimeout, readWithTimeout } from "./realSources.ts";
import type { RealSource } from "./realSources.ts";

export interface SyncSteamAccountInput {
  accountId: string;
  /** Usuario de la sesión (constitución, 5). */
  userId: string;
  steamSource: RealSource;
  /** Sin cliente, la lectura de Leetify es un fallo (P15-9). */
  leetify: LeetifyClient | undefined;
  lock: AccountLock;
  /** Plazo de cada consulta en ms; 8 s por defecto (RNF-4). */
  timeouts?: { steamMs?: number | undefined; leetifyMs?: number | undefined };
  at: Date;
}

export type SyncSteamAccountResult =
  | { ok: true; account: GameAccountJson; syncNotice?: string }
  | { ok: false; status: 400 | 403 | 404 | 429 | 503; error: string };

// Estado del rango de la cuenta guardada. Una cuenta sin `premier` es anterior a la 015 y su
// rango es simulado (RF-20): una lectura con resultado la trata como recién verificada, así el
// historial nunca mezcla puntos simulados (RF-11); un fallo no la toca.
function nextPremier(account: GameAccountDocument, reading: LeetifyReading, at: Date): PremierState | null {
  if (account.premier === undefined) {
    return reading.kind === "failed" ? null : verifiedPremier(reading, at);
  }
  const state: PremierState = {
    premier: account.premier,
    currentRank: account.currentRank === null ? null : toSnapshot(account.currentRank),
    rankHistory: account.rankHistory.map(toSnapshot),
  };
  return reading.kind === "failed" ? null : applyLeetifyReading(state, reading, at); // RF-18
}

export async function syncSteamAccount(input: SyncSteamAccountInput): Promise<SyncSteamAccountResult> {
  const { userId, steamSource, leetify, lock, timeouts = {}, at } = input;
  const accountId = input.accountId.toLowerCase(); // P15-13: la misma cuenta, el mismo bloqueo
  const steamName = SOURCE_NAMES.steam;

  const readAccount = () =>
    GameAccount.findOne({ _id: accountId }, { user: 1, lastSyncedAt: 1, verification: 1, profile: 1 }).lean();

  // 404 y 403 antes que el bloqueo (P15-13): no revelan nada de lo que hace otro usuario.
  const first = await readAccount();
  if (first === null) return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
  if (!first.user.equals(userId)) return { ok: false, status: 403, error: MESSAGES.forbidden };

  // RF-19, D21: la que llega mientras otra está en curso recibe el 429 de la espera completa.
  if (!lock.tryAcquire(accountId)) {
    return { ok: false, status: 429, error: ACCOUNT_ERRORS.syncCooldown(5) };
  }
  try {
    // Relectura bajo el bloqueo: la anterior pudo terminar entre la primera lectura y tomarlo.
    const current = await readAccount();
    if (current === null) return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
    if (!current.user.equals(userId)) return { ok: false, status: 403, error: MESSAGES.forbidden };
    const verification = current.verification;
    if (verification?.source !== "steam") {
      return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
    }

    // Spec 012, RF-16; spec 013, D6: sin datos de perfil no hay lectura que cuente.
    const hasProfile = current.profile !== undefined && current.profile !== null;
    const cooldown = syncCooldown(hasProfile ? current.lastSyncedAt : null, at);
    if (!cooldown.allowed) {
      return { ok: false, status: 429, error: ACCOUNT_ERRORS.syncCooldown(cooldown.minutes) };
    }

    // RF-17: primero Steam; si no responde, sin Leetify y sin cambios (RF-19 de la 012).
    const steamId = verification.externalId;
    const read = await readWithTimeout(
      steamSource,
      { gameId: "cs2", handle: steamId, externalId: steamId },
      timeouts.steamMs ?? SOURCE_TIMEOUT_MS,
    );
    if (!read.ok) {
      return read.reason === "gone"
        ? { ok: false, status: 404, error: ACCOUNT_ERRORS.sourceAccountGone(steamName) }
        : { ok: false, status: 503, error: ACCOUNT_ERRORS.sourceUnavailable(steamName) };
    }
    const premier = await readPremierWithTimeout(leetify, steamId, timeouts.leetifyMs ?? SOURCE_TIMEOUT_MS);

    // Una sola escritura sobre la cuenta releída. Si entretanto cambió la identidad verificada,
    // el resultado ya no le corresponde (como en la 012): 404.
    let stale = false;
    const result = await updateOwnedAccount(accountId, userId, (account) => {
      if (account.verification?.externalId !== steamId) {
        stale = true;
        return null;
      }
      account.lastSyncedAt = at; // Steam respondió: la espera corre (RF-17)
      if (read.data.handle !== "") account.handle = read.data.handle;
      if (read.data.profile !== undefined) account.profile = read.data.profile;
      const next = nextPremier(account, premier, at);
      if (next !== null) {
        account.premier = next.premier;
        account.currentRank = next.currentRank;
        account.rankHistory = next.rankHistory;
      }
      return null;
    });
    if (!result.ok) return result; // desvinculada o de otro dueño entretanto
    if (stale) return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };

    const account = toGameAccountJson(result.account);
    return premier.kind === "failed"
      ? { ok: true, account, syncNotice: LEETIFY_NOTICES.syncFailed } // RF-16, P15-8
      : { ok: true, account };
  } finally {
    lock.release(accountId);
  }
}
