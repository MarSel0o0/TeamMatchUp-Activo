// Cuentas de juego: `/api/accounts` (spec 004, plan, secciones 6, 7, 8, 9 y 11).
// T6: listar, obtener y vincular. RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-29,
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
  bodyId,
  closeTestServers,
  edit,
  link,
  linkOk,
  nonExistingId,
  rawAccountsInDb,
  signUp,
  sync,
  unlink,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

// Textos exactos de la spec 004 (RF-2, RF-3, RF-5, RF-6, RF-11, RF-13, RF-22, RF-29, RF-38,
// DP-6), escritos como literales: no se importan de `ACCOUNT_ERRORS` (plan, P-23).
const ERR = {
  invalidId: "id con formato inválido",
  invalidGame: "juego no válido",
  invalidHandle: {
    lol: "Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres antes de # y 2 a 5 letras o dígitos después",
    r6: "Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto, guion o guion bajo",
    cs2: "SteamID64 no válido: son 17 dígitos que empiezan por 7656119",
  },
  invalidRegion: {
    lol: "región no válida para League of Legends",
    r6: "región no válida para Rainbow Six Siege",
    cs2: "región no válida para Counter-Strike 2",
  },
  duplicate: "ya tienes una cuenta vinculada en este juego",
  handleNotEditable:
    "el identificador del juego no se puede editar: desvincula la cuenta y vuelve a vincularla",
  forbidden: "no tienes permiso para esta operación",
  accountNotFound: "cuenta no encontrada",
  userNotFound: "usuario no encontrado",
  noAccountForGame: "el jugador no tiene una cuenta vinculada en este juego",
} as const;

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

    test(`${operation.name} con credencial de usuario eliminado → 401 "token inválido"`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      await User.deleteOne({ _id: ana.id });
      const response = await withSession(ana.agent[operation.method](operation.path), ana.csrf).send(LINKS.lol);
      assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
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

  // RF-14, P-21: cuenta sin dueño (el usuario se borra con el driver, sin la cascada). Beto
  // vincula lol y cs2 y se borra; Ana y Carla conservan sus cuentas.
  async function seedWithOrphans(t: TestContext): Promise<{ ana: SignedUp; beto: SignedUp; carla: SignedUp }> {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, { email: "carla@example.com", username: "Carla" });
    await linkOk(beto, LINKS.lol);
    await linkOk(ana, LINKS.lol);
    await linkOk(beto, LINKS.cs2);
    await linkOk(carla, LINKS.r6);
    await linkOk(ana, LINKS.r6);
    const deleted = await User.collection.deleteOne({ _id: new mongoose.Types.ObjectId(beto.id) });
    assert.strictEqual(deleted.deletedCount, 1);
    assert.strictEqual(await GameAccount.countDocuments({ user: beto.id }), 2);
    return { ana, beto, carla };
  }

  function userIdOf(account: unknown): unknown {
    return typeof account === "object" && account !== null ? Reflect.get(account, "userId") : undefined;
  }

  test("RF-14: sin filtro no incluye las cuentas sin dueño y conserva el orden por id", async (t) => {
    const { ana, beto } = await seedWithOrphans(t);
    const response = await list(ana, "");
    assert.strictEqual(response.status, 200);
    const expected = byFilter(await accountsInDb(), (account) => account.userId !== beto.id);
    assert.strictEqual(expected.length, 3);
    assert.deepStrictEqual(response.body, expected);
    assert.ok((response.body as unknown[]).every((account) => userIdOf(account) !== beto.id));
    for (const account of response.body as unknown[]) assertAccountShape(account);
  });

  test("RF-14: con game no incluye las cuentas sin dueño", async (t) => {
    const { ana, beto } = await seedWithOrphans(t);
    for (const gameId of ["lol", "cs2", "r6"] as const) {
      const response = await list(ana, `?game=${gameId}`);
      assert.strictEqual(response.status, 200);
      const expected = byFilter(
        await accountsInDb(),
        (account) => account.gameId === gameId && account.userId !== beto.id,
      );
      assert.deepStrictEqual(response.body, expected);
    }
    assert.strictEqual(((await list(ana, "?game=cs2")).body as unknown[]).length, 0);
    assert.strictEqual(((await list(ana, "?game=lol")).body as unknown[]).length, 1);
  });

  test("RF-14: user=<id borrado> → 200 con lista vacía (con y sin game)", async (t) => {
    const { ana, beto } = await seedWithOrphans(t);
    for (const query of [`?user=${beto.id}`, `?user=${beto.id}&game=lol`]) {
      const response = await list(ana, query);
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, []);
    }
  });

  test("RF-14: las cuentas de los demás usuarios siguen saliendo en ambos filtros", async (t) => {
    const { ana, carla } = await seedWithOrphans(t);
    const byUser = await list(ana, `?user=${carla.id}`);
    assert.strictEqual(byUser.status, 200);
    assert.deepStrictEqual(byUser.body, byFilter(await accountsInDb(), (account) => account.userId === carla.id));
    assert.strictEqual((byUser.body as unknown[]).length, 1);
    const mine = await list(ana, "?user=me");
    assert.deepStrictEqual(mine.body, byFilter(await accountsInDb(), (account) => account.userId === ana.id));
    assert.strictEqual((mine.body as unknown[]).length, 2);
  });

  test("RF-14: dos listados seguidos dan el mismo orden, el de los id en minúsculas ascendentes", async (t) => {
    const { ana } = await seedWithOrphans(t);
    const first = await list(ana, "");
    const second = await list(ana, "");
    assert.strictEqual(first.status, 200);
    assert.deepStrictEqual(second.body, first.body);
    const ids = (first.body as unknown[]).map((account) => String(Reflect.get(account as object, "id")));
    assert.strictEqual(ids.length, 3);
    for (const id of ids) assert.match(id, HEX24_LOWER);
    assert.deepStrictEqual(ids, [...ids].sort());
  });

  test("RF-14: una cuenta insertada con un dueño que nunca existió tampoco aparece", async (t) => {
    const { ana } = await seed(t);
    const before = (await list(ana, "")).body as unknown[];
    const orphan = await GameAccount.collection.insertOne({
      ...(await rawAccountsInDb())[0],
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
    });
    assert.ok(orphan.acknowledged);
    assert.strictEqual(await GameAccount.countDocuments({}), 5);
    const response = await list(ana, "");
    assert.deepStrictEqual(response.body, before);
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
      assertStatusError(await list(ana, query), 400, ERR.invalidId);
    });
  }

  const invalidGame = [
    { name: "game repetido", query: "?game=lol&game=lol" },
    { name: "game vacío", query: "?game=" },
    { name: "game inexistente", query: "?game=dota" },
    { name: "user válido y game inválido", query: "?user=me&game=dota" },
  ];
  for (const { name, query } of invalidGame) {
    test(`${name} → 400 "juego no válido"`, async (t) => {
      const { ana } = await seed(t);
      assertStatusError(await list(ana, query), 400, ERR.invalidGame);
    });
  }

  // T21 (RF-2, DP-10, DP-38): `me` exacto, ya decodificado; todo lo demás con formato propio.
  describe("filtros estrictos (RF-2)", () => {
    const strictUser = [
      { name: "user=Me", query: "?user=Me" },
      { name: "user=ME", query: "?user=ME" },
      { name: "user=%20me (espacio)", query: "?user=%20me" },
      { name: "user=me%20 (espacio final)", query: "?user=me%20" },
      { name: "user=%zz (codificación mal formada)", query: "?user=%zz" },
      { name: "user= (vacío)", query: "?user=" },
      { name: "user repetido con dos identificadores", query: "?user=aaaaaaaaaaaaaaaaaaaaaaaa&user=aaaaaaaaaaaaaaaaaaaaaaaa" },
      { name: "user=%zz con game inválido → solo el de user", query: "?user=%zz&game=xyz" },
      { name: "user=abc&game=xyz → solo el de user", query: "?user=abc&game=xyz" },
      { name: "user= con game inválido → solo el de user", query: "?user=&game=LOL" },
    ];
    for (const { name, query } of strictUser) {
      test(`${name} → 400 "id con formato inválido"`, async (t) => {
        const { ana } = await seed(t);
        assertStatusError(await list(ana, query), 400, ERR.invalidId);
      });
    }

    test("user=m%65 (se decodifica a me) → 200 con las cuentas del usuario de la sesión", async (t) => {
      const { ana } = await seed(t);
      const response = await list(ana, "?user=m%65");
      assert.strictEqual(response.status, 200);
      const expected = byFilter(await accountsInDb(), (account) => account.userId === ana.id);
      assert.strictEqual(expected.length, 2);
      assert.deepStrictEqual(response.body, expected);
      assert.deepStrictEqual(response.body, (await list(ana, "?user=me")).body);
    });

    const strictGame = [
      { name: "game=LOL", query: "?game=LOL" },
      { name: "game=%20lol (espacio)", query: "?game=%20lol" },
      { name: "game= (vacío)", query: "?game=" },
      { name: "game=lol&game=cs2 (repetido)", query: "?game=lol&game=cs2" },
      { name: "user=me&game=LOL", query: "?user=me&game=LOL" },
    ];
    for (const { name, query } of strictGame) {
      test(`${name} → 400 "juego no válido"`, async (t) => {
        const { ana } = await seed(t);
        assertStatusError(await list(ana, query), 400, ERR.invalidGame);
      });
    }

    // Los nombres se comparan exactamente: `User`, `user[]` y `page` son otros nombres (DP-38).
    const ignored = [
      { name: "page=2", query: "?page=2" },
      { name: "User=abc", query: "?User=abc" },
      { name: "user[]=abc", query: "?user[]=abc" },
      { name: "Game=xyz", query: "?Game=xyz" },
      { name: "page=2&User=abc&user[]=abc", query: "?page=2&User=abc&user[]=abc" },
    ];
    for (const { name, query } of ignored) {
      test(`${name} se ignora → 200 con la lista completa`, async (t) => {
        const { ana } = await seed(t);
        const response = await list(ana, query);
        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(response.body, await accountsInDb());
        assert.strictEqual((response.body as unknown[]).length, 4);
      });
    }

    test("un parámetro ignorado no cambia los filtros válidos que lo acompañan", async (t) => {
      const { ana } = await seed(t);
      const response = await list(ana, "?page=2&user=me&User=abc&game=r6");
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(
        response.body,
        byFilter(await accountsInDb(), (account) => account.userId === ana.id && account.gameId === "r6"),
      );
    });

    test("los filtros inválidos no dependen de que la lista tenga cuentas", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      assertStatusError(await list(ana, "?user=Me"), 400, ERR.invalidId);
      assertStatusError(await list(ana, "?game=LOL"), 400, ERR.invalidGame);
      assert.deepStrictEqual((await list(ana, "?page=2")).body, []);
    });
  });
});

