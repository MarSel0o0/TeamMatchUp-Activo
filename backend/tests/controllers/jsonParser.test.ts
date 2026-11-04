// Paso del cuerpo de `/api/sessions` (spec 006, RF-23, RF-28, DP6-36; plan, secciones 6 y 8,
// P6-1). Sin pruebas de 413/415 (D6-1).
// - (a) a (c): con `createApp` real; el router de sesiones se monta en T5, así que (a) acepta
//   404 ("endpoint desconocido") y 401 ("sesion no iniciada"), pero nunca el 400 del global.
// - (d): un `express()` minimo con los dos parsers en el mismo orden que `createApp`.
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import supertest from "supertest";
import { authApp, closeTestServers, listenOnLoopback } from "./helpers.ts";

const app = await authApp();

after(async () => {
  await closeTestServers();
});

function json(path: string, body: string) {
  return supertest(app).post(path).set("Content-Type", "application/json").send(body);
}

describe("parser de /api/sessions con createApp", () => {
  test("(a) un primitivo en /api/sessions no responde 400 JSON mal formado", async () => {
    const response = await json("/api/sessions/x/y/z", "3");
    assert.notStrictEqual(response.status, 400);
    const expected: Array<[number, string]> = [
      [404, "endpoint desconocido"],
      [401, "sesión no iniciada"],
    ];
    assert.ok(
      expected.some(([status, error]) => response.status === status && response.body.error === error),
      `respuesta inesperada: ${response.status} ${JSON.stringify(response.body)}`,
    );
  });

  test("(b) JSON mal formado en /api/sessions responde 400", async () => {
    const response = await json("/api/sessions/x/y/z", "{mal");
    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(response.body, { error: "JSON mal formado" });
  });

  test("(c) el parser global sigue estricto fuera de /api/sessions", async () => {
    for (const body of ["3", "null", '"x"', "true"]) {
      const response = await json("/api/inexistente", body);
      assert.strictEqual(response.status, 400, `cuerpo ${body}`);
      assert.deepStrictEqual(response.body, { error: "JSON mal formado" });
    }
  });
});

describe("(d) los dos parsers en el orden de createApp", () => {
  // Cuerpo tal como lo ve el manejador de la ruta: `kind` distingue null de undefined.
  async function echoServer() {
    const echo = express();
    echo.use("/api/sessions", express.json({ limit: 102_400, strict: false }));
    echo.use(express.json({ limit: 102_400, strict: true }));
    echo.post("/api/sessions/eco", (request, response) => {
      const body: unknown = request.body;
      const kind = body === undefined ? "undefined" : body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
      response.json({ kind, body: body === undefined ? null : body });
    });
    return listenOnLoopback(echo);
  }

  test("null, 3, \"x\", true y [] llegan a request.body tal cual", async () => {
    const server = await echoServer();
    const cases: Array<[string, string, unknown]> = [
      ["null", "null", null],
      ["3", "number", 3],
      ['"x"', "string", "x"],
      ["true", "boolean", true],
      ["[]", "array", []],
    ];
    for (const [raw, kind, body] of cases) {
      const response = await supertest(server)
        .post("/api/sessions/eco")
        .set("Content-Type", "application/json")
        .send(raw);
      assert.strictEqual(response.status, 200, `cuerpo ${raw}`);
      assert.deepStrictEqual(response.body, { kind, body }, `cuerpo ${raw}`);
    }
  });

  test("un objeto llega intacto y el global no relee el cuerpo", async () => {
    const server = await echoServer();
    const response = await supertest(server)
      .post("/api/sessions/eco")
      .set("Content-Type", "application/json")
      .send('{"title":"x"}');
    assert.deepStrictEqual(response.body, { kind: "object", body: { title: "x" } });
  });

  test("text/plain con JSON dentro deja request.body sin definir", async () => {
    const server = await echoServer();
    const response = await supertest(server)
      .post("/api/sessions/eco")
      .set("Content-Type", "text/plain")
      .send('{"title":"x"}');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.kind, "undefined");
  });

  test("el cuerpo vacio deja request.body sin definir o como objeto vacio", async () => {
    const server = await echoServer();
    for (const type of ["application/json", undefined]) {
      const request = supertest(server).post("/api/sessions/eco");
      const response = await (type === undefined ? request : request.set("Content-Type", type)).send();
      assert.strictEqual(response.status, 200);
      assert.ok(
        response.body.kind === "undefined" || (response.body.kind === "object" && Object.keys(response.body.body).length === 0),
        `cuerpo vacio visto como ${JSON.stringify(response.body)}`,
      );
    }
  });

  test("JSON mal formado responde 400 desde el parser local", async () => {
    const server = await echoServer();
    const response = await supertest(server)
      .post("/api/sessions/eco")
      .set("Content-Type", "application/json")
      .send("{mal");
    assert.strictEqual(response.status, 400);
  });
});
