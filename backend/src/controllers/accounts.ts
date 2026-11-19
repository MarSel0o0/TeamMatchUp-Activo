// Cuentas de juego: `/api/accounts` (spec 004, plan, secciones 6, 7 y 8).
// T6: listar (RF-2), obtener (RF-3) y vincular (RF-4..RF-7). RF-1, RF-29, RF-37,
// RF-44, RNF-2, RNF-3.
// T20: listar y obtener ocultan las cuentas sin dueño (RF-14, P-21).
// T7: editar (RF-7, RF-8, RF-22, RF-38, RF-40) y desvincular (RF-9), con propiedad
// (RF-11) en el orden de RF-29.
// T8: resincronizar (RF-10, RF-15, RF-28, RF-42, RF-43, DP-9) con `updateOwnedAccount`:
// propiedad (RF-11), concurrencia optimista con reintento (RF-39) y una sola escritura
// (RF-45).
// Spec 012, T6: resincronizar una cuenta verificada consulta su fuente real (RF-15) con la
// espera mínima (RF-16), sin cambiar nada si la fuente falla (RF-19, RF-21); la cuenta sin
// verificar sigue como en la 004 (RF-18).
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
import { SOURCE_NAMES } from "../domain/sources.ts";
import { syncCooldown } from "../domain/syncCooldown.ts";
import { applyRealSync } from "../domain/verification.ts";
import type { RealData } from "../domain/verification.ts";
import { canonicalHandle } from "../domain/rankSimulator.ts";
import { GameAccount } from "../models/gameAccount.ts";
import type { GameAccountDocument } from "../models/gameAccount.ts";
import { isVerifiedByOtherUser, ownerExists, withExistingOwners } from "../services/accountReads.ts";
import { linkAccount, toAccountState, toMatchRecord, updateOwnedAccount } from "../services/accountWrites.ts";
import { simulatedRankProvider } from "../services/rankProvider.ts";
import { SOURCE_TIMEOUT_MS, readWithTimeout } from "../services/realSources.ts";
import type { SourceRegistry } from "../services/realSources.ts";
import { decodeSegment } from "../services/userTarget.ts";
import { clock } from "../utils/clock.ts";
import { MESSAGES } from "../utils/errors.ts";
import { createWithUser } from "../utils/middleware.ts";

// Aplica una lectura real a la cuenta en memoria (spec 012, RF-9, RF-15). Rango, historial y
// partidas por `applyRealSync`; el identificador visible y el perfil, tal como los entrega la
// fuente (`handleKey` lo recalcula `pre("validate")`).
function applyReal(account: GameAccountDocument, data: RealData, at: Date): void {
  const next = applyRealSync(toAccountState(account), data, at);
  account.currentRank = next.currentRank;
  account.rankHistory = next.rankHistory;
  account.matches = next.matches.map(toMatchRecord);
  account.lastSyncedAt = next.lastSyncedAt;
  if (data.handle !== "") account.handle = data.handle;
  if (data.profile !== undefined) account.profile = data.profile;
}

export interface AccountsRouterOptions {
  jwtSecret: string;
  now: () => number; // segundos Unix (reloj de las credenciales)
  sources?: SourceRegistry; // spec 012: sin ellas, las cuentas verificadas no se pueden resincronizar
  sourceTimeoutMs?: number | undefined;
}

export function createAccountsRouter({
  jwtSecret,
  now,
  sources = {},
  sourceTimeoutMs = SOURCE_TIMEOUT_MS,
}: AccountsRouterOptions): Router {
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
    // Spec 012, RF-12: un identificador que otro usuario ya verificó no se puede vincular.
    if (await isVerifiedByOtherUser(sessionUserId, data.gameId, data.handle)) {
      response.status(409).json({ error: ACCOUNT_ERRORS.verifiedElsewhere });
      return;
    }
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
  // Spec 012: una cuenta verificada sigue otro camino (RF-15): espera mínima → fuente real.
  router.post("/:id/sync", async (request, response) => {
    const at = clock.now();
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    const sessionUserId = request.userId ?? "";

    // Lectura ligera solo para elegir el camino (proyección, sin hidratar el documento).
    // Existencia y propiedad en el mismo orden de `updateOwnedAccount`, que las vuelve a
    // comprobar al escribir.
    const current = await GameAccount.findOne(
      { _id: id },
      { user: 1, gameId: 1, handle: 1, lastSyncedAt: 1, verification: 1, profile: 1 },
    ).lean();
    if (current === null) {
      response.status(404).json({ error: ACCOUNT_ERRORS.accountNotFound });
      return;
    }
    if (!current.user.equals(sessionUserId)) {
      response.status(403).json({ error: MESSAGES.forbidden });
      return;
    }

    const verification = current.verification;
    if (verification === undefined || verification === null) {
      // RF-18: cuenta sin verificar, lectura simulada como en la spec 004 y sin espera.
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
        return null;
      });
      if (!result.ok) {
        response.status(result.status).json({ error: result.error });
        return;
      }
      response.status(200).json(result.account);
      return;
    }

    // RF-16: la espera mínima va antes de consultar la fuente y no la consulta. Spec 013, RF-12 y
    // D6: una cuenta verificada sin datos de perfil no tiene una lectura que cuente, así que
    // puede resincronizar de inmediato (también tras intentos que fallaron).
    const hasProfile = current.profile !== undefined && current.profile !== null;
    const cooldown = syncCooldown(hasProfile ? current.lastSyncedAt : null, at);
    if (!cooldown.allowed) {
      response.status(429).json({ error: ACCOUNT_ERRORS.syncCooldown(cooldown.minutes) });
      return;
    }

    // RF-19, RF-20: sin fuente registrada, o registrada para otra, no hay a quién preguntar.
    const sourceName = SOURCE_NAMES[verification.source];
    const source = sources[current.gameId];
    if (source === undefined || source.id !== verification.source) {
      response.status(503).json({ error: ACCOUNT_ERRORS.sourceUnavailable(sourceName) });
      return;
    }
    const read = await readWithTimeout(
      source,
      { gameId: current.gameId, handle: current.handle, externalId: verification.externalId },
      sourceTimeoutMs,
    );
    if (!read.ok) {
      // RF-19 / RF-21: la cuenta y `lastSyncedAt` no se tocan.
      if (read.reason === "gone") {
        response.status(404).json({ error: ACCOUNT_ERRORS.sourceAccountGone(sourceName) });
      } else {
        response.status(503).json({ error: ACCOUNT_ERRORS.sourceUnavailable(sourceName) });
      }
      return;
    }

    // Una sola escritura sobre la cuenta releída (RF-45 de la 004). Si entretanto se desvinculó
    // y se vinculó otra sin verificar, o con otra identidad real, el resultado ya no le
    // corresponde: no se aplica y responde 404.
    let stale = false;
    const result = await updateOwnedAccount(id, sessionUserId, (account) => {
      if (account.verification?.externalId !== verification.externalId) {
        stale = true;
        return null;
      }
      applyReal(account, read.data, at);
      return null;
    });
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    if (stale) {
      response.status(404).json({ error: ACCOUNT_ERRORS.accountNotFound });
      return;
    }
    response.status(200).json(result.account);
  });

  return router;
}
