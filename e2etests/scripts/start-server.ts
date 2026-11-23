// Lanzador del sistema bajo prueba (spec 018, RF-2 pasos 1, 2, 3 y 5; RF-4 a RF-8, RF-10, RNF-9;
// plan §4.2). Playwright lo arranca con `webServer` y lo detiene al terminar; también se puede
// ejecutar solo: `node scripts/start-server.ts`.
//
// - Paso 1: comprueba las condiciones previas sin compilar ni arrancar nada.
// - Paso 2: compila la interfaz y el servidor desde el código actual (procedimiento de la spec 010).
// - Paso 3: arranca el servidor compilado con la base E2E y espera a que responda.
// Ningún proceso se lanza con `shell`: el programa es siempre el propio Node (RNF-9). El lanzador
// nunca escribe el entorno, la ubicación de MongoDB ni el secreto de firma (RF-6, RF-10).
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { constants } from "node:os";
import { basename, dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { configuredDatabaseNames, readEnvFile } from "../lib/backendEnv.ts";
import {
  checkDatabaseName,
  checkMongoLocation,
  formatPreflightErrors,
  missingPackages,
} from "../lib/preflight.ts";
import { serverEnv, uiBuildEnv, type ProcessEnv } from "../lib/processEnv.ts";
import { readSettings, type Settings } from "../lib/settings.ts";

const e2eDir = fileURLToPath(new URL("..", import.meta.url));
const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const frontendDir = join(rootDir, "frontend");
const backendDir = join(rootDir, "backend");

const STARTUP_LIMIT_MS = 60_000;
const POLL_INTERVAL_MS = 250;
const STOP_LIMIT_MS = 5_000;

// Proceso hijo en curso (compilación o servidor), para detenerlo en la parada (RF-2, paso 5).
let current: ChildProcess | null = null;
let stopping = false;

function isRunning(child: ChildProcess | null): child is ChildProcess {
  return child !== null && child.exitCode === null && child.signalCode === null;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

// ---- Parada (RF-2, paso 5): en una señal se detiene el hijo en curso y se termina.
async function stop(signal: NodeJS.Signals): Promise<void> {
  if (stopping) return;
  stopping = true;
  const child = current;
  if (isRunning(child)) {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), delay(STOP_LIMIT_MS)]);
    if (isRunning(child)) child.kill("SIGKILL");
  }
  process.exit(128 + constants.signals[signal]);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => void stop(signal));
}
process.on("exit", () => {
  if (isRunning(current)) current.kill("SIGKILL");
});

// Tras una señal, el hijo termina con error: no se informa como fallo de compilación ni de
// arranque; la parada termina el proceso.
async function waitIfStopping(): Promise<void> {
  if (stopping) await new Promise<never>(() => {});
}

// ---- Paso 1: condiciones previas (RF-4, RF-6, RF-7).
function dependencyErrors(folder: string, label: string): string[] {
  const manifestPath = join(folder, "package.json");
  if (!existsSync(manifestPath)) return [`no se encontró ${label}/package.json`];
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return [`no se pudo leer ${label}/package.json`];
  }
  const missing = missingPackages(manifest, (name) =>
    existsSync(join(folder, "node_modules", name, "package.json")),
  );
  if (missing.length === 0) return [];
  return [`faltan dependencias de ${label}/ (${missing.join(", ")}): ejecuta npm ci en ${label}/`];
}