// T21 (RF-29): la interpretación del cuerpo (spec 001) va antes que la sesión, en todas las
// operaciones de `/api/accounts`, aunque no lean el cuerpo (DELETE y sync). Cada caso se
// prueba sin sesión (el error del cuerpo y nunca el 401) y con sesión (el mismo error, sin
// ejecutar la operación: la cuenta de Ana queda intacta).
describe("cuerpo antes que sesión (RF-29)", () => {
  const BODY_LIMIT = 102_400;

  // Arma `{"a":"xxx…"}` con exactamente `bytes` bytes.
  function jsonBodyOfBytes(bytes: number): string {
    const wrapperBytes = Buffer.byteLength('{"a":""}');
    const body = `{"a":"${"x".repeat(bytes - wrapperBytes)}"}`;
    assert.strictEqual(Buffer.byteLength(body), bytes);
    return body;
  }

  type Method = "post" | "put" | "delete";
  interface Operation {
    name: string;
    method: Method;
    path: (accountId: string) => string;
  }
  const operations: readonly Operation[] = [
    { name: "POST /api/accounts", method: "post", path: () => "/api/accounts" },
    { name: "PUT /api/accounts/:id", method: "put", path: (id) => `/api/accounts/${id}` },
    { name: "DELETE /api/accounts/:id", method: "delete", path: (id) => `/api/accounts/${id}` },
    { name: "POST /api/accounts/:id/sync", method: "post", path: (id) => `/api/accounts/${id}/sync` },
  ];

  interface BodyCase {
    name: string;
    status: number;
    error: string;
    body: string;
    encoding?: string;
  }
  const bodyCases: readonly BodyCase[] = [
    { name: 'JSON truncado {"a":', status: 400, error: "JSON mal formado", body: '{"a":' },
    { name: "cuerpo de 102 401 bytes", status: 413, error: "cuerpo demasiado grande", body: jsonBodyOfBytes(BODY_LIMIT + 1) },
    {
      name: "codificación no soportada",
      status: 415,
      error: "codificación no soportada",
      body: '{"a":1}',
      encoding: "desconocida",
    },
    { name: 'cuerpo JSON "x"', status: 400, error: "JSON mal formado", body: '"x"' },
    { name: "cuerpo JSON 5", status: 400, error: "JSON mal formado", body: "5" },
    { name: "cuerpo JSON true", status: 400, error: "JSON mal formado", body: "true" },
    { name: "cuerpo JSON false", status: 400, error: "JSON mal formado", body: "false" },
    { name: "cuerpo JSON null", status: 400, error: "JSON mal formado", body: "null" },
  ];

  function raw(request: supertest.Test, body: string, encoding: string | undefined): supertest.Test {
    const json = request.set("Content-Type", "application/json");
    return (encoding === undefined ? json : json.set("Content-Encoding", encoding)).send(body);
  }

  for (const operation of operations) {
    for (const bodyCase of bodyCases) {
      test(`${operation.name} con ${bodyCase.name} → ${bodyCase.status} "${bodyCase.error}", con y sin sesión`, async (t) => {
        fixClock(t);
        const ana = await signUp(app, ANA);
        const accountId = await linkOk(ana, LINKS.lol);
        const before = await rawAccountsInDb();
        const path = operation.path(accountId);

        // Sin sesión: el error del cuerpo, no el 401.
        const anonymous = await raw(supertest(app)[operation.method](path), bodyCase.body, bodyCase.encoding);
        assertStatusError(anonymous, bodyCase.status, bodyCase.error);

        // Con sesión y comprobante: el mismo error, sin tocar la cuenta.
        const request = withSession(ana.agent[operation.method](path), ana.csrf);
        assertStatusError(await raw(request, bodyCase.body, bodyCase.encoding), bodyCase.status, bodyCase.error);

        // Con credencial de usuario eliminado: sigue ganando el cuerpo (antes que "token inválido").
        const other = await signUp(app, BETO);
        await User.deleteOne({ _id: other.id });
        const stale = withSession(other.agent[operation.method](path), other.csrf);
        assertStatusError(await raw(stale, bodyCase.body, bodyCase.encoding), bodyCase.status, bodyCase.error);

        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test(`${operation.name} sin sesión y con cuerpo válido → 401 "sesión no iniciada"`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const accountId = await linkOk(ana, LINKS.lol);
      const before = await rawAccountsInDb();
      const request = supertest(app)[operation.method](operation.path(accountId));
      const response = await request.set("Content-Type", "application/json").send(JSON.stringify(LINKS.lol));
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });
  }

  test("el 102 400 bytes exactos sí se acepta: sin sesión → 401, no 413", async () => {
    const response = await supertest(app)
      .post("/api/accounts")
      .set("Content-Type", "application/json")
      .send(jsonBodyOfBytes(BODY_LIMIT));
    assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
  });
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

  test("RF-14: cuenta cuyo dueño ya no existe → 404 \"cuenta no encontrada\"", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const orphanId = await linkOk(beto, LINKS.lol);
    const otherId = await linkOk(ana, LINKS.lol);
    await User.collection.deleteOne({ _id: new mongoose.Types.ObjectId(beto.id) });
    assert.strictEqual(await GameAccount.countDocuments({ _id: orphanId }), 1);
    for (const id of [orphanId, orphanId.toUpperCase()]) {
      assertStatusError(await withSession(ana.agent.get(`/api/accounts/${id}`), ana.csrf), 404, ERR.accountNotFound);
    }
    const other = await withSession(ana.agent.get(`/api/accounts/${otherId}`), ana.csrf);
    assert.strictEqual(other.status, 200);
    assert.strictEqual(bodyId(other), otherId);
  });

  for (const bad of ["abc", "me", `${"a".repeat(23)}g`, "a".repeat(25)]) {
    test(`id mal formado (${bad}) → 400 "id con formato inválido"`, async () => {
      const ana = await signUp(app, ANA);
      const response = await withSession(ana.agent.get(`/api/accounts/${bad}`), ana.csrf);
      assertStatusError(response, 400, ERR.invalidId);
    });
  }

  test("id inexistente → 404 \"cuenta no encontrada\"", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get(`/api/accounts/${nonExistingId()}`), ana.csrf);
    assertStatusError(response, 404, ERR.accountNotFound);
  });

  test("%zz sin sesión → 401 \"sesión no iniciada\"", async () => {
    const response = await supertest(app).get("/api/accounts/%zz");
    assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("%zz con sesión → 400 \"id con formato inválido\"", async () => {
    const ana = await signUp(app, ANA);
    const response = await withSession(ana.agent.get("/api/accounts/%zz"), ana.csrf);
    assertStatusError(response, 400, ERR.invalidId);
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

  test("vincular no cambia ningún dato del usuario ni lo escribe, en los tres juegos (RF-46)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const before = await User.findById(ana.id).lean();
    assert.ok(before !== null);
    const writing = t.mock.method(User, "updateOne");
    for (const gameId of ["lol", "r6", "cs2"] as const) {
      await linkOk(ana, LINKS[gameId]);
      assert.deepStrictEqual(await User.findById(ana.id).lean(), before, gameId);
    }
    assert.strictEqual(writing.mock.callCount(), 0);
    assert.strictEqual((await rawAccountsInDb()).length, 3);
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
  });

  test("duplicado → 400 RF-5 y no se crea otra", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    const before = await rawAccountsInDb();
    const response = await link(ana, { gameId: "lol", handle: "Otro#TAG", region: "NA" });
    assertStatusError(response, 400, ERR.duplicate);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
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
    assertStatusError(rejected, 400, ERR.duplicate);
    const id = bodyId(created);
    assert.deepStrictEqual(await rawAccountsInDb(), [
      expectedRawAccount(id, ana.id, LINKS.cs2, expectedState("cs2", LINKS.cs2.handle)),
    ]);
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
    { name: "cuerpo vacío", body: {}, error: ERR.invalidGame },
    { name: "juego inexistente", body: { ...LINKS.lol, gameId: "dota" }, error: ERR.invalidGame },
    { name: "todo inválido → solo el juego", body: { gameId: 1, handle: null, region: null }, error: ERR.invalidGame },
    { name: "identificador nulo (LoL)", body: { ...LINKS.lol, handle: null }, error: ERR.invalidHandle.lol },
    { name: "identificador solo espacios (R6)", body: { ...LINKS.r6, handle: "   " }, error: ERR.invalidHandle.r6 },
    { name: "identificador que no es texto (CS2)", body: { ...LINKS.cs2, handle: 7656119 }, error: ERR.invalidHandle.cs2 },
    { name: "identificador y región inválidos → solo el identificador", body: { gameId: "r6", handle: "x", region: "" }, error: ERR.invalidHandle.r6 },
    { name: "región vacía", body: { ...LINKS.lol, region: "" }, error: ERR.invalidRegion.lol },
    { name: "región «KR» con signo de kelvin (DP-35)", body: { ...LINKS.lol, region: "\u212AR" }, error: ERR.invalidRegion.lol },
    { name: "región de otro juego", body: { ...LINKS.cs2, region: "LAS" }, error: ERR.invalidRegion.cs2 },
    { name: "región que no es texto", body: { ...LINKS.r6, region: 3 }, error: ERR.invalidRegion.r6 },
  ];
  for (const { name, body, error } of invalid) {
    test(`${name} → 400 "${error}" sin crear nada (RF-6)`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      assertStatusError(await link(ana, body), 400, error);
      assert.deepStrictEqual(await rawAccountsInDb(), []);
    });
  }

  test("datos inválidos antes que duplicado (RF-29)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    assertStatusError(await link(ana, { ...LINKS.lol, region: "XX" }), 400, ERR.invalidRegion.lol);
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

// --- T7: editar y desvincular. RF-7, RF-8, RF-9, RF-11, RF-22, RF-29, RF-38, RF-40 ---

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
    assertStatusError(await edit(ana, id, { gameId: "r6", region: "LATAM" }), 400, ERR.invalidRegion.lol);
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
      assertStatusError(await edit(ana, id, { handle }), 400, ERR.handleNotEditable);
      assertStatusError(await edit(ana, id, { handle, region: "EUW" }), 400, ERR.handleNotEditable);
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
    { name: "«KR» con signo de kelvin (DP-35)", region: "\u212AR" },
  ];
  for (const { name, region } of badRegions) {
    test(`región ${name} → 400 RF-38 y la base no cambia`, async (t) => {
      const { ana, id } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { region }), 400, ERR.invalidRegion.lol);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });
  }

  test("región inválida en R6 y CS2 → el texto nombra el juego de la cuenta (RF-38)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const r6 = await linkOk(ana, LINKS.r6);
    const cs2 = await linkOk(ana, LINKS.cs2);
    const before = await rawAccountsInDb();
    assertStatusError(await edit(ana, r6, { region: "LAS" }), 400, ERR.invalidRegion.r6);
    assertStatusError(await edit(ana, cs2, { region: "LATAM" }), 400, ERR.invalidRegion.cs2);
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

    test("credencial de usuario eliminado → 401 \"token inválido\" (RF-44)", async (t) => {
      const { ana, id } = await seedLol(t);
      await User.deleteOne({ _id: ana.id });
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { region: "EUW" }), 401, SESSION_MESSAGES.invalidToken);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    for (const bad of ["abc", "me", `${"a".repeat(23)}g`]) {
      test(`id mal formado (${bad}), incluso con datos inválidos → 400 "id con formato inválido"`, async (t) => {
        const { ana } = await seedLol(t);
        const before = await rawAccountsInDb();
        assertStatusError(await edit(ana, bad, { handle: null, region: "XX" }), 400, ERR.invalidId);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("%zz con sesión → 400 \"id con formato inválido\"", async (t) => {
      const { ana } = await seedLol(t);
      assertStatusError(await edit(ana, "%zz", { region: "EUW" }), 400, ERR.invalidId);
    });

    test("inexistente, incluso con datos inválidos → 404 \"cuenta no encontrada\"", async (t) => {
      const { ana } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, nonExistingId(), { handle: null, region: "XX" }), 404, ERR.accountNotFound);
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
        const { id } = await seedLol(t);
        const beto = await signUp(app, BETO);
        const before = await rawAccountsInDb();
        assertStatusError(await edit(beto, id, body), 403, ERR.forbidden);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("identificador distinto y región inválida → solo RF-22", async (t) => {
      const { ana, id } = await seedLol(t);
      const before = await rawAccountsInDb();
      assertStatusError(await edit(ana, id, { handle: "Otro#TAG", region: "XX" }), 400, ERR.handleNotEditable);
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
  test("cuenta propia → 204 sin cuerpo; la cuenta se borra (RF-9)", async (t) => {
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
    const get = await withSession(ana.agent.get(`/api/accounts/${lol}`), ana.csrf);
    assertStatusError(get, 404, ERR.accountNotFound);
  });

  test("id en mayúsculas → 204 sobre la misma cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.r6);
    assert.strictEqual((await unlink(ana, id.toUpperCase())).status, 204);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
  });

  test("tras desvincular se puede volver a vincular el mismo juego (RF-5)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    assert.strictEqual((await unlink(ana, id)).status, 204);
    await linkOk(ana, LINKS.lol);
  });

  test("dos veces la misma cuenta → la segunda 404 \"cuenta no encontrada\"", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    assert.strictEqual((await unlink(ana, id)).status, 204);
    assertStatusError(await unlink(ana, id), 404, ERR.accountNotFound);
  });

  test("desvincular no escribe al usuario: sus datos son idénticos tras editar, resincronizar y desvincular (RF-46)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.lol);
    const before = await User.findById(ana.id).lean();
    assert.ok(before !== null);
    const writing = t.mock.method(User, "updateOne");
    assert.strictEqual((await edit(ana, id, { region: "BR" })).status, 200);
    assert.deepStrictEqual(await User.findById(ana.id).lean(), before);
    assert.strictEqual((await sync(ana, id)).status, 200);
    assert.deepStrictEqual(await User.findById(ana.id).lean(), before);
    assert.strictEqual((await unlink(ana, id)).status, 204);
    assert.deepStrictEqual(await User.findById(ana.id).lean(), before);
    assert.strictEqual(writing.mock.callCount(), 0);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
  });

  test("el documento crudo de un usuario recién registrado no tiene la clave accounts", async () => {
    const ana = await signUp(app, ANA);
    const raw = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(ana.id) });
    assert.ok(raw !== null);
    assert.ok(!("accounts" in raw));
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

    test("credencial de usuario eliminado → 401 \"token inválido\" (RF-44)", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const id = await linkOk(ana, LINKS.lol);
      await User.deleteOne({ _id: ana.id });
      const before = await rawAccountsInDb();
      assertStatusError(await unlink(ana, id), 401, SESSION_MESSAGES.invalidToken);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    for (const bad of ["abc", "me", "%zz"]) {
      test(`id mal formado (${bad}) → 400 "id con formato inválido"`, async (t) => {
        fixClock(t);
        const ana = await signUp(app, ANA);
        await linkOk(ana, LINKS.lol);
        const before = await rawAccountsInDb();
        assertStatusError(await unlink(ana, bad), 400, ERR.invalidId);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("inexistente → 404 \"cuenta no encontrada\"", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      await linkOk(ana, LINKS.lol);
      const before = await rawAccountsInDb();
      assertStatusError(await unlink(ana, nonExistingId()), 404, ERR.accountNotFound);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("cuenta ajena → 403 RF-11; la cuenta no cambia", async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const beto = await signUp(app, BETO);
      const id = await linkOk(ana, LINKS.lol);
      const before = await rawAccountsInDb();
      assertStatusError(await unlink(beto, id), 403, ERR.forbidden);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });
  });
});

// --- T8: resincronizar, concurrencia y fallo forzado (RF-10, RF-11, RF-15, RF-28, RF-29,
// RF-39, RF-42, RF-43, RF-45; DP-9, DP-36). El esperado se calcula con `simulateReading` +
// `initialState` / `applySync` y los mismos instantes fijos (P-13).

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

    test("credencial de usuario eliminado → 401 \"token inválido\" (RF-44)", async (t) => {
      const { ana, id } = await seed(t);
      await User.deleteOne({ _id: ana.id });
      const before = await rawAccountsInDb();
      assertStatusError(await sync(ana, id), 401, SESSION_MESSAGES.invalidToken);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    for (const bad of ["abc", "me", "%zz"]) {
      test(`id mal formado (${bad}) → 400 "id con formato inválido"`, async (t) => {
        const { ana } = await seed(t);
        const before = await rawAccountsInDb();
        assertStatusError(await sync(ana, bad), 400, ERR.invalidId);
        assert.deepStrictEqual(await rawAccountsInDb(), before);
      });
    }

    test("inexistente → 404 \"cuenta no encontrada\"", async (t) => {
      const { ana } = await seed(t);
      const before = await rawAccountsInDb();
      assertStatusError(await sync(ana, nonExistingId()), 404, ERR.accountNotFound);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
    });

    test("cuenta ajena → 403 RF-11 y la base no cambia", async (t) => {
      const { id } = await seed(t);
      const beto = await signUp(app, BETO);
      const before = await rawAccountsInDb();
      fixClock(t, FIXED_NOW + ONE_HOUR);
      assertStatusError(await sync(beto, id), 403, ERR.forbidden);
      assert.deepStrictEqual(await rawAccountsInDb(), before);
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
    assertStatusError(synced, 404, ERR.accountNotFound);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
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
  // Fotografía del documento del usuario (`lean()`): debe quedar idéntica (RF-46).
  async function userSnapshot(userId: string) {
    const user = await User.findById(userId).lean();
    assert.ok(user !== null);
    return user;
  }

  test("la comprobación del usuario lanza → 500, ninguna cuenta, usuario intacto y la siguiente vinculación → 201 (RF-46)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const userBefore = await userSnapshot(ana.id);
    const original = User.exists.bind(User);
    let calls = 0;
    const failing = t.mock.method(User, "exists", (filter: Parameters<typeof User.exists>[0]) => {
      calls += 1;
      if (calls === 2) throw new Error("fallo forzado"); // la 1.ª llamada es la de withUser
      return original(filter);
    });
    assertStatusError(await link(ana, LINKS.lol), 500, MESSAGES.internal);
    assert.strictEqual(failing.mock.callCount(), 2);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await userSnapshot(ana.id), userBefore);
    failing.mock.restore();
    const id = await linkOk(ana, LINKS.lol);
    assert.deepStrictEqual(await rawAccountsInDb(), [
      expectedRawAccount(id, ana.id, LINKS.lol, expectedState("lol", LINKS.lol.handle)),
    ]);
    assert.deepStrictEqual(await userSnapshot(ana.id), userBefore);
  });

  test("GameAccount.create lanza → 500, ninguna cuenta, usuario intacto y la siguiente vinculación → 201 (RF-46)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const userBefore = await userSnapshot(ana.id);
    const failing = t.mock.method(GameAccount, "create", async () => {
      throw new Error("fallo forzado");
    });
    assertStatusError(await link(ana, LINKS.r6), 500, MESSAGES.internal);
    assert.strictEqual(failing.mock.callCount(), 1);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await userSnapshot(ana.id), userBefore);
    failing.mock.restore();
    await linkOk(ana, LINKS.r6);
    assert.strictEqual((await rawAccountsInDb()).length, 1);
    assert.deepStrictEqual(await userSnapshot(ana.id), userBefore);
  });

  test("GameAccount.deleteOne lanza al desvincular → 500, la cuenta sigue completa, usuario intacto y la siguiente desvinculación → 204 (RF-46)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LINKS.cs2);
    const accountsBefore = await rawAccountsInDb();
    const userBefore = await userSnapshot(ana.id);
    const failing = t.mock.method(GameAccount, "deleteOne", () => {
      throw new Error("fallo forzado");
    });
    assertStatusError(await unlink(ana, id), 500, MESSAGES.internal);
    assert.strictEqual(failing.mock.callCount(), 1);
    assert.deepStrictEqual(await rawAccountsInDb(), accountsBefore);
    assert.deepStrictEqual(await userSnapshot(ana.id), userBefore);
    failing.mock.restore();
    assert.strictEqual((await unlink(ana, id)).status, 204);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await userSnapshot(ana.id), userBefore);
  });

  test("usuario borrado justo antes de crear la cuenta → 404 \"usuario no encontrado\" y ninguna cuenta (RF-47)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const original = GameAccount.create.bind(GameAccount);
    const deleting = t.mock.method(GameAccount, "create", async (...args: unknown[]) => {
      await User.collection.deleteOne({ _id: new mongoose.Types.ObjectId(ana.id) });
      const created: unknown = await Reflect.apply(original, GameAccount, args);
      return created;
    });
    assertStatusError(await link(ana, LINKS.lol), 404, ERR.userNotFound);
    assert.strictEqual(deleting.mock.callCount(), 1);
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.strictEqual(await User.exists({ _id: ana.id }), null);
  });

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
