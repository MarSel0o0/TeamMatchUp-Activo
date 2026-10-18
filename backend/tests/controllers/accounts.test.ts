// Cuentas de juego: `/api/accounts` (spec 004, plan, secciones 6, 7, 8, 9 y 11).
// T6: listar, obtener y vincular. RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-29, RF-33,
// RF-37, RF-44, RNF-2, RNF-3.
// - Valores exactos (RNF-1, P-13): el esperado se calcula con las funciones puras
//   (`simulateReading` + `initialState`) y el mismo instante fijo (`FIXED_NOW`), y se compara
//   con la respuesta y con `rawAccountsInDb()`.
// - El instante de las cuentas se fija con `t.mock.method(clock, "now", ...)`; el reloj de
//   las credenciales (`createApp`) no se toca (sección 9).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import type { GameAccountDocument } from "../../src/models/gameAccount.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { clock } from "../../src/utils/clock.ts";
import { MESSAGES } from "../../src/utils/errors.ts";
import { ACCOUNT_ERRORS } from "../../src/domain/accountRules.ts";
import { applySync, initialState, shouldAppendSnapshot } from "../../src/domain/accountState.ts";
import type { AccountState } from "../../src/domain/accountState.ts";
import { canonicalHandle, simulateReading } from "../../src/domain/rankSimulator.ts";
import type { Snapshot } from "../../src/domain/rankSimulator.ts";
import type { GameId } from "../../src/domain/games.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  HEX24_LOWER,
  ISO_MS_Z,
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

// Una cuenta válida por juego (región con la grafía de la lista).
const LINKS = {
  lol: { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" },
  r6: { gameId: "r6", handle: "jugador2", region: "LATAM" },
  cs2: { gameId: "cs2", handle: "76561190000000001", region: "South America" },
} as const satisfies Record<GameId, { gameId: GameId; handle: string; region: string }>;

const ACCOUNT_KEYS = [
  "currentRank",
  "gameId",
  "handle",
  "id",
  "lastSyncedAt",
  "rankHistory",
  "region",
  "simulated",
  "userId",
  "verified",
];

const REAL_SOURCES = /riot|ubisoft|valve|faceit|steam/i;

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

// Estado esperado al vincular: lectura 0 con el identificador canónico (RF-4, RF-35).
function expectedState(gameId: GameId, handle: string, at: number = FIXED_NOW): AccountState {
  const now = new Date(at);
  return initialState(simulateReading({ gameId, canonicalHandle: canonicalHandle(handle), readingNumber: 0, now }), now);
}

// Lo mismo que vería el cliente: fechas en ISO (JSON).
function asJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// Fotografía como la guarda Mongoose (sin `division` si no la tiene).
function storedSnapshot(snapshot: Snapshot): Record<string, unknown> {
  const { tier, division, points, normalized, recordedAt } = snapshot;
  return division === undefined
    ? { tier, points, normalized, recordedAt }
    : { tier, division, points, normalized, recordedAt };
}

// Cuerpo esperado de la cuenta (RF-4, RF-37, RNF-3).
function expectedAccountJson(
  id: string,
  userId: string,
  link: { gameId: GameId; handle: string; region: string },
  state: AccountState,
): unknown {
  return asJson({
    id,
    userId,
    gameId: link.gameId,
    handle: link.handle,
    region: link.region,
    currentRank: storedSnapshot(state.currentRank),
    rankHistory: state.rankHistory.map(storedSnapshot),
    lastSyncedAt: state.lastSyncedAt,
    verified: state.verified,
    simulated: true,
  });
}

// Documento crudo esperado en la base (`lean()`), con los campos internos.
function expectedRawAccount(
  id: string,
  userId: string,
  link: { gameId: GameId; handle: string; region: string },
  state: AccountState,
): unknown {
  return {
    _id: new mongoose.Types.ObjectId(id),
    user: new mongoose.Types.ObjectId(userId),
    gameId: link.gameId,
    handle: link.handle,
    region: link.region,
    currentRank: storedSnapshot(state.currentRank),
    rankHistory: state.rankHistory.map(storedSnapshot),
    matches: state.matches.map((match) => ({
      matchId: match.id,
      gameId: match.gameId,
      playedAt: match.playedAt,
      result: match.result,
      summary: match.summary,
      durationMinutes: match.durationMinutes,
      rankDelta: match.rankDelta,
    })),
    readingNumber: 0,
    lastSyncedAt: state.lastSyncedAt,
    verified: state.verified,
    __v: 0,
  };
}

function bodyId(response: Response): string {
  const body: unknown = response.body;
  const id: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "id") : undefined;
  assert.ok(typeof id === "string", "la respuesta debería traer el id de la cuenta");
  return id;
}

// RNF-3, RF-37: forma exacta de una cuenta y ninguna mención de fuentes reales (RNF-2).
function assertAccountShape(account: unknown): void {
  assert.ok(typeof account === "object" && account !== null);
  assert.deepStrictEqual(Object.keys(account).sort(), ACCOUNT_KEYS);
  assert.match(String(Reflect.get(account, "id")), HEX24_LOWER);
  assert.match(String(Reflect.get(account, "userId")), HEX24_LOWER);
  assert.match(String(Reflect.get(account, "lastSyncedAt")), ISO_MS_Z);
  assert.strictEqual(Reflect.get(account, "simulated"), true);
  assert.strictEqual(typeof Reflect.get(account, "verified"), "boolean");
  const current: unknown = Reflect.get(account, "currentRank");
  assert.ok(typeof current === "object" && current !== null);
  assert.match(String(Reflect.get(current, "recordedAt")), ISO_MS_Z);
  assert.doesNotMatch(JSON.stringify(account), REAL_SOURCES);
}

function link(session: SignedUp, body: unknown): supertest.Test {
  return withSession(session.agent.post("/api/accounts"), session.csrf).send(body as object);
}

async function linkOk(session: SignedUp, body: unknown): Promise<string> {
  const response = await link(session, body);
  assert.strictEqual(response.status, 201);
  return bodyId(response);
}

async function accountIdsOf(userId: string): Promise<string[]> {
  const user = await User.findById(userId).lean();
  assert.ok(user !== null);
  return user.accounts.map((id) => id.toString());
}

