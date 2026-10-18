// Validación pura de la configuración (RF-1, RF-2, RF-3, RF-10, RF-11, RF-12, RF-15, RF-20 de
// la 001; RF-17, RF-27 y RF-28 de la 002).
// Recibe el entorno como objeto: no lee process.env ni tiene efectos al importarse (D2).
// loadConfig es la única parte con E/S: carga el archivo de variables con dotenv sin
// sobrescribir las del proceso (RF-21, D1) y delega en parseConfig.
// Los valores no se recortan; los espacios solo cuentan para decidir si están vacíos (D18).
// Los mensajes van en español, en minúscula y sin punto final, y nunca incluyen las URI de
// la base, que pueden llevar credenciales (RNF-3).

import { isIP } from "node:net";
import { resolve } from "node:path";
import dotenv, { type DotenvPopulateInput } from "dotenv";

// Valor de desarrollo del secreto de sesión, NO secreto: se admite en development y test
// (RF-27) y se rechaza en production, también con espacios alrededor (RF-28).
export const DEV_JWT_SECRET = "solo-desarrollo-no-usar-en-produccion";

export type NodeEnv = "development" | "test" | "production";
export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface DatabaseConfig {
  uri: string;
  name: string;
}

export interface Config {
  nodeEnv: NodeEnv;
  port: number;
  host: string | null; // null = todas las interfaces
  db: DatabaseConfig; // ya elegida según el entorno
  jwtSecret: string; // tal como viene, sin recortar (D18 de la 001)
}

export type ConfigResult = { ok: true; config: Config } | { ok: false; errors: string[] };

const NODE_ENVS: readonly NodeEnv[] = ["development", "test", "production"];

const MESSAGES = {
  missing: (names: readonly string[]) => `faltan variables de entorno obligatorias: ${names.join(", ")}`,
  invalidNodeEnv: "NODE_ENV debe ser exactamente development, test o production",
  invalidPort: "PORT debe ser un número entero entre 1 y 65535",
  invalidHost: (host: string, port: number) =>
    `HOST no es una dirección válida: no se puede escuchar en ${host}:${port}`,
  sameDatabase:
    "la base de prueba no puede ser la de desarrollo: TEST_MONGODB_URI y TEST_MONGODB_DBNAME coinciden con MONGODB_URI y MONGODB_DBNAME",
  devJwtSecretInProduction: "JWT_SECRET tiene el valor de desarrollo, que no se admite en producción",
  header: "configuración inválida, el servidor no arranca:",
} as const;

const HOSTNAME_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

export function parsePort(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const port = Number(raw);
  return port >= 1 && port <= 65535 ? port : null;
}

export function isValidHostSyntax(host: string): boolean {
  if (isIP(host) !== 0) return true;
  if (host.length === 0 || host.length > 253) return false;
  const labels = host.split(".");
  if (!labels.every((label) => HOSTNAME_LABEL.test(label))) return false;
  // RFC 1123 §2.1 / RFC 3696 §2: la última etiqueta no puede ser solo numérica (D20).
  return !/^[0-9]+$/.test(labels[labels.length - 1] ?? "");
}

function isNodeEnv(value: string): value is NodeEnv {
  return (NODE_ENVS as readonly string[]).includes(value);
}

