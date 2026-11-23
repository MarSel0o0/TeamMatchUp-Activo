// Partidas de CS2 desde Leetify en la ficha (spec 019, T3): `GET /api/users/:id/games/:gameId/
// leetify-matches` y el resumen sin partidas simuladas ni tasa de victorias para el origen Leetify.
// RF-1, RF-2, RF-4, RF-6, RF-7, RF-8, RF-12; plan, §3, P19-1, P19-2 y P19-3. Steam y Leetify se
// simulan con clientes falsos: ninguna prueba toca la red (RNF-1).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { ACCOUNT_ERRORS } from "../../src/domain/accountRules.ts";
import { LEETIFY_MATCH_ERRORS } from "../../src/domain/leetify.ts";
import type { LeetifyMatchesReading, LeetifyReading } from "../../src/domain/leetify.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import type { LeetifyClient } from "../../src/services/leetifyClient.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, closeTestServers, linkOk, nonExistingId, signUp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import { STEAM_ID, fakeLeetifyClient, fakeSteamClient, steamApp, steamLoginQuery, tokenOf } from "./steamHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const MATCH = { id: "m1", finishedAt: "2026-11-20T18:00:00.000Z", map: "de_mirage", outcome: "win", score: [13, 9] };

interface MatchesState {
  premier: LeetifyReading;
  matches: LeetifyMatchesReading;
  matchCalls: string[];
}

/** Leetify falso con partidas: `state.matches` es lo que "responde" a la lectura de partidas. */
function fakeLeetifyWithMatches() {
  const state: MatchesState = {
    premier: { kind: "rated", rating: 19309 },
    matches: { kind: "matches", matches: [MATCH as never] },
    matchCalls: [],
  };
  const client: LeetifyClient = {
    readPremier: async () => state.premier,
    readRecentMatches: async (steamId) => {
      state.matchCalls.push(steamId);
      return state.matches;
    },
  };
  return { client, state };
}

const steam = fakeSteamClient();
const leetify = fakeLeetifyWithMatches();
const app = await steamApp(steam.client, leetify.client);
// Doble anterior a la spec 019: sin `readRecentMatches` (P19-3).
const appOldDouble = await steamApp(steam.client, fakeLeetifyClient().client);

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await SteamAttempt.deleteMany({});
  leetify.state.premier = { kind: "rated", rating: 19309 };
  leetify.state.matches = { kind: "matches", matches: [MATCH as never] };
  leetify.state.matchCalls.length = 0;
  mock.method(clock, "now", () => new Date(FIXED_NOW));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await SteamAttempt.deleteMany({});
  await mongoose.disconnect();
});

/** Verifica la CS2 del usuario con Steam (spec 013) y comprueba que salió bien. */
async function verify(session: SignedUp): Promise<void> {
  const start = await withSession(session.agent.post("/api/steam/start"), session.csrf);
  assert.equal(start.status, 200);
  const token = tokenOf((start.body as { url: string }).url);
  const done = await withSession(session.agent.post("/api/steam/complete"), session.csrf).send({
    query: steamLoginQuery(token),
  });
  assert.equal(done.status, 200);
  assert.equal((done.body as { outcome: string }).outcome, "verified");
}

const matchesOf = (session: SignedUp, userId: string, gameId = "cs2") =>
  withSession(session.agent.get(`/api/users/${userId}/games/${gameId}/leetify-matches`), session.csrf);

