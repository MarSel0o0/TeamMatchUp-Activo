// Rutas de Riot Games: `/api/riot` (spec 014; plan, §§2.2, 5.1 y 5.2).
// Todas las rutas exigen sesión y comprobante anti-CSRF mediante `withUser` (constitución, 5).
// - `GET /` (disponibilidad de Riot, RF-38)
// - `GET /challenges/current` (recuperar desafío abierto sin clave/Riot/límites/RF-49, RF-45)
// - `POST /challenges` (pedir desafío en el orden exacto de RF-22)
// - `POST /challenges/:id/confirm` (confirmar desafío en el orden exacto de RF-26, pasos 1 a 3)
// La clave de Riot nunca llega aquí: vive solo en el cliente (`riotClient.ts`, RNF-4).
// Ninguna respuesta expone el identificador interno de Riot (`puuid`, RNF-3).
import { randomInt } from "node:crypto";
import { Router } from "express";
import {
  MAX_CONFIRM_ATTEMPTS,
  availableStarterIcons,
  challengeConfirmNotice,
  challengeDeleteAt,
  hourlyRateLimitWait,
  isChallengeExpired,
  noFreeIconsWait,
  pickStarterIcon,
} from "../domain/riotChallenge.ts";
import type { PendingBlock } from "../domain/riotChallenge.ts";
import { applyRiotReading } from "../domain/riotLpDelta.ts";
import { RESERVE_CONFIRM, RESERVE_CREATE } from "../domain/riotRateLimiter.ts";
import { RIOT_ERRORS, isLolRegion, validateChallengeRequest } from "../domain/riotRules.ts";
import { GameAccount, toGameAccountJson } from "../models/gameAccount.ts";
import { RiotChallenge, toRiotChallengeJson } from "../models/riotChallenge.ts";
import { isVerifiedByOtherUser } from "../services/accountReads.ts";
import {
  cancelChallenge,
  completeChallenge,
  countRecentChallenges,
  createChallengeAndCancelPrevious,
  findChallengeByIdForUser,
  findOpenChallenge,
  incrementChallengeAttempts,
  openChallengesForPuuid,
} from "../services/riotChallenges.ts";
import type { RiotClient } from "../services/riotClient.ts";
import type { RiotLimiter } from "../services/riotLimiter.ts";
import { readRiotAccountData, riotCall } from "../services/riotSync.ts";
import type { RiotUserLock } from "../services/riotUserLock.ts";
import { verifyAccount } from "../services/verifyAccount.ts";
import { clock } from "../utils/clock.ts";
import { createWithUser } from "../utils/middleware.ts";

/** Plazo máximo de una operación completa con Riot Games en ms: 60 segundos (RNF-7). */
export const RIOT_OPERATION_TIMEOUT_MS = 60_000;

/** Riot Games configurado en la instancia: cliente HTTP y dobles opcionales para pruebas. */
export interface RiotIntegration {
  client: RiotClient;
  /** Limitador propio inyectable en pruebas; por defecto `createApp` crea uno por instancia. */
  limiter?: RiotLimiter;
  /** Selector uniforme de índice para pruebas deterministas; por defecto `crypto.randomInt`. */
  pickIndex?: (length: number) => number;
}

export interface RiotRouterOptions {
  jwtSecret: string;
  now: () => number; // segundos Unix (reloj de las credenciales)
  riot?: RiotIntegration | undefined;
  limiter: RiotLimiter;
  userLock: RiotUserLock;
  /** Plazo máximo de una operación completa con Riot en ms; por defecto 60 s (RNF-7). */
  operationTimeoutMs?: number | undefined;
}

function defaultPickIndex(length: number): number {
  return randomInt(0, length);
}

async function isChallengeCancelled(challengeId: string, userId: string): Promise<boolean> {
  const current = await findChallengeByIdForUser(challengeId, userId);
  return current === null || current.status === "cancelled";
}

