// Variables propias de la suite (E2E_*) y sus valores por defecto (spec 018, RF-6, RF-7).
// Función pura: recibe el entorno como parámetro. Las variables de la suite empiezan por E2E_ y
// nunca se llaman MONGODB_DBNAME, para no confundirse con la base de desarrollo configurada.

export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface Settings {
  port: number;
  mongoUri: string;
  dbName: string;
  baseURL: string;
}

export type SettingsResult =
  | { ok: true; settings: Settings }
  | { ok: false; errors: string[] };

export const DEFAULT_SETTINGS = {
  port: 3901,
  mongoUri: "mongodb://127.0.0.1:27017",
  dbName: "teammatchup_e2e",
} as const;

// Una variable vacía cuenta como no definida.
function readVariable(env: EnvSource, name: string): string | undefined {
  const value = env[name];
  return value === undefined || value === "" ? undefined : value;
}

function parsePort(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const port = Number(raw);
  return port >= 1 && port <= 65535 ? port : null;
}

export function readSettings(env: EnvSource): SettingsResult {
  const rawPort = readVariable(env, "E2E_PORT");
  const port = rawPort === undefined ? DEFAULT_SETTINGS.port : parsePort(rawPort);
  if (port === null) {
    return { ok: false, errors: ["E2E_PORT debe ser un número entero entre 1 y 65535"] };
  }
  return {
    ok: true,
    settings: {
      port,
      mongoUri: readVariable(env, "E2E_MONGODB_URI") ?? DEFAULT_SETTINGS.mongoUri,
      dbName: readVariable(env, "E2E_MONGODB_DBNAME") ?? DEFAULT_SETTINGS.dbName,
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}
