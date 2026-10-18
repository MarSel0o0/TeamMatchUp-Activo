// Middlewares de Express: ruta desconocida (RF-4) y manejador de errores
// (RF-5, RF-6, RF-7, RF-16, RF-17) de la spec 001, `withUser` de la spec 002 y la guardia
// de las rutas de usuario de la spec 003.

import type { RequestHandler } from "express";
import { User } from "../models/user.ts";
import { CSRF_HEADER, SESSION_COOKIE, SESSION_MESSAGES, checkSession } from "../services/sessionToken.ts";
import { USER_TARGET_MESSAGES, decodeSegment, matchUserRoute } from "../services/userTarget.ts";
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
export interface WithUserOptions {
  jwtSecret: string;
  now: () => number; // segundos Unix
}

export function createWithUser({ jwtSecret, now }: WithUserOptions): RequestHandler {
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
    return withUser(request, response, () => {
      if (route.kind !== "list" && decodeSegment(route.rawSegment) === null) {
        response.status(400).json({ error: USER_TARGET_MESSAGES.invalidId });
        return;
      }
      next();
    });
  };
}
