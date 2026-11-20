// Composición de Express (spec 001: RF-4, RF-5, RF-7, RF-16, RF-17; spec 002: RF-26;
// spec 004: RF-1; spec 005: RF-1; spec 010: RF-1, RF-2, RF-3).
// No conecta a la base: la conexión vive en src/server.ts. No lee `process.env`: el secreto,
// el entorno y el reloj llegan como opciones (D11), así las pruebas pueden fijarlos.

import { join } from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import type { Express } from "express";
import { createAccountsRouter } from "./controllers/accounts.ts";
import { createAuthRouter } from "./controllers/auth.ts";
import { createMatchesRouter } from "./controllers/matches.ts";
import { createRiotRouter } from "./controllers/riot.ts";
import type { RiotIntegration } from "./controllers/riot.ts";
import { createSessionsRouter } from "./controllers/sessions.ts";
import { createSteamRouter } from "./controllers/steam.ts";
import type { SteamIntegration } from "./controllers/steam.ts";
import { createUsersRouter } from "./controllers/users.ts";
import type { LeetifyClient } from "./services/leetifyClient.ts";
import type { SourceRegistry } from "./services/realSources.ts";
import { createRiotLimiter } from "./services/riotLimiter.ts";
import { createAccountLock } from "./services/accountLock.ts";
import { createRiotUserLock } from "./services/riotUserLock.ts";
import { createSteamSource } from "./services/steamSource.ts";
import type { NodeEnv } from "./utils/config.ts";
import { errorHandler, unknownEndpoint } from "./utils/middleware.ts";

export interface AppOptions {
  jwtSecret: string;
  nodeEnv: NodeEnv;
  now?: () => number; // segundos Unix; por defecto el reloj real
  /** Spec 012 (P12-5): fuentes reales por juego; sin ellas solo hay cuentas simuladas (RF-20). */
  sources?: SourceRegistry;
  /** Plazo de una consulta a una fuente en ms; por defecto 8 s (RNF-5). Lo cambian las pruebas. */
  sourceTimeoutMs?: number;
  /**
   * Spec 013: Steam configurado (dirección pública y cliente; no se llama `steam` para no chocar con
   * `Config.steam`, que lleva la clave, cuando se le pasa la configuración entera). Sin él, `/api/steam` responde que
   * no está disponible (RF-22). Si no hay otra fuente para CS2, Steam es la de las
   * resincronizaciones (RF-14).
   */
  steamIntegration?: SteamIntegration;
  /**
   * Spec 014: Riot Games configurado (cliente y dobles opcionales; no se llama `riot` para no
   * chocar con `Config.riot` al pasar la configuración entera). Sin él, `/api/riot` informa
   * no disponible y las operaciones que consultan a Riot responden 503 (RF-38).
   */
  riotIntegration?: RiotIntegration;
  /** Plazo máximo de una operación completa con Riot en ms; por defecto 60 s (RNF-7). */
  operationTimeoutMs?: number;
  /**
   * Spec 015: cliente de Leetify para el rango Premier de CS2. Sin él (pruebas antiguas), toda
   * lectura es un fallo y nunca hay red (P15-9, RNF-1); `index.ts` siempre lo construye.
   */
  leetifyClient?: LeetifyClient;
  /**
   * Spec 010 (D-1): carpeta de la interfaz compilada. Con ella, la app sirve sus archivos y
   * entrega `index.html` en cualquier GET/HEAD fuera de `/api` (RF-1, RF-2, RF-3). Sin ella,
   * nada cambia: las rutas desconocidas responden 404 JSON. La calcula `index.ts`.
   */
  uiDir?: string;
}

