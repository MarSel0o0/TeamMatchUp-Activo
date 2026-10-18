// Arranque del servidor (plan §2.3 y §3.6): validar ya ocurrió en `loadConfig`; aquí se
// conecta a la base y solo después se escucha (RF-14). La conexión no vive en `app.ts` (D3).
import http from "node:http";
import type { RequestListener } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { User } from "./models/user.ts";
import type { Config, DatabaseConfig } from "./utils/config.ts";
import type { Logger } from "./utils/logger.ts";

// RF-13: plazo del controlador para encontrar el servidor de la base (D5).
export const DB_CONNECT_TIMEOUT_MS = 10_000;

// Error de arranque con un mensaje ya apto para mostrarse (en español, sin URI de la base).
// Sin propiedades de parámetro para respetar `erasableSyntaxOnly`.
export class StartupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StartupError";
  }
}

// RF-18: dirección real de escucha como URL. Las IPv6 van entre corchetes.
export function describeListenAddress(address: AddressInfo | string | null): string {
  if (address === null) return "dirección desconocida";
  if (typeof address === "string") return address;
  const host = address.address.includes(":") ? `[${address.address}]` : address.address;
  return `http://${host}:${address.port}`;
}

// RF-12: dirección (o todas las interfaces) y puerto que no se pudieron usar.
export function listenFailureMessage(
  host: string | null,
  port: number,
  code: string | undefined,
): string {
  const where = host === null ? "todas las interfaces" : host;
  const suffix = code === undefined ? "" : ` (${code})`;
  return `no se pudo escuchar en ${where}, puerto ${port}${suffix}`;
}

// D3, D5: el propio `connect` rechaza al vencer el plazo, sin reintentos de fondo.
export async function connectDatabase(db: DatabaseConfig): Promise<void> {
  await mongoose.connect(db.uri, { dbName: db.name, serverSelectionTimeoutMS: DB_CONNECT_TIMEOUT_MS });
}

// Spec 002, RF-21 (D14): los índices únicos de `email` y `usernameKey` existen antes de
// aceptar la primera petición, sin depender del `autoIndex` en segundo plano.
export async function prepareDatabase(): Promise<void> {
  await User.init();
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

// D4: eventos `listening` / `error` de Node envueltos en una promesa (RF-10, RF-12).
export function listen(app: RequestListener, port: number, host: string | null): Promise<http.Server> {
  const server = http.createServer(app);
  return new Promise((resolve, reject) => {
    const onError = (error: unknown) => {
      server.off("listening", onListening);
      reject(new StartupError(listenFailureMessage(host, port, errorCode(error))));
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(server);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    if (host === null) server.listen(port);
    else server.listen(port, host);
  });
}

export interface StartServerDeps {
  app: RequestListener;
  log: Logger;
}

export async function startServer(config: Config, { app, log }: StartServerDeps): Promise<http.Server> {
  try {
    await connectDatabase(config.db); // RF-14: antes de escuchar
  } catch {
    // RF-13: el mensaje no incluye la URI, que puede llevar credenciales.
    throw new StartupError("la base de datos no está disponible: no se pudo conectar en 10 s");
  }
  try {
    await prepareDatabase(); // spec 002, RF-21: entre conectar y escuchar
  } catch {
    await mongoose.disconnect();
    throw new StartupError("no se pudieron preparar los índices de la base de datos");
  }
  let server: http.Server;
  try {
    server = await listen(app, config.port, config.host);
  } catch (error) {
    await mongoose.disconnect(); // RF-12
    throw error;
  }
  log.info(`servidor escuchando en ${describeListenAddress(server.address())}`); // RF-18
  return server;
}
