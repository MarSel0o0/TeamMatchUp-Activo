// Composición de Express (spec 001: RF-4, RF-5, RF-7, RF-16, RF-17; spec 002: RF-26;
// spec 004: RF-1; spec 005: RF-1).
// No conecta a la base: la conexión vive en src/server.ts. No lee `process.env`: el secreto,
// el entorno y el reloj llegan como opciones (D11), así las pruebas pueden fijarlos.

import cookieParser from "cookie-parser";
import express from "express";
import type { Express } from "express";
import { createAccountsRouter } from "./controllers/accounts.ts";
import { createAuthRouter } from "./controllers/auth.ts";
import { createMatchesRouter } from "./controllers/matches.ts";
import { createSessionsRouter } from "./controllers/sessions.ts";
import { createUsersRouter } from "./controllers/users.ts";
import type { NodeEnv } from "./utils/config.ts";
import { errorHandler, unknownEndpoint } from "./utils/middleware.ts";

export interface AppOptions {
  jwtSecret: string;
  nodeEnv: NodeEnv;
  now?: () => number; // segundos Unix; por defecto el reloj real
}

// Reloj real en segundos Unix (el de las credenciales).
function systemNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function createApp(options: AppOptions): Express {
  const { jwtSecret, nodeEnv, now = systemNow } = options;
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
  app.use("/api/accounts", createAccountsRouter({ jwtSecret, now })); // spec 004: todas con sesión (RF-1)

  app.use("/api/matches", createMatchesRouter({ jwtSecret, now })); // spec 005: con sesión (RF-1)
  app.use("/api/sessions", createSessionsRouter({ jwtSecret, now })); // spec 006: con sesión (RF-1)

  app.use(unknownEndpoint);
  app.use(errorHandler); // siempre el último

  return app;
}