function chromiumInstalled(): boolean {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.listen({ port, host: "127.0.0.1", exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

// npm-cli.js: el que fija npm al ejecutar `npm test` o, si no, el que se instala junto a Node
// (carpeta de Node en Windows, `../lib/node_modules` en Linux y macOS).
function findNpmCli(): string | null {
  const candidates: string[] = [];
  const fromNpm = process.env["npm_execpath"];
  if (fromNpm !== undefined && basename(fromNpm) === "npm-cli.js") candidates.push(fromNpm);
  const nodeDir = dirname(process.execPath);
  candidates.push(join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"));
  candidates.push(join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"));
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function backendEnvFile(errors: string[]): Record<string, string> {
  try {
    return readEnvFile(join(backendDir, ".env"));
  } catch {
    errors.push("no se pudo leer backend/.env");
    return {};
  }
}

async function preflight(): Promise<{ settings: Settings; npmCli: string }> {
  const errors: string[] = [];
  const result = readSettings(process.env);
  const settings = result.ok ? result.settings : null;
  if (!result.ok) errors.push(...result.errors);

  if (settings !== null) {
    const configured = configuredDatabaseNames(process.env, backendEnvFile(errors));
    const nameError = checkDatabaseName(settings.dbName, configured);
    if (nameError !== null) errors.push(nameError);
    const locationError = checkMongoLocation(settings.mongoUri);
    if (locationError !== null) errors.push(locationError);
  }

  errors.push(...dependencyErrors(frontendDir, "frontend"));
  errors.push(...dependencyErrors(backendDir, "backend"));
  errors.push(...dependencyErrors(e2eDir, "e2etests"));

  if (!chromiumInstalled()) {
    errors.push("Chromium de Playwright no está instalado: npm run browser:install en e2etests/");
  }

  if (settings !== null && !(await isPortFree(settings.port))) {
    errors.push(
      `el puerto ${settings.port} de 127.0.0.1 está ocupado: detén lo que escucha en él o cambia E2E_PORT`,
    );
  }

  const npmCli = findNpmCli();
  if (npmCli === null) {
    errors.push("no se encontró npm junto a Node: ejecuta la suite con npm test desde e2etests/");
  }

  if (settings === null || npmCli === null || errors.length > 0) {
    process.stderr.write(formatPreflightErrors(errors));
    process.exit(1);
  }
  return { settings, npmCli };
}

// ---- Paso 2: compilación (RF-5).
async function runNpm(npmCli: string, script: string, env: ProcessEnv, label: string): Promise<void> {
  const child = spawn(process.execPath, [npmCli, "run", script], {
    cwd: backendDir,
    env,
    stdio: "inherit",
    shell: false,
  });
  current = child;
  const outcome = await new Promise<number | null>((resolve) => {
    child.once("error", () => resolve(null));
    child.once("exit", (code) => resolve(code));
  });
  current = null;
  await waitIfStopping();
  if (outcome !== 0) fail(`falló la compilación ${label}`);
}

async function build(npmCli: string): Promise<void> {
  // Vite vacía frontend/dist y copyUi borra y vuelve a copiar backend/dist.
  await runNpm(npmCli, "build:ui", uiBuildEnv(process.env), "de la interfaz");
  rmSync(join(backendDir, "out"), { recursive: true, force: true });
  await runNpm(npmCli, "build", process.env, "del servidor");
}

// ---- Paso 3: arranque y espera (RF-4, RF-6, RF-8, RF-10).
async function responds(baseURL: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL}/`, { signal: AbortSignal.timeout(2_000) });
    await response.arrayBuffer();
    return response.status === 200;
  } catch {
    return false;
  }
}

async function start(settings: Settings): Promise<void> {
  // Secreto de firma de esta ejecución: solo va en el entorno del proceso del servidor (RF-10).
  const secret = randomBytes(32).toString("base64url");
  const server = spawn(process.execPath, ["out/index.js"], {
    cwd: backendDir,
    env: serverEnv(process.env, settings, secret),
    stdio: ["ignore", "inherit", "inherit"],
    shell: false,
  });
  current = server;

  let exitCode: number | null | undefined;
  const exited = new Promise<number | null>((resolve) => {
    server.once("error", () => resolve(null));
    server.once("exit", (code) => resolve(code));
  }).then((code) => {
    exitCode = code;
    return code;
  });

  const deadline = Date.now() + STARTUP_LIMIT_MS;
  for (;;) {
    if (exitCode !== undefined) {
      await waitIfStopping();
      fail(`el servidor terminó al arrancar (código ${exitCode ?? "desconocido"})`);
    }
    if (Date.now() >= deadline) {
      server.kill("SIGTERM");
      fail("el servidor no respondió en 60 s");
    }
    if (await responds(settings.baseURL)) break;
    await delay(POLL_INTERVAL_MS);
  }

  process.stdout.write(`sistema bajo prueba listo en ${settings.baseURL}\n`);
  const code = await exited;
  await waitIfStopping();
  process.stderr.write(`el servidor terminó (código ${code ?? "desconocido"})\n`);
  process.exit(code ?? 1);
}

const { settings, npmCli } = await preflight();
await build(npmCli);
await start(settings);
