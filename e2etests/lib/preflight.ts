// Reglas puras de las condiciones previas de la suite (spec 018, RF-2 paso 1, RF-4, RF-6).
// Ningún mensaje incluye la ubicación de MongoDB, que puede llevar credenciales (RF-6).

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function checkDatabaseName(name: string, configured: readonly string[]): string | null {
  if (!name.toLowerCase().includes("e2e")) {
    return `el nombre de la base E2E («${name}») debe contener «e2e» (E2E_MONGODB_DBNAME)`;
  }
  const lower = name.toLowerCase();
  if (configured.some((other) => other !== "" && other.toLowerCase() === lower)) {
    return (
      `el nombre de la base E2E («${name}») coincide, sin distinguir mayúsculas, con el de una base ` +
      "configurada del servidor (MONGODB_DBNAME o TEST_MONGODB_DBNAME): usa otro con E2E_MONGODB_DBNAME"
    );
  }
  return null;
}

// Servidor de una entrada «host[:puerto]», en minúsculas; "" si no hay nombre.
function hostOf(entry: string): string {
  const colon = entry.indexOf(":");
  return (colon === -1 ? entry : entry.slice(0, colon)).toLowerCase();
}

export function checkMongoLocation(uri: string): string | null {
  const scheme = "mongodb://";
  if (uri.toLowerCase().startsWith("mongodb+srv://")) {
    return "la ubicación de MongoDB (E2E_MONGODB_URI) no puede usar mongodb+srv://, que busca los servidores por DNS";
  }
  if (!uri.toLowerCase().startsWith(scheme)) {
    return "la ubicación de MongoDB (E2E_MONGODB_URI) debe empezar por mongodb://";
  }
  const rest = uri.slice(scheme.length);
  const end = rest.search(/[/?]/);
  const authority = end === -1 ? rest : rest.slice(0, end);
  const hostList = authority.slice(authority.lastIndexOf("@") + 1);
  const hosts = hostList.split(",").map(hostOf);
  if (!hosts.every((host) => LOCAL_HOSTS.has(host))) {
    return "la ubicación de MongoDB (E2E_MONGODB_URI) debe nombrar solo los servidores 127.0.0.1 o localhost";
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function missingPackages(manifest: unknown, isInstalled: (name: string) => boolean): string[] {
  if (!isRecord(manifest)) return [];
  const names = new Set<string>();
  for (const key of ["dependencies", "devDependencies"]) {
    const list = manifest[key];
    if (isRecord(list)) for (const name of Object.keys(list)) names.add(name);
  }
  return [...names].filter((name) => !isInstalled(name));
}

export function formatPreflightErrors(errors: readonly string[]): string {
  return `la suite no arranca:\n${errors.map((error) => `- ${error}\n`).join("")}`;
}
