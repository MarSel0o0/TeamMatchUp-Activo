// Guardia de las rutas de usuario, listado y obtener un usuario (spec 003, plan §3.1–§3.3 y
// §6.2). RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-18 (pasos 1–3), RF-20, RNF-2.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { CSRF_HEADER, SESSION_COOKIE, SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { USER_TARGET_MESSAGES } from "../../src/services/userTarget.ts";
import { testConfig } from "../server/helpers.ts";
import {
  HEX24_LOWER,
  ISO_MS_Z,
  authApp,
  closeTestServers,
  nonExistingId,
  rawCookieRequest,
  setCreatedAt,
  signUp,
  withSession,
} from "./helpers.ts";
import type { HttpMethod, SignedUp } from "./helpers.ts";

const app = await authApp();
const api = supertest(app);

const PUBLIC_KEYS = ["avatarColor", "bio", "createdAt", "displayName", "id", "timezone", "username"];
const OWN_KEYS = [...PUBLIC_KEYS, "email"].sort();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const CARO = { email: "caro@example.com", username: "Caro" } as const;

const MALFORMED = { error: "JSON mal formado" };
const TOO_LARGE = { error: "cuerpo demasiado grande" };
const UNSUPPORTED = { error: "codificación no soportada" };

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

function keysOf(value: unknown): string[] {
  assert.ok(typeof value === "object" && value !== null, "se esperaba un objeto");
  return Object.keys(value).sort();
}

function fieldOf(value: unknown, key: string): unknown {
  assert.ok(typeof value === "object" && value !== null, "se esperaba un objeto");
  return Reflect.get(value, key);
}

// RNF-2: identificador en minúsculas y fecha ISO 8601 con milisegundos y `Z`.
function assertRepresentation(user: unknown): void {
  const id = fieldOf(user, "id");
  const createdAt = fieldOf(user, "createdAt");
  assert.ok(typeof id === "string" && HEX24_LOWER.test(id), `id con otro formato: ${String(id)}`);
  assert.ok(typeof createdAt === "string" && ISO_MS_Z.test(createdAt), `fecha con otro formato: ${String(createdAt)}`);
}

// Datos propios tal como los da la consulta de sesión de la spec 002.
async function ownData(session: SignedUp): Promise<unknown> {
  const response = await withSession(session.agent.get("/api/auth/me"), session.csrf);
  assert.strictEqual(response.status, 200);
  return response.body;
}

// Datos públicos esperados: los propios sin el correo.
async function publicData(session: SignedUp): Promise<Record<string, unknown>> {
  const own = await ownData(session);
  assert.ok(typeof own === "object" && own !== null);
  const copy: Record<string, unknown> = { ...own };
  delete copy["email"];
  return copy;
}

interface Operation {
  method: HttpMethod;
  path: (segment: string) => string;
  body?: unknown; // cuerpo que no pasaría las validaciones de la 003
}

// Las 6 operaciones de la spec (las que aún no existen las cubre la guardia).
const OPERATIONS: readonly Operation[] = [
  { method: "get", path: () => "/api/users" },
  { method: "get", path: (segment) => `/api/users/${segment}` },
  { method: "patch", path: (segment) => `/api/users/${segment}`, body: { displayName: 5, avatarColor: "#abc" } },
  { method: "delete", path: (segment) => `/api/users/${segment}` },
  { method: "get", path: (segment) => `/api/users/${segment}/availability` },
  { method: "put", path: (segment) => `/api/users/${segment}/availability`, body: { blocks: "2-20" } },
];

const SEGMENTS_WITHOUT_SESSION = ["me", "aaaaaaaaaaaa", "%zz", "%E0%A4", "Me", "%20me"];

function send(test: supertest.Test, body: unknown): supertest.Test {
  return body === undefined ? test : test.send(body as object);
}

