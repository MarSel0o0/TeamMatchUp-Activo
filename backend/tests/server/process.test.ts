// Arranque como proceso hijo (plan §6.2, D12): código de salida y salida de error.
// Casos sin base: la configuración es inválida y el proceso termina antes de conectar.
// Casos con base: el hijo solo recibe la base de prueba o una URI inalcanzable.
// RF-2, RF-11, RF-12, RF-13, RF-14, RF-15, RF-20, RF-21, RNF-1 (001); RF-17, RF-27, RF-28 (002).
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import type { Server as NetServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { DEV_JWT_SECRET } from "../../src/utils/config.ts";
import { getFreePort, spawnServer, startChild, testConfig, tryConnect, waitForPort } from "./helpers.ts";
import type { RunningChild, SpawnResult } from "./helpers.ts";

// URI inalcanzable y con credenciales ficticias: nunca se usa porque la configuración falla
// antes, y sirve para comprobar que no aparece en los mensajes (D17).
const URI = "mongodb://usuario:secreto@127.0.0.1:1";

const DB_VARS_WITHOUT_SECRET = {
  MONGODB_URI: URI,
  MONGODB_DBNAME: "teammatchup_proceso",
  TEST_MONGODB_URI: URI,
  TEST_MONGODB_DBNAME: "teammatchup_proceso_test",
} as const;

// JWT_SECRET con el valor de desarrollo: sirve en development y test (RF-27).
const DB_VARS = { JWT_SECRET: DEV_JWT_SECRET, ...DB_VARS_WITHOUT_SECRET } as const;

const HEADER = "configuración inválida, el servidor no arranca:";

function assertConfigFailure(result: SpawnResult): void {
  assert.strictEqual(result.timedOut, false, "el proceso no terminó a tiempo");
  assert.notStrictEqual(result.code, 0);
  assert.notStrictEqual(result.code, null);
  assert.ok(result.stderr.includes(HEADER), `salida de error inesperada: ${result.stderr}`);
  assert.ok(!result.stderr.includes(URI), "la salida de error no debe mostrar la URI");
  assert.strictEqual(result.stdout, "");
}

function assertNamesNodeEnvValues(stderr: string): void {
  for (const word of ["NODE_ENV", "development", "test", "production"]) {
    assert.ok(stderr.includes(word), `el mensaje no nombra ${word}: ${stderr}`);
  }
}

describe("RF-2: variables obligatorias", () => {
  test("entorno test sin PORT → no arranca y nombra PORT", async () => {
    const result = await spawnServer({ NODE_ENV: "test", ...DB_VARS });
    assertConfigFailure(result);
    assert.match(result.stderr, /faltan variables de entorno obligatorias: PORT/);
  });

  test("sin NODE_ENV ni PORT → nombra ambas", async () => {
    const result = await spawnServer({ ...DB_VARS });
    assertConfigFailure(result);
    assert.match(result.stderr, /faltan variables de entorno obligatorias: NODE_ENV, PORT/);
  });
});

describe("RF-17: JWT_SECRET obligatoria en los tres entornos", () => {
  for (const nodeEnv of ["development", "test", "production"]) {
    test(`entorno ${nodeEnv} sin JWT_SECRET → no arranca y la nombra`, async () => {
      const result = await spawnServer({ NODE_ENV: nodeEnv, PORT: "3001", ...DB_VARS_WITHOUT_SECRET });
      assertConfigFailure(result);
      assert.match(result.stderr, /faltan variables de entorno obligatorias: JWT_SECRET/);
    });

    test(`entorno ${nodeEnv} con JWT_SECRET solo de espacios → no arranca y la nombra`, async () => {
      const result = await spawnServer({ NODE_ENV: nodeEnv, PORT: "3001", ...DB_VARS, JWT_SECRET: "   " });
      assertConfigFailure(result);
      assert.match(result.stderr, /faltan variables de entorno obligatorias: JWT_SECRET/);
    });
  }

  test("sin NODE_ENV ni JWT_SECRET → nombra ambas", async () => {
    const result = await spawnServer({ PORT: "3001", ...DB_VARS_WITHOUT_SECRET });
    assertConfigFailure(result);
    assert.match(result.stderr, /faltan variables de entorno obligatorias: NODE_ENV, JWT_SECRET/);
  });
});

describe("RF-28: el valor de desarrollo no se admite en producción", () => {
  for (const value of [DEV_JWT_SECRET, `  ${DEV_JWT_SECRET} `]) {
    test(`production con JWT_SECRET=${JSON.stringify(value)} → no arranca y nombra JWT_SECRET y producción`, async () => {
      const result = await spawnServer({ NODE_ENV: "production", PORT: "3001", ...DB_VARS, JWT_SECRET: value });
      assertConfigFailure(result);
      assert.match(result.stderr, /JWT_SECRET tiene el valor de desarrollo, que no se admite en producción/);
    });
  }
});

describe("RF-20: NODE_ENV exacto", () => {
  for (const value of ["Test", "TEST", "prod"]) {
    test(`NODE_ENV=${value} → no arranca y nombra los tres valores aceptados`, async () => {
      const result = await spawnServer({ NODE_ENV: value, PORT: "3001", ...DB_VARS });
      assertConfigFailure(result);
      assertNamesNodeEnvValues(result.stderr);
    });
  }
});

describe("RF-11: PORT entre 1 y 65535", () => {
  for (const value of ["0", "65536", "abc"]) {
    test(`PORT=${value} → no arranca y nombra PORT`, async () => {
      const result = await spawnServer({ NODE_ENV: "development", PORT: value, ...DB_VARS });
      assertConfigFailure(result);
      assert.match(result.stderr, /PORT debe ser un número entero entre 1 y 65535/);
    });
  }
});

describe("RF-15: base de prueba distinta de la de desarrollo", () => {
  test("entorno test con TEST_* iguales a MONGODB_* → no arranca", async () => {
    const result = await spawnServer({
      NODE_ENV: "test",
      PORT: "3001",
      MONGODB_URI: URI,
      MONGODB_DBNAME: "teammatchup_proceso",
      TEST_MONGODB_URI: URI,
      TEST_MONGODB_DBNAME: "teammatchup_proceso",
    });
    assertConfigFailure(result);
    assert.match(result.stderr, /la base de prueba no puede ser la de desarrollo/);
  });
});

describe("RF-21: el entorno del proceso prevalece sobre .env", () => {
  test(".env con NODE_ENV=Test y proceso development sin PORT → nombra PORT, sin el mensaje de RF-20", async () => {
    const result = await spawnServer(
      { NODE_ENV: "development", ...DB_VARS },
      { envFile: "NODE_ENV=Test\n" },
    );
    assertConfigFailure(result);
    assert.match(result.stderr, /faltan variables de entorno obligatorias: PORT/);
    assert.ok(!result.stderr.includes("NODE_ENV debe ser"), `no debe traer el mensaje de RF-20: ${result.stderr}`);
  });
});

describe("RNF-1: el mensaje de configuración se ve también en prueba", () => {
  test("entorno test con PORT=abc → el mensaje aparece en la salida de error", async () => {
    const result = await spawnServer({ NODE_ENV: "test", PORT: "abc", ...DB_VARS });
    assertConfigFailure(result);
    assert.match(result.stderr, /PORT debe ser un número entero entre 1 y 65535/);
  });
});

// ---------------------------------------------------------------------------------------
// Casos con base (T9). La base es siempre la de prueba (testConfig lo garantiza) o una URI
// inalcanzable; ningún caso escribe en ella.

const HOST = "127.0.0.1";
const running: RunningChild[] = [];

// Si una prueba falla a mitad, el hijo no queda colgado.
after(async () => {
  await Promise.all(running.splice(0).map((child) => child.stop()));
});

function testDb(): { uri: string; name: string } {
  const { db } = testConfig();
  return { uri: db.uri, name: db.name };
}

async function launch(env: Readonly<Record<string, string>>): Promise<RunningChild> {
  const child = await startChild(env);
  running.push(child);
  return child;
}

// Arranca, espera el puerto y termina el hijo: el servidor llegó a escuchar.
async function assertStartsAndStop(env: Readonly<Record<string, string>>, port: number): Promise<SpawnResult> {
  const child = await launch(env);
  try {
    await waitForPort(port, HOST);
  } finally {
    await child.stop();
  }
  const result = await child.result;
  assert.strictEqual(result.timedOut, false);
  return result;
}

function occupyPort(port: number): Promise<NetServer> {
  return new Promise((resolve, reject) => {
    const blocker = createServer();
    blocker.once("error", reject);
    blocker.listen(port, HOST, () => resolve(blocker));
  });
}

function closeBlocker(blocker: NetServer): Promise<void> {
  return new Promise((resolve) => blocker.close(() => resolve()));
}

describe("Matriz de variables de base por entorno", () => {
  test("entorno test sin MONGODB_* arranca", async () => {
    const db = testDb();
    const port = await getFreePort();
    await assertStartsAndStop(
      {
        NODE_ENV: "test",
        PORT: String(port),
        HOST,
        JWT_SECRET: DEV_JWT_SECRET,
        TEST_MONGODB_URI: db.uri,
        TEST_MONGODB_DBNAME: db.name,
      },
      port,
    );
  });

  test("entorno development sin TEST_* y con MONGODB_* a la base de prueba arranca", async () => {
    const db = testDb();
    const port = await getFreePort();
    await assertStartsAndStop(
      {
        NODE_ENV: "development",
        PORT: String(port),
        HOST,
        JWT_SECRET: DEV_JWT_SECRET,
        MONGODB_URI: db.uri,
        MONGODB_DBNAME: db.name,
      },
      port,
    );
  });
});

describe("RNF-1: en prueba el servidor no escribe nada", () => {
  test("entorno test válido: escucha y la salida estándar queda vacía", async () => {
    const db = testDb();
    const port = await getFreePort();
    const result = await assertStartsAndStop(
      {
        NODE_ENV: "test",
        PORT: String(port),
        HOST,
        JWT_SECRET: DEV_JWT_SECRET,
        TEST_MONGODB_URI: db.uri,
        TEST_MONGODB_DBNAME: db.name,
      },
      port,
    );
    assert.strictEqual(result.stdout, "");
  });

  test("entorno test válido con el puerto ocupado → código ≠ 0 y salida de error vacía", async () => {
    const db = testDb();
    const port = await getFreePort();
    const blocker = await occupyPort(port);
    try {
      const result = await spawnServer({
        NODE_ENV: "test",
        PORT: String(port),
        HOST,
        JWT_SECRET: DEV_JWT_SECRET,
        TEST_MONGODB_URI: db.uri,
        TEST_MONGODB_DBNAME: db.name,
      });
      assert.strictEqual(result.timedOut, false);
      assert.notStrictEqual(result.code, 0);
      assert.notStrictEqual(result.code, null);
      assert.strictEqual(result.stderr, "");
      assert.strictEqual(result.stdout, "");
    } finally {
      await closeBlocker(blocker);
    }
  });
});

describe("RF-12: dirección o puerto no utilizable", () => {
  test("entorno development con el puerto ocupado → código ≠ 0 y mensaje con dirección y puerto", async () => {
    const db = testDb();
    const port = await getFreePort();
    const blocker = await occupyPort(port);
    try {
      const result = await spawnServer({
        NODE_ENV: "development",
        PORT: String(port),
        HOST,
        JWT_SECRET: DEV_JWT_SECRET,
        MONGODB_URI: db.uri,
        MONGODB_DBNAME: db.name,
      });
      assert.strictEqual(result.timedOut, false);
      assert.notStrictEqual(result.code, 0);
      assert.notStrictEqual(result.code, null);
      assert.ok(result.stderr.includes(HOST), `el mensaje no nombra la dirección: ${result.stderr}`);
      assert.ok(result.stderr.includes(String(port)), `el mensaje no nombra el puerto: ${result.stderr}`);
      assert.match(result.stderr, /no se pudo escuchar/);
    } finally {
      await closeBlocker(blocker);
    }
  });
});

describe("RF-13 + RF-14: base no disponible", () => {
  test(
    "MONGODB_URI inalcanzable → termina entre 10 y 12 s, sin aceptar conexiones mientras espera",
    { timeout: 20_000 },
    async () => {
      const port = await getFreePort();
      const unreachable = "mongodb://127.0.0.1:1";
      const child = await launch({
        NODE_ENV: "development",
        PORT: String(port),
        HOST,
        JWT_SECRET: DEV_JWT_SECRET,
        MONGODB_URI: unreachable,
        MONGODB_DBNAME: "teammatchup_inalcanzable",
      });
      // RF-14: mientras espera a la base, el puerto rechaza conexiones.
      const probes: (string | null)[] = [];
      for (const waitMs of [1_000, 4_000, 3_000]) {
        await delay(waitMs);
        probes.push(await tryConnect(port, HOST));
      }
      const result = await child.result;
      assert.deepStrictEqual(probes, ["ECONNREFUSED", "ECONNREFUSED", "ECONNREFUSED"]);
      assert.strictEqual(result.timedOut, false);
      assert.notStrictEqual(result.code, 0);
      assert.notStrictEqual(result.code, null);
      assert.match(result.stderr, /la base de datos no está disponible/);
      assert.ok(!result.stderr.includes(unreachable), "el mensaje no debe mostrar la URI");
      assert.ok(result.durationMs >= 10_000, `terminó demasiado pronto: ${result.durationMs} ms`);
      assert.ok(result.durationMs <= 12_000, `terminó demasiado tarde: ${result.durationMs} ms`);
    },
  );
});