describe("sesión (RF-1, RF-44)", () => {
  const operations = [
    { name: "listar", method: "get", path: "/api/accounts" },
    { name: "obtener", method: "get", path: `/api/accounts/${"a".repeat(24)}` },
    { name: "vincular", method: "post", path: "/api/accounts" },
  ] as const;

  for (const operation of operations) {
    test(`${operation.name} sin sesión → 401 "sesión no iniciada"`, async (t) => {
      fixClock(t);
      const response = await supertest(app)[operation.method](operation.path).send(LINKS.lol);
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), []);
    });

    test(`${operation.name} sin cabecera X-CSRF-Token → 401 "token inválido"`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const response = await ana.agent[operation.method](operation.path).send(LINKS.lol);
      assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
      assert.deepStrictEqual(await rawAccountsInDb(), []);
    });

    test(`${operation.name} con credencial de usuario eliminado → 401 "sesión no iniciada"`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      await User.deleteOne({ _id: ana.id });
      const response = await withSession(ana.agent[operation.method](operation.path), ana.csrf).send(LINKS.lol);
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), []);
    });
  }

  test("regresión (spec 002): la misma credencial en /api/users/me sigue en \"token inválido\"", async () => {
    const ana = await signUp(app, ANA);
    await User.deleteOne({ _id: ana.id });
    const response = await withSession(ana.agent.get("/api/users/me"), ana.csrf);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
  });
});

describe("listar", () => {
  // Ana: lol y r6. Beto: lol y cs2.
  async function seed(t: TestContext): Promise<{ ana: SignedUp; beto: SignedUp }> {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(ana, LINKS.lol);
    await linkOk(ana, LINKS.r6);
    await linkOk(beto, LINKS.lol);
    await linkOk(beto, LINKS.cs2);
    return { ana, beto };
  }

  function byFilter(all: unknown[], predicate: (account: Record<string, unknown>) => boolean): unknown[] {
    return all.filter(
      (account) => typeof account === "object" && account !== null && predicate(account as Record<string, unknown>),
    );
  }

  async function list(session: SignedUp, query: string): Promise<Response> {
    return withSession(session.agent.get(`/api/accounts${query}`), session.csrf);
  }

  test("sin filtros → 200 con todas las cuentas, en el orden de la base", async (t) => {
    const { ana } = await seed(t);
    const response = await list(ana, "");
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, await accountsInDb());
    assert.strictEqual((response.body as unknown[]).length, 4);
    for (const account of response.body as unknown[]) assertAccountShape(account);
  });

  test("sin cuentas → 200 con lista vacía", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const response = await list(ana, "");
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, []);
  });

  test("user=me → solo las del usuario de la sesión", async (t) => {
    const { ana } = await seed(t);
    const response = await list(ana, "?user=me");
    assert.strictEqual(response.status, 200);
    const expected = byFilter(await accountsInDb(), (account) => account.userId === ana.id);
    assert.strictEqual(expected.length, 2);
    assert.deepStrictEqual(response.body, expected);
  });

  test("user=<id de otro> (también en mayúsculas) → solo las de ese usuario", async (t) => {
    const { ana, beto } = await seed(t);
    const expected = byFilter(await accountsInDb(), (account) => account.userId === beto.id);
    assert.strictEqual(expected.length, 2);
    for (const value of [beto.id, beto.id.toUpperCase()]) {
      const response = await list(ana, `?user=${value}`);
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, expected);
    }
  });

  test("user con formato válido que no existe → 200 con lista vacía", async (t) => {
    const { ana } = await seed(t);
    const response = await list(ana, `?user=${nonExistingId()}`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, []);
  });

  test("game=lol → solo las de ese juego", async (t) => {
    const { ana } = await seed(t);
    const response = await list(ana, "?game=lol");
    assert.strictEqual(response.status, 200);
    const expected = byFilter(await accountsInDb(), (account) => account.gameId === "lol");
    assert.strictEqual(expected.length, 2);
    assert.deepStrictEqual(response.body, expected);
  });

  test("user=me&game=r6 → los dos filtros a la vez", async (t) => {
    const { ana } = await seed(t);
    const response = await list(ana, "?user=me&game=r6");
    assert.strictEqual(response.status, 200);
    const expected = byFilter(
      await accountsInDb(),
      (account) => account.userId === ana.id && account.gameId === "r6",
    );
    assert.strictEqual(expected.length, 1);
    assert.deepStrictEqual(response.body, expected);
  });

  const invalidUser = [
    { name: "user repetido", query: "?user=me&user=me" },
    { name: "user vacío", query: "?user=" },
    { name: "user sin formato", query: "?user=abc" },
    { name: "user y game inválidos → solo el de user", query: "?user=abc&game=dota" },
  ];
  for (const { name, query } of invalidUser) {
    test(`${name} → 400 "id con formato inválido"`, async (t) => {
      const { ana } = await seed(t);
      assertStatusError(await list(ana, query), 400, ACCOUNT_ERRORS.invalidId);
    });
  }

  const invalidGame = [
    { name: "game repetido", query: "?game=lol&game=lol" },
    { name: "game vacío", query: "?game=" },
    { name: "game inexistente", query: "?game=dota" },
    { name: "user válido y game inválido", query: "?user=me&game=dota" },
  ];
  for (const { name, query } of invalidGame) {
    test(`${name} → 400 "Juego no válido."`, async (t) => {
      const { ana } = await seed(t);
      assertStatusError(await list(ana, query), 400, ACCOUNT_ERRORS.invalidGame);
    });
  }
});

