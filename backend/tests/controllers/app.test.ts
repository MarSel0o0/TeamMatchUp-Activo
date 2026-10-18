import { describe, test } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import type { Response } from "supertest";
import { createApp } from "../../src/app.ts";
import { testConfig } from "../server/helpers.ts";

const api = supertest(createApp(testConfig()));

const UNKNOWN = { error: "endpoint desconocido" };
const MALFORMED = { error: "JSON mal formado" };
const TOO_LARGE = { error: "cuerpo demasiado grande" };
const UNSUPPORTED = { error: "codificación no soportada" };

const LIMIT_BYTES = 102_400;

// Arma `{"a":"xxx…"}` con exactamente `bytes` bytes (RF-16).
function jsonBodyOfBytes(bytes: number): string {
  const wrapperBytes = Buffer.byteLength('{"a":""}');
  const body = `{"a":"${"x".repeat(bytes - wrapperBytes)}"}`;
  assert.strictEqual(Buffer.byteLength(body), bytes);
  return body;
}

function assertJsonError(response: Response, status: number, body: { error: string }): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, body);
}

type Method = "get" | "post" | "put" | "patch" | "delete" | "options";
const METHODS: readonly Method[] = ["get", "post", "put", "patch", "delete", "options"];

describe("app: ruta desconocida (RF-4)", () => {
  for (const path of ["/api/inexistente", "/perfil"]) {
    for (const method of METHODS) {
      test(`${method.toUpperCase()} ${path} → 404`, async () => {
        const response = await api[method](path);
        assertJsonError(response, 404, UNKNOWN);
      });
    }
  }
});

describe("app: rutas de la spec 002 con otro método (001-RF-4)", () => {
  for (const [method, path] of [
    ["get", "/api/auth/login"],
    ["put", "/api/users"],
    ["get", "/api/users"],
    ["delete", "/api/users"],
  ] as const) {
    test(`${method.toUpperCase()} ${path} → 404`, async () => {
      const response = await api[method](path);
      assertJsonError(response, 404, UNKNOWN);
    });
  }
});

describe("app: HEAD (RF-7)", () => {
  test("HEAD /api/inexistente → 404, cabecera JSON y cuerpo vacío", async () => {
    const response = await api.head("/api/inexistente");
    assert.strictEqual(response.status, 404);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.strictEqual(response.text ?? "", "");
    assert.deepStrictEqual(response.body, {});
  });
});

describe("app: JSON mal formado (RF-5)", () => {
  for (const raw of ['{"a":', "42", '"texto"', "true", "null"]) {
    test(`${raw} → 400`, async () => {
      const response = await api
        .post("/api/inexistente")
        .set("Content-Type", "application/json")
        .send(raw);
      assertJsonError(response, 400, MALFORMED);
    });
  }

  test("cuerpo vacío con tipo JSON se acepta → 404", async () => {
    const response = await api.post("/api/inexistente").set("Content-Type", "application/json");
    assertJsonError(response, 404, UNKNOWN);
  });

  test("text/plain no se interpreta → 404", async () => {
    const response = await api
      .post("/api/inexistente")
      .set("Content-Type", "text/plain")
      .send("no json");
    assertJsonError(response, 404, UNKNOWN);
  });
});

describe("app: tamaño del cuerpo (RF-16)", () => {
  test("102 401 bytes → 413", async () => {
    const response = await api
      .post("/api/inexistente")
      .set("Content-Type", "application/json")
      .send(jsonBodyOfBytes(LIMIT_BYTES + 1));
    assertJsonError(response, 413, TOO_LARGE);
  });

  test("102 400 bytes → aceptado (404, no 413)", async () => {
    const response = await api
      .post("/api/inexistente")
      .set("Content-Type", "application/json")
      .send(jsonBodyOfBytes(LIMIT_BYTES));
    assertJsonError(response, 404, UNKNOWN);
  });
});

describe("app: codificación no soportada (RF-17)", () => {
  test("Content-Encoding: desconocida → 415", async () => {
    const response = await api
      .post("/api/inexistente")
      .set("Content-Type", "application/json")
      .set("Content-Encoding", "desconocida")
      .send('{"a":1}');
    assertJsonError(response, 415, UNSUPPORTED);
  });

  test("charset=iso-8859-1 → 415", async () => {
    const response = await api
      .post("/api/inexistente")
      .set("Content-Type", "application/json; charset=iso-8859-1")
      .send('{"a":1}');
    assertJsonError(response, 415, UNSUPPORTED);
  });
});

describe("app: el cuerpo se interpreta antes de buscar la ruta", () => {
  test("JSON mal formado a ruta inexistente → 400, no 404", async () => {
    const response = await api
      .put("/perfil")
      .set("Content-Type", "application/json")
      .send('{"a":');
    assertJsonError(response, 400, MALFORMED);
  });

  test("cuerpo demasiado grande a ruta inexistente → 413, no 404", async () => {
    const response = await api
      .put("/perfil")
      .set("Content-Type", "application/json")
      .send(jsonBodyOfBytes(LIMIT_BYTES + 1));
    assertJsonError(response, 413, TOO_LARGE);
  });

  test("codificación no soportada a ruta inexistente → 415, no 404", async () => {
    const response = await api
      .put("/perfil")
      .set("Content-Type", "application/json")
      .set("Content-Encoding", "desconocida")
      .send('{"a":1}');
    assertJsonError(response, 415, UNSUPPORTED);
  });
});
