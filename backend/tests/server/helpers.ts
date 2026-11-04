// Utilidades de las pruebas de arranque (plan §6.1).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { connect, createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../../src/utils/config.ts";
import type { Config } from "../../src/utils/config.ts";

// Protección de la base de desarrollo: solo devuelve una configuración si el entorno es el
// de prueba y la base elegida es la de prueba. En cualquier otro caso la prueba falla.
export function testConfig(): Config {
  const result = loadConfig();
  assert.ok(result.ok, "la configuración de prueba no es válida: revisa backend/.env");
  const { config } = result;
  assert.strictEqual(config.nodeEnv, "test", "las pruebas deben ejecutarse con NODE_ENV=test");
  assert.ok(process.env.TEST_MONGODB_DBNAME, "falta TEST_MONGODB_DBNAME");
  assert.strictEqual(
    config.db.name,
    process.env.TEST_MONGODB_DBNAME,
    "las pruebas solo pueden usar la base de prueba",
  );
  return config;
}

// Puerto libre elegido por el sistema: se abre en el puerto 0, se lee y se cierra. Se sondea
// en `host` (por defecto 127.0.0.1, donde escuchan y conectan las pruebas); con `null`, sin
// host ("::"), como un servidor sin HOST. `null` y no `undefined`, que activa el valor por defecto.
export function getFreePort(host: string | null = "127.0.0.1"): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    const onListening = (): void => {
      const { port } = probe.address() as AddressInfo;
      probe.close((error) => (error ? reject(error) : resolve(port)));
    };
    if (host === null) probe.listen(0, onListening);
    else probe.listen(0, host, onListening);
  });
}

export interface SpawnOptions {
  // Contenido de un `.env` que se escribe en el directorio de trabajo temporal (RF-21).
  envFile?: string;
  // Límite de seguridad: si el hijo no termina antes, se mata y la prueba lo detecta.
  timeoutMs?: number;
}

export interface SpawnResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

const INDEX_PATH = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

// Hijo en marcha: `result` se resuelve cuando termina; `stop` lo termina (SIGTERM) y espera.
export interface RunningChild {
  result: Promise<SpawnResult>;
  stop: () => Promise<SpawnResult>;
}

// Lanza `src/index.ts` como proceso hijo (D12). El entorno es explícito: solo PATH y las
// variables de la prueba, sin heredar NODE_ENV ni el resto del entorno de `npm test`. El
// directorio de trabajo es una carpeta temporal, así el hijo no lee `backend/.env` salvo
// que la prueba escriba uno propio en ella. La carpeta se borra cuando el hijo termina.
export async function startChild(
  env: Readonly<Record<string, string>>,
  { envFile, timeoutMs = 15_000 }: SpawnOptions = {},
): Promise<RunningChild> {
  const cwd = await mkdtemp(join(tmpdir(), "teammatchup-spawn-"));
  try {
    if (envFile !== undefined) await writeFile(join(cwd, ".env"), envFile);
  } catch (error) {
    await rm(cwd, { recursive: true, force: true });
    throw error;
  }
  const childEnv: Record<string, string> = { ...env };
  if (process.env.PATH !== undefined) childEnv.PATH = process.env.PATH;
  const started = performance.now();
  const child = spawn(process.execPath, [INDEX_PATH], { cwd, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  const finished = new Promise<SpawnResult>((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal, stdout, stderr, durationMs: performance.now() - started, timedOut });
    });
  });
  const result = finished.finally(() => rm(cwd, { recursive: true, force: true }));
  const stop = async (): Promise<SpawnResult> => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    return result;
  };
  return { result, stop };
}

// Ejecuta el hijo hasta que termina por sí mismo (o vence `timeoutMs`).
export async function spawnServer(
  env: Readonly<Record<string, string>>,
  options: SpawnOptions = {},
): Promise<SpawnResult> {
  return (await startChild(env, options)).result;
}

// Un intento de conexión TCP: `null` si acepta, o el código de error (p. ej. ECONNREFUSED).
export function tryConnect(port: number, host = "127.0.0.1"): Promise<string | null> {
  return new Promise((resolvePromise) => {
    const socket = connect({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolvePromise(null);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      resolvePromise(error.code ?? "error");
    });
  });
}

// Espera a que el puerto acepte conexiones; rechaza si no ocurre antes de `timeoutMs`.
export async function waitForPort(port: number, host = "127.0.0.1", timeoutMs = 10_000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if ((await tryConnect(port, host)) === null) return;
    await delay(100);
  }
  throw new Error(`el puerto ${host}:${port} no aceptó conexiones en ${timeoutMs} ms`);
}
