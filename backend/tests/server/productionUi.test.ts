// Spec 010 (T3, D-2, D-4): en producción el arranque exige la interfaz compilada en
// `backend/dist`. Sin `index.html` el proceso termina con código 1 y un mensaje en español,
// antes de conectar a la base. La carpeta es fija (D-2), así que la prueba sigue la rama que
// corresponde al estado real del repositorio: sin compilación, comprueba el fallo; con ella,
// comprueba que el servidor llega a escuchar sin ese mensaje (contra la base de prueba, sin
// escribir en ella). RF-1, RF-6.
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getFreePort, spawnServer, startChild, testConfig, waitForPort } from "./helpers.ts";
import type { RunningChild } from "./helpers.ts";

const UI_INDEX = fileURLToPath(new URL("../../dist/index.html", import.meta.url));
const MESSAGE = "falta la interfaz compilada en backend/dist: ejecuta npm run build:ui";
// Secreto propio de producción (RF-28 de la 002 rechaza el de desarrollo).
const PROD_SECRET = "secreto-de-prueba-de-produccion-0123456789abcdef";
// Inalcanzable: si el proceso intentara conectar antes de comprobar la interfaz, tardaría.
const UNREACHABLE = "mongodb://127.0.0.1:1";

const running: RunningChild[] = [];
after(async () => {
  await Promise.all(running.splice(0).map((child) => child.stop()));
});

describe("Spec 010 D-4: arranque de producción y la interfaz compilada", () => {
  test("sin backend/dist/index.html → código 1 y mensaje en español, sin conectar", { skip: existsSync(UI_INDEX) ? "hay compilación en backend/dist" : false }, async () => {
    const result = await spawnServer({
      NODE_ENV: "production",
      PORT: "3001",
      JWT_SECRET: PROD_SECRET,
      MONGODB_URI: UNREACHABLE,
      MONGODB_DBNAME: "teammatchup_proceso",
    });
    assert.strictEqual(result.timedOut, false, "el proceso no terminó a tiempo");
    assert.strictEqual(result.code, 1);
    assert.ok(result.stderr.includes(MESSAGE), `salida de error inesperada: ${result.stderr}`);
    assert.strictEqual(result.stdout, "");
  });

  test("con backend/dist/index.html → arranca y escucha, sin el mensaje", { skip: existsSync(UI_INDEX) ? false : "no hay compilación en backend/dist" }, async () => {
    const { db } = testConfig();
    const port = await getFreePort();
    const child = await startChild({
      NODE_ENV: "production",
      PORT: String(port),
      HOST: "127.0.0.1",
      JWT_SECRET: PROD_SECRET,
      MONGODB_URI: db.uri,
      MONGODB_DBNAME: db.name,
    });
    running.push(child);
    try {
      await waitForPort(port, "127.0.0.1");
    } finally {
      await child.stop();
    }
    const result = await child.result;
    assert.strictEqual(result.timedOut, false);
    assert.ok(!result.stderr.includes(MESSAGE), `no debe aparecer el mensaje: ${result.stderr}`);
  });
});
