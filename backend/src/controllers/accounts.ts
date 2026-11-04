// Cuentas de juego: `/api/accounts` (spec 004, plan, secciones 6, 7 y 8).
// T6: listar (RF-2), obtener (RF-3) y vincular (RF-4..RF-7). RF-1, RF-29, RF-37,
// RF-44, RNF-2, RNF-3.
// T20: listar y obtener ocultan las cuentas sin dueño (RF-14, P-21).
// T7: editar (RF-7, RF-8, RF-22, RF-38, RF-40) y desvincular (RF-9), con propiedad
// (RF-11) en el orden de RF-29.
// T8: resincronizar (RF-10, RF-15, RF-28, RF-42, RF-43, DP-9) con `updateOwnedAccount`:
// propiedad (RF-11), concurrencia optimista con reintento (RF-39) y una sola escritura
// (RF-45).
// - Guardias sin ruta antes de todas las rutas (P-15): (1) `withUser` (pasos 1 a 5
//   de la spec 002; si el usuario ya no existe, 401 "token inválido", RF-44); (2) primer
//   segmento no decodificable → 400 "id con formato inválido", antes de que Express 5
//   empareje `:id` y lance su propio error.
// - El instante de las cuentas se toma una sola vez por petición con `clock.now()` (P-5).
// - Toda escritura usa el usuario de la sesión, nunca un id del cuerpo (constitución, 5).
import { Router } from "express";
import {
  ACCOUNT_ERRORS,
  isValidId,
  parseAccountFilters,
  validateAccountEdit,
  validateLinkPayload,
} from "../domain/accountRules.ts";
import { applySync, initialState } from "../domain/accountState.ts";
import type { AccountState } from "../domain/accountState.ts";
import { canonicalHandle } from "../domain/rankSimulator.ts";
import type { Snapshot } from "../domain/rankSimulator.ts";
import { GameAccount } from "../models/gameAccount.ts";
import type { GameAccountDocument, RankSnapshotFields } from "../models/gameAccount.ts";
import { ownerExists, withExistingOwners } from "../services/accountReads.ts";
import { linkAccount, toMatchRecord, updateOwnedAccount } from "../services/accountWrites.ts";
import { simulatedRankProvider } from "../services/rankProvider.ts";
import { decodeSegment } from "../services/userTarget.ts";
import { clock } from "../utils/clock.ts";
import { MESSAGES } from "../utils/errors.ts";
import { createWithUser } from "../utils/middleware.ts";

// Fotografía guardada → fotografía del dominio (sin `division` si no la tiene).
function toSnapshot(stored: RankSnapshotFields): Snapshot {
  const { tier, division, points, normalized, recordedAt } = stored;
  return division === undefined
    ? { tier, points, normalized, recordedAt }
    : { tier, division, points, normalized, recordedAt };
}

// Estado puro de una cuenta guardada ("estado(account)" del plan, sección 6); `matchId` → `id`.
function toAccountState(account: GameAccountDocument): AccountState {
  return {
    currentRank: toSnapshot(account.currentRank),
    rankHistory: account.rankHistory.map(toSnapshot),
    matches: account.matches.map(({ matchId, gameId, playedAt, result, summary, durationMinutes, rankDelta }) => ({
      id: matchId,
      gameId,
      playedAt,
      result,
      summary,
      durationMinutes,
      rankDelta,
    })),
    readingNumber: account.readingNumber,
    lastSyncedAt: account.lastSyncedAt,
    verified: account.verified,
  };
}

export interface AccountsRouterOptions {
  jwtSecret: string;
  now: () => number; // segundos Unix (reloj de las credenciales)
}

