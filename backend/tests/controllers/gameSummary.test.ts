// Resumen por juego y cascada al eliminar usuario (spec 004, plan, secciones 6, 8 y 11).
// RF-12, RF-13, RF-14, RF-29 (resumen), RF-37, RF-39 (usuario), RF-44.
// - `GET /api/users/:id/games/:gameId`: la guardia de usuarios lo reconoce (`kind: "games"`)
//   y usa `withExistingUser` (P-14, P-15).
// - Valores exactos (RNF-1, P-13): el esperado se calcula con `simulateReading` +
//   `initialState` / `applySync` y las funciones puras del resumen (`recentMatches`,
//   `winRate`, `trend`) con los mismos instantes fijos.
// - Montaje según T8b (P-18): servidor ya escuchando en 127.0.0.1 y cierre en `after`.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { clock } from "../../src/utils/clock.ts";
import { ACCOUNT_ERRORS } from "../../src/domain/accountRules.ts";
import { applySync, initialState, recentMatches, trend, winRate } from "../../src/domain/accountState.ts";
import type { AccountState } from "../../src/domain/accountState.ts";
import { canonicalHandle, simulateReading } from "../../src/domain/rankSimulator.ts";
import type { GameId } from "../../src/domain/games.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  accountsInDb,
  authApp,
  closeTestServers,
  nonExistingId,
  rawAccountsInDb,
  signUp,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const LINKS = {
  lol: { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" },
  r6: { gameId: "r6", handle: "jugador2", region: "LATAM" },
  cs2: { gameId: "cs2", handle: "76561190000000001", region: "South America" },
} as const satisfies Record<GameId, { gameId: GameId; handle: string; region: string }>;

const HOUR = 3_600_000;
const SUMMARY_KEYS = ["account", "recentMatches", "trend", "winRate"];
const MATCH_KEYS = ["durationMinutes", "gameId", "id", "playedAt", "rankDelta", "result", "summary"];

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function fixClock(t: TestContext, at: number = FIXED_NOW): void {
  t.mock.method(clock, "now", () => new Date(at));
}

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

function asJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function bodyId(response: Response): string {
  const body: unknown = response.body;
  const id: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "id") : undefined;
  assert.ok(typeof id === "string", "la respuesta debería traer el id de la cuenta");
  return id;
}

function link(session: SignedUp, body: unknown): supertest.Test {
  return withSession(session.agent.post("/api/accounts"), session.csrf).send(body as object);
}

async function linkOk(session: SignedUp, body: unknown): Promise<string> {
  const response = await link(session, body);
  assert.strictEqual(response.status, 201);
  return bodyId(response);
}

function sync(session: SignedUp, id: string): supertest.Test {
  return withSession(session.agent.post(`/api/accounts/${id}/sync`), session.csrf);
}

function summary(session: SignedUp, user: string, game: string): supertest.Test {
  return withSession(session.agent.get(`/api/users/${user}/games/${game}`), session.csrf);
}

function deleteMe(session: SignedUp): supertest.Test {
  return withSession(session.agent.delete("/api/users/me"), session.csrf);
}

// Estado tras vincular en FIXED_NOW y resincronizar en cada instante de `syncs`.
function expectedState(gameId: GameId, handle: string, syncs: readonly number[]): AccountState {
  const canonical = canonicalHandle(handle);
  const linkedAt = new Date(FIXED_NOW);
  const start = initialState(
    simulateReading({ gameId, canonicalHandle: canonical, readingNumber: 0, now: linkedAt }),
    linkedAt,
  );
  return syncs.reduce((state, at, index) => {
    const now = new Date(at);
    const readingNumber = index + 1;
    return applySync(state, simulateReading({ gameId, canonicalHandle: canonical, readingNumber, now }), readingNumber, now);
  }, start);
}

// Instantes de resincronización (una por hora) hasta tener más de 8 partidas guardadas.
function syncsForMoreThanEight(gameId: GameId, handle: string): number[] {
  const syncs: number[] = [];
  while (expectedState(gameId, handle, syncs).matches.length <= 8) {
    syncs.push(FIXED_NOW + (syncs.length + 1) * HOUR);
    assert.ok(syncs.length <= 20, "no se alcanzan más de 8 partidas");
  }
  return syncs;
}