describe("obtener", () => {
  test("cuenta propia → 200 con la cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    const response = await withSession(ana.agent.get(`/api/accounts/${id}`), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, LINKS.lol, expectedState("lol", LINKS.lol.handle)));
    assertAccountShape(response.body);
  });

  test("cuenta de otro usuario → 200 (obtener no comprueba propiedad)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const id = await linkOk(ana, LINKS.cs2);
    const response = await withSession(beto.agent.get(`/api/accounts/${id}`), beto.csrf);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, (await accountsInDb())[0]);
    assertAccountShape(response.body);
  });

  test("id en mayúsculas → 200 con la misma cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.r6);
    const response = await withSession(ana.agent.get(`/api/accounts/${id.toUpperCase()}`), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(bodyId(response), id);
  });

  for (const bad of ["abc", "me", `${"a".repeat(23)}g`, "a".repeat(25)]) {
    test(`id mal formado (${bad}) → 400 "id con formato inválido"`, async () => {
      const ana = await signUp(app, ANA);
      const response = await withSession(ana.agent.get(`/api/accounts/${bad}`), ana.csrf);
      assertStatusError(response, 400, ACCOUNT_ERRORS.invalidId);
    });
  }

  test("id inexistente → 404 \"Cuenta no encontrada.\"", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get(`/api/accounts/${nonExistingId()}`), ana.csrf);
    assertStatusError(response, 404, ACCOUNT_ERRORS.accountNotFound);
  });

  test("%zz sin sesión → 401 \"sesión no iniciada\"", async () => {
    const response = await supertest(app).get("/api/accounts/%zz");
    assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("%zz con sesión → 400 \"id con formato inválido\"", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get("/api/accounts/%zz"), ana.csrf);
    assertStatusError(response, 400, ACCOUNT_ERRORS.invalidId);
  });
});

describe("vincular", () => {
  for (const gameId of ["lol", "r6", "cs2"] as const) {
    test(`${gameId}: 201 con la lectura 0 exacta, en la respuesta y en la base`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const body = LINKS[gameId];
      const response = await link(ana, body);
      assert.strictEqual(response.status, 201);
      assert.match(response.headers["content-type"] ?? "", /application\/json/);
      const id = bodyId(response);
      const state = expectedState(gameId, body.handle);
      assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, body, state));
      assertAccountShape(response.body);
      assert.deepStrictEqual(await rawAccountsInDb(), [expectedRawAccount(id, ana.id, body, state)]);
      assert.deepStrictEqual(await accountsInDb(), [response.body]);
    });
  }

  test("la cuenta se agrega a User.accounts y no aparece en las respuestas de usuario (RF-33)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const lol = await linkOk(ana, LINKS.lol);
    const cs2 = await linkOk(ana, LINKS.cs2);
    assert.deepStrictEqual(await accountIdsOf(ana.id), [lol, cs2]);
    const me = await withSession(ana.agent.get("/api/users/me"), ana.csrf);
    assert.strictEqual(me.status, 200);
    assert.strictEqual(Reflect.get(me.body as object, "accounts"), undefined);
  });

  test("identificador y región sin espacios en los extremos; región con la grafía de la lista", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const response = await link(ana, { gameId: "lol", handle: "  Jugador1#LAS  ", region: " las " });
    assert.strictEqual(response.status, 201);
    const id = bodyId(response);
    const state = expectedState("lol", "Jugador1#LAS");
    assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, LINKS.lol, state));
    assert.deepStrictEqual(await rawAccountsInDb(), [expectedRawAccount(id, ana.id, LINKS.lol, state)]);
  });

  test("se ignoran user, currentRank, verified, readingNumber, simulated y demás campos (RF-7)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const state = expectedState("r6", LINKS.r6.handle);
    const response = await link(ana, {
      ...LINKS.r6,
      user: beto.id,
      userId: beto.id,
      currentRank: { tier: "Champion", points: 9999, normalized: 100, recordedAt: "2000-01-01T00:00:00.000Z" },
      rankHistory: [],
      matches: [],
      verified: !state.verified,
      readingNumber: 7,
      lastSyncedAt: "2000-01-01T00:00:00.000Z",
      simulated: false,
    });
    assert.strictEqual(response.status, 201);
    const id = bodyId(response);
    assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, LINKS.r6, state));
    assert.deepStrictEqual(await rawAccountsInDb(), [expectedRawAccount(id, ana.id, LINKS.r6, state)]);
    assert.deepStrictEqual(await accountIdsOf(beto.id), []);
  });

  test("duplicado → 400 RF-5 y no se crea otra", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    const before = await rawAccountsInDb();
    const response = await link(ana, { gameId: "lol", handle: "Otro#TAG", region: "NA" });
    assertStatusError(response, 400, ACCOUNT_ERRORS.duplicate);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
    assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
  });

  test("dos vinculaciones simultáneas del mismo juego → un 201 y un 400 RF-5", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const responses = await Promise.all([link(ana, LINKS.cs2), link(ana, LINKS.cs2)]);
    const statuses = responses.map((response) => response.status).sort();
    assert.deepStrictEqual(statuses, [201, 400]);
    const created = responses.find((response) => response.status === 201);
    const rejected = responses.find((response) => response.status === 400);
    assert.ok(created !== undefined && rejected !== undefined);
    assertStatusError(rejected, 400, ACCOUNT_ERRORS.duplicate);
    const id = bodyId(created);
    assert.deepStrictEqual(await rawAccountsInDb(), [
      expectedRawAccount(id, ana.id, LINKS.cs2, expectedState("cs2", LINKS.cs2.handle)),
    ]);
    assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
  });

  test("otro juego del mismo usuario no es duplicado", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    await linkOk(ana, LINKS.r6);
    await linkOk(ana, LINKS.cs2);
    assert.strictEqual((await rawAccountsInDb()).length, 3);
  });

  test("mismo identificador en dos usuarios, otra región u otras mayúsculas → misma lectura", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(ana, { gameId: "lol", handle: "Jugador3#LAS", region: "LAS" });
    await linkOk(beto, { gameId: "lol", handle: "jugador3#las", region: "EUW" });
    const [first, second] = await rawAccountsInDb();
    assert.ok(first !== undefined && second !== undefined);
    const reading = ({ currentRank, rankHistory, matches, readingNumber, lastSyncedAt, verified }: typeof first) => ({
      currentRank,
      rankHistory,
      matches,
      readingNumber,
      lastSyncedAt,
      verified,
    });
    assert.deepStrictEqual(reading(first), reading(second));
    assert.strictEqual(first.handle, "Jugador3#LAS");
    assert.strictEqual(second.handle, "jugador3#las");
    assert.strictEqual(second.region, "EUW");
    const state = expectedState("lol", "Jugador3#LAS");
    assert.deepStrictEqual(first, expectedRawAccount(first._id.toString(), ana.id, {
      gameId: "lol",
      handle: "Jugador3#LAS",
      region: "LAS",
    }, state));
  });

  const invalid = [
    { name: "cuerpo vacío", body: {}, error: ACCOUNT_ERRORS.invalidGame },
    { name: "juego inexistente", body: { ...LINKS.lol, gameId: "dota" }, error: ACCOUNT_ERRORS.invalidGame },
    { name: "todo inválido → solo el juego", body: { gameId: 1, handle: null, region: null }, error: ACCOUNT_ERRORS.invalidGame },
    { name: "identificador nulo (LoL)", body: { ...LINKS.lol, handle: null }, error: ACCOUNT_ERRORS.invalidHandle.lol },
    { name: "identificador solo espacios (R6)", body: { ...LINKS.r6, handle: "   " }, error: ACCOUNT_ERRORS.invalidHandle.r6 },
    { name: "identificador que no es texto (CS2)", body: { ...LINKS.cs2, handle: 7656119 }, error: ACCOUNT_ERRORS.invalidHandle.cs2 },
    { name: "identificador y región inválidos → solo el identificador", body: { gameId: "r6", handle: "x", region: "" }, error: ACCOUNT_ERRORS.invalidHandle.r6 },
    { name: "región vacía", body: { ...LINKS.lol, region: "" }, error: ACCOUNT_ERRORS.invalidRegion("lol") },
    { name: "región de otro juego", body: { ...LINKS.cs2, region: "LAS" }, error: ACCOUNT_ERRORS.invalidRegion("cs2") },
    { name: "región que no es texto", body: { ...LINKS.r6, region: 3 }, error: ACCOUNT_ERRORS.invalidRegion("r6") },
  ];
  for (const { name, body, error } of invalid) {
    test(`${name} → 400 "${error}" sin crear nada (RF-6)`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      assertStatusError(await link(ana, body), 400, error);
      assert.deepStrictEqual(await rawAccountsInDb(), []);
      assert.deepStrictEqual(await accountIdsOf(ana.id), []);
    });
  }

  test("datos inválidos antes que duplicado (RF-29)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    assertStatusError(await link(ana, { ...LINKS.lol, region: "XX" }), 400, ACCOUNT_ERRORS.invalidRegion("lol"));
  });

  test("ninguna respuesta de error menciona fuentes reales (RNF-2)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    for (const body of [{ gameId: "dota" }, { ...LINKS.lol, region: "XX" }]) {
      const response = await link(ana, body);
      assert.doesNotMatch(String(Reflect.get(response.body as object, "error")), /valve|faceit|steam web api/i);
    }
    await linkOk(ana, LINKS.lol);
    const duplicate = await link(ana, LINKS.lol);
    assert.doesNotMatch(JSON.stringify(duplicate.body), REAL_SOURCES);
  });
});

