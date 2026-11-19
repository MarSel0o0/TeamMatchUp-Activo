// Orquestación de lecturas reales de Riot Games (spec 014, RF-7, RF-11, RF-14, RF-15, RF-16,
// RF-27, RF-29, RF-30, RF-32, RF-35, RF-37, RF-38, RF-49, RF-50, RF-51, RF-52, RF-53, RNF-1,
// RNF-6, RNF-7; D53, D68, D69, D78, D80, D81, D82, D83, D84, D89, D90, D92, D94, D95, D98,
// D102; plan, §§2.2, 5.2, 5.3, O-1, P14-3, P14-5 y P14-6).
// - `riotCall` consume 1 consulta de la reserva respetando 20/s y el plazo global de 60 s.
// - `readRiotAccountData` lee identidad vigente, perfil, rango Solo/Dúo y hasta 20 partidas
//   dentro del presupuesto reservado tras confirmar el ícono.
// - `syncRiotAccount` resincroniza una cuenta verificada con Riot en el orden exacto de RF-51.
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import type { PendingBlock } from "../domain/riotChallenge.ts";
import type { RiotMatchRecord, RiotRankSnapshot } from "../domain/riotData.ts";
import { applyRiotReading } from "../domain/riotLpDelta.ts";
import type { RiotLpBaseline } from "../domain/riotLpDelta.ts";
import { RESERVE_SYNC } from "../domain/riotRateLimiter.ts";
import { RIOT_ERRORS, RIOT_NOTICES, isLolRegion } from "../domain/riotRules.ts";
import type { LolRegion } from "../domain/riotRules.ts";
import { syncCooldown } from "../domain/syncCooldown.ts";
import { GameAccount, toGameAccountJson } from "../models/gameAccount.ts";
import type {
  AccountProfileFields,
  GameAccountJson,
  MatchRecordFields,
  RankSnapshotFields,
  RiotLpBaselineFields,
} from "../models/gameAccount.ts";
import { MESSAGES } from "../utils/errors.ts";
import { updateOwnedAccount } from "./accountWrites.ts";
import type { RiotClient, RiotSummonerData } from "./riotClient.ts";
import type { RiotLimiter, RiotReservation } from "./riotLimiter.ts";
import type { RiotUserLock } from "./riotUserLock.ts";
import { unlinkUnverifiedElsewhere } from "./verifyAccount.ts";

/** Máximo de detalles de partida que se consultan por lectura (RF-11, D39, D84, RNF-1). */
const MAX_MATCH_DETAILS = 20;
/** Plazo máximo de una operación completa con Riot en ms: 60 segundos (RNF-7). */
const DEFAULT_OPERATION_TIMEOUT_MS = 60_000;

export type RiotCallOutcome<T> = { aborted: true } | { aborted: false; result: T };

/**
 * Consume 1 consulta reservada respetando 20/s y el plazo global de 60 s (RF-37, RNF-7).
 * Corta de inmediato si vence `signal`, incluso si el cliente ignora la señal de cancelación.
 */
