// Spec 010 (RF-1, RF-2, RF-3): con `uiDir`, la app sirve la interfaz compilada y el fallback
// de sus rutas desde el mismo origen que la API. La carpeta es temporal: no depende del build.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import supertest from "supertest";
import type { Response } from "supertest";
import { createApp } from "../../src/app.ts";
import { testConfig } from "../server/helpers.ts";
import { closeTestServers, listenOnLoopback } from "./helpers.ts";

const INDEX_HTML = "<!doctype html><title>TeamMatchUp</title><div id=root></div>";
const APP_JS = "console.log('app');";
const UNKNOWN = { error: "endpoint desconocido" };

let uiDir = "";
let withUi: supertest.Agent;
let withoutUi: supertest.Agent;

before(async () => {
  uiDir = await mkdtemp(join(tmpdir(), "tmu-ui-"));
  await mkdir(join(uiDir, "assets"));
  await writeFile(join(uiDir, "index.html"), INDEX_HTML);
  await writeFile(join(uiDir, "assets", "app.js"), APP_JS);
  const { jwtSecret, nodeEnv } = testConfig();
  withUi = supertest.agent(await listenOnLoopback(createApp({ jwtSecret, nodeEnv, uiDir })));
  withoutUi = supertest.agent(await listenOnLoopback(createApp({ jwtSecret, nodeEnv })));
});

after(async () => {
  await closeTestServers();
  await rm(uiDir, { recursive: true, force: true });
});

function assertApp(response: Response): void {
  assert.strictEqual(response.status, 200);
  assert.match(response.headers["content-type"] ?? "", /text\/html/);
  assert.strictEqual(response.text, INDEX_HTML);
}

function assertUnknownEndpoint(response: Response): void {
  assert.strictEqual(response.status, 404);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, UNKNOWN);
}

describe("ui: rutas de la interfaz (RF-1, RF-2)", () => {
  for (const path of ["/", "/perfil", "/agenda/66b7f0c2a1d3e4f5a6b7c8d9", "/jugadores/x/lol", "/ruta/que/no/existe"]) {
    test(`GET ${path} entrega la aplicación`, async () => {
      assertApp(await withUi.get(path));
    });
  }

  test("un archivo inexistente fuera de la API entrega la aplicación", async () => {
    assertApp(await withUi.get("/logo-viejo.png"));
  });

  test("HEAD /perfil → 200 sin cuerpo", async () => {
    const response = await withUi.head("/perfil");
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.strictEqual(response.text ?? "", "");
  });

  test("un archivo real se entrega tal cual, no como la aplicación", async () => {
    const response = await withUi.get("/assets/app.js");
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /javascript/);
    assert.strictEqual(response.text, APP_JS);
  });

  test("un método distinto de GET y HEAD sobre una ruta de la interfaz sigue en 404 JSON", async () => {
    assertUnknownEndpoint(await withUi.post("/perfil").send({}));
    assertUnknownEndpoint(await withUi.put("/perfil").send({}));
    assertUnknownEndpoint(await withUi.delete("/perfil"));
  });
});

describe("ui: la API sigue por delante (RF-3)", () => {
  for (const path of ["/api", "/api/", "/api/inexistente", "/api/auth/inexistente"]) {
    test(`GET ${path} → 404 JSON, no la aplicación`, async () => {
      assertUnknownEndpoint(await withUi.get(path));
    });
  }

  test("una ruta protegida de la API sin sesión → 401 JSON", async () => {
    const response = await withUi.get("/api/auth/me");
    assert.strictEqual(response.status, 401);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.ok(typeof response.body.error === "string");
  });
});

describe("ui: sin `uiDir` nada cambia (RF-1)", () => {
  test("GET /perfil → 404 JSON", async () => {
    assertUnknownEndpoint(await withoutUi.get("/perfil"));
  });

  test("GET / → 404 JSON", async () => {
    assertUnknownEndpoint(await withoutUi.get("/"));
  });
});
