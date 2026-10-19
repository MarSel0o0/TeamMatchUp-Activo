// Barrido de las operaciones protegidas del servidor (spec 006, T10). RF-1, RF-18, DP6-21, DP6-28,
// DP6-32; plan, sección 9 ("Barrido de 401").
// - Lista explícita método + ruta de las specs 002 a 006, contrastada el 2026-10-19 con los routers
//   reales (`auth.ts`, `users.ts`, `accounts.ts`, `matches.ts`, `sessions.ts`). Quedan fuera el
//   registro, el inicio y el cierre de sesión (públicos). Si una ruta deja de coincidir, no se
//   ajusta esta lista por cuenta propia: se reporta (D6-4).
// - Cada petición envía `{}` o ningún cuerpo, porque un cuerpo mal formado (o, al crear o editar
//   sesiones, uno que no es objeto) respondería antes el 400 de RF-23 o RF-28.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { testConfig } from "../server/helpers.ts";
import { authApp, closeTestServers, deleteMe, nonExistingId, rawCookieRequest, signUp } from "./helpers.ts";
import type { HttpMethod } from "./helpers.ts";

const app = await authApp();

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
  await PlaySession.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await PlaySession.deleteMany({});
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

interface ProtectedRoute {
  spec: string;
  method: HttpMethod;
  path: string; // con los marcadores `:id` y `:gameId`
}

const ROUTES: readonly ProtectedRoute[] = [
  { spec: "002", method: "get", path: "/api/auth/me" },
  { spec: "003", method: "get", path: "/api/users" },
  { spec: "003", method: "get", path: "/api/users/:id" },
  { spec: "003", method: "patch", path: "/api/users/:id" },
  { spec: "003", method: "delete", path: "/api/users/:id" },
  { spec: "003", method: "get", path: "/api/users/:id/availability" },
  { spec: "003", method: "put", path: "/api/users/:id/availability" },
  { spec: "004", method: "get", path: "/api/accounts" },
  { spec: "004", method: "post", path: "/api/accounts" },
  { spec: "004", method: "get", path: "/api/accounts/:id" },
  { spec: "004", method: "put", path: "/api/accounts/:id" },
  { spec: "004", method: "delete", path: "/api/accounts/:id" },
  { spec: "004", method: "post", path: "/api/accounts/:id/sync" },
  { spec: "004", method: "get", path: "/api/users/:id/games/:gameId" },
  { spec: "005", method: "get", path: "/api/matches" },
  { spec: "006", method: "get", path: "/api/sessions" },
  { spec: "006", method: "get", path: "/api/sessions/:id" },
  { spec: "006", method: "post", path: "/api/sessions" },
  { spec: "006", method: "put", path: "/api/sessions/:id" },
  { spec: "006", method: "delete", path: "/api/sessions/:id" },
  { spec: "006", method: "post", path: "/api/sessions/:id/join" },
  { spec: "006", method: "post", path: "/api/sessions/:id/leave" },
];

const SESSION_ROUTES = ROUTES.filter((route) => route.spec === "006");

// Ruta concreta: identificadores con formato válido que no corresponden a nada.
function concrete(path: string): string {
  return path.replace(":id", nonExistingId()).replace(":gameId", "lol");
}

function assertStatusError(response: Response, status: number, message: string, label: string): void {
  assert.strictEqual(response.status, status, `${label} → ${response.status} ${JSON.stringify(response.body)}`);
  assert.match(response.headers["content-type"] ?? "", /application\/json/, label);
  assert.deepStrictEqual(response.body, { error: message }, label);
}

describe("la lista del barrido", () => {
  test("tiene 22 operaciones, sin repeticiones, y siete son de la spec 006", () => {
    assert.strictEqual(ROUTES.length, 22);
    assert.strictEqual(new Set(ROUTES.map((route) => `${route.method} ${route.path}`)).size, 22);
    assert.strictEqual(SESSION_ROUTES.length, 7);
  });
});

describe("sin credencial (RF-1)", () => {
  for (const route of ROUTES) {
    test(`${route.method.toUpperCase()} ${route.path} (spec ${route.spec}) → 401 "sesión no iniciada", sin cuerpo y con {}`, async () => {
      const path = concrete(route.path);
      const label = `${route.method.toUpperCase()} ${path}`;
      assertStatusError(await supertest(app)[route.method](path), 401, SESSION_MESSAGES.notLoggedIn, `${label} sin cuerpo`);
      assertStatusError(
        await supertest(app)[route.method](path).send({}),
        401,
        SESSION_MESSAGES.notLoggedIn,
        `${label} con {}`,
      );
    });
  }
});

describe("con la credencial de un usuario eliminado (RF-18, DP6-39)", () => {
  for (const route of SESSION_ROUTES) {
    test(`${route.method.toUpperCase()} ${route.path} → 401 "token inválido", no "sesión no iniciada"`, async () => {
      const ana = await signUp(app, { email: "ana@example.com", username: "Ana" });
      assert.strictEqual((await deleteMe(ana)).status, 204);
      const path = concrete(route.path);
      const label = `${route.method.toUpperCase()} ${path}`;
      assertStatusError(
        await rawCookieRequest(app, route.method, path, ana.cookie, ana.csrf),
        401,
        SESSION_MESSAGES.invalidToken,
        `${label} sin cuerpo`,
      );
      assertStatusError(
        await rawCookieRequest(app, route.method, path, ana.cookie, ana.csrf).send({}),
        401,
        SESSION_MESSAGES.invalidToken,
        `${label} con {}`,
      );
    });
  }
});
