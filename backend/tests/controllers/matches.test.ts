// Coincidencias: `GET /api/matches` (spec 005, plan, secciones 5, 6 y 8).
// Sesión, errores y respuesta. RF-1, RF-3, RF-5, RF-6, RF-12, RF-13, RF-14, RF-15, RF-16,
// RF-18, RNF-2.
// Filtros y orden. RF-2, RF-4, RF-7, RF-8, RF-9, RF-11, RF-17, RNF-3, R6 y DP-26.
// - Datos armados por la prueba: usuarios por la API de registro, bloques con `User.updateOne`
//   y cuentas con `GameAccount.create`; rangos y verificada los elige la prueba.
// - Los valores esperados de distancia y puntaje se escriben a mano (plan, sección 3.3).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { MATCH_ERRORS } from "../../src/domain/matchQuery.ts";
import { GAME_IDS } from "../../src/domain/games.ts";
import type { GameId } from "../../src/domain/games.ts";
import { ladder, normalizeStep } from "../../src/domain/rankScale.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  ISO_MS_Z,
  authApp,
  closeTestServers,
  forgeToken,
  nonExistingId,
  noneToken,
  rawCookieRequest,
  registerUser,
  signUp,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const MATCHES = "/api/matches";

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
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

// Petición del usuario de la sesión con su comprobante.
function get(user: SignedUp, query: string): supertest.Test {
  return withSession(user.agent.get(`${MATCHES}${query}`), user.csrf);
}

interface AccountData {
  gameId?: GameId;
  normalized?: number;
  verified?: boolean;
  handle?: string;
}

// Cuenta de `userId` con la fotografía elegida por la prueba (`normalized` fija la posición).
async function createAccount(userId: string, data: AccountData = {}) {
  const recordedAt = new Date(FIXED_NOW);
  const snapshot = { tier: "Oro", division: "II", points: 40, normalized: data.normalized ?? 50, recordedAt };
  const gameId = data.gameId ?? "lol";
  return GameAccount.create({
    user: userId,
    gameId,
    handle: data.handle ?? `handle-${userId}`,
    region: "LAS",
    currentRank: snapshot,
    rankHistory: [snapshot],
    matches: [
      {
        matchId: "m-1",
        gameId,
        playedAt: recordedAt,
        result: "win",
        summary: "partida de prueba",
        durationMinutes: 30,
        rankDelta: 1,
      },
    ],
    readingNumber: 3,
    lastSyncedAt: recordedAt,
    verified: data.verified ?? false,
  });
}

async function setAvailability(userId: string, blocks: string[]): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { availability: blocks } });
}

