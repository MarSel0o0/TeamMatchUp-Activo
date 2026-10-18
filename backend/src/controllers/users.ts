// Registro: `POST /api/users` (plan §3.5). RF-1..RF-7, RF-16, RF-19, RF-20, RF-21, RF-26.
// - Público (RF-26) y sin sesión: no lee ni escribe cookies ni la cabecera X-CSRF-Token,
//   así que la sesión que el navegador ya tuviera queda igual (RF-20).
// - Los campos del usuario se pasan uno a uno: lo demás del cuerpo se ignora (RF-16) y el
//   color, la biografía y la zona horaria quedan con sus valores por defecto (RF-1).
// - Duplicados: comprobación previa con el correo por delante (RF-3); si dos registros
//   chocan a la vez, el E11000 se traduce repitiendo la misma consulta (RF-21, D7).
//
// Spec 003 (plan §3.1–§3.3): el resto de rutas pasa por la guardia (sesión y segmento
// decodificable, D2), montada después del registro y antes de las rutas `/:id`.
// - `GET /` listado (RF-2, RF-4, RNF-2) y `GET /:id` obtener (RF-3..RF-6, RF-20, RNF-2).
// - `PATCH /:id` actualizar el propio perfil (§3.4: RF-7..RF-10, RF-15..RF-19, RF-21,
//   RF-22, RNF-1): una sola escritura atómica sobre el usuario de la sesión (D4, D9).
// - `GET /:id/availability` leer (§3.6: RF-12, RF-20) y `PUT /:id/availability` reemplazar
//   la propia (§3.7: RF-10, RF-13, RF-14, RF-18, RF-22, RNF-1).
// - `DELETE /:id` eliminar la propia cuenta (§3.5: RF-10, RF-11, RF-22): un único
//   `deleteOne` del usuario de la sesión, que se lleva su disponibilidad (D1), y el borrado
//   de la cookie con los mismos atributos que la emisión (D8 de la 002).
//
// Spec 004 (plan, secciones 6 y 8; T9): RF-12, RF-13, RF-14, RF-29, RF-37, RF-39, RF-44.
// - `GET /:id/games/:gameId` resumen por juego. La guardia usa `withExistingUser` para esta
//   ruta (401 "sesión no iniciada" con la credencial de un usuario eliminado, P-14).
// - `DELETE /:id` borra también las cuentas de juego del usuario, **después** de
//   `User.deleteOne` (P-7): una vinculación intercalada nunca deja una cuenta suya.
import { Router } from "express";
import mongoose from "mongoose";
import { User, toOwnUserJson, toPublicUserJson } from "../models/user.ts";
import type { OwnUserJson, PublicUserJson, UserDocument } from "../models/user.ts";
import { MESSAGES, validateRegistration } from "../services/credentials.ts";
import { hashPassword } from "../services/passwords.ts";
import { validateAvailability } from "../services/availability.ts";
import { validateProfileUpdate } from "../services/profile.ts";
import { SESSION_COOKIE, sessionCookieOptions } from "../services/sessionToken.ts";
import { USER_TARGET_MESSAGES, resolveUserTarget } from "../services/userTarget.ts";
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import { recentMatches, trend, winRate } from "../domain/accountState.ts";
import { isGameId } from "../domain/games.ts";
import type { SimulatedMatch } from "../domain/rankSimulator.ts";
import { GameAccount, toGameAccountJson } from "../models/gameAccount.ts";
import type { GameAccountDocument } from "../models/gameAccount.ts";
import type { NodeEnv } from "../utils/config.ts";
import { createUserRoutesGuard, createWithExistingUser, createWithUser } from "../utils/middleware.ts";

export interface UsersRouterOptions {
  jwtSecret: string;
  nodeEnv: NodeEnv; // atributos de la cookie al eliminar la cuenta (RF-11)
  now: () => number; // segundos Unix
}

type DuplicateMessage = typeof MESSAGES.emailTaken | typeof MESSAGES.usernameTaken;

