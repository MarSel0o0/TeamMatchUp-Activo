// Middlewares finales de Express: ruta desconocida (RF-4) y manejador de errores
// (RF-5, RF-6, RF-7, RF-16, RF-17).

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
