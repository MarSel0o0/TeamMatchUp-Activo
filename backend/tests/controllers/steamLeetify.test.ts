// `POST /api/steam/complete` con Leetify (spec 015, T4): al verificar con Steam, el rango Premier
// sale de Leetify y el simulado se descarta. RF-1, RF-2, RF-3, RF-15, RF-22; plan, §4.3, P15-5,
// P15-9 y D20. Steam y Leetify se simulan con clientes falsos: ninguna prueba toca la red (RNF-1).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { LEETIFY_NOTICES } from "../../src/domain/leetify.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import type { LeetifyClient } from "../../src/services/leetifyClient.ts";
import type { SteamClient } from "../../src/services/steamClient.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, authApp, closeTestServers, linkOk, signUp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import {
  PUBLIC_PROFILE,
  PUBLIC_URL,
  STEAM_ID,
  fakeLeetifyClient,
  fakeSteamClient,
  steamApp,
  steamLoginQuery,
  tokenOf,
} from "./steamHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date(FIXED_NOW);
const ELSEWHERE = "esta cuenta ya está verificada por otro usuario"; // spec 013, RF-8

const steam = fakeSteamClient();
const leetify = fakeLeetifyClient();
const app = await steamApp(steam.client, leetify.client);
const appWithoutLeetify = await steamApp(steam.client);

interface AccountJson {
  currentRank: { tier: string; points: number; normalized: number; recordedAt: string } | null;
  rankHistory: { tier: string; points: number }[];
  premierStatus?: string;
  premier?: unknown;
  profile?: Record<string, unknown>;
  origins: Record<string, string>;
  verified: boolean;
}

interface CompleteBody {
  outcome: string;
  account: AccountJson;
  notice?: string;
}

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await SteamAttempt.deleteMany({});
  steam.state.assertionCalls.length = 0;
  steam.state.profileCalls.length = 0;
  steam.state.assertion = "valid";
  steam.state.profile = fakeSteamClient().state.profile;
  leetify.state.calls.length = 0;
  leetify.state.reading = { kind: "rated", rating: 19309 };
  mock.method(clock, "now", () => new Date(FIXED_NOW));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await SteamAttempt.deleteMany({});
  await mongoose.disconnect();
});

/** Abre un intento y vuelve de Steam con él (spec 013): la verificación completa. */
async function verify(session: SignedUp) {
  const start = await withSession(session.agent.post("/api/steam/start"), session.csrf);
  assert.equal(start.status, 200);
  const token = tokenOf((start.body as { url: string }).url);
  return withSession(session.agent.post("/api/steam/complete"), session.csrf).send({
    query: steamLoginQuery(token),
  });
}

async function storedCs2(userId: string) {
  return GameAccount.findOne({ user: userId, gameId: "cs2" });
}