// RF-3: si se repiten los dos, el del correo. Los dos valores ya vienen normalizados.
export async function duplicateMessage(email: string, key: string): Promise<DuplicateMessage | null> {
  if (await User.exists({ email })) return MESSAGES.emailTaken;
  if (await User.exists({ usernameKey: key })) return MESSAGES.usernameTaken;
  return null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

// Datos propios (con correo) solo si el usuario es el de la sesión (RF-4).
function userJson(user: UserDocument, sessionUserId: string): OwnUserJson | PublicUserJson {
  return user.id === sessionUserId.toLowerCase() ? toOwnUserJson(user) : toPublicUserJson(user);
}

// Resumen por juego (RF-12, RF-37; plan, sección 6): la cuenta (con `simulated`), las 8
// primeras partidas guardadas en el orden de RF-28, la tasa de victorias de esas partidas y
// la tendencia. `matchId` se entrega como `id`; `matches` y `readingNumber` no salen.
function gameSummaryJson(account: GameAccountDocument) {
  const matches: SimulatedMatch[] = account.matches.map(
    ({ matchId, gameId, playedAt, result, summary, durationMinutes, rankDelta }) => ({
      id: matchId,
      gameId,
      playedAt,
      result,
      summary,
      durationMinutes,
      rankDelta,
    }),
  );
  const recent = recentMatches(matches);
  return {
    account: toGameAccountJson(account),
    recentMatches: recent,
    winRate: winRate(recent),
    trend: trend(account.currentRank, account.rankHistory),
  };
}

export function createUsersRouter({ jwtSecret, nodeEnv, now }: UsersRouterOptions): Router {
  const router = Router();
  const cookieOptions = sessionCookieOptions(nodeEnv);
  const withUser = createWithUser({ jwtSecret, now });
  const withExistingUser = createWithExistingUser({ jwtSecret, now });

  router.post("/", async (request, response) => {
    const validation = validateRegistration(request.body);
    if (!validation.ok) {
      // Sin consultar la base (RF-5: las repeticiones se revisan solo con todo válido).
      response.status(400).json({ error: validation.error });
      return;
    }
    const { email, username, usernameKey, password, displayName } = validation.value;

    const duplicate = await duplicateMessage(email, usernameKey);
    if (duplicate !== null) {
      response.status(400).json({ error: duplicate });
      return;
    }

    const passwordHash = await hashPassword(password); // RF-2
    let user;
    try {
      user = await User.create({ email, username, usernameKey, passwordHash, displayName });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        // RF-21: carrera con otro registro; mismo mensaje y prioridad que RF-3, nunca 500.
        const raced = await duplicateMessage(email, usernameKey);
        if (raced !== null) {
          response.status(400).json({ error: raced });
          return;
        }
      }
      throw error; // → errorHandler (500 genérico)
    }

    response.status(201).json(toOwnUserJson(user)); // sin Set-Cookie ni X-CSRF-Token (RF-20)
  });

  // Desde aquí, las rutas de la spec 003: la guardia ya comprobó la sesión (RF-1) y que el
  // segmento se puede decodificar (RF-5). `withUser` no se repite en cada ruta.
  router.use(createUserRoutesGuard({ withUser, withExistingUser }));

  // RF-2: todos, por fecha de creación y, si empatan, por identificador (D10: lista blanca).
  router.get("/", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const users = await User.find().sort({ createdAt: 1, _id: 1 });
    response.status(200).json(users.map((user) => userJson(user, sessionUserId)));
  });

  // RF-20: (2) `me`, (3) formato → 400, (4) existencia → 404. El id va en minúsculas (D7).
  router.get("/:id", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const target = resolveUserTarget(request.params.id, sessionUserId);
    if (!target.ok) {
      response.status(400).json({ error: target.error });
      return;
    }
    const user = await User.findById(target.id);
    if (user === null) {
      response.status(404).json({ error: USER_TARGET_MESSAGES.userNotFound });
      return;
    }
    response.status(200).json(target.own ? toOwnUserJson(user) : toPublicUserJson(user));
  });

  // RF-18: (2) `me`, (3) formato → 400, (4) ajeno → 403 sin consultar la base, (5) cuerpo → 400.
  router.patch("/:id", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const target = resolveUserTarget(request.params.id, sessionUserId);
    if (!target.ok) {
      response.status(400).json({ error: target.error });
      return;
    }
    if (!target.own) {
      response.status(403).json({ error: USER_TARGET_MESSAGES.forbidden }); // RF-10
      return;
    }
    const validation = validateProfileUpdate(request.body); // RF-19: primer error
    if (!validation.ok) {
      response.status(400).json({ error: validation.error });
      return;
    }
    const update = validation.value; // solo las 4 claves validadas y recortadas (RF-9, RF-21)
    // RNF-1: siempre el usuario de la sesión, nunca el id recibido. Sin campos enviados no se
    // escribe (D9); si no, una sola operación atómica sin upsert (D4, RF-22).
    const user =
      Object.keys(update).length === 0
        ? await User.findById(sessionUserId)
        : await User.findOneAndUpdate(
            { _id: sessionUserId },
            { $set: update },
            { returnDocument: "after", runValidators: true, upsert: false },
          );
    if (user === null) {
      // RF-22: la cuenta se borró antes de aplicar la escritura; sin ningún efecto.
      response.status(404).json({ error: USER_TARGET_MESSAGES.userNotFound });
      return;
    }
    response.status(200).json(toOwnUserJson(user));
  });

  // RF-18: (2) `me`, (3) formato → 400, (4) ajeno → 403 sin comprobar si existe.
  router.delete("/:id", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const target = resolveUserTarget(request.params.id, sessionUserId);
    if (!target.ok) {
      response.status(400).json({ error: target.error });
      return;
    }
    if (!target.own) {
      response.status(403).json({ error: USER_TARGET_MESSAGES.forbidden }); // RF-10
      return;
    }
    // RF-11: usuario y disponibilidad en una sola operación (D1). Con `deletedCount` 0 (una
    // segunda eliminación en curso) la respuesta es la misma: idempotente, nunca 500 (RF-22).
    await User.deleteOne({ _id: sessionUserId });
    // Spec 004, RF-14 y RF-39: después del usuario, sus cuentas de juego (P-7).
    await GameAccount.deleteMany({ user: sessionUserId });
    response.clearCookie(SESSION_COOKIE, cookieOptions); // mismos atributos que la emisión
    response.status(204).end();
  });

  // RF-20: (2) `me`, (3) formato → 400, (4) existencia → 404. Cualquiera puede leer la de otro.
  router.get("/:id/availability", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const target = resolveUserTarget(request.params.id, sessionUserId);
    if (!target.ok) {
      response.status(400).json({ error: target.error });
      return;
    }
    const user = await User.findById(target.id, { availability: 1 });
    if (user === null) {
      response.status(404).json({ error: USER_TARGET_MESSAGES.userNotFound });
      return;
    }
    // RF-12: lista directa en el orden guardado; sin el campo, el default de Mongoose (`[]`).
    response.status(200).json([...user.availability]);
  });

  // RF-18: (2) `me`, (3) formato → 400, (4) ajeno → 403 sin consultar la base, (5) cuerpo → 400.
  router.put("/:id/availability", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const target = resolveUserTarget(request.params.id, sessionUserId);
    if (!target.ok) {
      response.status(400).json({ error: target.error });
      return;
    }
    if (!target.own) {
      response.status(403).json({ error: USER_TARGET_MESSAGES.forbidden }); // RF-10
      return;
    }
    const validation = validateAvailability(request.body); // RF-14: primer error; `user` se ignora
    if (!validation.ok) {
      response.status(400).json({ error: validation.error });
      return;
    }
    // RNF-1: siempre el usuario de la sesión. Una sola operación atómica sin upsert (D4, RF-22).
    const user = await User.findOneAndUpdate(
      { _id: sessionUserId },
      { $set: { availability: validation.value } },
      { returnDocument: "after", runValidators: true, upsert: false },
    );
    if (user === null) {
      // RF-22: la cuenta se borró antes de aplicar la escritura; sin ningún efecto.
      response.status(404).json({ error: USER_TARGET_MESSAGES.userNotFound });
      return;
    }
    response.status(200).json([...user.availability]); // RF-13: sin repetidos, orden de primera aparición
  });

  // RF-13, RF-29: (sesión, guardia) → formato del usuario o `me` → juego → usuario existe →
  // cuenta en ese juego. Cualquiera con sesión puede leer el resumen de otro (RF-12).
  router.get("/:id/games/:gameId", async (request, response) => {
    const sessionUserId = request.userId ?? "";
    const target = resolveUserTarget(request.params.id, sessionUserId);
    if (!target.ok) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidId });
      return;
    }
    const { gameId } = request.params;
    if (!isGameId(gameId)) {
      response.status(400).json({ error: ACCOUNT_ERRORS.invalidGame });
      return;
    }
    if ((await User.exists({ _id: target.id })) === null) {
      response.status(404).json({ error: ACCOUNT_ERRORS.userNotFound });
      return;
    }
    const account = await GameAccount.findOne({ user: target.id, gameId });
    if (account === null) {
      response.status(404).json({ error: ACCOUNT_ERRORS.noAccountForGame });
      return;
    }
    response.status(200).json(gameSummaryJson(account));
  });

  return router;
}
