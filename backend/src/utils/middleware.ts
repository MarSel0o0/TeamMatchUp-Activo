// Middlewares de Express: ruta desconocida (RF-4) y manejador de errores
// (RF-5, RF-6, RF-7, RF-16, RF-17) de la spec 001, `withUser` de la spec 002 y la guardia
// de las rutas de usuario de la spec 003.

import type { RequestHandler } from "express";
import { User } from "../models/user.ts";
import { CSRF_HEADER, SESSION_COOKIE, SESSION_MESSAGES, checkSession } from "../services/sessionToken.ts";
import { USER_TARGET_MESSAGES, decodeSegment, matchUserRoute, resolveUserTarget } from "../services/userTarget.ts";
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import { MESSAGES, mapErrorToResponse } from "./errors.ts";
import { logger } from "./logger.ts";
import type { Logger } from "./logger.ts";

// Interfaz mínima a la que `Response` de Express es asignable sin conversiones (D9).
export interface JsonResponder {
  headersSent: boolean;
  status(code: number): JsonResponder;
  json(body: unknown): unknown;
}

export type ErrorNext = (error: unknown) => void;

// `response.json` fija el tipo de contenido JSON; en HEAD Node descarta el cuerpo (RF-7).
export function unknownEndpoint(_request: unknown, response: JsonResponder): void {
  response.status(404).json({ error: MESSAGES.unknownEndpoint });
}

export function createErrorHandler(log: Pick<Logger, "error">) {
  return function errorHandler(
    error: unknown,
    _request: unknown,
    response: JsonResponder,
    next: ErrorNext,
  ): void {
    // Si ya se empezó a enviar, no se puede reescribir: Express cierra la conexión (RF-7).
    if (response.headersSent) {
      next(error);
      return;
    }
    const { status, error: message } = mapErrorToResponse(error);
    // El detalle solo llega al registro del servidor, nunca al cliente (RF-6).
    if (status === 500) log.error("error no previsto:", error);
    response.status(status).json({ error: message });
  };
}

export const errorHandler = createErrorHandler(logger);

// Operaciones protegidas (spec 002, plan §3.3): RF-10, RF-11, RF-12, RF-15, RF-22, RF-23, RF-24.
// - La credencial solo se lee de la cookie `token` (RF-23): `Authorization` y el cuerpo no
//   se miran nunca. El comprobante solo de la cabecera `X-CSRF-Token`.
// - Pasos 1 a 4 de RF-24 en `checkSession` (puro, con "ahora" inyectado); aquí el paso 5:
//   el usuario debe existir (RF-22). Los fallos responden 401 aquí, sin `errorHandler` (D4).
// - Spec 004 (RF-44, DP-37): el paso 5 responde siempre 401 "token inválido" (sin variantes
//   configurables): lo usan las rutas de la 002, la 003, la 004 y la 005.
export interface SessionGuardOptions {
  jwtSecret: string;
  now: () => number; // segundos Unix
}

export function createWithUser({ jwtSecret, now }: SessionGuardOptions): RequestHandler {
  return async function withUser(request, response, next): Promise<void> {
    // `request.cookies` viene tipado con `any` por cookie-parser: se pasa por `unknown` (§1.2, D13).
    const cookies: unknown = request.cookies;
    const cookie: unknown =
      typeof cookies === "object" && cookies !== null ? Reflect.get(cookies, SESSION_COOKIE) : undefined;
    const check = checkSession({
      cookie,
      csrfHeader: request.get(CSRF_HEADER),
      secret: jwtSecret,
      nowSeconds: now(),
    });
    if (!check.ok) {
      response.status(401).json({ error: check.error });
      return;
    }
    // (5) El identificador ya tiene formato de ObjectId (paso 4, D16): no hay CastError.
    if ((await User.exists({ _id: check.userId })) === null) {
      response.status(401).json({ error: SESSION_MESSAGES.invalidToken });
      return;
    }
    request.userId = check.userId; // RF-15: identidad solo desde la credencial
    next();
  };
}

// Guardia de las rutas de usuario (spec 003, plan §3.1, D2): RF-1, RF-5, RF-6, RF-18, RF-20.
// Se monta sin ruta (`router.use`) antes de las rutas `/:id`, porque Express 5 decodifica
// `:id` al emparejar y con `%zz` respondería su propio 400 antes de comprobar la sesión.
// - Rutas fuera de la tabla de la 003 (registro, 404 de la 001): siguen sin sesión.
// - (1) sesión con `withUser` (401 de 002-RF-24); (3) segmento no decodificable → 400.
// - Spec 004 (plan, sección 6, P-14, P-15): el resumen `/:id/games/:gameId` usa el mismo
//   `withUser` (RF-44: la credencial de un usuario eliminado responde 401 "token inválido")
//   y comprueba los dos segmentos en el orden de RF-13: usuario no decodificable (o, si el
//   juego tampoco lo es, sin formato válido) → 400 "id con formato inválido"; juego no
//   decodificable → 400 "juego no válido".
// Los 400/413/415 de interpretación del cuerpo ya ocurrieron antes, en `express.json`.
export interface UserRoutesGuardOptions {
  withUser: RequestHandler;
}

export function createUserRoutesGuard({ withUser }: UserRoutesGuardOptions): RequestHandler {
  return function userRoutesGuard(request, response, next) {
    const route = matchUserRoute(request.method, request.path);
    if (route === null) {
      next();
      return;
    }
    if (route.kind === "games") {
      return withUser(request, response, () => {
        const decodedUser = decodeSegment(route.rawSegment);
        if (decodedUser === null) {
          response.status(400).json({ error: USER_TARGET_MESSAGES.invalidId });
          return;
        }
        if (decodeSegment(route.rawGame) === null) {
          // RF-13: el formato del usuario se revisa antes que el juego.
          const target = resolveUserTarget(decodedUser, request.userId ?? "");
          const error = target.ok ? ACCOUNT_ERRORS.invalidGame : USER_TARGET_MESSAGES.invalidId;
          response.status(400).json({ error });
          return;
        }
        next();
      });
    }
    return withUser(request, response, () => {
      if (route.kind !== "list" && decodeSegment(route.rawSegment) === null) {
        response.status(400).json({ error: USER_TARGET_MESSAGES.invalidId });
        return;
      }
      next();
    });
  };
}