export function createRiotRouter({
  jwtSecret,
  now,
  riot,
  limiter,
  userLock,
  operationTimeoutMs = RIOT_OPERATION_TIMEOUT_MS,
}: RiotRouterOptions): Router {
  const router = Router();
  const pickIndex = riot?.pickIndex ?? defaultPickIndex;

  router.use(createWithUser({ jwtSecret, now }));

  // RF-38: la interfaz consulta si ofrecer «Verificar con Riot Games».
  router.get("/", (_request, response) => {
    response.status(200).json({ available: riot !== undefined });
  });

  // RF-45: recupera el desafío abierto y vigente del usuario de la sesión sin consultar a Riot,
  // sin depender de la clave, sin contar para ningún límite y sin verse bloqueado por RF-49.
  router.get("/challenges/current", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const at = clock.now();
    const open = await findOpenChallenge(sessionUserId, at);
    response.status(200).json({ challenge: open === null ? null : toRiotChallengeJson(open, at) });
  });

  // RF-1, RF-3..RF-6, RF-18..RF-22, RF-34, RF-37, RF-38, RF-43, RF-49, RF-52, RNF-3, RNF-7.
  // Sigue el orden exacto de RF-22 (plan §5.1).
  router.post("/challenges", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const at = clock.now();

    // 1. Formato: Riot ID antes que región (RF-18).
    const validation = validateChallengeRequest(request.body);
    if (!validation.ok) {
      response.status(validation.status).json({ error: validation.error });
      return;
    }
    const { gameName, tagLine, riotId, region } = validation.value;

    // 2. Operación simultánea del mismo usuario (RF-49, D70).
    if (!userLock.tryAcquire(sessionUserId)) {
      response.status(409).json({ error: RIOT_ERRORS.inProgress });
      return;
    }

    try {
      // 3. El usuario ya tiene una cuenta de LoL verificada (RF-6).
      const alreadyVerified = await GameAccount.exists({
        user: sessionUserId,
        gameId: "lol",
        verification: { $exists: true },
      });
      if (alreadyVerified !== null) {
        response.status(409).json({ error: RIOT_ERRORS.alreadyVerified });
        return;
      }

      // 4. Cuenta manual de LoL en otra región (RF-20, D49).
      const manual = await GameAccount.findOne(
        { user: sessionUserId, gameId: "lol", verification: { $exists: false } },
        { region: 1 },
      ).lean();
      if (manual !== null && manual.region !== region) {
        response.status(409).json({ error: RIOT_ERRORS.manualRegionMismatch(manual.region) });
        return;
      }

      // 5. Límite de 5 desafíos creados en la última hora (RF-21, D34).
      const recent = await countRecentChallenges(sessionUserId, at);
      const hourlyWaitMs = hourlyRateLimitWait(recent.createdDates, at);
      if (hourlyWaitMs !== null) {
        response.status(429).json({ error: RIOT_ERRORS.hourlyLimit(hourlyWaitMs) });
        return;
      }

      // 6. Otro usuario verificó ese Riot ID por texto, sin mayúsculas ni región (RF-5, D51).
      if (await isVerifiedByOtherUser(sessionUserId, "lol", riotId)) {
        response.status(409).json({ error: RIOT_ERRORS.verifiedElsewhere });
        return;
      }

      // 7. Clave de Riot ausente (RF-38).
      if (riot === undefined) {
        response.status(503).json({ error: RIOT_ERRORS.unavailable });
        return;
      }

      // 8. Reserva de 2 consultas en el limitador propio (RF-37, D84).
      const reservation = limiter.reserve(RESERVE_CREATE);
      if (reservation === null) {
        response.status(503).json({ error: RIOT_ERRORS.busy });
        return;
      }

      try {
        const opController = new AbortController();
        const opTimer = setTimeout(() => opController.abort(), operationTimeoutMs);

        try {
          // 9. Cuenta global por Riot ID (Account-v1).
          const accountOutcome = await riotCall(limiter, reservation, opController.signal, (signal) =>
            riot.client.getAccountByRiotId({ gameName, tagLine }, region, signal),
          );
          if (accountOutcome.aborted) {
            response.status(503).json({ error: RIOT_ERRORS.unavailable });
            return;
          }
          if (accountOutcome.result.kind === "not_found") {
            response.status(404).json({ error: RIOT_ERRORS.accountNotFound });
            return;
          }
          if (accountOutcome.result.kind !== "ok") {
            response.status(503).json({ error: RIOT_ERRORS.unavailable });
            return;
          }
          const riotAccount = accountOutcome.result.account;

          // 10. Perfil de LoL en la plataforma de la región (Summoner-v4).
          // Al pedir desafío, un nivel ilegible también es 503 (RF-52, plan §5.1 paso 10).
          const summonerOutcome = await riotCall(limiter, reservation, opController.signal, (signal) =>
            riot.client.getSummonerByPuuid(riotAccount.puuid, region, signal),
          );
          if (summonerOutcome.aborted) {
            response.status(503).json({ error: RIOT_ERRORS.unavailable });
            return;
          }
          if (summonerOutcome.result.kind === "not_found") {
            response.status(404).json({ error: RIOT_ERRORS.accountNotFound });
            return;
          }
          if (
            summonerOutcome.result.kind !== "ok" ||
            summonerOutcome.result.summoner.level === null
          ) {
            response.status(503).json({ error: RIOT_ERRORS.unavailable });
            return;
          }
          const summoner = summonerOutcome.result.summoner;

          // 11. Otro usuario verificó esta cuenta interna de Riot (RF-5 por puuid).
          const takenByPuuid = await GameAccount.exists({
            gameId: "lol",
            "verification.externalId": riotAccount.puuid,
            user: { $ne: sessionUserId },
          });
          if (takenByPuuid !== null) {
            response.status(409).json({ error: RIOT_ERRORS.verifiedElsewhere });
            return;
          }

          // 12. Selección uniforme de ícono de inicio 0..28 con exclusiones (RF-19, RF-43).
          const openOwn = await findOpenChallenge(sessionUserId, at);
          const openSamePuuid = await openChallengesForPuuid(riotAccount.puuid, at);
          const excluded: number[] = [
            summoner.profileIconId,
            ...openSamePuuid.map((challenge) => challenge.iconId),
          ];
          if (openOwn !== null) excluded.push(openOwn.iconId);

          const available = availableStarterIcons(excluded);
          const iconId = pickStarterIcon(available, pickIndex);
          if (iconId === null) {
            const noIconsWaitMs = noFreeIconsWait(
              openSamePuuid.map((challenge) => challenge.expiresAt),
              at,
            );
            response.status(429).json({ error: RIOT_ERRORS.noFreeIcons(noIconsWaitMs) });
            return;
          }

          // 13. Guardar desafío con el Riot ID en la forma de Riot (D86) y anular el previo (RF-4).
          const created = await createChallengeAndCancelPrevious({
            userId: sessionUserId,
            puuid: riotAccount.puuid,
            riotId: riotAccount.riotId,
            region,
            iconId,
            now: at,
          });

          // 14. 201 sin `puuid` (RF-1, RNF-3, D100).
          response.status(201).json(toRiotChallengeJson(created, at));
        } finally {
          clearTimeout(opTimer);
        }
      } finally {
        limiter.release(reservation);
      }
    } finally {
      userLock.release(sessionUserId);
    }
  });

  // RF-7..RF-12, RF-16, RF-23..RF-27, RF-29, RF-30..RF-32, RF-34, RF-36..RF-38, RF-48..RF-50,
  // RF-52, RNF-1, RNF-3, RNF-6, RNF-7. Sigue el orden exacto de RF-26 pasos 1 a 3 (plan §5.2).
  router.post("/challenges/:id/confirm", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const challengeParam = request.params.id ?? "";
    const at = clock.now();

    // Paso 1: sin consultar a Riot (no cuenta como intento).
    // 1. 404 desafío ajeno o inexistente (RF-23; principio 5: filtra siempre por userId).
    const initialChallenge = await findChallengeByIdForUser(challengeParam, sessionUserId);
    if (initialChallenge === null) {
      response.status(404).json({ error: RIOT_ERRORS.challengeNotFound });
      return;
    }

    // 2. 409 desafío ya completado (RF-48, D41).
    if (initialChallenge.status === "completed") {
      response.status(409).json({ error: RIOT_ERRORS.challengeCompleted });
      return;
    }

    // 3. 409 operación simultánea del mismo usuario (RF-25, RF-49, D90).
    if (!userLock.tryAcquire(sessionUserId)) {
      response.status(409).json({ error: RIOT_ERRORS.inProgress });
      return;
    }

    try {
      // Releer tras tomar el bloqueo para evitar estado obsoleto si otra operación cerró recién.
      const challenge = await findChallengeByIdForUser(challengeParam, sessionUserId);
      if (challenge === null) {
        response.status(404).json({ error: RIOT_ERRORS.challengeNotFound });
        return;
      }
      if (challenge.status === "completed") {
        response.status(409).json({ error: RIOT_ERRORS.challengeCompleted });
        return;
      }

      const challengeId = challenge._id.toString();

      // 4. 429 límite de 10 confirmaciones contadas (RF-10, D9).
      if (challenge.attempts >= MAX_CONFIRM_ATTEMPTS) {
        if (challenge.status === "open") {
          await cancelChallenge(challengeId, at);
        }
        response.status(429).json({ error: RIOT_ERRORS.tooManyAttempts });
        return;
      }

      // 5. 400 vencido o anulado (RF-9, D15; la vigencia se comprueba solo aquí, D97).
      if (challenge.status === "cancelled" || isChallengeExpired(challenge.expiresAt, at)) {
        response.status(400).json({ error: RIOT_ERRORS.challengeExpired });
        return;
      }

      // 6. 409 otro usuario ya verificó esta cuenta interna de Riot; anula el desafío (RF-24, D91).
      const takenBeforeRiot = await GameAccount.exists({
        gameId: "lol",
        "verification.externalId": challenge.puuid,
        user: { $ne: sessionUserId },
      });
      if (takenBeforeRiot !== null) {
        await cancelChallenge(challengeId, at);
        response.status(409).json({ error: RIOT_ERRORS.verifiedElsewhere });
        return;
      }

      // 7. 503 sin clave de Riot (RF-38).
      if (riot === undefined) {
        response.status(503).json({ error: RIOT_ERRORS.unavailable });
        return;
      }

      // 8. 503 limitador propio sin hueco para reservar 24 consultas (RF-37, D84).
      const reservation = limiter.reserve(RESERVE_CONFIRM);
      if (reservation === null) {
        response.status(503).json({ error: RIOT_ERRORS.busy });
        return;
      }

      // Paso 2: consultando a Riot (confirmación contada a partir de aquí).
      try {
        await incrementChallengeAttempts(challengeId);
        if (!isLolRegion(challenge.region)) {
          throw new Error(`región de desafío inválida: ${challenge.region}`);
        }
        const region = challenge.region;

        const opController = new AbortController();
        const opTimer = setTimeout(() => opController.abort(), operationTimeoutMs);

        try {
          // 9. Consultar Summoner-v4 para comprobar el ícono asignado.
          const summonerOutcome = await riotCall(
            limiter,
            reservation,
            opController.signal,
            (signal) => riot.client.getSummonerByPuuid(challenge.puuid, region, signal),
          );

          // Paso 3 (D104): anulación en paralelo sustituye cualquier resultado del paso 2.
          if (await isChallengeCancelled(challengeId, sessionUserId)) {
            response.status(400).json({ error: RIOT_ERRORS.challengeExpired });
            return;
          }

          // D94: invalid_data aquí significa que `profileIconId` no se pudo leer.
          if (
            summonerOutcome.aborted ||
            summonerOutcome.result.kind === "unavailable" ||
            summonerOutcome.result.kind === "invalid_data"
          ) {
            response.status(503).json({ error: RIOT_ERRORS.unavailable });
            return;
          }

          if (summonerOutcome.result.kind === "not_found") {
            await cancelChallenge(challengeId, at);
            response.status(404).json({ error: RIOT_ERRORS.accountNotFound });
            return;
          }

          const summoner = summonerOutcome.result.summoner;
          if (summoner.profileIconId !== challenge.iconId) {
            response.status(400).json({ error: RIOT_ERRORS.iconMismatch });
            return;
          }

          // 10. Ícono confirmado. Exclusividad antes de leer datos (RF-24, D91).
          const takenAfterIcon = await GameAccount.exists({
            gameId: "lol",
            "verification.externalId": challenge.puuid,
            user: { $ne: sessionUserId },
          });
          if (takenAfterIcon !== null) {
            if (await isChallengeCancelled(challengeId, sessionUserId)) {
              response.status(400).json({ error: RIOT_ERRORS.challengeExpired });
              return;
            }
            await cancelChallenge(challengeId, at);
            response.status(409).json({ error: RIOT_ERRORS.verifiedElsewhere });
            return;
          }

          // 11. Lectura de los datos reales dentro del presupuesto reservado y del plazo de 60 s.
          const readResult = await readRiotAccountData({
            client: riot.client,
            limiter,
            reservation,
            signal: opController.signal,
            puuid: challenge.puuid,
            region,
            fallbackRiotId: challenge.riotId,
            summoner,
            at,
          });

          if (readResult.kind === "account_not_found") {
            if (await isChallengeCancelled(challengeId, sessionUserId)) {
              response.status(400).json({ error: RIOT_ERRORS.challengeExpired });
              return;
            }
            await cancelChallenge(challengeId, at);
            response.status(404).json({ error: RIOT_ERRORS.accountNotFound });
            return;
          }

          // Paso 3 (D104): cierre atómico sobre `status: "open"` antes de verificar.
          const closed = await completeChallenge(challengeId, sessionUserId, at);
          if (closed === null) {
            response.status(400).json({ error: RIOT_ERRORS.challengeExpired });
            return;
          }

          // 13. Estado final de Riot con `applyRiotReading` y bloques pendientes (RF-7, RF-27).
          const reading = applyRiotReading({
            previousRank: null,
            previousHistory: [],
            previousMatches: [],
            previousBaseline: null,
            rankResult: readResult.rankResult,
            matchesResult: readResult.matchesResult,
            isVerification: true,
          });

          const pendingBlocks: PendingBlock[] = [
            ...(readResult.rankResult.ok ? [] : (["rank"] as const)),
            ...(readResult.matchesResult.ok ? [] : (["matches"] as const)),
            ...(readResult.profilePending ? (["profile"] as const) : []),
          ];
          const allBlocksRead = pendingBlocks.length === 0;
          const lastSuccessfulSyncAt = allBlocksRead ? at : null;

          // 14. Verificar cuenta de LoL (con exclusividad y desvinculación + RF-29/D89).
          const verified = await verifyAccount({
            userId: sessionUserId,
            gameId: "lol",
            handle: readResult.handle,
            region,
            verification: { source: "riot", externalId: challenge.puuid },
            riotState: {
              currentRank: reading.currentRank,
              rankHistory: reading.rankHistory,
              matches: reading.matches,
              profile: readResult.profile,
              pendingBlocks,
              lastSuccessfulSyncAt,
              riotLpBaseline: reading.nextBaseline,
            },
            now: at,
          });

          if (!verified.ok) {
            // Carrera en índice único (409) o usuario eliminado (404): revertir cierre a anulado.
            await RiotChallenge.updateOne(
              { _id: challenge._id, status: "completed" },
              { $set: { status: "cancelled" }, $min: { deleteAt: challengeDeleteAt(at) } },
            );
            response.status(verified.status).json({ error: verified.error });
            return;
          }

          // 15. 200 `{ outcome: "verified", account, notice? }` sin `puuid` (RF-7, RF-27, RNF-3).
          const notice = challengeConfirmNotice(pendingBlocks);
          response.status(200).json({
            outcome: "verified",
            account: toGameAccountJson(verified.account),
            ...(notice === undefined ? {} : { notice }),
          });
        } finally {
          clearTimeout(opTimer);
        }
      } finally {
        limiter.release(reservation);
      }
    } finally {
      userLock.release(sessionUserId);
    }
  });

  return router;
}
