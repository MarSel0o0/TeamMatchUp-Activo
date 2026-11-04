// Agenda de sesiones de juego: `/api/sessions` (spec 006, plan, sección 5).
// T5: listar (RF-1, RF-2, RF-22) y obtener (RF-3, RF-4, RF-19, RF-24, RNF-1).
// T6: crear (RF-5, RF-6, RF-15, RF-20, RF-21, RF-27, RF-28, RNF-2).
// T7: editar y cancelar (RF-7 a RF-10, RF-19, RF-20, RF-24, RF-26).
// T8: sumarse y salir (RF-11 a RF-14, RF-17, RF-19, RF-20, RF-21, RF-24, DP6-38, DP6-39).
// Capas del router, en este orden (RF-20), con `router.use` y sin ruta, como `accounts.ts`:
// (1) paso del cuerpo: `requireObjectBody` solo al crear (`POST /`) y editar (`PUT /:id`), antes
//     de la sesión (RF-28); el resto de operaciones no mira el cuerpo (RF-15). El JSON mal
//     formado ya lo rechazó el parser de `createApp` (RF-23);
// (2) sesión: `createWithUser` (los tres 401 de la 002 y el del usuario eliminado, "token
//     inválido", RF-1, RF-18, DP6-39), sin guardia propia, como `matches.ts`;
// (3) segmento decodificable (P6-11): `%zz` → 400 "id con formato inválido" antes de que Express
//     5 empareje `:id` (si no, llegaría al `errorHandler` como 500);
// (4) las rutas, con `request.userId ?? ""`.
// Sin `try/catch`: Express 5 envía los rechazos al `errorHandler` (RT-03).
import { Router } from "express";
import type { RequestHandler } from "express";
import { isValidId } from "../domain/accountRules.ts";
import { isGameId } from "../domain/games.ts";
import type { GameId } from "../domain/games.ts";
import {
  SESSION_ERRORS,
  parseGameFilter,
  validateCreatePayload,
  validateSessionEdit,
} from "../domain/sessionRules.ts";
import { applyEdit, applyLeave, newSession } from "../domain/sessionState.ts";
import { GameAccount } from "../models/gameAccount.ts";
import { listSessionViews, loadSessionView } from "../services/sessionReads.ts";
import { SESSION_MESSAGES } from "../services/sessionToken.ts";
import { cancelSession, createSession, joinSession, mutateSession } from "../services/sessionWrites.ts";
import { decodeSegment } from "../services/userTarget.ts";
import { clock } from "../utils/clock.ts";
import { createWithUser, requireObjectBody } from "../utils/middleware.ts";
import type { SessionGuardOptions } from "../utils/middleware.ts";

// `PUT` de un solo segmento (`/:id`), sobre la ruta sin decodificar.
const SINGLE_SEGMENT = /^\/[^/]+\/?$/;

// Capa 1: el cuerpo solo se exige objeto al crear y al editar.
const bodyStep: RequestHandler = (request, response, next) => {
  const takesBody =
    (request.method === "POST" && request.path === "/") ||
    (request.method === "PUT" && SINGLE_SEGMENT.test(request.path));
  if (takesBody) {
    requireObjectBody(request, response, next);
    return;
  }
  next();
};

// Capa 3: `request.path` sin decodificar: "/", "/<id>" o "/<id>/...".
const decodableSegment: RequestHandler = (request, response, next) => {
  const [, rawSegment = ""] = request.path.split("/");
  if (rawSegment !== "" && decodeSegment(rawSegment) === null) {
    response.status(400).json({ error: SESSION_ERRORS.badId });
    return;
  }
  next();
};