export function createAccountsRouter({ jwtSecret, now }: AccountsRouterOptions): Router {
  const router = Router();

  router.use(createWithUser({ jwtSecret, now }));

  // `request.path` sin decodificar: "/", "/<id>" o "/<id>/...".
  router.use((request, response, next) => {
    const [, rawSegment = ""] = request.path.split("/");
    if (rawSegment !== "" && decodeSegment(rawSegment) === null) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    next();
  });

  // RF-2: sesión → filtros (usuario primero, luego juego). Usuario inexistente → [].
  router.get("/", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    // Parser `simple` de Express 5: un valor repetido llega como arreglo (inválido, RF-2).
    const filters = parseAccountFilters(request.query, sessionUserId);
    if (!filters.ok) {
      response.status(filters.status).json({ error: filters.error });
      return;
    }
    const { userId, gameId } = filters.value;
    const accounts = await GameAccount.find({
      ...(userId === undefined ? {} : { user: userId }),
      ...(gameId === undefined ? {} : { gameId }),
    }).sort({ _id: 1 });
    // RF-14: nunca se muestran cuentas cuyo dueño ya no existe (P-21); el orden se conserva.
    response.status(200).json(await withExistingOwners(accounts));
  });

  // RF-3, RF-14, RF-29: sesión → formato → existencia, también del dueño (obtener no comprueba
  // propiedad).
  router.get("/:id", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    const account = await GameAccount.findById(id);
    if (account === null || !(await ownerExists(account))) {
      response.status(404).json({ error: ACCOUNT_ERRORS.accountNotFound });
      return;
    }
    response.status(200).json(account);
  });

  // RF-4..RF-7, RF-29: sesión → datos (RF-6) → duplicado (RF-5).
  router.post("/", async (request, response) => {
    const at = clock.now();
    const sessionUserId = request.userId ?? "";
    const payload = validateLinkPayload(request.body); // solo juego, identificador y región (RF-7)
    if (!payload.ok) {
      response.status(payload.status).json({ error: payload.error });
      return;
    }
    const data = payload.value;
    if ((await GameAccount.exists({ user: sessionUserId, gameId: data.gameId })) !== null) {
      response.status(400).json({ error: ACCOUNT_ERRORS.duplicate });
      return;
    }
    const reading = simulatedRankProvider.read({
      gameId: data.gameId,
      canonicalHandle: canonicalHandle(data.handle),
      readingNumber: 0,
      now: at,
    });
    const result = await linkAccount(sessionUserId, data, initialState(reading, at));
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    response.status(201).json(result.account);
  });

  // RF-8, RF-22, RF-38, RF-40, RF-29: sesión → formato → existencia → dueño → datos (RF-22,
  // luego RF-38). Solo se leen identificador y región; el juego del cuerpo se ignora (RF-7).
  // No se obtiene ninguna lectura: rango, historial, partidas, número y fecha no cambian.
  router.put("/:id", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    const sessionUserId = request.userId ?? "";
    const body: unknown = request.body;
    const result = await updateOwnedAccount(id, sessionUserId, (account) => {
      const edit = validateAccountEdit(account, body);
      if (!edit.ok) return edit.error;
      if (edit.value.region !== undefined) account.region = edit.value.region;
      return null;
    });
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    response.status(200).json(result.account);
  });

  // RF-9, RF-11, RF-29, RF-39, RF-46: sesión → formato → existencia → dueño. Un solo borrado
  // de la cuenta (con su historial y sus partidas), sin tocar al usuario. Si otra
  // desvinculación se completó entre la lectura y el borrado, `deletedCount` es 0 → 404.
  router.delete("/:id", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    const sessionUserId = request.userId ?? "";
    const account = await GameAccount.findById(id);
    if (account === null) {
      response.status(404).json({ error: ACCOUNT_ERRORS.accountNotFound });
      return;
    }
    if (!account.user.equals(sessionUserId)) {
      response.status(403).json({ error: MESSAGES.forbidden });
      return;
    }
    const deletion = await GameAccount.deleteOne({ _id: account._id, user: sessionUserId });
    if (deletion.deletedCount === 0) {
      response.status(404).json({ error: ACCOUNT_ERRORS.accountNotFound });
      return;
    }
    response.status(204).end();
  });

  // RF-10, RF-29: sesión → formato → existencia → dueño (RF-11). Dentro de
  // `updateOwnedAccount`, así un reintento por `VersionError` relee la cuenta y usa el número
  // siguiente al que dejó la escritura ganadora (RF-39). El cuerpo no se lee.
  router.post("/:id/sync", async (request, response) => {
    const at = clock.now();
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    const sessionUserId = request.userId ?? "";
    const result = await updateOwnedAccount(id, sessionUserId, (account) => {
      const readingNumber = account.readingNumber + 1;
      const reading = simulatedRankProvider.read({
        gameId: account.gameId,
        canonicalHandle: canonicalHandle(account.handle),
        readingNumber,
        now: at,
      });
      const next = applySync(toAccountState(account), reading, readingNumber, at);
      account.currentRank = next.currentRank;
      account.rankHistory = next.rankHistory;
      account.matches = next.matches.map(toMatchRecord);
      account.readingNumber = next.readingNumber;
      account.lastSyncedAt = next.lastSyncedAt;
      account.verified = next.verified;
      return null;
    });
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    response.status(200).json(result.account);
  });

  return router;
}
