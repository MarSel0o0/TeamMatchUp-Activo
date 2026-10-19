// Coincidencias: `GET /api/matches` (spec 005, plan, sección 5).
// Sesión, errores y respuesta. RF-1, RF-3, RF-5, RF-6, RF-12, RF-13, RF-14, RF-15, RF-16,
// RF-18, RNF-2.
// - Controlador fino: lectura de la consulta → lectura de datos → motor → respuesta.
// - Orden de RF-16: sesión (`withExistingUser`, que ya cubre los 401 de la spec 002 y el del
//   usuario eliminado, RF-13) → filtros → usuario todavía existe → cuenta propia (404).
// - Sin `try/catch`: Express 5 envía los rechazos al `errorHandler` (RT-03).
import { Router } from "express";
import { buildMatches } from "../domain/matching.ts";
import { MATCH_ERRORS, parseMatchQuery } from "../domain/matchQuery.ts";
import { loadMatchInputs } from "../services/matchInputs.ts";
import { SESSION_MESSAGES } from "../services/sessionToken.ts";
import type { SessionGuardOptions } from "../utils/middleware.ts";
import { createWithExistingUser } from "../utils/middleware.ts";

export function createMatchesRouter({ jwtSecret, now }: SessionGuardOptions): Router {
  const router = Router();

  router.use(createWithExistingUser({ jwtSecret, now }));

  // RF-18: solo se leen los cinco parámetros del contrato; el resto se ignora.
  router.get("/", async (request, response) => {
    const query = parseMatchQuery(request.query);
    if (!query.ok) {
      response.status(query.status).json({ error: query.error });
      return;
    }
    const inputs = await loadMatchInputs(request.userId ?? "", query.value.gameId);
    if (inputs.kind === "noSession") {
      response.status(401).json({ error: SESSION_MESSAGES.notLoggedIn });
      return;
    }
    if (inputs.kind === "noAccount") {
      response.status(404).json({ error: MATCH_ERRORS.noAccount });
      return;
    }
    response.status(200).json(buildMatches(query.value, inputs.viewer, inputs.candidates));
  });

  return router;
}