export function createSessionsRouter({ jwtSecret, now }: SessionGuardOptions): Router {
  const router = Router();

  router.use(bodyStep);
  router.use(createWithUser({ jwtSecret, now }));
  router.use(decodableSegment);

  // RF-2, RF-22 (RF-20: sesión → filtro). Las demás claves de la consulta no se leen.
  router.get("/", async (request, response) => {
    const filter = parseGameFilter(request.query);
    if (!filter.ok) {
      response.status(filter.status).json({ error: filter.error });
      return;
    }
    response.status(200).json(await listSessionViews(filter.value));
  });

  // RF-3, RF-4, RF-19, RF-24 (RF-20: sesión → formato → existencia, también del anfitrión).
  router.get("/:id", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: SESSION_ERRORS.badId });
      return;
    }
    const view = await loadSessionView(id);
    if (view === null) {
      response.status(404).json({ error: SESSION_ERRORS.notFound });
      return;
    }
    response.status(200).json(view);
  });

  // RF-5, RF-6, RF-27 (RF-20: cuerpo → sesión → juego → cuenta → resto). El anfitrión sale solo de
  // la sesión (RF-21); `validateCreatePayload` devuelve únicamente los siete campos (RF-15).
  router.post("/", async (request, response) => {
    const userId = request.userId ?? "";
    const at = clock.now(); // una sola vez por petición
    const linkedGames = new Set<GameId>(
      (await GameAccount.distinct("gameId", { user: userId })).filter(isGameId),
    );
    const input = validateCreatePayload(request.body, linkedGames);
    if (!input.ok) {
      response.status(input.status).json({ error: input.error });
      return;
    }
    const created = await createSession(newSession(input.value, userId, at));
    if (!created.ok) {
      // El usuario se eliminó entretanto: no queda sesión y la credencial ya no vale (DP6-39).
      response.status(created.status).json({ error: SESSION_MESSAGES.invalidToken });
      return;
    }
    const view = await loadSessionView(created.id);
    if (view === null) {
      // El anfitrión desapareció entre guardar y leer (cascada): misma respuesta que la compensación.
      response.status(401).json({ error: SESSION_MESSAGES.invalidToken });
      return;
    }
    response.status(201).json(view);
  });

  // RF-7, RF-8, RF-10, RF-26 (RF-20: cuerpo -> sesión -> formato -> existencia -> anfitrión -> datos
  // -> RF-8). Los datos se validan ya, pero `applyEdit` los informa solo tras el 403 del anfitrión.
  router.put("/:id", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: SESSION_ERRORS.badId });
      return;
    }
    const userId = request.userId ?? "";
    const patch = validateSessionEdit(request.body);
    const result = await mutateSession(id, (session) => applyEdit(session, userId, patch), {
      requireHost: true,
    });
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    const view = await loadSessionView(id);
    if (view === null) {
      // La sesión se canceló o su anfitrión se eliminó entre guardar y leer.
      response.status(404).json({ error: SESSION_ERRORS.notFound });
      return;
    }
    response.status(200).json(view);
  });

  // RF-9, RF-10 (RF-20: cuerpo -> sesión -> formato -> existencia -> anfitrión). El cuerpo se ignora.
  router.delete("/:id", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: SESSION_ERRORS.badId });
      return;
    }
    const result = await cancelSession(id, request.userId ?? "");
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    response.status(204).end();
  });

  // RF-11, RF-12 (RF-20: sesión -> formato -> existencia, también del anfitrión -> RF-12). El cuerpo se
  // ignora (RF-15); quien se suma sale solo de `request.userId` (RF-21).
  router.post("/:id/join", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: SESSION_ERRORS.badId });
      return;
    }
    const result = await joinSession(id, request.userId ?? "");
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    const view = await loadSessionView(id);
    if (view === null) {
      // La sesión se canceló o su anfitrión se eliminó entre guardar y leer.
      response.status(404).json({ error: SESSION_ERRORS.notFound });
      return;
    }
    response.status(200).json(view);
  });

  // RF-13, RF-14, RF-17 (RF-20: sesión -> formato -> existencia, también del anfitrión -> RF-14 -> RF-17).
  // El cuerpo se ignora (RF-15).
  router.post("/:id/leave", async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      response.status(400).json({ error: SESSION_ERRORS.badId });
      return;
    }
    const userId = request.userId ?? "";
    const result = await mutateSession(id, (session) => applyLeave(session, userId), { requireHost: true });
    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }
    const view = await loadSessionView(id);
    if (view === null) {
      response.status(404).json({ error: SESSION_ERRORS.notFound });
      return;
    }
    response.status(200).json(view);
  });

  return router;
}