// Resumen esperado (RF-12, RF-37): la cuenta como la ve el cliente y las 8 primeras partidas.
function expectedSummary(account: unknown, state: AccountState): unknown {
  const recent = recentMatches(state.matches);
  return asJson({
    account,
    recentMatches: recent.map((match) => ({
      id: match.id,
      gameId: match.gameId,
      playedAt: match.playedAt,
      result: match.result,
      summary: match.summary,
      durationMinutes: match.durationMinutes,
      rankDelta: match.rankDelta,
    })),
    winRate: winRate(recent),
    trend: trend(state.currentRank, state.rankHistory),
  });
}

function assertSummaryShape(body: unknown): void {
  assert.ok(typeof body === "object" && body !== null);
  assert.deepStrictEqual(Object.keys(body).sort(), SUMMARY_KEYS);
  const account: unknown = Reflect.get(body, "account");
  assert.ok(typeof account === "object" && account !== null);
  assert.strictEqual(Reflect.get(account, "simulated"), true);
  assert.strictEqual("matches" in account, false);
  assert.strictEqual("readingNumber" in account, false);
  const matches: unknown = Reflect.get(body, "recentMatches");
  assert.ok(Array.isArray(matches));
  for (const match of matches) {
    assert.ok(typeof match === "object" && match !== null);
    assert.deepStrictEqual(Object.keys(match).sort(), MATCH_KEYS);
  }
}

describe("resumen por juego (RF-12, RF-37)", () => {
  test("cuenta recién vinculada: me → 200 con la cuenta, sus partidas, tasa y tendencia", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    for (const gameId of Object.keys(LINKS) as GameId[]) {
      const data = LINKS[gameId];
      await linkOk(ana, data);
      const response = await summary(ana, "me", gameId);
      assert.strictEqual(response.status, 200, gameId);
      assert.match(response.headers["content-type"] ?? "", /application\/json/);
      assertSummaryShape(response.body);
      const [account] = (await accountsInDb()).filter(
        (stored) => typeof stored === "object" && stored !== null && Reflect.get(stored, "gameId") === gameId,
      );
      assert.deepStrictEqual(response.body, expectedSummary(account, expectedState(gameId, data.handle, [])), gameId);
    }
  });

  test("tras varias resincronizaciones: solo las 8 primeras partidas en orden RF-28", async (t) => {
    const data = LINKS.r6;
    const syncs = syncsForMoreThanEight(data.gameId, data.handle);
    let current = FIXED_NOW;
    t.mock.method(clock, "now", () => new Date(current));
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, data);
    for (const at of syncs) {
      current = at;
      assert.strictEqual((await sync(ana, id)).status, 200);
    }
    const state = expectedState(data.gameId, data.handle, syncs);
    assert.ok(state.matches.length > 8);
    const response = await summary(ana, "me", data.gameId);
    assert.strictEqual(response.status, 200);
    assertSummaryShape(response.body);
    const [account] = await accountsInDb();
    assert.deepStrictEqual(response.body, expectedSummary(account, state));
    const recent: unknown = Reflect.get(response.body as object, "recentMatches");
    assert.ok(Array.isArray(recent));
    assert.strictEqual(recent.length, 8);
  });

  test("resumen de otro usuario por su identificador → 200, igual que el propio", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(ana, LINKS.cs2);
    const own = await summary(ana, "me", "cs2");
    const other = await summary(beto, ana.id, "cs2");
    assert.strictEqual(other.status, 200);
    assertSummaryShape(other.body);
    assert.deepStrictEqual(other.body, own.body);
    const upper = await summary(beto, ana.id.toUpperCase(), "cs2");
    assert.strictEqual(upper.status, 200);
    assert.deepStrictEqual(upper.body, own.body);
  });

  test("HEAD del resumen → 200 sin cuerpo", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    const response = await withSession(ana.agent.head("/api/users/me/games/lol"), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.text, undefined);
  });
});

