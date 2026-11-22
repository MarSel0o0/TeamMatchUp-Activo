// Lectura de backend/.env sin cargar código del servidor (spec 018, RF-1, RF-6; plan §4.2).
// Solo lee: nunca escribe el archivo ni modifica process.env (RF-5, P5).
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import type { EnvSource } from "./settings.ts";

// Variables con el formato de dotenv; {} si el archivo no existe.
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const parsed = parseEnv(readFileSync(path, "utf8"));
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

const DATABASE_NAME_KEYS = ["MONGODB_DBNAME", "TEST_MONGODB_DBNAME"] as const;

// Nombres de la base de desarrollo y de la de pruebas configurados en el entorno del proceso y en
// el archivo de variables del servidor (RF-6). Sin vacíos ni repetidos.
export function configuredDatabaseNames(processEnv: EnvSource, fileEnv: EnvSource): string[] {
  const names = new Set<string>();
  for (const source of [processEnv, fileEnv]) {
    for (const key of DATABASE_NAME_KEYS) {
      const value = source[key];
      if (value !== undefined && value !== "") names.add(value);
    }
  }
  return [...names];
}
