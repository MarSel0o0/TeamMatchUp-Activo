// Rutas de Steam: `/api/steam` (spec 013; plan, secciones 4.1 y 4.2). Todas exigen sesión y el
// comprobante anti-CSRF con `withUser`, como cualquier operación protegida (RNF-6, spec 002): la
// vuelta de Steam no relaja ninguna regla (D3).
// T5: `GET /` (¿está disponible?, RF-22) y `POST /start` (abrir el intento, RF-1, RF-3).
// T6: `POST /complete` (la vuelta de Steam, RF-4 a RF-9, RF-12).
// - Sin Steam configurado (`steam` indefinido) la ruta responde igual: disponible `false` y 503.
// - La clave de Steam no llega aquí: vive solo en el cliente (`steamClient.ts`, RNF-2).
// Spec 015, T4 (plan, §4.3, P15-5, P15-9): tras la confirmación, perfil de Steam y rango Premier de
// Leetify en paralelo; sin cliente de Leetify la lectura es un fallo. RF-1, RF-2, RF-3, RF-15.
import { Router } from "express";
import { ACCOUNT_ERRORS } from "../domain/accountRules.ts";
import { LEETIFY_NOTICES } from "../domain/leetify.ts";
import { SOURCE_NAMES } from "../domain/sources.ts";
import { attemptStatus } from "../domain/steamAttempt.ts";
import {
  STEAM_OPENID_URL,
  buildLoginParams,
  buildReturnTo,
  parseSteamResponse,
} from "../domain/steamOpenId.ts";
import { STEAM_ERRORS, parseCompleteBody } from "../domain/steamRules.ts";
import { GameAccount } from "../models/gameAccount.ts";
import type { LeetifyClient } from "../services/leetifyClient.ts";
import { SOURCE_TIMEOUT_MS, readPremierWithTimeout, readWithTimeout } from "../services/realSources.ts";
import { consumeAttempt, discardAttempt, findAttempt, openAttempt } from "../services/steamAttempts.ts";
import type { AssertionResult, SteamClient } from "../services/steamClient.ts";
import { createSteamSource } from "../services/steamSource.ts";
import { verifyAccount } from "../services/verifyAccount.ts";
import { clock } from "../utils/clock.ts";
import { createWithUser } from "../utils/middleware.ts";

/** Steam configurado en la instancia: su dirección pública y el cliente que habla con Steam. */
export interface SteamIntegration {
  /** Origen con que el navegador abre esta instancia (`PUBLIC_URL`, RNF-4). */
  publicUrl: string;
  client: SteamClient;
}

export interface SteamRouterOptions {
  jwtSecret: string;
  now: () => number; // segundos Unix (reloj de las credenciales)
  steam?: SteamIntegration | undefined;
  /** Plazo de cada consulta a Steam y a Leetify en ms; por defecto 8 s (RNF-5 de la 012, RNF-4). */
  sourceTimeoutMs?: number | undefined;
  /** Spec 015: cliente de Leetify; sin él, toda lectura del rango Premier es un fallo (P15-9). */
  leetify?: LeetifyClient | undefined;
}

// Confirma la respuesta con Steam con plazo (RF-9). Un plazo vencido o cualquier fallo es
// `unavailable`, aunque el cliente ignore la señal de cancelación.
async function confirmWithTimeout(
  client: SteamClient,
  params: Readonly<Record<string, string>>,
  timeoutMs: number,
): Promise<AssertionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expired = new Promise<AssertionResult>((resolve) => {
    controller.signal.addEventListener("abort", () => resolve("unavailable"), { once: true });
  });
  try {
    return await Promise.race([client.verifyAssertion(params, controller.signal), expired]);
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timer);
  }
}