// --- T7: editar y desvincular. RF-7, RF-8, RF-9, RF-11, RF-22, RF-29, RF-33, RF-38, RF-40 ---

function edit(session: SignedUp, id: string, body: unknown): supertest.Test {
  return withSession(session.agent.put(`/api/accounts/${id}`), session.csrf).send(body as object);
}

function unlink(session: SignedUp, id: string): supertest.Test {
  return withSession(session.agent.delete(`/api/accounts/${id}`), session.csrf);
}

// Documento crudo sin `__v`: la versión es interna de la concurrencia optimista (DP-29).
function withoutVersion(account: object): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...account };
  delete rest.__v;
  return rest;
}

const ONE_HOUR = 60 * 60 * 1000;

describe("editar", () => {
  // Ana vincula LoL (región LAS) al instante fijo.
  async function seedLol(t: TestContext): Promise<{ ana: SignedUp; id: string }> {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    return { ana, id };
  }

  test("región válida con otra grafía → 200 con la grafía de la lista; nada más cambia (RF-8)", async (t) => {
    const { ana, id } = await seedLol(t);
    const [before] = await rawAccountsInDb();
    assert.ok(before !== undefined);
    fixClock(t, FIXED_NOW + ONE_HOUR); // otro instante: la edición no lo usa
    const response = await edit(ana, id, { region: " euw " });
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    const state = expectedState("lol", LINKS.lol.handle);
    assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, { ...LINKS.lol, region: "EUW" }, state));
    assertAccountShape(response.body);
    const [after] = await rawAccountsInDb();
    assert.ok(after !== undefined);
    assert.deepStrictEqual(withoutVersion(after), { ...withoutVersion(before), region: "EUW" });
    assert.strictEqual(after.readingNumber, 0);
    assert.deepStrictEqual(after.lastSyncedAt, new Date(FIXED_NOW));
    assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
  });

  test("región igual a la guardada con otra grafía → 200 sin cambios", async (t) => {
    const { ana, id } = await seedLol(t);
    const before = await rawAccountsInDb();
    const response = await edit(ana, id, { region: " las " });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, (await accountsInDb())[0]);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("mismo identificador con otras mayúsculas y espacios + región nueva → 200; el identificador no cambia (RF-22, DP-19)", async (t) => {
    const { ana, id } = await seedLol(t);
    const [before] = await rawAccountsInDb();
    assert.ok(before !== undefined);
    const response = await edit(ana, id, { handle: "  jugador1#las ", region: "NA" });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(Reflect.get(response.body as object, "handle"), LINKS.lol.handle);
    assert.strictEqual(Reflect.get(response.body as object, "region"), "NA");
    const [after] = await rawAccountsInDb();
    assert.ok(after !== undefined);
    assert.deepStrictEqual(withoutVersion(after), { ...withoutVersion(before), region: "NA" });
  });

  test("mismo identificador sin región → 200 sin cambios", async (t) => {
    const { ana, id } = await seedLol(t);
    const before = await rawAccountsInDb();
    const response = await edit(ana, id, { handle: "JUGADOR1#LAS" });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, (await accountsInDb())[0]);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("cuerpo vacío → 200 con la cuenta sin cambios (RF-40)", async (t) => {
    const { ana, id } = await seedLol(t);
    const before = await rawAccountsInDb();
    const response = await edit(ana, id, {});
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(
      response.body,
      expectedAccountJson(id, ana.id, LINKS.lol, expectedState("lol", LINKS.lol.handle)),
    );
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("sin cuerpo → 200 con la cuenta sin cambios (RF-40)", async (t) => {
    const { ana, id } = await seedLol(t);
    const before = await rawAccountsInDb();
    const response = await withSession(ana.agent.put(`/api/accounts/${id}`), ana.csrf);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, (await accountsInDb())[0]);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("solo campos ignorados (dueño, rango, partidas, número, fechas, marcas) → 200 sin cambios (RF-7, RF-40)", async (t) => {
    const { ana, id } = await seedLol(t);
    const beto = await signUp(app, BETO);
    const before = await rawAccountsInDb();
    const response = await edit(ana, id, {
      gameId: "dota",
      user: beto.id,
      userId: beto.id,
      currentRank: { tier: "Challenger", points: 9999, normalized: 100, recordedAt: "2000-01-01T00:00:00.000Z" },
      rankHistory: [],
      matches: [],
      readingNumber: 7,
      lastSyncedAt: "2000-01-01T00:00:00.000Z",
      verified: true,
      simulated: false,
    });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, (await accountsInDb())[0]);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
    assert.deepStrictEqual(await accountIdsOf(beto.id), []);
  });

  test("un juego en el cuerpo se ignora aunque no exista; la región se valida con el juego de la cuenta (RF-7)", async (t) => {
    const { ana, id } = await seedLol(t);
    const [before] = await rawAccountsInDb();
    assert.ok(before !== undefined);
    const nonexistent = await edit(ana, id, { gameId: "dota", region: "EUW" });
    assert.strictEqual(nonexistent.status, 200);
    assert.strictEqual(Reflect.get(nonexistent.body as object, "gameId"), "lol");
    assert.strictEqual(Reflect.get(nonexistent.body as object, "region"), "EUW");
    // Región de LoL con un juego de R6 en el cuerpo: vale, porque cuenta el juego de la cuenta.
    const otherGame = await edit(ana, id, { gameId: "r6", region: "kr" });
    assert.strictEqual(otherGame.status, 200);
    assert.strictEqual(Reflect.get(otherGame.body as object, "gameId"), "lol");
    assert.strictEqual(Reflect.get(otherGame.body as object, "region"), "KR");
    // Región de R6 con un juego de R6 en el cuerpo: inválida para la cuenta de LoL.
    assertStatusError(await edit(ana, id, { gameId: "r6", region: "LATAM" }), 400, ACCOUNT_ERRORS.invalidRegion("lol"));
    const [after] = await rawAccountsInDb();
    assert.ok(after !== undefined);
    assert.deepStrictEqual(withoutVersion(after), { ...withoutVersion(before), region: "KR" });
  });

  const otherHandles = [
    { name: "otro identificador", handle: "Otro#TAG" },
    { name: "nulo", handle: null },
    { name: "vacío", handle: "" },
    { name: "solo espacios", handle: "   " },
    { name: "no es texto", handle: 12345 },
  ];
  for (const { name, handle } of otherHandles) {
    test(`identificador ${name} → 400 RF-22 y la base no cambia`, async (t) => {
      const { ana, id } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { handle }), 400, ACCOUNT_ERRORS.handleNotEditable);
      assertStatusError(await edit(ana, id, { handle, region: "EUW" }), 400, ACCOUNT_ERRORS.handleNotEditable);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });
  }

  const badRegions = [
    { name: "inexistente", region: "XX" },
    { name: "nula", region: null },
    { name: "vacía", region: "" },
    { name: "solo espacios", region: "   " },
    { name: "que no es texto", region: 3 },
    { name: "de otro juego", region: "South America" },
  ];
  for (const { name, region } of badRegions) {
    test(`región ${name} → 400 RF-38 y la base no cambia`, async (t) => {
      const { ana, id } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { region }), 400, ACCOUNT_ERRORS.invalidRegion("lol"));
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });
  }

  test("región inválida en R6 y CS2 → el texto nombra el juego de la cuenta (RF-38)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const r6 = await linkOk(ana, LINKS.r6);
    const cs2 = await linkOk(ana, LINKS.cs2);
    const before = await rawAccountsInDb();
    assertStatusError(await edit(ana, r6, { region: "LAS" }), 400, ACCOUNT_ERRORS.invalidRegion("r6"));
    assertStatusError(await edit(ana, cs2, { region: "LATAM" }), 400, ACCOUNT_ERRORS.invalidRegion("cs2"));
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  describe("orden de errores (RF-29)", () => {
    test("sin sesión → 401 \"sesión no iniciada\"", async (t) => {
      const { id } = await seedLol(t);
      const before = await rawAccountsInDb();
      const response = await supertest(app).put(`/api/accounts/${id}`).send({ region: "XX" });
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("credencial de usuario eliminado → 401 \"sesión no iniciada\" (RF-44)", async (t) => {
      const { ana, id } = await seedLol(t);
      await User.deleteOne({ _id: ana.id });
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { region: "EUW" }), 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    for (const bad of ["abc", "me", `${"a".repeat(23)}g`]) {
      test(`id mal formado (${bad}), incluso con datos inválidos → 400 "id con formato inválido"`, async (t) => {
        const { ana } = await seedLol(t);
        const before = await rawAccountsInDb();
        assertStatusError(await edit(ana, bad, { handle: null, region: "XX" }), 400, ACCOUNT_ERRORS.invalidId);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("%zz con sesión → 400 \"id con formato inválido\"", async (t) => {
      const { ana } = await seedLol(t);
      assertStatusError(await edit(ana, "%zz", { region: "EUW" }), 400, ACCOUNT_ERRORS.invalidId);
    });

    test("inexistente, incluso con datos inválidos → 404 \"Cuenta no encontrada.\"", async (t) => {
      const { ana } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, nonExistingId(), { handle: null, region: "XX" }), 404, ACCOUNT_ERRORS.accountNotFound);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    const foreignBodies = [
      { name: "región válida", body: { region: "EUW" } },
      { name: "región inválida", body: { region: "XX" } },
      { name: "identificador distinto y región inválida", body: { handle: "Otro#TAG", region: "XX" } },
      { name: "cuerpo vacío", body: {} },
    ];
    for (const { name, body } of foreignBodies) {
      test(`cuenta ajena con ${name} → 403 RF-11 y la base no cambia`, async (t) => {
        const { ana, id } = await seedLol(t);
        const beto = await signUp(app, BETO);
        const before = await rawAccountsInDb();
        assertStatusError(await edit(beto, id, body), 403, ACCOUNT_ERRORS.forbidden);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
        assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
      });
    }

    test("identificador distinto y región inválida → solo RF-22", async (t) => {
      const { ana, id } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { handle: "Otro#TAG", region: "XX" }), 400, ACCOUNT_ERRORS.handleNotEditable);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("id en mayúsculas → 200 sobre la misma cuenta", async (t) => {
      const { ana, id } = await seedLol(t);
      const response = await edit(ana, id.toUpperCase(), { region: "BR" });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(bodyId(response), id);
      assert.strictEqual(Reflect.get(response.body as object, "region"), "BR");
    });
  });
});

describe("desvincular", () => {
  test("cuenta propia → 204 sin cuerpo; la cuenta se borra y sale de User.accounts (RF-9, RF-33)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const lol = await linkOk(ana, LINKS.lol);
    const cs2 = await linkOk(ana, LINKS.cs2);
    const betoLol = await linkOk(beto, LINKS.lol);
    const response = await unlink(ana, lol);
    assert.strictEqual(response.status, 204);
    assert.strictEqual(response.text, "");
    const remaining = (await rawAccountsInDb()).map((account) => account._id.toString());
    assert.deepStrictEqual(remaining, [cs2, betoLol]);
    assert.strictEqual(await GameAccount.exists({ _id: lol }), null);
    assert.deepStrictEqual(await accountIdsOf(ana.id), [cs2]);
    assert.deepStrictEqual(await accountIdsOf(beto.id), [betoLol]);
    const get = await withSession(ana.agent.get(`/api/accounts/${lol}`), ana.csrf);
    assertStatusError(get, 404, ACCOUNT_ERRORS.accountNotFound);
  });

  test("id en mayúsculas → 204 sobre la misma cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.r6);
    assert.strictEqual((await unlink(ana, id.toUpperCase())).status, 204);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await accountIdsOf(ana.id), []);
  });

  test("tras desvincular se puede volver a vincular el mismo juego (RF-5)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    assert.strictEqual((await unlink(ana, id)).status, 204);
    const again = await linkOk(ana, LINKS.lol);
    assert.deepStrictEqual(await accountIdsOf(ana.id), [again]);
  });

  test("dos veces la misma cuenta → la segunda 404 \"Cuenta no encontrada.\"", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    assert.strictEqual((await unlink(ana, id)).status, 204);
    assertStatusError(await unlink(ana, id), 404, ACCOUNT_ERRORS.accountNotFound);
  });

  describe("orden de errores (RF-29)", () => {
    test("sin sesión → 401 \"sesión no iniciada\"", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const id = await linkOk(ana, LINKS.lol);
      const before = await rawAccountsInDb();
      assertStatusError(await supertest(app).delete(`/api/accounts/${id}`), 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("credencial de usuario eliminado → 401 \"sesión no iniciada\" (RF-44)", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const id = await linkOk(ana, LINKS.lol);
      await User.deleteOne({ _id: ana.id });
      const before = await rawAccountsInDb();
      assertStatusError(await unlink(ana, id), 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    for (const bad of ["abc", "me", "%zz"]) {
      test(`id mal formado (${bad}) → 400 "id con formato inválido"`, async (t) => {
        fixClock(t);
        const ana = await signUp(app, ANA);
        await linkOk(ana, LINKS.lol);
        const before = await rawAccountsInDb();
        assertStatusError(await unlink(ana, bad), 400, ACCOUNT_ERRORS.invalidId);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("inexistente → 404 \"Cuenta no encontrada.\"", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const id = await linkOk(ana, LINKS.lol);
      const before = await rawAccountsInDb();
      assertStatusError(await unlink(ana, nonExistingId()), 404, ACCOUNT_ERRORS.accountNotFound);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
      assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
    });

    test("cuenta ajena → 403 RF-11; la cuenta y User.accounts no cambian", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const beto = await signUp(app, BETO);
      const id = await linkOk(ana, LINKS.lol);
      const before = await rawAccountsInDb();
      assertStatusError(await unlink(beto, id), 403, ACCOUNT_ERRORS.forbidden);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
      assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
    });
  });
});

// --- T8: resincronizar, concurrencia y fallo forzado (RF-10, RF-11, RF-15, RF-28, RF-29,
// RF-39, RF-42, RF-43, RF-45; DP-9, DP-36). El esperado se calcula con `simulateReading` +
// `initialState` / `applySync` y los mismos instantes fijos (P-13).

function sync(session: SignedUp, id: string): supertest.Test {
  return withSession(session.agent.post(`/api/accounts/${id}/sync`), session.csrf);
}

// Estado tras vincular en `linkedAt` y resincronizar en cada instante de `syncs` (lecturas 1..k).
function expectedSyncedState(gameId: GameId, handle: string, linkedAt: number, syncs: readonly number[]): AccountState {
  const canonical = canonicalHandle(handle);
  return syncs.reduce((state, at, index) => {
    const now = new Date(at);
    const readingNumber = index + 1;
    return applySync(state, simulateReading({ gameId, canonicalHandle: canonical, readingNumber, now }), readingNumber, now);
  }, expectedState(gameId, handle, linkedAt));
}

// Documento crudo esperado sin `__v`, con el número de lectura del estado.
function expectedRawSynced(
  id: string,
  userId: string,
  data: { gameId: GameId; handle: string; region: string },
  state: AccountState,
): Record<string, unknown> {
  return { ...withoutVersion(expectedRawAccount(id, userId, data, state) as object), readingNumber: state.readingNumber };
}

async function onlyRawAccount(): Promise<Record<string, unknown>> {
  const [account, ...rest] = await rawAccountsInDb();
  assert.ok(account !== undefined);
  assert.strictEqual(rest.length, 0);
  return withoutVersion(account);
}

// Primer identificador R6 de la forma `jugador<i>` cuya lectura 1 cumple `predicate` respecto de la 0.
function findR6Handle(predicate: (previous: Snapshot, next: Snapshot) => boolean): string {
  const now = new Date(FIXED_NOW);
  for (let i = 0; i < 1000; i += 1) {
    const handle = `jugador${i}`;
    const r0 = simulateReading({ gameId: "r6", canonicalHandle: handle, readingNumber: 0, now });
    const r1 = simulateReading({ gameId: "r6", canonicalHandle: handle, readingNumber: 1, now });
    if (predicate(r0.snapshot, r1.snapshot)) return handle;
  }
  throw new Error("ningún identificador cumple la condición");
}

describe("resincronizar", () => {
  for (const gameId of Object.keys(LINKS) as GameId[]) {
    test(`${gameId}: dos resincronizaciones → lecturas 1 y 2 exactas, en la respuesta y en la base (RF-10)`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const data = LINKS[gameId];
      const id = await linkOk(ana, data);
      const instants = [FIXED_NOW + ONE_HOUR, FIXED_NOW + 3 * ONE_HOUR];
      for (const [index, at] of instants.entries()) {
        fixClock(t, at);
        const response = await sync(ana, id);
        const state = expectedSyncedState(gameId, data.handle, FIXED_NOW, instants.slice(0, index + 1));
        assert.strictEqual(state.readingNumber, index + 1);
        assert.strictEqual(response.status, 200);
        assertAccountShape(response.body);
        assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, data, state));
        assert.deepStrictEqual(response.body, (await accountsInDb())[0]);
        assert.deepStrictEqual(await onlyRawAccount(), expectedRawSynced(id, ana.id, data, state));
        assert.strictEqual(Reflect.get(response.body as object, "lastSyncedAt"), new Date(at).toISOString());
      }
      assert.deepStrictEqual(await accountIdsOf(ana.id), [id]); // RF-33: la lista no cambia
    });
  }

  test("historial sin cambio de tier, división ni puntos → no se agrega fotografía (DP-9, DP-36)", async (t) => {
    const handle = findR6Handle((previous, next) => !shouldAppendSnapshot(previous, next));
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, { ...LINKS.r6, handle });
    fixClock(t, FIXED_NOW + ONE_HOUR);
    const response = await sync(ana, id);
    assert.strictEqual(response.status, 200);
    const body = response.body as { currentRank: Record<string, unknown>; rankHistory: Record<string, unknown>[] };
    assert.strictEqual(body.rankHistory.length, 1);
    const [last] = body.rankHistory;
    assert.ok(last !== undefined);
    // El último coincide con el vigente salvo la fecha, que es anterior (DP-36).
    assert.deepStrictEqual({ ...last, recordedAt: null }, { ...body.currentRank, recordedAt: null });
    assert.strictEqual(last.recordedAt, new Date(FIXED_NOW).toISOString());
    assert.strictEqual(body.currentRank.recordedAt, new Date(FIXED_NOW + ONE_HOUR).toISOString());
    const raw = await onlyRawAccount();
    assert.strictEqual(raw.readingNumber, 1);
  });

  test("historial con cambio → se agrega la fotografía al final (DP-9, DP-36)", async (t) => {
    const handle = findR6Handle((previous, next) => shouldAppendSnapshot(previous, next));
    fixClock(t);
    const ana = await signUp(app, ANA);
    const linked = await link(ana, { ...LINKS.r6, handle });
    assert.strictEqual(linked.status, 201);
    const id = bodyId(linked);
    fixClock(t, FIXED_NOW + ONE_HOUR);
    const response = await sync(ana, id);
    assert.strictEqual(response.status, 200);
    const body = response.body as { currentRank: unknown; rankHistory: unknown[] };
    const before = linked.body as { rankHistory: unknown[] };
    assert.deepStrictEqual(body.rankHistory, [...before.rankHistory, body.currentRank]);
  });

  test("cinco resincronizaciones → como máximo 20 partidas, con la principal de la última (RF-15, RF-28, RF-42)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const data = LINKS.r6;
    const id = await linkOk(ana, data);
    const instants = [1, 2, 3, 4, 5].map((hours) => FIXED_NOW + hours * ONE_HOUR);
    const canonical = canonicalHandle(data.handle);
    const readings = [0, ...instants.keys()].map((_, n) =>
      simulateReading({ gameId: "r6", canonicalHandle: canonical, readingNumber: n, now: new Date(FIXED_NOW) }),
    );
    // Precondición: las seis lecturas entregan más de 20 partidas en total.
    assert.ok(readings.reduce((total, reading) => total + reading.matches.length, 0) > 20);
    for (const at of instants) {
      fixClock(t, at);
      assert.strictEqual((await sync(ana, id)).status, 200);
    }
    const expected = expectedSyncedState("r6", data.handle, FIXED_NOW, instants);
    const raw = await onlyRawAccount();
    assert.deepStrictEqual(raw, expectedRawSynced(id, ana.id, data, expected));
    const matches = raw.matches as { matchId: string }[];
    assert.strictEqual(matches.length, 20);
    const lastMain = readings[5]?.mainMatchId;
    assert.ok(lastMain !== undefined);
    assert.ok(matches.some((match) => match.matchId === lastMain));
    assert.strictEqual(new Set(matches.map((match) => match.matchId)).size, matches.length);
  });

  describe("orden de errores (RF-29)", () => {
    async function seed(t: TestContext): Promise<{ ana: SignedUp; id: string }> {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const id = await linkOk(ana, LINKS.lol);
      return { ana, id };
    }

    test("sin sesión → 401 \"sesión no iniciada\"", async (t) => {
      const { id } = await seed(t);
      const before = await rawAccountsInDb();
      assertStatusError(await supertest(app).post(`/api/accounts/${id}/sync`), 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("sin cabecera X-CSRF-Token → 401 \"token inválido\"", async (t) => {
      const { ana, id } = await seed(t);
      const before = await rawAccountsInDb();
      assertStatusError(await ana.agent.post(`/api/accounts/${id}/sync`), 401, SESSION_MESSAGES.invalidToken);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("credencial de usuario eliminado → 401 \"sesión no iniciada\" (RF-44)", async (t) => {
      const { ana, id } = await seed(t);
      await User.deleteOne({ _id: ana.id });
      const before = await rawAccountsInDb();
      assertStatusError(await sync(ana, id), 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    for (const bad of ["abc", "me", "%zz"]) {
      test(`id mal formado (${bad}) → 400 "id con formato inválido"`, async (t) => {
        const { ana } = await seed(t);
        const before = await rawAccountsInDb();
        assertStatusError(await sync(ana, bad), 400, ACCOUNT_ERRORS.invalidId);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("inexistente → 404 \"Cuenta no encontrada.\"", async (t) => {
      const { ana } = await seed(t);
      const before = await rawAccountsInDb();
      assertStatusError(await sync(ana, nonExistingId()), 404, ACCOUNT_ERRORS.accountNotFound);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("cuenta ajena → 403 RF-11 y la base no cambia", async (t) => {
      const { ana, id } = await seed(t);
      const beto = await signUp(app, BETO);
      const before = await rawAccountsInDb();
      fixClock(t, FIXED_NOW + ONE_HOUR);
      assertStatusError(await sync(beto, id), 403, ACCOUNT_ERRORS.forbidden);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
      assert.deepStrictEqual(await accountIdsOf(ana.id), [id]);
    });

    test("id en mayúsculas → 200 sobre la misma cuenta (lectura 1)", async (t) => {
      const { ana, id } = await seed(t);
      const response = await sync(ana, id.toUpperCase());
      assert.strictEqual(response.status, 200);
      assert.strictEqual(bodyId(response), id);
      assert.strictEqual((await onlyRawAccount()).readingNumber, 1);
    });
  });
});

// Hace que las `count` primeras llamadas a `GameAccount.findById` esperen a que todas se
// hayan hecho antes de devolver el documento: así todas leen la misma versión (carrera
// forzada y determinista). Las siguientes llamadas (reintentos) pasan directo.
function forceSimultaneousReads(t: TestContext, count: number): { calls: () => number } {
  const original = GameAccount.findById.bind(GameAccount);
  let calls = 0;
  let release: () => void = () => undefined;
  const allIssued = new Promise<void>((resolve) => {
    release = resolve;
  });
  t.mock.method(GameAccount, "findById", async (id: string) => {
    calls += 1;
    const position = calls;
    const account = await original(id);
    if (position <= count) {
      if (position === count) release();
      await allIssued;
    }
    return account;
  });
  return { calls: () => calls };
}

describe("concurrencia", () => {
  test("dos resincronizaciones simultáneas → número de lectura 2 y estado igual al serial (RF-39)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const data = LINKS.r6;
    const id = await linkOk(ana, data);
    const responses = await Promise.all([sync(ana, id), sync(ana, id)]);
    assert.deepStrictEqual(responses.map((response) => response.status), [200, 200]);
    const serial1 = expectedSyncedState("r6", data.handle, FIXED_NOW, [FIXED_NOW]);
    const serial2 = expectedSyncedState("r6", data.handle, FIXED_NOW, [FIXED_NOW, FIXED_NOW]);
    assert.deepStrictEqual(await onlyRawAccount(), expectedRawSynced(id, ana.id, data, serial2));
    // Una respuesta es la del primer paso en serie y la otra la del segundo.
    const bodies = responses.map((response) => JSON.stringify(response.body)).sort();
    const expected = [serial1, serial2].map((state) => JSON.stringify(expectedAccountJson(id, ana.id, data, state))).sort();
    assert.deepStrictEqual(bodies, expected);
  });

  test("carrera forzada: ambas leen la misma versión → una reintenta con el número siguiente (RF-39)", { timeout: 20_000 }, async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const data = LINKS.lol;
    const id = await linkOk(ana, data);
    const reads = forceSimultaneousReads(t, 2);
    const responses = await Promise.all([sync(ana, id), sync(ana, id)]);
    assert.deepStrictEqual(responses.map((response) => response.status), [200, 200]);
    assert.strictEqual(reads.calls(), 3); // dos lecturas iniciales y un reintento
    const serial2 = expectedSyncedState("lol", data.handle, FIXED_NOW, [FIXED_NOW, FIXED_NOW]);
    assert.deepStrictEqual(await onlyRawAccount(), expectedRawSynced(id, ana.id, data, serial2));
    const raw = await onlyRawAccount();
    const ids = (raw.matches as { matchId: string }[]).map((match) => match.matchId);
    assert.strictEqual(new Set(ids).size, ids.length); // ninguna partida repetida
  });

  test("desvincular y resincronizar a la vez → 204, sync 200 o 404 y la cuenta no existe al final (RF-39)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.cs2);
    const [unlinked, synced] = await Promise.all([unlink(ana, id), sync(ana, id)]);
    assert.strictEqual(unlinked.status, 204);
    assert.ok([200, 404].includes(synced.status), `sync respondió ${synced.status}`);
    if (synced.status === 404) assertStatusError(synced, 404, ACCOUNT_ERRORS.accountNotFound);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await accountIdsOf(ana.id), []);
  });

  test("desvinculación entre la lectura y la escritura de la sync → 204 y 404; save no recrea la cuenta (RF-39)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.cs2);
    const originalSave = GameAccount.prototype.save;
    let unlinked: Response | undefined;
    t.mock.method(
      GameAccount.prototype,
      "save",
      async function (this: GameAccountDocument, ...args: Parameters<GameAccountDocument["save"]>) {
        unlinked ??= await unlink(ana, id); // la desvinculación termina antes de escribir
        return originalSave.apply(this, args);
      },
    );
    const synced = await sync(ana, id);
    assert.strictEqual(unlinked?.status, 204);
    assertStatusError(synced, 404, ACCOUNT_ERRORS.accountNotFound);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await accountIdsOf(ana.id), []);
  });

  test("resincronizar y desvincular en serie → 200 y 204; la cuenta no existe al final (RF-39)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.cs2);
    assert.strictEqual((await sync(ana, id)).status, 200);
    assert.strictEqual((await unlink(ana, id)).status, 204);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
  });
});

describe("fallo", () => {
  test("save forzado a fallar → 500, base idéntica y la siguiente sync usa el mismo número (RF-45)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const data = LINKS.lol;
    const id = await linkOk(ana, data);
    const before = await rawAccountsInDb();
    const failing = t.mock.method(GameAccount.prototype, "save", async () => {
      throw new Error("fallo forzado");
    });
    fixClock(t, FIXED_NOW + ONE_HOUR);
    assertStatusError(await sync(ana, id), 500, MESSAGES.internal);
    assert.strictEqual(failing.mock.callCount(), 1); // sin reintentos ante otro error
    assert.deepStrictEqual(await rawAccountsInDb(), before);
    failing.mock.restore();
    const at = FIXED_NOW + 2 * ONE_HOUR;
    fixClock(t, at);
    const response = await sync(ana, id);
    assert.strictEqual(response.status, 200);
    const expected = expectedSyncedState("lol", data.handle, FIXED_NOW, [at]);
    assert.strictEqual(expected.readingNumber, 1);
    assert.deepStrictEqual(response.body, expectedAccountJson(id, ana.id, data, expected));
    assert.deepStrictEqual(await onlyRawAccount(), expectedRawSynced(id, ana.id, data, expected));
  });
});