describe("RF-1: sesión obligatoria en las 6 operaciones", () => {
  for (const operation of OPERATIONS) {
    for (const segment of [...SEGMENTS_WITHOUT_SESSION, "valido"]) {
      const label = `${operation.method.toUpperCase()} ${operation.path(segment)}`;
      test(`sin cookie: ${label} → 401 sesión no iniciada`, async () => {
        const target = segment === "valido" ? nonExistingId() : segment;
        const response = await send(api[operation.method](operation.path(target)), operation.body);
        assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
      });
    }
  }

  for (const path of ["/api/users/me/", "/api/users/me/AVAILABILITY", "/api/users/me/availability/", "/api/users/"]) {
    test(`sin cookie: GET ${path} → 401 (paridad con Express, R5)`, async () => {
      const response = await api.get(path);
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
    });
  }

  test("sin cookie: HEAD /api/users → 401 sin cuerpo", async () => {
    const response = await api.head("/api/users");
    assert.strictEqual(response.status, 401);
    assert.strictEqual(response.text ?? "", "");
  });

  test("sin cookie: el registro sigue siendo público (POST /api/users → 201)", async () => {
    const response = await api.post("/api/users").send({ ...ANA, password: "contraseña-segura" });
    assert.strictEqual(response.status, 201);
  });

  for (const operation of OPERATIONS) {
    test(`credencial alterada: ${operation.method.toUpperCase()} ${operation.path("me")} → 401 token inválido`, async () => {
      const ana = await signUp(app, ANA);
      const altered = `${ana.cookie.slice(0, -2)}${ana.cookie.endsWith("AA") ? "BB" : "AA"}`;
      const request = rawCookieRequest(app, operation.method, operation.path("me"), altered, ana.csrf);
      const response = await send(request, operation.body);
      assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    });
  }

  test("credencial válida sin comprobante: GET /api/users/%zz → 401 token inválido, no 400", async () => {
    const ana = await signUp(app, ANA);
    const response = await api.get("/api/users/%zz").set("Cookie", `${SESSION_COOKIE}=${ana.cookie}`);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
  });

  test("comprobante que no coincide: GET /api/users → 401 token inválido", async () => {
    const ana = await signUp(app, ANA);
    const response = await ana.agent.get("/api/users").set(CSRF_HEADER, "otro");
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
  });
});

describe("RF-18: la interpretación del cuerpo de la spec 001 va antes que la sesión", () => {
  test("PATCH /api/users/me con JSON mal formado y sin cookie → 400 JSON mal formado", async () => {
    const response = await api.patch("/api/users/me").set("Content-Type", "application/json").send('{"a":');
    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(response.body, MALFORMED);
  });

  test("PUT /api/users/%zz/availability con más de 102 400 bytes y sin cookie → 413", async () => {
    const body = JSON.stringify({ blocks: ["2-20".repeat(30_000)] });
    const response = await api.put("/api/users/%zz/availability").set("Content-Type", "application/json").send(body);
    assert.strictEqual(response.status, 413);
    assert.deepStrictEqual(response.body, TOO_LARGE);
  });

  test("DELETE /api/users/me con codificación no soportada y sin cookie → 415", async () => {
    const response = await api
      .delete("/api/users/me")
      .set("Content-Type", "application/json")
      .set("Content-Encoding", "desconocida")
      .send('{"a":1}');
    assert.strictEqual(response.status, 415);
    assert.deepStrictEqual(response.body, UNSUPPORTED);
  });
});

describe("RF-2, RF-4, RNF-2: listado", () => {
  test("solo el usuario de la sesión → lista con sus datos propios", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get("/api/users"), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.deepStrictEqual(response.body, [await ownData(ana)]);
  });

  test("ordenado por fecha de creación ascendente; el propio con correo, los demás públicos", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const caro = await signUp(app, CARO);
    // Orden de creación distinto del de inserción: Caro, Ana, Beto.
    await setCreatedAt([caro.id], new Date("2026-01-01T00:00:00.000Z"));
    await setCreatedAt([ana.id], new Date("2026-01-02T00:00:00.000Z"));
    await setCreatedAt([beto.id], new Date("2026-01-03T00:00:00.000Z"));

    const response = await withSession(ana.agent.get("/api/users"), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body));
    const list: unknown[] = response.body;
    assert.deepStrictEqual(
      list.map((user) => fieldOf(user, "id")),
      [caro.id, ana.id, beto.id],
    );
    assert.deepStrictEqual(list[0], await publicData(caro));
    assert.deepStrictEqual(list[1], await ownData(ana));
    assert.deepStrictEqual(list[2], await publicData(beto));
    assert.deepStrictEqual(keysOf(list[0]), PUBLIC_KEYS);
    assert.deepStrictEqual(keysOf(list[1]), OWN_KEYS);
    assert.deepStrictEqual(keysOf(list[2]), PUBLIC_KEYS);
    for (const user of list) assertRepresentation(user);
    assert.strictEqual(fieldOf(list[1], "createdAt"), "2026-01-02T00:00:00.000Z");
  });

  test("misma fecha de creación → por identificador ascendente", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const caro = await signUp(app, CARO);
    // Ana se reinserta: en el orden natural queda la última aunque su identificador es el menor.
    const anaObjectId = new mongoose.Types.ObjectId(ana.id);
    const raw = await User.collection.findOne({ _id: anaObjectId });
    assert.ok(raw !== null);
    await User.collection.deleteOne({ _id: anaObjectId });
    await User.collection.insertOne(raw);
    await setCreatedAt([caro.id], new Date("2026-01-01T00:00:00.000Z"));
    await setCreatedAt([ana.id, beto.id], new Date("2026-02-01T00:00:00.000Z"));

    const response = await withSession(beto.agent.get("/api/users"), beto.csrf);
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body));
    const list: unknown[] = response.body;
    const tied = [ana.id, beto.id].sort();
    assert.deepStrictEqual(
      list.map((user) => fieldOf(user, "id")),
      [caro.id, ...tied],
    );
    // El correo solo en el de la sesión (Beto).
    for (const user of list) {
      assert.deepStrictEqual(keysOf(user), fieldOf(user, "id") === beto.id ? OWN_KEYS : PUBLIC_KEYS);
    }
  });

  test("nunca expone hash, clave del nombre ni disponibilidad", async () => {
    const ana = await signUp(app, ANA);
    await signUp(app, BETO);
    await User.collection.updateMany({}, { $set: { availability: ["2-20"] } });
    const response = await withSession(ana.agent.get("/api/users"), ana.csrf);
    assert.strictEqual(response.status, 200);
    const text = response.text;
    for (const forbidden of ["passwordHash", "usernameKey", "availability", "_id", "__v", "beto@example.com"]) {
      assert.ok(!text.includes(forbidden), `la respuesta contiene ${forbidden}`);
    }
  });

  test("HEAD /api/users con sesión → 200 sin cuerpo", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.head("/api/users"), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.text ?? "", "");
  });
});