describe("orden de errores del resumen (RF-13, RF-29)", () => {
  test("usuario con formato inválido → 400 \"id con formato inválido\" (antes que el juego)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    for (const [user, game] of [
      ["abc", "lol"],
      ["%zz", "lol"],
      ["abc", "xx"],
      ["%zz", "%zz"],
      ["abc", "%zz"],
      ["%20me", "lol"],
    ]) {
      assertStatusError(await summary(ana, user ?? "", game ?? ""), 400, ACCOUNT_ERRORS.invalidId);
    }
  });

  test("juego inválido → 400 \"Juego no válido.\" (antes que la existencia del usuario)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    for (const [user, game] of [
      ["me", "xx"],
      ["me", "%zz"],
      ["me", "LOL"],
      [nonExistingId(), "xx"],
      [nonExistingId(), "%zz"],
    ]) {
      assertStatusError(await summary(ana, user ?? "", game ?? ""), 400, ACCOUNT_ERRORS.invalidGame);
    }
  });

  test("usuario inexistente → 404 \"Usuario no encontrado.\"", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    assertStatusError(await summary(ana, nonExistingId(), "lol"), 404, ACCOUNT_ERRORS.userNotFound);
  });

  test("sin cuenta en ese juego → 404 \"El jugador no tiene una cuenta vinculada en este juego.\"", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(ana, LINKS.lol);
    assertStatusError(await summary(ana, "me", "r6"), 404, ACCOUNT_ERRORS.noAccountForGame);
    assertStatusError(await summary(ana, beto.id, "lol"), 404, ACCOUNT_ERRORS.noAccountForGame);
  });
});

describe("sesión del resumen (RF-1, RF-29, RF-44)", () => {
  test("sin sesión → 401 \"sesión no iniciada\", también con segmentos mal formados", async () => {
    for (const path of ["/api/users/me/games/lol", "/api/users/%zz/games/lol", "/api/users/me/games/%zz"]) {
      assertStatusError(await supertest(app).get(path), 401, SESSION_MESSAGES.notLoggedIn);
    }
  });

  test("sin cabecera X-CSRF-Token → 401 \"token inválido\"", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await ana.agent.get("/api/users/me/games/lol"), 401, SESSION_MESSAGES.invalidToken);
  });

  test("credencial de usuario eliminado → 401 \"sesión no iniciada\"", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(beto, LINKS.lol);
    await User.deleteOne({ _id: ana.id });
    assertStatusError(await summary(ana, "me", "lol"), 401, SESSION_MESSAGES.notLoggedIn);
    assertStatusError(await summary(ana, beto.id, "lol"), 401, SESSION_MESSAGES.notLoggedIn);
  });
});

describe("eliminar usuario (RF-14, RF-39)", () => {
  test("DELETE /api/users/me borra todas sus cuentas y no las de otros", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(ana, LINKS.lol);
    await linkOk(ana, LINKS.r6);
    const betoAccount = await linkOk(beto, LINKS.lol);
    const response = await deleteMe(ana);
    assert.strictEqual(response.status, 204);
    const remaining = await rawAccountsInDb();
    assert.deepStrictEqual(
      remaining.map((account) => [account._id.toString(), account.user.toString()]),
      [[betoAccount, beto.id]],
    );
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 0);
  });

  test("eliminación simultánea a una vinculación → 204, vinculación 201 o 401 y ninguna cuenta del usuario", async (t) => {
    fixClock(t);
    for (let i = 0; i < 5; i += 1) {
      const user = await signUp(app, { email: `simul${i}@example.com`, username: `Simul${i}` });
      const [linked, deleted] = await Promise.all([link(user, LINKS.lol), deleteMe(user)]);
      assert.strictEqual(deleted.status, 204, `iteración ${i}`);
      assert.ok([201, 401].includes(linked.status), `iteración ${i}: ${linked.status}`);
      if (linked.status === 401) {
        assert.deepStrictEqual(linked.body, { error: SESSION_MESSAGES.notLoggedIn });
      }
      assert.strictEqual(await GameAccount.countDocuments({ user: user.id }), 0, `iteración ${i}`);
      assert.strictEqual(await User.exists({ _id: user.id }), null);
    }
  });

  test("vinculación que termina justo antes del borrado de cuentas → la cascada la borra", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    // La vinculación completa ocurre entre `User.deleteOne` y la cascada: se intercala
    // ejecutando primero la vinculación y después el borrado real del usuario.
    const original = User.deleteOne;
    let linkedStatus = 0;
    t.mock.method(User, "deleteOne", async (...args: unknown[]) => {
      linkedStatus = (await link(ana, LINKS.lol)).status;
      const result: unknown = await Reflect.apply(original, User, args);
      return result;
    });
    assert.strictEqual((await deleteMe(ana)).status, 204);
    assert.strictEqual(linkedStatus, 201);
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 0);
  });
});