describe("sesión", () => {
  test("sin credencial → 401 \"sesión no iniciada\" (RF-1)", async () => {
    assertStatusError(await supertest(app).get(`${MATCHES}?game=lol`), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("sin credencial y con filtros inválidos → 401, la sesión va antes (DP5-1)", async () => {
    assertStatusError(await supertest(app).get(`${MATCHES}?game=nada`), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("credencial alterada (otro secreto, «none», ilegible) → 401 \"token inválido\"", async () => {
    const ana = await signUp(app, ANA);
    const payload = { id: ana.id, username: "Ana", csrf: "c" };
    const tokens = [forgeToken(payload, { secret: "otro-secreto" }), noneToken(payload), `${ana.cookie}x`];
    for (const token of tokens) {
      const response = await rawCookieRequest(app, "get", `${MATCHES}?game=lol`, token, "c");
      assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    }
  });

  test("sin cabecera X-CSRF-Token → 401 \"token inválido\"", async () => {
    const ana = await signUp(app, ANA);
    await createAccount(ana.id);
    assertStatusError(await ana.agent.get(`${MATCHES}?game=lol`), 401, SESSION_MESSAGES.invalidToken);
  });

  test("comprobante que no corresponde → 401 \"token inválido\"", async () => {
    const ana = await signUp(app, ANA);
    const response = await ana.agent.get(`${MATCHES}?game=lol`).set("X-CSRF-Token", "otro");
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
  });

  test("credencial expirada → 401 \"sesión expirada\"", async () => {
    const ana = await signUp(app, ANA);
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const token = forgeToken({ id: ana.id, username: "Ana", csrf: "c" }, { iat: twoHoursAgo });
    const response = await rawCookieRequest(app, "get", `${MATCHES}?game=lol`, token, "c");
    assertStatusError(response, 401, SESSION_MESSAGES.expired);
  });

  test("credencial de usuario eliminado → 401 \"sesión no iniciada\", no 404 (RF-13)", async () => {
    const ana = await signUp(app, ANA);
    await createAccount(ana.id);
    await User.deleteOne({ _id: ana.id });
    assertStatusError(await get(ana, "?game=lol"), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("credencial de usuario eliminado con consulta inválida → 401 (la sesión va antes)", async () => {
    const ana = await signUp(app, ANA);
    await User.deleteOne({ _id: ana.id });
    assertStatusError(await get(ana, "?game=nada"), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("el cuerpo y la cabecera Authorization no sustituyen a la cookie", async () => {
    const ana = await signUp(app, ANA);
    const response = await supertest(app)
      .get(`${MATCHES}?game=lol`)
      .set("Authorization", `Bearer ${ana.cookie}`)
      .set("X-CSRF-Token", ana.csrf);
    assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
  });
});

describe("errores", () => {
  test("juego ausente, vacío, desconocido, en mayúsculas, con espacios o repetido → 400 \"Juego no válido.\" (RF-5)", async () => {
    const ana = await signUp(app, ANA);
    const queries = [
      "",
      "?game=",
      "?game=dota",
      "?game=LOL",
      "?game=%20lol%20",
      "?game=lol&game=r6",
      "?game=constructor",
      "?game=__proto__",
    ];
    for (const query of queries) {
      assertStatusError(await get(ana, query), 400, MATCH_ERRORS.game);
    }
  });

  test("diferencia máxima inválida → 400 con su texto (RF-12)", async () => {
    const ana = await signUp(app, ANA);
    const values = ["abc", "", "-1", "101", "1.5", "+5", "1e1", "0x10", "%205%20", "5&maxRankDistance=6"];
    for (const value of values) {
      const response = await get(ana, `?game=lol&maxRankDistance=${value}`);
      assertStatusError(response, 400, MATCH_ERRORS.maxRankDistance);
    }
  });

  test("horas en común inválidas → 400 con su texto (RF-12)", async () => {
    const ana = await signUp(app, ANA);
    for (const value of ["abc", "", "-1", "169", "2.5", "0x10"]) {
      const response = await get(ana, `?game=lol&minSharedHours=${value}`);
      assertStatusError(response, 400, MATCH_ERRORS.minSharedHours);
    }
  });

  test("solo verificadas inválido → 400 con su texto (RF-14)", async () => {
    const ana = await signUp(app, ANA);
    for (const value of ["TRUE", "1", "abc", "", "true&onlyVerified=false"]) {
      const response = await get(ana, `?game=lol&onlyVerified=${value}`);
      assertStatusError(response, 400, MATCH_ERRORS.onlyVerified);
    }
  });

  test("búsqueda repetida → 400 con su texto (RF-15)", async () => {
    const ana = await signUp(app, ANA);
    for (const query of ["search=a&search=b", "search=&search="]) {
      assertStatusError(await get(ana, `?game=lol&${query}`), 400, MATCH_ERRORS.search);
    }
  });

  test("orden de RF-16: juego antes que diferencia máxima", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await get(ana, "?game=nada&maxRankDistance=abc"), 400, MATCH_ERRORS.game);
  });

  test("orden de RF-16: diferencia máxima antes que horas", async () => {
    const ana = await signUp(app, ANA);
    const response = await get(ana, "?game=lol&maxRankDistance=abc&minSharedHours=169");
    assertStatusError(response, 400, MATCH_ERRORS.maxRankDistance);
  });

  test("orden de RF-16: horas antes que solo verificadas", async () => {
    const ana = await signUp(app, ANA);
    const response = await get(ana, "?game=lol&minSharedHours=169&onlyVerified=abc");
    assertStatusError(response, 400, MATCH_ERRORS.minSharedHours);
  });

  test("orden de RF-16: solo verificadas antes que búsqueda", async () => {
    const ana = await signUp(app, ANA);
    const response = await get(ana, "?game=lol&onlyVerified=abc&search=a&search=b");
    assertStatusError(response, 400, MATCH_ERRORS.onlyVerified);
  });

  test("orden de RF-16: sin cuenta y con horas 169 → 400 de horas, no 404", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await get(ana, "?game=lol&minSharedHours=169"), 400, MATCH_ERRORS.minSharedHours);
  });

  test("sin cuenta vinculada en el juego → 404 con su texto (RF-6)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(beto.id, { gameId: "lol" });
    await createAccount(ana.id, { gameId: "r6" });

    assertStatusError(await get(ana, "?game=lol"), 404, MATCH_ERRORS.noAccount);
    assertStatusError(await get(ana, "?game=cs2"), 404, "No tienes una cuenta vinculada en este juego.");
  });

  test("ningún error contiene nombres de fuentes reales (RNF-3)", async () => {
    const ana = await signUp(app, ANA);
    const responses = [await get(ana, "?game=nada"), await get(ana, "?game=lol")];
    for (const response of responses) {
      assert.doesNotMatch(JSON.stringify(response.body), /riot|ubisoft|valve|faceit/i);
    }
  });
});

describe("respuesta", () => {
  test("200 con la forma exacta del candidato (RF-3, RNF-2)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await setAvailability(ana.id, ["0-5", "0-23", "2-20"]);
    await setAvailability(beto.id, ["2-20", "0-5", "4-9"]);
    await createAccount(ana.id, { normalized: 40 });
    const betoAccount = await createAccount(beto.id, { normalized: 44, verified: true, handle: "beto#LAS" });

    const response = await get(ana, "?game=lol");

    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    const body: unknown = response.body;
    assert.ok(Array.isArray(body));
    assert.strictEqual(body.length, 1);
    const [candidate]: unknown[] = body;
    assert.ok(typeof candidate === "object" && candidate !== null);
    assert.deepStrictEqual(Object.keys(candidate).sort(), [
      "account",
      "gameId",
      "rankDistance",
      "score",
      "sharedBlocks",
      "user",
    ]);

    const betoUser = await User.findById(beto.id);
    assert.ok(betoUser !== null);
    assert.deepStrictEqual(Reflect.get(candidate, "user"), {
      id: beto.id,
      username: "Beto",
      displayName: betoUser.displayName,
      avatarColor: betoUser.avatarColor,
      bio: betoUser.bio,
      timezone: betoUser.timezone,
      createdAt: betoUser.createdAt.toISOString(),
    });
    assert.match(String(Reflect.get(Reflect.get(candidate, "user"), "createdAt")), ISO_MS_Z);

    const account: unknown = Reflect.get(candidate, "account");
    assert.ok(typeof account === "object" && account !== null);
    assert.deepStrictEqual(Object.keys(account).sort(), [
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
    ]);
    assert.deepStrictEqual(account, JSON.parse(JSON.stringify(betoAccount)));
    assert.strictEqual(Reflect.get(account, "simulated"), true);
    assert.strictEqual(Reflect.get(account, "userId"), beto.id);
    assert.strictEqual(Reflect.get(account, "verified"), true);

    assert.strictEqual(Reflect.get(candidate, "gameId"), "lol");
    assert.strictEqual(Reflect.get(candidate, "rankDistance"), 4);
    assert.deepStrictEqual(Reflect.get(candidate, "sharedBlocks"), ["0-5", "2-20"]);
    assert.strictEqual(typeof Reflect.get(candidate, "score"), "number");
  });

  test("la respuesta no filtra datos privados ni internos", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id);
    await createAccount(beto.id);

    const response = await get(ana, "?game=lol");

    assert.strictEqual(response.status, 200);
    const text = JSON.stringify(response.body);
    for (const forbidden of ["email", "passwordHash", "usernameKey", "matches", "readingNumber", "availability", "__v", "_id"]) {
      assert.ok(!text.includes(`"${forbidden}"`), `no debe contener ${forbidden}`);
    }
    assert.ok(!text.includes(BETO.email));
    assert.doesNotMatch(text, /riot|ubisoft|valve|faceit/i);
  });

  test("lista vacía → 200 con arreglo vacío; el propio usuario no aparece (RF-4)", async () => {
    const ana = await signUp(app, ANA);
    await createAccount(ana.id);

    const response = await get(ana, "?game=lol");

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, []);
  });

  test("`page=2`, `user=<id>` y otros parámetros desconocidos se ignoran (RF-18)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id);
    await createAccount(beto.id);

    const plain = await get(ana, "?game=lol");
    const withExtras = await get(ana, `?game=lol&page=2&user=${nonExistingId()}&limit=1&x[y]=1`);
    const withOwnId = await get(ana, `?game=lol&user=${ana.id}`);

    assert.strictEqual(plain.status, 200);
    assert.strictEqual(plain.body.length, 1);
    assert.strictEqual(withExtras.status, 200);
    assert.deepStrictEqual(withExtras.body, plain.body);
    assert.strictEqual(withOwnId.status, 200);
    assert.deepStrictEqual(withOwnId.body, plain.body);
  });

  test("solo devuelve cuentas del juego pedido", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id, { gameId: "lol" });
    await createAccount(ana.id, { gameId: "r6" });
    await createAccount(beto.id, { gameId: "r6", handle: "beto-r6" });

    const lol = await get(ana, "?game=lol");
    const r6 = await get(ana, "?game=r6");

    assert.deepStrictEqual(lol.body, []);
    assert.strictEqual(r6.body.length, 1);
    assert.strictEqual(r6.body[0].gameId, "r6");
    assert.strictEqual(r6.body[0].account.handle, "beto-r6");
  });

  test("los filtros válidos llegan al motor (máximo 3 deja fuera a quien está a 4)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id, { normalized: 40 });
    await createAccount(beto.id, { normalized: 44 });

    const all = await get(ana, "?game=lol&maxRankDistance=4");
    const none = await get(ana, "?game=lol&maxRankDistance=3");

    assert.strictEqual(all.body.length, 1);
    assert.deepStrictEqual(none.body, []);
  });

  test("la respuesta no cambia la base (solo lectura)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id);
    await createAccount(beto.id);
    const before = await GameAccount.find({}).sort({ _id: 1 }).lean();

    await get(ana, "?game=lol");

    assert.deepStrictEqual(await GameAccount.find({}).sort({ _id: 1 }).lean(), before);
  });
});