describe("RF-3, RF-4, RF-6, RNF-2: obtener un usuario", () => {
  test("otro usuario → 200 con sus datos públicos (sin correo)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const response = await withSession(ana.agent.get(`/api/users/${beto.id}`), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, await publicData(beto));
    assert.deepStrictEqual(keysOf(response.body), PUBLIC_KEYS);
    assertRepresentation(response.body);
  });

  test("otro usuario con su id en mayúsculas → 200 público con el id en minúsculas", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const response = await withSession(ana.agent.get(`/api/users/${beto.id.toUpperCase()}`), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, await publicData(beto));
  });

  for (const [label, segment] of [
    ["por su id", (id: string) => id],
    ["por me", () => "me"],
    ["por m%65", () => "m%65"],
    ["por su id en mayúsculas", (id: string) => id.toUpperCase()],
    ["con / final", (id: string) => `${id}/`],
  ] as const) {
    test(`el propio ${label} → 200 con correo e id en minúsculas`, async () => {
      const ana = await signUp(app, ANA);
      await signUp(app, BETO);
      const response = await withSession(ana.agent.get(`/api/users/${segment(ana.id)}`), ana.csrf);
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, await ownData(ana));
      assert.deepStrictEqual(keysOf(response.body), OWN_KEYS);
      assert.strictEqual(fieldOf(response.body, "id"), ana.id);
      assert.strictEqual(fieldOf(response.body, "email"), ANA.email);
      assertRepresentation(response.body);
    });
  }

  test("HEAD /api/users/me → 200 sin cuerpo", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.head("/api/users/me"), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.text ?? "", "");
  });
});

describe("RF-5, RF-20: identificador inválido o inexistente al obtener", () => {
  const invalid = [
    "aaaaaaaaaaaa",
    "a".repeat(23),
    "a".repeat(25),
    `${"a".repeat(23)}z`,
    `${"a".repeat(23)}g`,
    "Me",
    "ME",
    "%20me",
    "%zz",
    "%E0%A4",
    "%",
  ];
  for (const segment of invalid) {
    test(`GET /api/users/${segment} → 400 id con formato inválido`, async () => {
      const ana = await signUp(app, ANA);
      const response = await withSession(ana.agent.get(`/api/users/${segment}`), ana.csrf);
      assertStatusError(response, 400, USER_TARGET_MESSAGES.invalidId);
    });
  }

  test("id con formato válido que no existe → 404 usuario no encontrado", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get(`/api/users/${nonExistingId()}`), ana.csrf);
    assertStatusError(response, 404, USER_TARGET_MESSAGES.userNotFound);
  });

  test("id inexistente en mayúsculas → 404 (no 400)", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get(`/api/users/${nonExistingId().toUpperCase()}`), ana.csrf);
    assertStatusError(response, 404, USER_TARGET_MESSAGES.userNotFound);
  });

  for (const segment of ["%zz", "%E0%A4"]) {
    test(`GET /api/users/${segment}/availability con sesión → 400 id con formato inválido (guardia)`, async () => {
      const ana = await signUp(app, ANA);
      const response = await withSession(ana.agent.get(`/api/users/${segment}/availability`), ana.csrf);
      assertStatusError(response, 400, USER_TARGET_MESSAGES.invalidId);
    });
  }
});