describe("lectura de Leetify al verificar (RF-1, RF-2, RF-3)", () => {
  test("con rating: rango real con su escalón y rating exacto, historial vacío (D27) y sin aviso", async () => {
    const ana = await signUp(app, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal(body.outcome, "verified");
    assert.equal("notice" in body, false);
    assert.equal(body.account.currentRank?.tier, "Purple"); // 19309 → escalón 3 (RF-4)
    assert.equal(body.account.currentRank?.points, 19309);
    assert.equal(body.account.currentRank?.recordedAt, NOW.toISOString());
    assert.deepEqual(body.account.rankHistory, []); // D27: sin historial real
    assert.equal("premierStatus" in body.account, false);
    assert.equal("premier" in body.account, false); // el estado interno no sale (P15-2)
    assert.equal(body.account.origins["rank"], "leetify");
    assert.equal((await storedCs2(ana.id))?.premier, "rated");
  });

  test("a Leetify se le pide el SteamID64 confirmado por Steam, una sola vez", async () => {
    const ana = await signUp(app, ANA);
    await verify(ana);
    assert.deepEqual(leetify.state.calls, [STEAM_ID]);
  });

  test("sin rango Premier: sin rango vigente, historial vacío, premierStatus unrated y sin aviso", async () => {
    leetify.state.reading = { kind: "unrated" };
    const ana = await signUp(app, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal("notice" in body, false);
    assert.equal(body.account.currentRank, null);
    assert.deepEqual(body.account.rankHistory, []);
    assert.equal(body.account.premierStatus, "unrated");
    assert.equal(body.account.verified, true);
    assert.equal((await storedCs2(ana.id))?.premier, "unrated");
  });

  test("RF-15: Leetify falla → verificada igual, rango no disponible y el aviso de Leetify", async () => {
    leetify.state.reading = { kind: "failed" };
    const ana = await signUp(app, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal(body.outcome, "verified");
    assert.equal(body.notice, LEETIFY_NOTICES.verifyFailed);
    assert.equal(body.account.verified, true);
    assert.equal(body.account.currentRank, null);
    assert.deepEqual(body.account.rankHistory, []);
    assert.equal(body.account.premierStatus, "unavailable");
    assert.equal((await storedCs2(ana.id))?.premier, "unavailable");
  });

  test("RF-15, RNF-4: Leetify que no responde a tiempo cuenta como fallo", async () => {
    const hanging: LeetifyClient = { readPremier: () => new Promise<never>(() => undefined) };
    const slowApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: steam.client },
      leetifyClient: hanging,
      sourceTimeoutMs: 30,
    });
    const ana = await signUp(slowApp, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal(body.notice, LEETIFY_NOTICES.verifyFailed);
    assert.equal(body.account.premierStatus, "unavailable");
  });

  test("P15-9: sin cliente de Leetify, la lectura es un fallo (nunca hay red)", async () => {
    const ana = await signUp(appWithoutLeetify, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal(body.notice, LEETIFY_NOTICES.verifyFailed);
    assert.equal(body.account.currentRank, null);
    assert.equal(body.account.premierStatus, "unavailable");
    assert.equal(leetify.state.calls.length, 0);
  });
});

describe("perfil de Steam y Leetify (RF-1, D20, P15-5)", () => {
  test("D20: el perfil de Steam cae y Leetify responde → verificada sin perfil y con el rating", async () => {
    steam.state.profile = { ok: false, reason: "unavailable" };
    const ana = await signUp(app, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal("profile" in body.account, false);
    assert.equal(body.account.currentRank?.points, 19309);
    assert.equal("notice" in body, false);
    assert.deepEqual(leetify.state.calls, [STEAM_ID]);
  });

  test("P15-5: el perfil y Leetify se leen en paralelo", async () => {
    // Cada lectura espera a que empiece la otra: en serie, la primera vencería su plazo.
    let profileStarted!: () => void;
    let premierStarted!: () => void;
    const profileGate = new Promise<void>((resolve) => (profileStarted = resolve));
    const premierGate = new Promise<void>((resolve) => (premierStarted = resolve));
    const steamClient: SteamClient = {
      verifyAssertion: steam.client.verifyAssertion,
      readProfile: async (steamId, signal) => {
        profileStarted();
        await premierGate;
        return steam.client.readProfile(steamId, signal);
      },
    };
    const leetifyClient: LeetifyClient = {
      readPremier: async () => {
        premierStarted();
        await profileGate;
        return { kind: "rated", rating: 19309 };
      },
    };
    const parallelApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: steamClient },
      leetifyClient,
      sourceTimeoutMs: 500,
    });
    const ana = await signUp(parallelApp, ANA);
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const body = response.body as CompleteBody;
    assert.equal(body.account.profile?.["displayName"], PUBLIC_PROFILE.displayName);
    assert.equal(body.account.currentRank?.points, 19309);
  });

  test("Steam no confirma la respuesta → no se consulta a Leetify", async () => {
    steam.state.assertion = "invalid";
    const ana = await signUp(app, ANA);
    assert.equal((await verify(ana)).status, 400);
    steam.state.assertion = "unavailable";
    assert.equal((await verify(ana)).status, 503);
    assert.equal(leetify.state.calls.length, 0);
  });
});

describe("lo simulado se descarta (RF-3, RF-22)", () => {
  test("cuenta manual con historial simulado: al verificar queda el rango de Leetify y el historial vacío (D27)", async () => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, { gameId: "cs2", handle: STEAM_ID, region: "Europe" });
    const before = await GameAccount.findById(id);
    assert.ok(before?.currentRank, "la cuenta manual tiene rango simulado");
    assert.ok((before?.rankHistory.length ?? 0) >= 1);
    assert.equal(before?.premier, undefined); // RF-22: sin verificar no tiene `premier`

    leetify.state.reading = { kind: "rated", rating: 36210 };
    const response = await verify(ana);
    assert.equal(response.status, 200);
    const stored = await GameAccount.findById(id);
    assert.equal(stored?.premier, "rated");
    assert.equal(stored?.currentRank?.tier, "Gold");
    assert.equal(stored?.currentRank?.points, 36210);
    assert.equal(stored?.currentRank?.normalized, 100);
    assert.deepEqual(stored?.rankHistory, []); // D27: el historial simulado se descarta y no se crea otro
    assert.equal(stored?.region, "Europe");
  });

  test("cuenta manual y Leetify sin rango: rango y historial simulados desaparecen", async () => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, { gameId: "cs2", handle: STEAM_ID, region: "Europe" });
    leetify.state.reading = { kind: "unrated" };
    assert.equal((await verify(ana)).status, 200);
    const stored = await GameAccount.findById(id);
    assert.equal(stored?.currentRank, null);
    assert.deepEqual(stored?.rankHistory, []);
    assert.equal(stored?.premier, "unrated");
  });

  test("RF-13 de la 013: las partidas de CS2 siguen simuladas", async () => {
    const ana = await signUp(app, ANA);
    const body = (await verify(ana)).body as CompleteBody;
    assert.ok(((await storedCs2(ana.id))?.matches.length ?? 0) >= 1);
    assert.equal(body.account.origins["matches"], "simulated");
  });
});

describe("409 de otro usuario (spec 013, RF-8)", () => {
  test("el SteamID64 ya verificado por otro usuario → 409 y la cuenta propia no cambia", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    assert.equal((await verify(beto)).status, 200);

    const id = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const before = JSON.parse(JSON.stringify(await GameAccount.findById(id)));
    leetify.state.reading = { kind: "rated", rating: 25000 };
    const response = await verify(ana);
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: ELSEWHERE });
    const after = JSON.parse(JSON.stringify(await GameAccount.findById(id)));
    assert.deepEqual(after, before);
    assert.equal(after.premier, undefined);
    // La cuenta de Beto conserva su lectura de la verificación anterior.
    assert.equal((await storedCs2(beto.id))?.currentRank?.points, 19309);
  });
});