// --- Filtros y orden ---------------------------------------------------------------------
// Datos armados a mano: la prueba elige escalón, puntos, verificada y disponibilidad. El rango
// se construye con `ladder`/`normalizeStep` (spec 004, DP-26). Los valores esperados de
// distancia y puntaje se calcularon a mano con el plan, sección 3.3:
//   R = máx(0, 100 − 4·d), H = mín(100, 12,5·b), puntaje = redondeo(0,55·R + 0,45·H) con mitades
//   hacia arriba.
// Escala de LoL (31 escalones): normalizado = round(100·paso / 30), así que los pasos múltiplos
// de 3 caen en decenas: paso 15 = 50, 18 = 60, 21 = 70, 24 = 80, 27 = 90, 0 = 0, 30 = 100.

interface AccountSpec {
  step: number;
  points?: number;
  verified?: boolean;
}

interface UserSetup {
  displayName?: string;
  blocks?: readonly string[];
  accounts?: Partial<Record<GameId, AccountSpec>>;
}

// Fotografía de rango en el escalón `step` de la escala del juego.
function snapshotAt(gameId: GameId, step: number, points: number) {
  const rung = ladder(gameId)[step];
  assert.ok(rung !== undefined, `el escalón ${step} no existe en ${gameId}`);
  return {
    tier: rung.tier,
    ...(rung.division === undefined ? {} : { division: rung.division }),
    points,
    normalized: normalizeStep(gameId, step),
    recordedAt: new Date(FIXED_NOW),
  };
}

