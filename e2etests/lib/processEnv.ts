// Entornos de compilación de la interfaz y de arranque del servidor (spec 018, RF-5, RF-6, RF-8,
// RF-10). Funciones puras: devuelven una copia y nunca modifican la base. El entorno del proceso
// prevalece sobre los archivos de variables (spec 001, RF-21), que la suite nunca escribe.
import type { Settings } from "./settings.ts";

export type ProcessEnv = Record<string, string | undefined>;

// Construcción de producción contra la API del mismo origen, nunca en modo simulado (RF-5).
export function uiBuildEnv(base: Readonly<ProcessEnv>): ProcessEnv {
  return { ...base, VITE_USE_MOCK_API: "false", VITE_API_URL: "/api", NODE_ENV: "production" };
}

// Servidor en producción, solo en 127.0.0.1, con la base E2E (RF-6), el secreto generado en esta
// ejecución (RF-10) y sin claves de servicios externos aunque la base las traiga (RF-8).
export function serverEnv(
  base: Readonly<ProcessEnv>,
  settings: Pick<Settings, "port" | "mongoUri" | "dbName">,
  secret: string,
): ProcessEnv {
  return {
    ...base,
    NODE_ENV: "production",
    PORT: String(settings.port),
    HOST: "127.0.0.1",
    MONGODB_URI: settings.mongoUri,
    MONGODB_DBNAME: settings.dbName,
    JWT_SECRET: secret,
    STEAM_API_KEY: "",
    RIOT_API_KEY: "",
    LEETIFY_API_KEY: "",
  };
}