export function parseConfig(env: EnvSource): ConfigResult {
  const errors: string[] = [];
  const missing: string[] = [];

  // RF-2 y RF-20: comparación exacta y sensible a mayúsculas.
  let nodeEnv: NodeEnv | null = null;
  const rawEnv = env.NODE_ENV;
  if (rawEnv === undefined || isBlank(rawEnv)) missing.push("NODE_ENV");
  else if (!isNodeEnv(rawEnv)) errors.push(MESSAGES.invalidNodeEnv);
  else nodeEnv = rawEnv;

  // RF-2 y RF-11: PORT es obligatoria en todos los entornos.
  let port: number | null = null;
  const rawPort = env.PORT;
  if (rawPort === undefined || isBlank(rawPort)) missing.push("PORT");
  else {
    port = parsePort(rawPort);
    if (port === null) errors.push(MESSAGES.invalidPort);
  }

  // RF-17: JWT_SECRET es obligatoria en los tres entornos, también sin NODE_ENV válida.
  const rawSecret = env.JWT_SECRET;
  const jwtSecret = rawSecret === undefined || isBlank(rawSecret) ? null : rawSecret;
  if (jwtSecret === null) missing.push("JWT_SECRET");

  // RF-10 y RF-12 (sintaxis): vacía equivale a no definida.
  const rawHost = env.HOST;
  const host = rawHost === undefined || isBlank(rawHost) ? null : rawHost;
  if (host !== null && port !== null && !isValidHostSyntax(host)) {
    errors.push(MESSAGES.invalidHost(host, port));
  }

  // RF-3: solo con entorno válido se miran las variables de base del entorno elegido.
  let db: DatabaseConfig | null = null;
  if (nodeEnv !== null) {
    const [uriKey, nameKey] =
      nodeEnv === "test" ? ["TEST_MONGODB_URI", "TEST_MONGODB_DBNAME"] : ["MONGODB_URI", "MONGODB_DBNAME"];
    const uri = env[uriKey];
    const name = env[nameKey];
    if (uri === undefined || isBlank(uri)) missing.push(uriKey);
    if (name === undefined || isBlank(name)) missing.push(nameKey);
    if (uri !== undefined && !isBlank(uri) && name !== undefined && !isBlank(name)) db = { uri, name };

    // RF-15: valores comparados tal como están escritos.
    if (
      nodeEnv === "test" &&
      db !== null &&
      !isBlank(env.MONGODB_URI) &&
      !isBlank(env.MONGODB_DBNAME) &&
      env.TEST_MONGODB_URI === env.MONGODB_URI &&
      env.TEST_MONGODB_DBNAME === env.MONGODB_DBNAME
    ) {
      errors.push(MESSAGES.sameDatabase);
    }
  }

  // RF-28: en producción se rechaza el valor de desarrollo, comparado ya recortado.
  // En development y test es un valor cualquiera no vacío (RF-27).
  if (nodeEnv === "production" && jwtSecret !== null && jwtSecret.trim() === DEV_JWT_SECRET) {
    errors.push(MESSAGES.devJwtSecretInProduction);
  }

  if (missing.length > 0) errors.unshift(MESSAGES.missing(missing));
  if (errors.length > 0 || nodeEnv === null || port === null || db === null || jwtSecret === null) {
    return { ok: false, errors };
  }
  return { ok: true, config: { nodeEnv, port, host, db, jwtSecret } };
}

export function formatConfigErrors(errors: readonly string[]): string {
  return [MESSAGES.header, ...errors.map((error) => `- ${error}`)].join("\n");
}

export interface LoadConfigOptions {
  envFilePath?: string;
  processEnv?: Record<string, string | undefined>;
}

export function loadConfig({
  envFilePath = resolve(process.cwd(), ".env"),
  processEnv = process.env,
}: LoadConfigOptions = {}): ConfigResult {
  // dotenv solo completa las claves que processEnv no tiene (una clave definida aunque esté
  // vacía cuenta como existente), así el entorno del proceso prevalece (RF-21). Si el archivo
  // no existe, devuelve un error sin lanzar y se ignora: solo cuenta el entorno del proceso.
  // Los tipos de dotenv declaran el destino como Record<string, string>, pero process.env
  // admite undefined; dotenv solo comprueba si la clave existe y escribe cadenas, nunca lee
  // los valores, así que la aserción es segura.
  dotenv.config({ path: envFilePath, processEnv: processEnv as DotenvPopulateInput, quiet: true });
  return parseConfig(processEnv);
}