async function createRankedAccount(userId: string, gameId: GameId, spec: AccountSpec, handle?: string) {
  const snapshot = snapshotAt(gameId, spec.step, spec.points ?? 40);
  return GameAccount.create({
    user: userId,
    gameId,
    handle: handle ?? `${gameId}-${userId}`,
    region: "LAS",
    currentRank: snapshot,
    rankHistory: [snapshot],
    matches: [],
    readingNumber: 0,
    lastSyncedAt: new Date(FIXED_NOW),
    verified: spec.verified ?? false,
  });
}

async function seed(userId: string, setup: UserSetup): Promise<void> {
  if (setup.blocks !== undefined) await setAvailability(userId, [...setup.blocks]);
  for (const gameId of GAME_IDS) {
    const spec = setup.accounts?.[gameId];
    if (spec !== undefined) await createRankedAccount(userId, gameId, spec);
  }
}

// Usuario de la sesión (Ana) con su disponibilidad y sus cuentas.
async function sessionUser(setup: UserSetup): Promise<SignedUp> {
  const ana = await signUp(app, ANA);
  await seed(ana.id, setup);
  return ana;
}

// Otro jugador: se registra por la API (sin iniciar sesión) y devuelve su identificador.
async function addPlayer(username: string, setup: UserSetup = {}): Promise<string> {
  const response = await registerUser(app, {
    email: `${username.toLowerCase()}@example.com`,
    username,
    ...(setup.displayName === undefined ? {} : { displayName: setup.displayName }),
  });
  assert.strictEqual(response.status, 201);
  const id: unknown = response.body.id;
  assert.ok(typeof id === "string");
  await seed(id, setup);
  return id;
}

interface Row {
  username: string;
  rankDistance: number;
  shared: number;
  score: number;
}

// Resumen de una respuesta 200: lo que se compara con los valores escritos a mano.
function readRows(response: Response): Row[] {
  assert.strictEqual(response.status, 200);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  const body: unknown = response.body;
  assert.ok(Array.isArray(body));
  return body.map((item: unknown): Row => {
    assert.ok(typeof item === "object" && item !== null);
    const user: unknown = Reflect.get(item, "user");
    assert.ok(typeof user === "object" && user !== null);
    const username: unknown = Reflect.get(user, "username");
    const rankDistance: unknown = Reflect.get(item, "rankDistance");
    const sharedBlocks: unknown = Reflect.get(item, "sharedBlocks");
    const score: unknown = Reflect.get(item, "score");
    assert.ok(typeof username === "string");
    assert.ok(typeof rankDistance === "number");
    assert.ok(typeof score === "number");
    assert.ok(Array.isArray(sharedBlocks));
    return { username, rankDistance, shared: sharedBlocks.length, score };
  });
}

async function usernames(user: SignedUp, query: string): Promise<string[]> {
  return readRows(await get(user, query)).map((row) => row.username);
}