export function createSteamRouter({
  jwtSecret,
  now,
  steam,
  sourceTimeoutMs = SOURCE_TIMEOUT_MS,
  leetify,
}: SteamRouterOptions): Router {
  const router = Router();
  const source = steam === undefined ? undefined : createSteamSource(steam.client);

  router.use(createWithUser({ jwtSecret, now }));

  // RF-22: la interfaz pregunta si ofrecer «Verificar con Steam».
  router.get("/", (_request, response) => {
    response.status(200).json({ available: steam !== undefined });
  });

  // RF-1, RF-3, RF-22, D11: sesión → configurado → sin cuenta de CS2 verificada → abrir el
  // intento (reemplaza el anterior) y devolver la página de inicio de sesión de Steam.
  router.post("/start", async (request, response) => {
    if (steam === undefined) {
      response.status(503).json({ error: STEAM_ERRORS.notConfigured });
      return;
    }
    const sessionUserId = request.userId ?? ""; // el usuario sale de la sesión, nunca del cuerpo
    const verified = await GameAccount.exists({
      user: sessionUserId,
      gameId: "cs2",
      verification: { $exists: true },
    });
    if (verified !== null) {
      response.status(409).json({ error: STEAM_ERRORS.alreadyVerified });
      return;
    }
    const { token } = await openAttempt(sessionUserId, clock.now());
    const returnTo = buildReturnTo(steam.publicUrl, token);
    const params = new URLSearchParams(buildLoginParams(returnTo, steam.publicUrl));
    response.status(200).json({ url: `${STEAM_OPENID_URL}?${params.toString()}` });
  });

  // RF-4 a RF-9, RF-12 (plan, 4.2). Orden: sesión (`withUser`) → configurado → cuerpo →
  // cancelación (RF-5) → intento (existe, es del usuario, vigente) y se consume → respuesta de
  // Steam (validación local) → sin cuenta de CS2 verificada → confirmación con Steam (RF-9) →
  // perfil (si falla, sin perfil: RF-12) y Leetify en paralelo (015, P15-5) → `verifyAccount` de
  // la spec 012 (RF-8).
  router.post("/complete", async (request, response) => {
    if (steam === undefined || source === undefined) {
      response.status(503).json({ error: STEAM_ERRORS.notConfigured });
      return;
    }
    const failed = () => response.status(400).json({ error: STEAM_ERRORS.verificationFailed });
    const sessionUserId = request.userId ?? ""; // nunca un id del cuerpo (constitución, 5)
    const at = clock.now();

    const body = parseCompleteBody(request.body);
    if (!body.ok) {
      failed();
      return;
    }
    const { query } = body;
    const token = query["attempt"];

    // RF-5: sin respuesta de inicio de sesión, cancelación o vuelta vacía. Solo se descarta el
    // intento propio con ese token.
    if (query["openid.mode"] !== "id_res") {
      if (token !== undefined) await discardAttempt(sessionUserId, token);
      response.status(200).json({ outcome: "cancelled" });
      return;
    }

    // RF-6: el intento debe existir, ser de quien vuelve y estar vigente. Uno ajeno no se toca;
    // uno vencido se elimina. Si es válido se consume: de aquí en adelante queda usado (P13-4).
    if (token === undefined) {
      failed();
      return;
    }
    const attempt = await findAttempt(token);
    if (attempt === null) {
      failed();
      return;
    }
    const status = attemptStatus(attempt, sessionUserId, at);
    if (status === "foreign") {
      failed();
      return;
    }
    const consumed = await consumeAttempt(attempt);
    if (status === "expired" || !consumed) {
      failed();
      return;
    }

    // RF-6, RNF-4: la respuesta debe volver a la dirección de esta instancia con este intento y
    // traer firmados los campos de los que depende la identidad.
    const parsed = parseSteamResponse(query, buildReturnTo(steam.publicUrl, token));
    if (parsed.kind !== "assertion") {
      failed();
      return;
    }

    // RF-3, RF-6: quien ya tiene una cuenta de CS2 verificada debe desvincularla antes.
    const alreadyVerified = await GameAccount.exists({
      user: sessionUserId,
      gameId: "cs2",
      verification: { $exists: true },
    });
    if (alreadyVerified !== null) {
      failed();
      return;
    }

    // RF-4, RF-6, RF-9: Steam confirma que la respuesta es auténtica.
    const confirmation = await confirmWithTimeout(steam.client, parsed.params, sourceTimeoutMs);
    if (confirmation === "unavailable") {
      response.status(503).json({ error: ACCOUNT_ERRORS.sourceUnavailable(SOURCE_NAMES.steam) });
      return;
    }
    if (confirmation === "invalid") {
      failed();
      return;
    }

    // RF-10, RF-12: perfil y horas. Si la lectura falla, la cuenta se verifica igual, sin perfil.
    // Spec 015, RF-1, D20, P15-5: el rango Premier de Leetify se lee a la vez y aunque el perfil
    // falle; un fallo de Leetify tampoco impide verificar (RF-15).
    const [read, premier] = await Promise.all([
      readWithTimeout(source, { gameId: "cs2", handle: parsed.steamId, externalId: parsed.steamId }, sourceTimeoutMs),
      readPremierWithTimeout(leetify, parsed.steamId, sourceTimeoutMs),
    ]);
    const real = read.ok ? { ...read.data, handle: parsed.steamId } : { handle: parsed.steamId };

    // RF-4, RF-8, RF-13: spec 012. Sin región: la cuenta propia conserva la suya y una nueva toma
    // la primera del catálogo (plan, P13-7).
    const result = await verifyAccount({
      userId: sessionUserId,
      gameId: "cs2",
      handle: parsed.steamId,
      verification: { source: "steam", externalId: parsed.steamId },
      real,
      premier, // spec 015, RF-3: reemplaza el rango simulado
      now: at,
    });
    if (!result.ok) {
      // 409/404: la lectura de Leetify se descarta sin escribir nada (plan, §4.3).
      response.status(result.status).json({ error: result.error });
      return;
    }
    response.status(200).json({
      outcome: "verified",
      account: result.account,
      ...(premier.kind === "failed" ? { notice: LEETIFY_NOTICES.verifyFailed } : {}), // RF-15
    });
  });

  return router;
}
