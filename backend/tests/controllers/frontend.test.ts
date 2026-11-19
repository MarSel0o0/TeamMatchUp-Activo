// Spec 010 (RF-1, RF-2, RF-3): con `frontendDir`, el mismo servidor entrega la interfaz
// compilada; la API y su 404 en JSON no cambian.
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import supertest from "supertest";
import { createApp } from "../../src/app.ts";
import { testConfig } from "../server/helpers.ts";
import { closeTestServers, listenOnLoopback } from "./helpers.ts";

const frontendDir = fileURLToPath(new URL("../fixtures/frontend", import.meta.url));
const api = supertest(await listenOnLoopback(createApp({ ...testConfig(), frontendDir })));

after(() => closeTestServers());

const UNKNOWN = { error: "endpoint desconocido" };

describe("interfaz compilada (spec 010)", () => {
  test("GET / → index.html (RF-1)", async () => {
    const response = await api.get("/");
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.match(response.text, /<div id="root">/);
  });

  test("GET de un archivo existente → ese archivo", async () => {
    const response = await api.get("/assets/app.js");
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /javascript/);
  });

  for (const path of ["/perfil", "/jugadores/abc", "/logo-viejo.png"]) {
    test(`GET ${path} → index.html (RF-2)`, async () => {
      const response = await api.get(path);
      assert.strictEqual(response.status, 200);
      assert.match(response.text, /<div id="root">/);
    });
  }

  test("HEAD /perfil → 200 HTML sin cuerpo", async () => {
    const response = await api.head("/perfil");
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
  });

  for (const path of ["/api", "/api/inexistente", "/api/users/x/y/z"]) {
    test(`GET ${path} → 404 JSON (RF-3)`, async () => {
      const response = await api.get(path);
      assert.strictEqual(response.status, 404);
      assert.match(response.headers["content-type"] ?? "", /application\/json/);
      assert.deepStrictEqual(response.body, UNKNOWN);
    });
  }

  test("POST /perfil → 404 JSON, no la interfaz", async () => {
    const response = await api.post("/perfil");
    assert.strictEqual(response.status, 404);
    assert.deepStrictEqual(response.body, UNKNOWN);
  });

  test("/apix no es la API → index.html", async () => {
    const response = await api.get("/apix");
    assert.strictEqual(response.status, 200);
    assert.match(response.text, /<div id="root">/);
  });
});