// Ocho bloques de la sesión; los candidatos comparten los que cada prueba indica.
const V8 = ["0-8", "0-9", "0-10", "0-11", "1-8", "1-9", "1-10", "1-11"];
// Diez bloques, para poder compartir 9.
const V10 = [...V8, "0-12", "1-12"];

describe("filtros y orden", () => {
  test("orden por puntaje de mayor a menor, con bloques en común ordenados por día y hora (RF-2, RF-3)", async () => {
    const ana = await sessionUser({ blocks: V8, accounts: { lol: { step: 15 } } });
    // Se crean en un orden distinto del esperado.
    await addPlayer("dcero", { blocks: ["6-23"], accounts: { lol: { step: 15 } } });
    await addPlayer("cfuerte", { blocks: V8, accounts: { lol: { step: 27 } } });
    await addPlayer("bmedio", {
      blocks: ["0-11", "0-8", "5-5", "0-10", "0-9"],
      accounts: { lol: { step: 18 } },
    });
    await addPlayer("aperfecto", { blocks: [...V8].reverse(), accounts: { lol: { step: 15 } } });

    // aperfecto: d 0, 8 bloques → 0,55·100 + 0,45·100 = 100.
    // bmedio:    d 10 (60 − 50), 4 bloques → 0,55·60 + 0,45·50 = 33 + 22,5 = 55,5 → 56.
    // dcero:     d 0, 0 bloques → 55.
    // cfuerte:   d 40 (90 − 50) → R = 0; 8 bloques → 45.
    const response = await get(ana, "?game=lol");
    assert.deepStrictEqual(readRows(response), [
      { username: "aperfecto", rankDistance: 0, shared: 8, score: 100 },
      { username: "bmedio", rankDistance: 10, shared: 4, score: 56 },
      { username: "dcero", rankDistance: 0, shared: 0, score: 55 },
      { username: "cfuerte", rankDistance: 40, shared: 8, score: 45 },
    ]);
    const perfect: unknown = response.body[0].sharedBlocks;
    const medium: unknown = response.body[1].sharedBlocks;
    assert.deepStrictEqual(perfect, ["0-8", "0-9", "0-10", "0-11", "1-8", "1-9", "1-10", "1-11"]);
    assert.deepStrictEqual(medium, ["0-8", "0-9", "0-10", "0-11"]);
  });

  test("desempates: menor distancia, más bloques y nombre de usuario por código Unicode (RF-2)", async () => {
    const ana = await sessionUser({ blocks: V10, accounts: { lol: { step: 15 } } });
    // Todos con puntaje 45 (R = 0 y 8 o más bloques saturan el horario).
    await addPlayer("alfa", { blocks: V8, accounts: { lol: { step: 27 } } }); // d 40, 8 bloques
    await addPlayer("beto", { blocks: V10.slice(0, 9), accounts: { lol: { step: 27 } } }); // d 40, 9
    await addPlayer("Zoe", { blocks: V10.slice(0, 9), accounts: { lol: { step: 27 } } }); // d 40, 9
    await addPlayer("Zeta", { blocks: V8, accounts: { lol: { step: 24 } } }); // d 30, 8 bloques

    // 1.º Zeta: distancia 30, antes que las de 40 aunque tenga menos bloques.
    // 2.º Zoe y 3.º beto: misma distancia y 9 bloques; "Z" (90) va antes que "b" (98).
    // 4.º alfa: misma distancia pero 8 bloques.
    assert.deepStrictEqual(readRows(await get(ana, "?game=lol")), [
      { username: "Zeta", rankDistance: 30, shared: 8, score: 45 },
      { username: "Zoe", rankDistance: 40, shared: 9, score: 45 },
      { username: "beto", rankDistance: 40, shared: 9, score: 45 },
      { username: "alfa", rankDistance: 40, shared: 8, score: 45 },
    ]);
  });

  test("el usuario de la sesión no aparece, ni siquiera al buscar su nombre (RF-4)", async () => {
    const ana = await sessionUser({
      blocks: V8,
      accounts: { lol: { step: 15 }, r6: { step: 14 }, cs2: { step: 3 } },
    });
    await addPlayer("beto", {
      blocks: V8,
      accounts: { lol: { step: 15 }, r6: { step: 14 }, cs2: { step: 3 } },
    });

    for (const game of GAME_IDS) {
      assert.deepStrictEqual(await usernames(ana, `?game=${game}`), ["beto"]);
      assert.deepStrictEqual(await usernames(ana, `?game=${game}&search=Ana`), []);
      assert.deepStrictEqual(await usernames(ana, `?game=${game}&search=ana`), []);
    }
  });

  test("sin filtros = distancia 100 y horas 0: aparece quien está a 100 y sin horas (RF-11)", async () => {
    const ana = await sessionUser({ blocks: V8, accounts: { lol: { step: 0 } } });
    await addPlayer("lejano", { accounts: { lol: { step: 30 } } }); // normalizado 100: d 100
    await addPlayer("cercano", { accounts: { lol: { step: 0 } } }); // d 0, 0 bloques

    // cercano: 55. lejano: R = 0 y H = 0 → 0.
    const expected: Row[] = [
      { username: "cercano", rankDistance: 0, shared: 0, score: 55 },
      { username: "lejano", rankDistance: 100, shared: 0, score: 0 },
    ];
    const plain = await get(ana, "?game=lol");
    const explicit = await get(ana, "?game=lol&maxRankDistance=100&minSharedHours=0");
    assert.deepStrictEqual(readRows(plain), expected);
    assert.deepStrictEqual(readRows(explicit), expected);
    assert.deepStrictEqual(explicit.body, plain.body);
    assert.deepStrictEqual(await usernames(ana, "?game=lol&maxRankDistance=99"), ["cercano"]);
  });

  test("distancia máxima: se conserva quien está justo en el límite (RF-7)", async () => {
    const ana = await sessionUser({ accounts: { lol: { step: 15 } } });
    await addPlayer("cero", { accounts: { lol: { step: 15, points: 55 } } }); // d 0 → 55
    await addPlayer("diez", { accounts: { lol: { step: 18 } } }); // d 10 → 33
    await addPlayer("cuarenta", { accounts: { lol: { step: 27 } } }); // d 40 → 0

    const cases: [string, string[]][] = [
      ["0", ["cero"]],
      ["9", ["cero"]],
      ["10", ["cero", "diez"]],
      ["39", ["cero", "diez"]],
      ["40", ["cero", "diez", "cuarenta"]],
      ["100", ["cero", "diez", "cuarenta"]],
      ["007", ["cero"]],
    ];
    for (const [max, expected] of cases) {
      assert.deepStrictEqual(await usernames(ana, `?game=lol&maxRankDistance=${max}`), expected, `máximo ${max}`);
    }
    assert.deepStrictEqual(await usernames(ana, "?game=lol"), ["cero", "diez", "cuarenta"]);
  });

  test("mínimo de horas: se conserva quien tiene justo ese número de bloques (RF-7)", async () => {
    const ana = await sessionUser({ blocks: V8, accounts: { lol: { step: 15 } } });
    await addPlayer("cuatro", { blocks: ["0-8", "0-9", "0-10", "0-11", "6-0"], accounts: { lol: { step: 15 } } });
    await addPlayer("tres", { blocks: ["1-8", "1-9", "1-10"], accounts: { lol: { step: 15 } } });
    await addPlayer("ninguno", { blocks: ["6-23"], accounts: { lol: { step: 15 } } });

    // d 0: cuatro → 55 + 0,45·50 = 77,5 → 78; tres → 55 + 0,45·37,5 = 71,875 → 72; ninguno → 55.
    assert.deepStrictEqual(readRows(await get(ana, "?game=lol")), [
      { username: "cuatro", rankDistance: 0, shared: 4, score: 78 },
      { username: "tres", rankDistance: 0, shared: 3, score: 72 },
      { username: "ninguno", rankDistance: 0, shared: 0, score: 55 },
    ]);
    const cases: [string, string[]][] = [
      ["0", ["cuatro", "tres", "ninguno"]],
      ["1", ["cuatro", "tres"]],
      ["3", ["cuatro", "tres"]],
      ["4", ["cuatro"]],
      ["5", []],
      ["168", []],
    ];
    for (const [min, expected] of cases) {
      assert.deepStrictEqual(await usernames(ana, `?game=lol&minSharedHours=${min}`), expected, `mínimo ${min}`);
    }
  });

  test("solo verificadas funciona en lol, r6 y cs2 (RF-8)", async () => {
    const steps = { lol: 15, r6: 14, cs2: 3 } as const;
    const ana = await sessionUser({
      accounts: { lol: { step: 15 }, r6: { step: 14 }, cs2: { step: 3 } },
    });
    await addPlayer("ver", {
      accounts: {
        lol: { step: steps.lol, verified: true },
        r6: { step: steps.r6, verified: true },
        cs2: { step: steps.cs2, verified: true },
      },
    });
    await addPlayer("nov", {
      accounts: { lol: { step: steps.lol }, r6: { step: steps.r6 }, cs2: { step: steps.cs2 } },
    });

    // Mismo puntaje (55) y distancia: desempata el nombre ("nov" < "ver").
    for (const game of GAME_IDS) {
      assert.deepStrictEqual(await usernames(ana, `?game=${game}`), ["nov", "ver"], game);
      assert.deepStrictEqual(await usernames(ana, `?game=${game}&onlyVerified=false`), ["nov", "ver"], game);
      assert.deepStrictEqual(await usernames(ana, `?game=${game}&onlyVerified=true`), ["ver"], game);
    }

    // Si ninguna cuenta está verificada, el filtro da lista vacía con 200.
    await GameAccount.updateMany({}, { $set: { verified: false } });
    for (const game of GAME_IDS) {
      const response = await get(ana, `?game=${game}&onlyVerified=true`);
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, []);
    }
  });

  test("búsqueda: `ÑANDÚ` encuentra a `Ñandú`, `nandu` no, y `.*` es texto literal (RF-9)", async () => {
    const ana = await sessionUser({ accounts: { lol: { step: 15 } } });
    await addPlayer("fulano", { displayName: "Ñandú", accounts: { lol: { step: 15 } } });
    await addPlayer("pro_player", { displayName: "Pro.*Player", accounts: { lol: { step: 15 } } });
    await addPlayer("otro", { accounts: { lol: { step: 15 } } });

    const search = (text: string) => usernames(ana, `?game=lol&search=${encodeURIComponent(text)}`);
    const all = ["fulano", "otro", "pro_player"];

    assert.deepStrictEqual(await search("ÑANDÚ"), ["fulano"]);
    assert.deepStrictEqual(await search("ñandú"), ["fulano"]);
    assert.deepStrictEqual(await search("nandu"), []);
    assert.deepStrictEqual(await search("ÑANDU"), []);
    assert.deepStrictEqual(await search("  ñandú  "), ["fulano"]);
    assert.deepStrictEqual(await search(".*"), ["pro_player"]);
    assert.deepStrictEqual(await search("pro.*play"), ["pro_player"]);
    assert.deepStrictEqual(await search("("), []);
    assert.deepStrictEqual(await search("["), []);
    assert.deepStrictEqual(await search("PRO_"), ["pro_player"]); // por nombre de usuario
    assert.deepStrictEqual(await search("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"), []);
    // Ausente, vacía y solo espacios no filtran.
    assert.deepStrictEqual(await usernames(ana, "?game=lol"), all);
    assert.deepStrictEqual(await usernames(ana, "?game=lol&search="), all);
    assert.deepStrictEqual(await usernames(ana, "?game=lol&search=%20%20%20"), all);
  });

  test("usuario de la sesión sin disponibilidad: todos con 0 bloques (casos límite)", async () => {
    const ana = await sessionUser({ accounts: { lol: { step: 15 } } });
    await addPlayer("igual", { blocks: V8, accounts: { lol: { step: 15 } } }); // d 0
    await addPlayer("cerca", { blocks: V8, accounts: { lol: { step: 18 } } }); // d 10
    await addPlayer("lejos", { blocks: V8, accounts: { lol: { step: 27 } } }); // d 40

    // 0,55·R: 55, 0,55·60 = 33 y 0.
    assert.deepStrictEqual(readRows(await get(ana, "?game=lol")), [
      { username: "igual", rankDistance: 0, shared: 0, score: 55 },
      { username: "cerca", rankDistance: 10, shared: 0, score: 33 },
      { username: "lejos", rankDistance: 40, shared: 0, score: 0 },
    ]);
    const response = await get(ana, "?game=lol&minSharedHours=1");
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, []);
  });

  test("R6 calcula distancia, filtro y puntaje igual que LoL y CS2 (caso límite de R6)", async () => {
    // Con 4 bloques en común (H = 50):
    //  - LoL: pasos 15 (50) y 21 (70): d 20 → 0,55·20 + 22,5 = 33,5 → 34.
    //  - R6: pasos 14 (40) y 21 (60): d 20 → 34.
    //  - CS2: pasos 3 (50) y 4 (67): d 17 → 0,55·32 + 22,5 = 40,1 → 40.
    const table = [
      { gameId: "lol", viewerStep: 15, candidateStep: 21, distance: 20, score: 34 },
      { gameId: "r6", viewerStep: 14, candidateStep: 21, distance: 20, score: 34 },
      { gameId: "cs2", viewerStep: 3, candidateStep: 4, distance: 17, score: 40 },
    ] as const;
    const ana = await sessionUser({
      blocks: V8,
      accounts: { lol: { step: 15 }, r6: { step: 14 }, cs2: { step: 3 } },
    });
    await addPlayer("dupla", {
      blocks: ["0-8", "0-9", "0-10", "0-11", "3-3"],
      accounts: { lol: { step: 21 }, r6: { step: 21 }, cs2: { step: 4 } },
    });

    for (const { gameId, distance, score } of table) {
      assert.deepStrictEqual(
        readRows(await get(ana, `?game=${gameId}`)),
        [{ username: "dupla", rankDistance: distance, shared: 4, score }],
        gameId,
      );
      assert.deepStrictEqual(await usernames(ana, `?game=${gameId}&maxRankDistance=${distance}`), ["dupla"], gameId);
      assert.deepStrictEqual(await usernames(ana, `?game=${gameId}&maxRankDistance=${distance - 1}`), [], gameId);
    }
  });

  test("mismo escalón con distintos puntos → distancia 0, en los tres juegos (DP-26)", async () => {
    // El siguiente escalón: LoL 16 → 53 (d 3), R6 15 → 43 (d 3), CS2 4 → 67 (d 17).
    // Sin bloques: mismo escalón → 55; d 3 → R = 88 → 48,4 → 48; d 17 → R = 32 → 17,6 → 18.
    const table = [
      { gameId: "lol", step: 15, next: 16, low: 10, high: 90, nextDistance: 3, nextScore: 48 },
      { gameId: "r6", step: 14, next: 15, low: 2410, high: 2490, nextDistance: 3, nextScore: 48 },
      { gameId: "cs2", step: 3, next: 4, low: 15100, high: 19900, nextDistance: 17, nextScore: 18 },
    ] as const;
    const ana = await sessionUser({
      accounts: {
        lol: { step: 15, points: 10 },
        r6: { step: 14, points: 2410 },
        cs2: { step: 3, points: 15100 },
      },
    });
    await addPlayer("mismo", {
      accounts: {
        lol: { step: 15, points: 90 },
        r6: { step: 14, points: 2490 },
        cs2: { step: 3, points: 19900 },
      },
    });
    await addPlayer("siguiente", {
      accounts: { lol: { step: 16 }, r6: { step: 15 }, cs2: { step: 4 } },
    });

    for (const { gameId, nextDistance, nextScore } of table) {
      assert.deepStrictEqual(
        readRows(await get(ana, `?game=${gameId}`)),
        [
          { username: "mismo", rankDistance: 0, shared: 0, score: 55 },
          { username: "siguiente", rankDistance: nextDistance, shared: 0, score: nextScore },
        ],
        gameId,
      );
      assert.deepStrictEqual(await usernames(ana, `?game=${gameId}&maxRankDistance=0`), ["mismo"], gameId);
    }
  });

  test("cuenta cuyo dueño no existe: se omite y responde 200 (RF-17)", async () => {
    const ana = await sessionUser({ accounts: { lol: { step: 15 } } });
    const betoId = await addPlayer("beto", { accounts: { lol: { step: 15 } } });
    await createRankedAccount(nonExistingId(), "lol", { step: 15, verified: true });

    assert.deepStrictEqual(readRows(await get(ana, "?game=lol")), [
      { username: "beto", rankDistance: 0, shared: 0, score: 55 },
    ]);

    // Sin Beto, solo queda la cuenta huérfana: 200 con lista vacía, no un error.
    await User.deleteOne({ _id: betoId });
    await GameAccount.deleteMany({ user: betoId });
    const response = await get(ana, "?game=lol");
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, []);
  });

  test("ningún candidato cumple los filtros: 200 con lista vacía", async () => {
    const ana = await sessionUser({ blocks: V8, accounts: { lol: { step: 15 } } });
    await addPlayer("beto", { blocks: V8, accounts: { lol: { step: 15 } } });

    for (const query of ["onlyVerified=true", "minSharedHours=9", "search=zzz", "maxRankDistance=0&search=zzz"]) {
      const response = await get(ana, `?game=lol&${query}`);
      assert.strictEqual(response.status, 200, query);
      assert.match(response.headers["content-type"] ?? "", /application\/json/);
      assert.deepStrictEqual(response.body, [], query);
    }
  });

  test("ninguna respuesta menciona Riot, Ubisoft, Valve ni FACEIT (RNF-3)", async () => {
    const ana = await sessionUser({
      blocks: V8,
      accounts: { lol: { step: 15 }, r6: { step: 14 } },
    });
    await addPlayer("beto", {
      blocks: V8,
      accounts: { lol: { step: 18, verified: true }, r6: { step: 21 } },
    });

    const queries = [
      "?game=lol",
      "?game=r6",
      "?game=lol&onlyVerified=true&search=beto",
      "?game=cs2",
      "?game=nada",
      "?game=lol&maxRankDistance=abc",
      "?game=lol&minSharedHours=169",
      "?game=lol&onlyVerified=abc",
      "?game=lol&search=a&search=b",
      "",
    ];
    for (const query of queries) {
      const response = await get(ana, query);
      assert.doesNotMatch(JSON.stringify(response.body), /riot|ubisoft|valve|faceit/i, query);
    }
    const noSession = await supertest(app).get(`${MATCHES}?game=lol`);
    assert.doesNotMatch(JSON.stringify(noSession.body), /riot|ubisoft|valve|faceit/i);
  });
});
