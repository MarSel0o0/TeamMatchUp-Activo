// Composición de Express (spec 001: RF-4, RF-5, RF-7, RF-16, RF-17; spec 002: RF-26;
// spec 004: RF-1; spec 005: RF-1).
// No conecta a la base: la conexión vive en src/server.ts. No lee `process.env`: el secreto,
// el entorno y el reloj llegan como opciones (D11), así las pruebas pueden fijarlos.

import { join } from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import type { Express } from "express";
import { createAccountsRouter } from "./controllers/accounts.ts";
import { createAuthRouter } from "./controllers/auth.ts";
import { createMatchesRouter } from "./controllers/matches.ts";
import { createSessionsRouter } from "./controllers/sessions.ts";
import { createUsersRouter } from "./controllers/users.ts";
import type { SourceRegistry } from "./services/realSources.ts";
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
   * Spec 010 (RF-1, RF-2): carpeta absoluta con la interfaz compilada. Si se da, el mismo
   * servidor la entrega; sin ella (desarrollo y prueba) solo responde la API.
   */
  frontendDir?: string;
}

// Reloj real en segundos Unix (el de las credenciales).
function systemNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function createApp(options: AppOptions): Express {
  const { jwtSecret, nodeEnv, now = systemNow, sources = {}, sourceTimeoutMs, frontendDir } = options;
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
  app.use("/api/accounts", createAccountsRouter({ jwtSecret, now, sources, sourceTimeoutMs }));

  app.use("/api/matches", createMatchesRouter({ jwtSecret, now })); // spec 005: con sesión (RF-1)
  app.use("/api/sessions", createSessionsRouter({ jwtSecret, now })); // spec 006: con sesión (RF-1)

  // Spec 010: interfaz compilada, después de la API para que una ruta /api inexistente siga
  // respondiendo 404 en JSON (RF-3). Cualquier GET/HEAD fuera de /api que no sea un archivo
  // entrega index.html, así recargar una ruta de la interfaz carga la aplicación (RF-2).
  // Middleware y no `app.get("*")`: en Express 5 el comodín `*` ya no es válido.
  if (frontendDir !== undefined) {
    app.use(express.static(frontendDir));
    app.use((request, response, next) => {
      const isRead = request.method === "GET" || request.method === "HEAD";
      if (isRead && request.path !== "/api" && !request.path.startsWith("/api/")) {
        response.sendFile(join(frontendDir, "index.html"));
      } else {
        next();
      }
    });
  }

  app.use(unknownEndpoint);
  app.use(errorHandler); // siempre el último

  return app;
}