describe("partidas de Leetify (RF-1, RF-2, RF-7, RF-8)", () => {
  test("cuenta verificada: pide a Leetify con el SteamID64 y entrega las partidas (RF-1, RF-2)", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    const response = await matchesOf(ana, "me");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: true, matches: [MATCH] });
    assert.deepEqual(leetify.state.matchCalls, [STEAM_ID]);
  });

  test("otro jugador con sesión ve las partidas de la ficha ajena (spec 008)", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    const beto = await signUp(app, BETO);
    const response = await matchesOf(beto, ana.id);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: true, matches: [MATCH] });
  });

  test("cada visita vuelve a pedir a Leetify: sin caché (RF-1)", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    await matchesOf(ana, "me");
    await matchesOf(ana, "me");
    assert.equal(leetify.state.matchCalls.length, 2);
  });

  test("Leetify sin partidas o sin perfil → lista vacía disponible (RF-8)", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    leetify.state.matches = { kind: "matches", matches: [] };
    const response = await matchesOf(ana, "me");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: true, matches: [] });
  });

  test("Leetify falla → 200 no disponible, nunca un error (RF-7, P19-2)", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    leetify.state.matches = { kind: "failed" };
    const response = await matchesOf(ana, "me");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: false, matches: [] });
  });

  test("un cliente sin lectura de partidas → no disponible, sin red (P19-3)", async () => {
    const ana = await signUp(appOldDouble, ANA);
    await verify(ana);
    const response = await matchesOf(ana, "me");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: false, matches: [] });
  });

  test("no guarda nada: la cuenta queda igual en la base (RF-6, RNF-3)", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    const before = (await GameAccount.findOne({ user: ana.id, gameId: "cs2" }).lean()) as unknown;
    await matchesOf(ana, "me");
    leetify.state.matches = { kind: "failed" };
    await matchesOf(ana, "me");
    const afterRead = (await GameAccount.findOne({ user: ana.id, gameId: "cs2" }).lean()) as unknown;
    assert.deepEqual(afterRead, before);
    assert.equal(JSON.stringify(afterRead).includes("de_mirage"), false);
    assert.equal(await GameAccount.countDocuments({}), 1);
  });
});

describe("partidas de Leetify: errores de la ruta (plan, §3)", () => {
  test("cuenta de CS2 sin verificar → 404 y sin consultar Leetify (RF-11)", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "cs2", handle: STEAM_ID, region: "Europe" });
    const response = await matchesOf(ana, "me");
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: LEETIFY_MATCH_ERRORS.notFromLeetify });
    assert.deepEqual(leetify.state.matchCalls, []);
  });

  test("cuenta de LoL → 404 (no obtiene partidas de Leetify)", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" });
    const response = await matchesOf(ana, "me", "lol");
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: LEETIFY_MATCH_ERRORS.notFromLeetify });
  });

  test("sin cuenta en el juego → 404; juego inválido → 400; usuario inexistente → 404; id inválido → 400", async () => {
    const ana = await signUp(app, ANA);
    assert.deepEqual((await matchesOf(ana, "me")).body, { error: ACCOUNT_ERRORS.noAccountForGame });
    const badGame = await matchesOf(ana, "me", "dota");
    assert.equal(badGame.status, 400);
    assert.deepEqual(badGame.body, { error: ACCOUNT_ERRORS.invalidGame });
    assert.equal((await matchesOf(ana, nonExistingId())).status, 404);
    assert.equal((await matchesOf(ana, "no-es-un-id")).status, 400);
  });

  test("sin sesión → 401", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    const { default: supertest } = await import("supertest");
    const response = await supertest(app).get(`/api/users/${ana.id}/games/cs2/leetify-matches`);
    assert.equal(response.status, 401);
  });
});

describe("resumen por juego con partidas de Leetify (RF-2, RF-4)", () => {
  test("CS2 verificada con Steam: origen leetify, sin partidas simuladas y sin tasa de victorias", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    const response = await withSession(ana.agent.get("/api/users/me/games/cs2"), ana.csrf);
    assert.equal(response.status, 200);
    const body = response.body as { account: { origins: Record<string, string> }; recentMatches: unknown[] };
    assert.equal(body.account.origins["matches"], "leetify");
    assert.deepEqual(body.recentMatches, []);
    assert.equal("winRate" in body, false);
    assert.equal("trend" in body, true);
  });

  test("CS2 sin verificar: partidas simuladas y tasa de victorias como hoy (RF-11)", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "cs2", handle: STEAM_ID, region: "Europe" });
    const response = await withSession(ana.agent.get("/api/users/me/games/cs2"), ana.csrf);
    const body = response.body as { account: { origins: Record<string, string> }; recentMatches: unknown[]; winRate: unknown };
    assert.equal(body.account.origins["matches"], "simulated");
    assert.ok(body.recentMatches.length > 0);
    assert.equal(typeof body.winRate, "number");
  });
});