// Reloj real en segundos Unix (el de las credenciales).
function systemNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function createApp(options: AppOptions): Express {
  const {
    jwtSecret,
    nodeEnv,
    now = systemNow,
    sourceTimeoutMs,
    steamIntegration: steam,
    riotIntegration,
    operationTimeoutMs,
    leetifyClient,
    uiDir,
  } = options;
  const riotLimiter = riotIntegration?.limiter ?? createRiotLimiter();
  const riotUserLock = createRiotUserLock();
  const accountLock = createAccountLock(); // spec 015, RF-19: uno por instancia (P15-6)
  const sources: SourceRegistry =
    steam !== undefined && options.sources?.cs2 === undefined
      ? { ...options.sources, cs2: createSteamSource(steam.client) }
      : (options.sources ?? {});
  const app = express();

  // Spec 006 (RF-23, RF-28, P6-1): `/api/sessions` acepta JSON escalar (`strict: false`) para
  // que `requireObjectBody` distinga `null` y los primitivos de "sin cuerpo". Va ANTES del
  // parser global: este sale sin leer si el cuerpo ya se consumió, así que no hay doble
  // lectura y el resto de rutas no cambia. El mismo límite mantiene el 413 igual (D6-1).
  app.use("/api/sessions", express.json({ limit: 102_400, strict: false }));

  // El cuerpo se interpreta antes de buscar la ruta: 400/413/415 ganan sobre 404.
  // Límite de 102 400 bytes exactos (RF-16 de la 001); `strict` rechaza JSON escalar o null.
  app.use(express.json({ limit: 102_400, strict: true }));

  // Cookies sin secreto (la credencial ya va firmada, D13): `request.cookies` para `withUser`.
  app.use(cookieParser());

  // Registro público (002-RF-26); el resto de rutas de usuario, protegidas (003-RF-1).
  app.use("/api/users", createUsersRouter({ jwtSecret, nodeEnv, now }));
  app.use("/api/auth", createAuthRouter({ jwtSecret, nodeEnv, now })); // login y logout públicos; me protegida (RF-26)
  // Spec 004: todas con sesión (RF-1). Spec 012: fuentes reales para resincronizar (RF-15).
  // Spec 014: resincronización dedicada con Riot (RF-51, RF-53, P14-3) y anulación de desafíos (RF-29).
  app.use(
    "/api/accounts",
    createAccountsRouter({
      jwtSecret,
      now,
      sources,
      sourceTimeoutMs,
      riotIntegration,
      riotLimiter,
      riotUserLock,
      operationTimeoutMs,
      steamIntegration: steam, // spec 015: CS2 verificada con Steam y Leetify (§4.2)
      leetify: leetifyClient,
      accountLock,
    }),
  );

  // Spec 013: con sesión (RNF-6). Spec 015: Leetify al verificar (RF-1, RF-3, RF-15).
  app.use("/api/steam", createSteamRouter({ jwtSecret, now, steam, sourceTimeoutMs, leetify: leetifyClient }));
  // Spec 014: verificación de LoL por ícono de invocador; todas las rutas exigen sesión.
  app.use(
    "/api/riot",
    createRiotRouter({
      jwtSecret,
      now,
      riot: riotIntegration,
      limiter: riotLimiter,
      userLock: riotUserLock,
      operationTimeoutMs,
    }),
  );
  app.use("/api/matches", createMatchesRouter({ jwtSecret, now })); // spec 005: con sesión (RF-1)
  app.use("/api/sessions", createSessionsRouter({ jwtSecret, now })); // spec 006: con sesión (RF-1)

  // Spec 010 (plan §2): la interfaz va DESPUÉS de la API, así ningún archivo tapa una ruta de
  // `/api` (RF-3). `/api` y `/api/...` no entran al fallback y llegan a `unknownEndpoint`; los
  // métodos que no son GET/HEAD tampoco (`app.get` atiende HEAD). Un fallo de `sendFile` va a
  // `errorHandler`.
  if (uiDir !== undefined) {
    const indexHtml = join(uiDir, "index.html");
    app.use(express.static(uiDir));
    app.get(/^\/(?!api(\/|$)).*/, (_request, response, next) => {
      response.sendFile(indexHtml, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(unknownEndpoint);
  app.use(errorHandler); // siempre el último

  return app;
}