export async function riotCall<T>(
  limiter: RiotLimiter,
  reservation: RiotReservation,
  signal: AbortSignal,
  call: (signal: AbortSignal) => Promise<T>,
): Promise<RiotCallOutcome<T>> {
  if (signal.aborted) return { aborted: true };
  try {
    await limiter.acquire(reservation, signal);
  } catch {
    return { aborted: true };
  }
  if (signal.aborted) return { aborted: true };

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<RiotCallOutcome<T>>((resolve) => {
    onAbort = () => resolve({ aborted: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });

  const invoke = (async (): Promise<RiotCallOutcome<T>> => {
    const result = await call(signal);
    if (signal.aborted) return { aborted: true };
    return { aborted: false, result };
  })();
  // Evita rechazos no manejados si `aborted` gana antes de que `invoke` termine.
  invoke.catch(() => undefined);

  try {
    return await Promise.race([invoke, aborted]);
  } catch {
    return { aborted: true };
  } finally {
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
}

export interface ReadRiotAccountDataInput {
  client: RiotClient;
  limiter: RiotLimiter;
  reservation: RiotReservation;
  signal: AbortSignal;
  puuid: string;
  region: LolRegion;
  /** Riot ID devuelto por Riot al pedir el desafío (D86); respaldo si falla Account-v1 (D82). */
  fallbackRiotId: string;
  /** Perfil ya obtenido al comprobar el ícono en Summoner-v4. */
  summoner: RiotSummonerData;
  /** Instante de la lectura para fechar la fotografía de rango. */
  at: Date;
}

export type ReadRiotAccountDataResult =
  | { kind: "account_not_found" }
  | {
      kind: "ok";
      handle: string;
      profile: AccountProfileFields;
      profilePending: boolean;
      rankResult: { ok: true; rank: RiotRankSnapshot | null } | { ok: false };
      matchesResult:
        | { ok: true; matches: RiotMatchRecord[]; omittedAny: boolean }
        | { ok: false };
    };

/**
 * Lee los datos reales de Riot tras confirmar el ícono y comprobar la exclusividad (plan §5.2,
 * paso 11). Aplica D82 (fallo no-404 del Riot ID vigente usa `fallbackRiotId` sin aviso),
 * D95 (404 al leer el Riot ID vigente → `{ kind: "account_not_found" }`), D92 (perfil pendiente
 * conserva `iconId`), D83/D102 (una partida suelta fallida se omite marcando `omittedAny`) y
 * D98 (si vence `signal`, los bloques sin leer quedan pendientes).
 */
export async function readRiotAccountData(
  input: ReadRiotAccountDataInput,
): Promise<ReadRiotAccountDataResult> {
  const { client, limiter, reservation, signal, puuid, region, fallbackRiotId, summoner, at } =
    input;

  // 11a. Riot ID vigente (Account-v1 by-puuid): 404 → RF-50 (D95); otro fallo → respaldo sin aviso (D82).
  let handle = fallbackRiotId;
  if (!signal.aborted) {
    const accountOutcome = await riotCall(limiter, reservation, signal, (callSignal) =>
      client.getAccountByPuuid(puuid, region, callSignal),
    );
    if (!accountOutcome.aborted) {
      if (accountOutcome.result.kind === "not_found") {
        return { kind: "account_not_found" };
      }
      if (accountOutcome.result.kind === "ok") {
        handle = accountOutcome.result.account.riotId;
      }
    }
  }

  // 11b. Perfil: si el nivel no se pudo interpretar, queda pendiente manteniendo `iconId` (D92).
  const profilePending = summoner.level === null;
  const profile: AccountProfileFields =
    summoner.level === null
      ? { iconId: summoner.profileIconId }
      : { level: summoner.level, iconId: summoner.profileIconId };

  // 11c. Rango Solo/Dúo (League-v4 entries/by-puuid).
  let rankResult: { ok: true; rank: RiotRankSnapshot | null } | { ok: false } = { ok: false };
  if (!signal.aborted) {
    const rankOutcome = await riotCall(limiter, reservation, signal, (callSignal) =>
      client.getSoloRankByPuuid(puuid, region, callSignal, at),
    );
    if (!rankOutcome.aborted && rankOutcome.result.kind === "ok") {
      rankResult = { ok: true, rank: rankOutcome.result.rank };
    }
  }

  // 11d. Partidas Solo/Dúo (lista + hasta 20 detalles).
  let matchesResult:
    | { ok: true; matches: RiotMatchRecord[]; omittedAny: boolean }
    | { ok: false } = { ok: false };
  if (!signal.aborted) {
    const idsOutcome = await riotCall(limiter, reservation, signal, (callSignal) =>
      client.getSoloMatchIds(puuid, region, callSignal),
    );
    if (!idsOutcome.aborted && idsOutcome.result.kind === "ok") {
      const matchIds = idsOutcome.result.matchIds.slice(0, MAX_MATCH_DETAILS);
      const matches: RiotMatchRecord[] = [];
      let omittedAny = false;
      for (const matchId of matchIds) {
        if (signal.aborted) {
          omittedAny = true;
          break;
        }
        const matchOutcome = await riotCall(limiter, reservation, signal, (callSignal) =>
          client.getMatchById(matchId, puuid, region, callSignal),
        );
        if (matchOutcome.aborted) {
          omittedAny = true;
          break;
        }
        if (matchOutcome.result.kind === "ok") {
          matches.push(matchOutcome.result.match);
        } else if (matchOutcome.result.kind !== "remake") {
          // D83, D102: fallo/inválido de una partida suelta solo omite esa partida y marca `omittedAny`.
          omittedAny = true;
        }
      }
      matchesResult = { ok: true, matches, omittedAny };
    }
  }

  return {
    kind: "ok",
    handle,
    profile,
    profilePending,
    rankResult,
    matchesResult,
  };
}

function toStoredRiotRankNonNull(stored: RankSnapshotFields): RiotRankSnapshot {
  return {
    tier: stored.tier,
    ...(stored.division === undefined ? {} : { division: stored.division }),
    points: stored.points,
    normalized: stored.normalized,
    recordedAt: stored.recordedAt,
    ...(stored.canonicalTier === undefined ? {} : { canonicalTier: stored.canonicalTier }),
  };
}

function toStoredRiotRank(stored: RankSnapshotFields | null): RiotRankSnapshot | null {
  return stored === null ? null : toStoredRiotRankNonNull(stored);
}

function toStoredRiotMatch(stored: MatchRecordFields): RiotMatchRecord {
  return {
    id: stored.matchId,
    gameId: "lol",
    playedAt: stored.playedAt,
    result: stored.result,
    summary: stored.summary,
    durationMinutes: stored.durationMinutes,
    ...(stored.rankDelta == null ? {} : { rankDelta: stored.rankDelta }),
  };
}

function toStoredBaseline(
  stored: RiotLpBaselineFields | null | undefined,
): RiotLpBaseline | null {
  if (stored === null || stored === undefined) return null;
  return {
    tier: stored.tier,
    ...(stored.division === undefined ? {} : { division: stored.division }),
    ...(stored.points === undefined ? {} : { points: stored.points }),
    matchIds: [...stored.matchIds],
  };
}

function toRiotMatchRecord(match: RiotMatchRecord): MatchRecordFields {
  const { id, gameId, playedAt, result, summary, durationMinutes, rankDelta } = match;
  return rankDelta === undefined
    ? { matchId: id, gameId, playedAt, result, summary, durationMinutes }
    : { matchId: id, gameId, playedAt, result, summary, durationMinutes, rankDelta };
}

/**
 * Instante de referencia para la espera mínima de una cuenta verificada con Riot (RF-7, RF-27,
 * RF-51, RF-53; D53, D68, D82; P14-5). Devuelve `null` (sin espera) si quedan bloques pendientes
 * o si todavía no hubo una lectura completa exitosa (`lastSuccessfulSyncAt === null`).
 */
export function effectiveRiotCooldownAnchor(account: {
  pendingBlocks?: readonly PendingBlock[] | undefined;
  lastSuccessfulSyncAt?: Date | null | undefined;
  lastSyncedAt: Date;
  profile?: AccountProfileFields | null | undefined;
}): Date | null {
  if (account.pendingBlocks !== undefined && account.pendingBlocks.length > 0) {
    return null;
  }
  if (account.lastSuccessfulSyncAt === null) {
    return null;
  }
  if (account.lastSuccessfulSyncAt !== undefined) {
    return account.lastSuccessfulSyncAt;
  }
  return account.profile !== undefined && account.profile !== null ? account.lastSyncedAt : null;
}

export interface SyncRiotAccountInput {
  accountId: string;
  userId: string;
  client?: RiotClient | undefined;
  limiter: RiotLimiter;
  userLock: RiotUserLock;
  operationTimeoutMs?: number | undefined;
  at: Date;
}

export type SyncRiotAccountResult =
  | { ok: true; account: GameAccountJson; syncNotice?: string }
  | { ok: false; status: 403 | 404 | 409 | 429 | 503; error: string };

/**
 * Resincronización dedicada para cuentas verificadas con Riot Games (spec 014, RF-14, RF-15,
 * RF-16, RF-29/D89, RF-30, RF-32, RF-35, RF-37, RF-38, RF-49, RF-51, RF-52, RF-53, RNF-1, RNF-6,
 * RNF-7; plan §5.3, O-1, P14-3, P14-5 y P14-6).
 *
 * Orden exacto (RF-51):
 * 1. 409 ya se está comprobando (lock por usuario en memoria, RF-49, D90)
 * 2. 503 sin clave de Riot (RF-38) — ANTES de la espera mínima
 * 3. 429 espera mínima de 5 min si aplica (spec 012 RF-16; no aplica si hay pendientes o parcial)
 * 4. 503 limitador propio sin hueco para reservar 24 consultas (RF-37, D84; libera sobrantes D69)
 * 5. Account-v1: 404 cuenta borrada (RF-35) / 503 fallo o 60 s (nada cambia)
 * 6. Summoner-v4: 404 sin perfil en la región (RF-35) / 503 fallo, nivel ilegible o 60 s (nada cambia)
 * 7. League-v4 y Match-v5: si vence el plazo global de 60 s → 503 sin cambios (RNF-7); si fallan
 *    sin vencer el plazo → resincronización parcial RF-53 (conserva datos previos, `syncNotice`
 *    en el 200, sin actualizar `lastSuccessfulSyncAt`)
 * 8. Una sola escritura con `updateOwnedAccount`; si cambió `handleKey`, desvincula manuales
 *    ajenas y anula sus desafíos abiertos (RF-14, RF-29/D89).
 */
export async function syncRiotAccount(
  input: SyncRiotAccountInput,
): Promise<SyncRiotAccountResult> {
  const {
    accountId,
    userId,
    client,
    limiter,
    userLock,
    operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
    at,
  } = input;

  // 1. Bloqueo por usuario (RF-49, D90).
  if (!userLock.tryAcquire(userId)) {
    return { ok: false, status: 409, error: RIOT_ERRORS.inProgress };
  }

  try {
    // 2. Clave de Riot ausente → 503 ANTES de comprobar la espera mínima (RF-38, RF-51).
    if (client === undefined) {
      return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
    }

    // Releer estado actual bajo el lock para evitar carreras y leer los campos internos.
    const current = await GameAccount.findOne(
      { _id: accountId },
      {
        user: 1,
        gameId: 1,
        region: 1,
        lastSyncedAt: 1,
        lastSuccessfulSyncAt: 1,
        pendingBlocks: 1,
        verification: 1,
        profile: 1,
      },
    ).lean();
    if (current === null) {
      return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
    }
    if (!current.user.equals(userId)) {
      return { ok: false, status: 403, error: MESSAGES.forbidden };
    }
    if (current.verification?.source !== "riot") {
      return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
    }

    const puuid = current.verification.externalId;
    const region = current.region;

    // 3. Espera mínima de 5 minutos (RF-51, RF-7, RF-27, RF-53, D53, D68).
    const anchor = effectiveRiotCooldownAnchor(current);
    const cooldown = syncCooldown(anchor, at);
    if (!cooldown.allowed) {
      return { ok: false, status: 429, error: ACCOUNT_ERRORS.syncCooldown(cooldown.minutes) };
    }

    // 4. Reserva de 24 consultas en el limitador propio (RF-37, RF-51, D84).
    const reservation = limiter.reserve(RESERVE_SYNC);
    if (reservation === null) {
      return { ok: false, status: 503, error: RIOT_ERRORS.busy };
    }

    try {
      if (!isLolRegion(region)) {
        return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
      }

      const opController = new AbortController();
      const opTimer = setTimeout(() => opController.abort(), operationTimeoutMs);

      try {
        // 5. Cuenta global por PUUID (Account-v1).
        const accountOutcome = await riotCall(
          limiter,
          reservation,
          opController.signal,
          (signal) => client.getAccountByPuuid(puuid, region, signal),
        );
        if (accountOutcome.aborted || opController.signal.aborted) {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }
        if (accountOutcome.result.kind === "not_found") {
          return { ok: false, status: 404, error: RIOT_ERRORS.accountGone };
        }
        if (accountOutcome.result.kind !== "ok") {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }
        const riotAccount = accountOutcome.result.account;

        // 6. Perfil en la plataforma de la región (Summoner-v4).
        const summonerOutcome = await riotCall(
          limiter,
          reservation,
          opController.signal,
          (signal) => client.getSummonerByPuuid(puuid, region, signal),
        );
        if (summonerOutcome.aborted || opController.signal.aborted) {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }
        if (summonerOutcome.result.kind === "not_found") {
          return { ok: false, status: 404, error: RIOT_ERRORS.regionTransferred(region) };
        }
        if (summonerOutcome.result.kind !== "ok") {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }
        const summoner = summonerOutcome.result.summoner;
        const summonerLevel = summoner.level;
        if (summonerLevel === null) {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }

        // 7a. Rango Solo/Dúo (League-v4). Si vence el plazo global de 60 s → 503 sin cambios (RNF-7).
        let rankResult: { ok: true; rank: RiotRankSnapshot | null } | { ok: false } = { ok: false };
        const rankOutcome = await riotCall(
          limiter,
          reservation,
          opController.signal,
          (signal) => client.getSoloRankByPuuid(puuid, region, signal, at),
        );
        if (rankOutcome.aborted || opController.signal.aborted) {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }
        if (rankOutcome.result.kind === "ok") {
          rankResult = { ok: true, rank: rankOutcome.result.rank };
        }

        // 7b. Partidas Solo/Dúo (Match-v5: lista + hasta 20 detalles).
        let matchesResult:
          | { ok: true; matches: RiotMatchRecord[]; omittedAny: boolean }
          | { ok: false } = { ok: false };
        const idsOutcome = await riotCall(
          limiter,
          reservation,
          opController.signal,
          (signal) => client.getSoloMatchIds(puuid, region, signal),
        );
        if (idsOutcome.aborted || opController.signal.aborted) {
          return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
        }
        if (idsOutcome.result.kind === "ok") {
          const matchIds = idsOutcome.result.matchIds.slice(0, MAX_MATCH_DETAILS);
          const matches: RiotMatchRecord[] = [];
          let omittedAny = false;
          for (const matchId of matchIds) {
            const matchOutcome = await riotCall(
              limiter,
              reservation,
              opController.signal,
              (signal) => client.getMatchById(matchId, puuid, region, signal),
            );
            if (matchOutcome.aborted || opController.signal.aborted) {
              return { ok: false, status: 503, error: RIOT_ERRORS.unavailable };
            }
            if (matchOutcome.result.kind === "ok") {
              matches.push(matchOutcome.result.match);
            } else if (matchOutcome.result.kind !== "remake") {
              // D83, D102: fallo/inválido de una partida suelta solo la omite y marca `omittedAny`.
              omittedAny = true;
            }
          }
          matchesResult = { ok: true, matches, omittedAny };
        }

        // 8. Aplicar en una sola escritura con `updateOwnedAccount` (RF-53, RF-30, RF-32, RF-14, RF-15).
        const partial = !rankResult.ok || !matchesResult.ok;
        let stale = false;
        let previousHandleKey = "";

        const write = await updateOwnedAccount(accountId, userId, (account) => {
          if (
            account.verification?.source !== "riot" ||
            account.verification.externalId !== puuid
          ) {
            stale = true;
            return null;
          }
          previousHandleKey = account.handleKey;

          const reading = applyRiotReading({
            previousRank: toStoredRiotRank(account.currentRank),
            previousHistory: account.rankHistory.map(toStoredRiotRankNonNull),
            previousMatches: account.matches.map(toStoredRiotMatch),
            previousBaseline: toStoredBaseline(account.riotLpBaseline),
            rankResult,
            matchesResult,
            isVerification: false,
          });

          // Recalcular `pendingBlocks`: quitar los bloques leídos bien y NUNCA pasar a pendiente
          // un bloque que falló en resincronización (RF-53, D68). El perfil ya se leyó en el paso 6.
          const nextPending = (account.pendingBlocks ?? []).filter((block) => {
            if (block === "profile") return false;
            if (block === "rank") return !rankResult.ok;
            if (block === "matches") return !matchesResult.ok;
            return true;
          });

          account.handle = riotAccount.riotId;
          account.profile = { level: summonerLevel, iconId: summoner.profileIconId };
          account.currentRank = reading.currentRank;
          account.rankHistory = reading.rankHistory;
          account.matches = reading.matches.map(toRiotMatchRecord);
          account.lastSyncedAt = at;
          if (nextPending.length > 0) {
            account.pendingBlocks = nextPending;
          } else {
            account.set("pendingBlocks", undefined);
          }
          if (!partial) {
            account.lastSuccessfulSyncAt = at;
          } else if (account.lastSuccessfulSyncAt === undefined) {
            account.lastSuccessfulSyncAt = null;
          }
          if (reading.nextBaseline === null) {
            account.set("riotLpBaseline", undefined);
          } else {
            account.riotLpBaseline = reading.nextBaseline;
          }
          return null;
        });

        if (!write.ok) {
          return {
            ok: false,
            status: write.status === 400 ? 404 : write.status,
            error: write.error,
          };
        }
        if (stale) {
          return { ok: false, status: 404, error: ACCOUNT_ERRORS.accountNotFound };
        }

        // 9. Si cambió el Riot ID, desvincular manuales ajenas y anular sus desafíos (RF-14, D89).
        if (write.account.handleKey !== previousHandleKey) {
          await unlinkUnverifiedElsewhere(write.account, at);
        }

        // 10. 200 con `syncNotice` en raíz solo cuando fue resincronización parcial (O-1, RF-53).
        const accountJson = toGameAccountJson(write.account);
        return partial
          ? { ok: true, account: accountJson, syncNotice: RIOT_NOTICES.partialSync }
          : { ok: true, account: accountJson };
      } finally {
        clearTimeout(opTimer);
      }
    } finally {
      limiter.release(reservation);
    }
  } finally {
    userLock.release(userId);
  }
}
