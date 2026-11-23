// Resincronización de cuentas verificadas con Riot Games, anulaciones en `/api/accounts`,
// resumen por juego (`GET /api/users/:id/games/lol`) y coincidencias (`GET /api/matches`)
// (spec 014, T8).
// Cubre RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34,
// RF-35, RF-36, RF-37, RF-38, RF-44, RF-49, RF-51, RF-52, RF-53, RNF-2, RNF-3, RNF-6, RNF-7;
// D35, D37, D52, D53, D57, D59, D61, D67, D68, D69, D78, D80, D81, D83, D84, D89, D90, D98,
// D102; plan §§2.2, 5.3, 8.1, O-1, P14-3 y P14-6.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { ACCOUNT_ERRORS } from "../../src/domain/accountRules.ts";
import { CHALLENGE_RETENTION_MS } from "../../src/domain/riotChallenge.ts";
import { roundDurationMinutes } from "../../src/domain/riotData.ts";
import type { RiotMatchRecord, RiotRankSnapshot } from "../../src/domain/riotData.ts";
import { RATE_LIMIT_2MIN, RESERVE_SYNC } from "../../src/domain/riotRateLimiter.ts";
import { RIOT_ERRORS, RIOT_NOTICES } from "../../src/domain/riotRules.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { RiotChallenge } from "../../src/models/riotChallenge.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { createChallengeAndCancelPrevious } from "../../src/services/riotChallenges.ts";
import type { RiotAccountResult, RiotSoloRankResult } from "../../src/services/riotClient.ts";
import { createRiotLimiter } from "../../src/services/riotLimiter.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import {
  authApp,
  closeTestServers,
  linkOk,
  rawAccountsInDb,
  signUp,
  sync,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import {
  OTHER_RIOT_PUUID,
  RIOT_ID,
  RIOT_PUUID,
  assertNoPuuid,
  confirmChallenge,
  createChallenge,
  currentChallenge,
  fakeRiotClient,
  riotApp,
  SHORT_OPERATION_TIMEOUT_MS,
} from "./riotHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const CARLA = { email: "carla@example.com", username: "Carla" } as const;
const MINUTE_MS = 60_000;
// Fecha futura para evitar que el monitor TTL de MongoDB purgue desafíos durante la prueba.
const BASE_NOW = Date.parse("2030-06-15T12:00:00.000Z");

let nowMs = BASE_NOW;
let limiterNowMs = BASE_NOW;
let nextPickIndex = 0;

const fake = fakeRiotClient();
const app = await riotApp({
  client: fake.client,
  limiter: createRiotLimiter({
    nowMs: () => limiterNowMs,
    sleep: async (ms) => {
      limiterNowMs += ms;
    },
  }),
  pickIndex: (length) => nextPickIndex % length,
});
const appWithoutRiot = await authApp();

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await RiotChallenge.deleteMany({});
  fake.reset();
  nowMs = BASE_NOW;
  limiterNowMs += 5 * MINUTE_MS;
  nextPickIndex = 0;
  mock.method(clock, "now", () => new Date(nowMs));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await RiotChallenge.deleteMany({});
  await mongoose.disconnect();
});

function sampleRank(overrides: Partial<RiotRankSnapshot> = {}): RiotRankSnapshot {
  return {
    tier: "GOLD",
    division: "II",
    points: 40,
    normalized: 47,
    recordedAt: new Date(nowMs),
    canonicalTier: "Gold",
    ...overrides,
  };
}

function sampleMatch(id: string, overrides: Partial<RiotMatchRecord> = {}): RiotMatchRecord {
  return {
    id,
    gameId: "lol",
    playedAt: new Date(nowMs - 1_800_000),
    result: "win",
    summary: "Ahri · 10/2/7",
    durationMinutes: roundDurationMinutes(1770), // 29 min 30 s -> 30 (D35)
    mode: "solo",
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Verifica la cuenta de LoL de `session` mediante el flujo completo de desafío + confirmación. */
async function verifyLolAccount(
  session: SignedUp,
  options: {
    puuid?: string;
    riotId?: string;
    region?: "LAS" | "LAN" | "NA" | "EUW" | "EUNE" | "BR" | "KR";
    iconId?: number;
    level?: number | null;
    rank?: RiotSoloRankResult;
    matchIds?: string[];
    matchesById?: Record<string, RiotMatchRecord>;
  } = {},
) {
  const puuid = options.puuid ?? RIOT_PUUID;
  const riotId = options.riotId ?? RIOT_ID;
  const region = options.region ?? "LAS";
  const [gameName = "JugadorUno", tagLine = "LAS"] = riotId.split("#");

  const challenge = await createChallengeAndCancelPrevious({
    userId: session.id,
    puuid,
    riotId,
    region,
    iconId: options.iconId ?? 7,
    now: new Date(nowMs),
  });

  fake.state.accountByPuuid = {
    kind: "ok",
    account: { puuid, gameName, tagLine, riotId },
  };
  fake.state.summonerByPuuid = {
    kind: "ok",
    summoner: {
      profileIconId: options.iconId ?? 7,
      level: options.level === undefined ? 120 : options.level,
    },
  };
  fake.state.soloRankByPuuid = options.rank ?? { kind: "ok", rank: sampleRank() };
  const matchIds = options.matchIds ?? [];
  fake.state.recentMatchIds = { kind: "ok", matchIds };
  const byId = options.matchesById ?? {};
  fake.state.matchById = (matchId) => {
    const found = byId[matchId];
    return found === undefined ? { kind: "not_found" } : { kind: "ok", match: found };
  };

  const res = await confirmChallenge(session, challenge.id);
  assert.strictEqual(res.status, 200, `falló verificación de prueba: ${JSON.stringify(res.body)}`);
  fake.state.accountByPuuidCalls.length = 0;
  fake.state.summonerByPuuidCalls.length = 0;
  fake.state.soloRankCalls.length = 0;
  fake.state.recentMatchIdsCalls.length = 0;
  fake.state.matchByIdCalls.length = 0;
  return res.body.account as { id: string; handle: string; region: string };
}

describe("POST /api/accounts/:id/sync (Riot): orden de errores RF-51 y RF-35", () => {
  test("409 ya se está comprobando: dos resincronizaciones simultáneas del mismo usuario (RF-49, D90)", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifyLolAccount(ana);
    nowMs += 5 * MINUTE_MS;

    const started = deferred<void>();
    const gate = deferred<RiotAccountResult>();
    fake.state.accountByPuuid = () => {
      started.resolve();
      return gate.promise;
    };

    const firstPromise = Promise.resolve(sync(ana, account.id));
    await started.promise;

    const second = await sync(ana, account.id);
    assert.strictEqual(second.status, 409);
    assert.deepStrictEqual(second.body, { error: RIOT_ERRORS.inProgress });
    assert.strictEqual(fake.state.accountByPuuidCalls.length, 1);

    // También bloquea un pedido de desafío del mismo usuario mientras resincroniza (RF-49, D90).
    const concurrentChallenge = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.strictEqual(concurrentChallenge.status, 409);
    assert.deepStrictEqual(concurrentChallenge.body, { error: RIOT_ERRORS.inProgress });

    gate.resolve({
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
    });
    const first = await firstPromise;
    assert.strictEqual(first.status, 200);
    assertNoPuuid(first.body);
  });

  test("503 sin clave de Riot va ANTES del 429 de espera mínima (RF-38, RF-51)", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const created = await GameAccount.create({
      user: ana.id,
      gameId: "lol",
      handle: RIOT_ID,
      region: "LAS",
      currentRank: sampleRank(),
      rankHistory: [sampleRank()],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: new Date(nowMs),
      lastSuccessfulSyncAt: new Date(nowMs), // recién sincronizada (dentro de 5 min)
      verification: { source: "riot", externalId: RIOT_PUUID, verifiedAt: new Date(nowMs) },
      profile: { level: 120, iconId: 7 },
    });
    const before = await rawAccountsInDb();

    const response = await withSession(
      ana.agent.post(`/api/accounts/${created.id}/sync`),
      ana.csrf,
    );
    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(response.body, { error: RIOT_ERRORS.unavailable });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("429 espera mínima tras verificación completa y 200 a los 5 min exactos (RF-7, RF-51)", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifyLolAccount(ana);

    // Recién verificada completamente → espera 5 minutos, sin consultar a Riot.
    const immediate = await sync(ana, account.id);
    assert.strictEqual(immediate.status, 429);
    assert.deepStrictEqual(immediate.body, { error: ACCOUNT_ERRORS.syncCooldown(5) });
    assert.strictEqual(fake.totalCalls(), 0);

    // A los 4 min 10 s → singular «1 minuto».
    nowMs += 4 * MINUTE_MS + 10_000;
    const almost = await sync(ana, account.id);
    assert.strictEqual(almost.status, 429);
    assert.deepStrictEqual(almost.body, { error: ACCOUNT_ERRORS.syncCooldown(1) });
    assert.strictEqual(fake.totalCalls(), 0);

    // A los 5 min exactos → 200.
    nowMs = BASE_NOW + 5 * MINUTE_MS;
    const allowed = await sync(ana, account.id);
    assert.strictEqual(allowed.status, 200);
    assert.strictEqual("syncNotice" in allowed.body, false);
    assertNoPuuid(allowed.body);
  });

  test("503 limitador propio sin hueco para reservar 24 consultas y liberación de sobrantes (RF-37, RF-51, D69, D84)", async () => {
    let limiterNow = BASE_NOW;
    const limiter = createRiotLimiter({
      nowMs: () => limiterNow,
      sleep: async () => undefined,
    });
    const limitedFake = fakeRiotClient();
    const limitedApp = await riotApp({ client: limitedFake.client, limiter });

    const ana = await signUp(limitedApp, ANA);
    const account = await GameAccount.create({
      user: ana.id,
      gameId: "lol",
      handle: RIOT_ID,
      region: "LAS",
      currentRank: sampleRank(),
      rankHistory: [sampleRank()],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: new Date(nowMs - 10 * MINUTE_MS),
      lastSuccessfulSyncAt: new Date(nowMs - 10 * MINUTE_MS),
      verification: { source: "riot", externalId: RIOT_PUUID, verifiedAt: new Date(nowMs - 10 * MINUTE_MS) },
      profile: { level: 120, iconId: 7 },
    });

    // Ocupar 77 cupos → quedan 23 (< 24 de RESERVE_SYNC).
    const hold = limiter.reserve(RATE_LIMIT_2MIN - (RESERVE_SYNC - 1));
    assert.ok(hold !== null);
    const before = await rawAccountsInDb();

    const busy = await withSession(ana.agent.post(`/api/accounts/${account.id}/sync`), ana.csrf);
    assert.strictEqual(busy.status, 503);
    assert.deepStrictEqual(busy.body, { error: RIOT_ERRORS.busy });
    assert.strictEqual(limitedFake.totalCalls(), 0);
    assert.deepStrictEqual(await rawAccountsInDb(), before);

    // Liberar cupo y forzar 404 en Account-v1 (1 consulta usada): las 23 sobrantes deben liberarse (D69).
    limiter.release(hold);
    limitedFake.state.accountByPuuid = { kind: "not_found" };
    const gone = await withSession(ana.agent.post(`/api/accounts/${account.id}/sync`), ana.csrf);
    assert.strictEqual(gone.status, 404);

    // Quedan 99 cupos en la ventana (100 - 1 usado), así que cabe reservar 99 (no 76).
    const check = limiter.reserve(RATE_LIMIT_2MIN - 1);
    assert.ok(check !== null, "debe liberar las 23 consultas sobrantes tras fallo temprano");
    limiter.release(check);
    limiterNow += 1;
  });

  test("503 fallo de Riot en cuenta o perfil (incl. nivel ilegible RF-52) deja la cuenta intacta", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifyLolAccount(ana);
    nowMs += 5 * MINUTE_MS;
    const before = await rawAccountsInDb();

    // Fallo Account-v1
    fake.state.accountByPuuid = { kind: "unavailable" };
    const acctFail = await sync(ana, account.id);
    assert.strictEqual(acctFail.status, 503);
    assert.deepStrictEqual(acctFail.body, { error: RIOT_ERRORS.unavailable });
    assert.strictEqual(fake.state.accountByPuuidCalls.length, 1);
    assert.deepStrictEqual(await rawAccountsInDb(), before);

    // Fallo Summoner-v4 por nivel ilegible (RF-52)
    fake.state.accountByPuuid = {
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
    };
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 12, level: null } };
    const summFail = await sync(ana, account.id);
    assert.strictEqual(summFail.status, 503);
    assert.deepStrictEqual(summFail.body, { error: RIOT_ERRORS.unavailable });
    assert.strictEqual(fake.state.summonerByPuuidCalls.length, 1);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("404 RF-35: cuenta borrada en Riot y cuenta transferida de región dejan la cuenta intacta", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifyLolAccount(ana, { region: "LAS" });
    nowMs += 5 * MINUTE_MS;
    const before = await rawAccountsInDb();

    // Account-v1 404 → cuenta borrada
    fake.state.accountByPuuid = { kind: "not_found" };
    const gone = await sync(ana, account.id);
    assert.strictEqual(gone.status, 404);
    assert.deepStrictEqual(gone.body, { error: "la cuenta ya no existe en Riot Games" });
    assert.deepStrictEqual(await rawAccountsInDb(), before);

    // Account-v1 ok + Summoner-v4 404 → cuenta transferida de región
    fake.state.accountByPuuid = {
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
    };
    fake.state.summonerByPuuid = { kind: "not_found" };
    const transferred = await sync(ana, account.id);
    assert.strictEqual(transferred.status, 404);
    assert.deepStrictEqual(transferred.body, {
      error:
        "la cuenta ya no tiene perfil de League of Legends en LAS: desvincúlala y vuelve a verificarla en su región nueva",
    });
    assert.deepStrictEqual(await rawAccountsInDb(), before);

    const stored = await GameAccount.findById(account.id);
    assert.strictEqual(stored?.verification?.source, "riot");
  });

  test("503 si se supera el tiempo máximo de operación (60 s, RNF-7/D98), incluso tras leer cuenta y perfil, sin cambiar nada", async () => {
    const slowFake = fakeRiotClient();
    const shortTimeoutApp = await riotApp({ client: slowFake.client }, { operationTimeoutMs: SHORT_OPERATION_TIMEOUT_MS });
    const ana = await signUp(shortTimeoutApp, ANA);
    const created = await GameAccount.create({
      user: ana.id,
      gameId: "lol",
      handle: RIOT_ID,
      region: "LAS",
      currentRank: sampleRank(),
      rankHistory: [sampleRank()],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: new Date(nowMs - 10 * MINUTE_MS),
      lastSuccessfulSyncAt: new Date(nowMs - 10 * MINUTE_MS),
      verification: { source: "riot", externalId: RIOT_PUUID, verifiedAt: new Date(nowMs - 10 * MINUTE_MS) },
      profile: { level: 120, iconId: 7 },
    });

    // Cuenta y perfil cambian, pero el rango cuelga hasta vencer el plazo global de la operación.
    slowFake.state.accountByPuuid = {
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "Cambiado", tagLine: "LAS", riotId: "Cambiado#LAS" },
    };
    slowFake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 99, level: 200 } };
    slowFake.state.soloRankByPuuid = () => new Promise<RiotSoloRankResult>(() => undefined);

    const before = await rawAccountsInDb();
    const res = await withSession(ana.agent.post(`/api/accounts/${created.id}/sync`), ana.csrf);
    assert.strictEqual(res.status, 503);
    assert.deepStrictEqual(res.body, { error: RIOT_ERRORS.unavailable });
    assert.strictEqual(slowFake.state.soloRankCalls.length, 1);
    // Ni el handle ni el perfil ya leídos deben guardarse (RNF-7).
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });
});

describe("RF-53: resincronización parcial (`syncNotice` O-1, bloques conservados, sin espera)", () => {
  test("falla el rango: 200 con `syncNotice`, conserva rango e historial, no pasa a pendiente y permite resincronizar de inmediato", async () => {
    const ana = await signUp(app, ANA);
    const m1 = sampleMatch("LA2_1");
    const account = await verifyLolAccount(ana, {
      rank: { kind: "ok", rank: sampleRank({ tier: "GOLD", division: "II", points: 45 }) },
      matchIds: ["LA2_1"],
      matchesById: { LA2_1: m1 },
    });

    nowMs += 5 * MINUTE_MS;
    const m2 = sampleMatch("LA2_2", { playedAt: new Date(nowMs - 600_000) });
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 18, level: 121 } };
    fake.state.soloRankByPuuid = { kind: "unavailable" };
    fake.state.recentMatchIds = { kind: "ok", matchIds: ["LA2_2", "LA2_1"] };
    fake.state.matchById = (id) =>
      id === "LA2_2"
        ? { kind: "ok", match: m2 }
        : id === "LA2_1"
          ? { kind: "ok", match: m1 }
          : { kind: "not_found" };

    const partial = await sync(ana, account.id);
    assert.strictEqual(partial.status, 200);
    assert.strictEqual(partial.body.syncNotice, RIOT_NOTICES.partialSync);
    assert.strictEqual(partial.body.currentRank.tier, "GOLD");
    assert.strictEqual(partial.body.currentRank.points, 45);
    assert.strictEqual(partial.body.rankHistory.length, 1);
    assert.deepStrictEqual(partial.body.profile, { level: 121, iconId: 18 });
    assert.strictEqual("pendingBlocks" in partial.body, false, "no pasa rango a pendiente (RF-53)");
    assertNoPuuid(partial.body);

    // Puede volver a resincronizar de inmediato (sin 429) porque la parcial no actualiza la espera.
    nowMs += 5_000;
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 68 }),
    };
    const full = await sync(ana, account.id);
    assert.strictEqual(full.status, 200);
    assert.strictEqual("syncNotice" in full.body, false);
    assert.strictEqual(full.body.currentRank.points, 68);
    assert.strictEqual(full.body.rankHistory.length, 2);

    // Ahora sí cuenta la espera mínima de 5 min.
    const blocked = await sync(ana, account.id);
    assert.strictEqual(blocked.status, 429);
  });

  test("cuenta con bloques pendientes desde RF-27: quita los leídos bien, conserva pendientes los que siguen fallando", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifyLolAccount(ana, {
      level: null, // profile pendiente
      rank: { kind: "unavailable" }, // rank pendiente
      matchIds: [],
    });
    // Forzar también matches pendiente al verificar usando una verificación con lista fallida
    await GameAccount.updateOne(
      { _id: account.id },
      { $set: { pendingBlocks: ["rank", "matches", "profile"], lastSuccessfulSyncAt: null } },
    );

    // Inmediatamente (sin espera mínima): perfil y rango OK, lista de partidas falla.
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 7, level: 130 } };
    fake.state.soloRankByPuuid = { kind: "ok", rank: sampleRank({ points: 55 }) };
    fake.state.recentMatchIds = { kind: "unavailable" };

    const partial = await sync(ana, account.id);
    assert.strictEqual(partial.status, 200);
    assert.strictEqual(partial.body.syncNotice, RIOT_NOTICES.partialSync);
    assert.deepStrictEqual(partial.body.pendingBlocks, ["matches"]);
    assert.strictEqual(partial.body.currentRank.points, 55);
    assert.deepStrictEqual(partial.body.profile, { level: 130, iconId: 7 });

    // Sigue pudiendo resincronizar de inmediato hasta leer todo.
    fake.state.recentMatchIds = { kind: "ok", matchIds: [] };
    const full = await sync(ana, account.id);
    assert.strictEqual(full.status, 200);
    assert.strictEqual("syncNotice" in full.body, false);
    assert.strictEqual("pendingBlocks" in full.body, false);
  });
});

describe("RF-14 + D89 (cambio de Riot ID) y RF-15 (cambio de ícono tras verificar)", () => {
  test("RF-14 + D89: cambiar Riot ID actualiza handle, conserva historial, desvincula manual ajena, anula su desafío y libera el Riot ID antiguo", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);

    const anaAccount = await verifyLolAccount(ana, {
      puuid: RIOT_PUUID,
      riotId: "NombreViejo#LAS",
      rank: { kind: "ok", rank: sampleRank({ tier: "GOLD", division: "II", points: 30 }) },
    });

    // Beto vincula manualmente el Riot ID que Ana va a adoptar (con otras mayúsculas) y abre un desafío.
    await linkOk(beto, { gameId: "lol", handle: "nombrenuevo#las", region: "LAS" });
    const betoChallenge = await createChallengeAndCancelPrevious({
      userId: beto.id,
      puuid: OTHER_RIOT_PUUID,
      riotId: "NombreNuevo#LAS",
      region: "LAS",
      iconId: 12,
      now: new Date(nowMs),
    });

    // Ana cambia su Riot ID en Riot y resincroniza 5 min después.
    nowMs += 5 * MINUTE_MS;
    fake.state.accountByPuuid = {
      kind: "ok",
      account: {
        puuid: RIOT_PUUID,
        gameName: "NombreNuevo",
        tagLine: "LAS",
        riotId: "NombreNuevo#LAS",
      },
    };
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 50 }),
    };

    const res = await sync(ana, anaAccount.id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.handle, "NombreNuevo#LAS");
    assert.strictEqual(res.body.verified, true);
    assert.strictEqual(res.body.verifiedWith, "riot");
    assert.strictEqual(res.body.rankHistory.length, 2);
    assertNoPuuid(res.body);

    // La cuenta manual de Beto fue desvinculada y su desafío abierto fue anulado (D89).
    const betoAccount = await GameAccount.findOne({ user: beto.id, gameId: "lol" });
    assert.strictEqual(betoAccount, null);
    const betoChallengeAfter = await RiotChallenge.findById(betoChallenge._id);
    assert.strictEqual(betoChallengeAfter?.status, "cancelled");
    assert.strictEqual(
      betoChallengeAfter?.deleteAt.getTime(),
      nowMs + CHALLENGE_RETENTION_MS,
      "deleteAt debe adelantarse a at + 24 h (D87)",
    );

    // El Riot ID antiguo quedó libre para vincularlo a mano (RF-14).
    const carlaLink = await withSession(carla.agent.post("/api/accounts"), carla.csrf).send({
      gameId: "lol",
      handle: "NombreViejo#LAS",
      region: "LAS",
    });
    assert.strictEqual(carlaLink.status, 201);
  });

  test("RF-15: cambiar a cualquier ícono después de verificar y resincronizar mantiene la verificación", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifyLolAccount(ana, { iconId: 5 });

    nowMs += 5 * MINUTE_MS;
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 4567, level: 125 } };

    const res = await sync(ana, account.id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.verified, true);
    assert.strictEqual(res.body.verifiedWith, "riot");
    assert.deepStrictEqual(res.body.profile, { level: 125, iconId: 4567 });
    assertNoPuuid(res.body);
  });
});

describe("RF-30, RF-12 y RF-32 end-to-end en resincronización y GET /api/users/:id/games/lol", () => {
  test("variación de LP con D37, D78, D81, D102, duración redondeada D35 y RF-32/D52 en games/lol", async () => {
    const ana = await signUp(app, ANA);

    // Lectura 1 (verificación completa): GOLD II 40 LP, m1 con 1769 s -> 29 min.
    const m1 = sampleMatch("LA2_M1", {
      playedAt: new Date(nowMs - 7_200_000),
      durationMinutes: roundDurationMinutes(1769), // 29 min 29 s -> 29
      summary: "MonkeyKing · 5/3/8",
    });
    const account = await verifyLolAccount(ana, {
      rank: { kind: "ok", rank: sampleRank({ tier: "GOLD", division: "II", points: 40 }) },
      matchIds: ["LA2_M1"],
      matchesById: { LA2_M1: m1 },
    });

    const summary1 = await withSession(ana.agent.get("/api/users/me/games/lol"), ana.csrf);
    assert.strictEqual(summary1.status, 200);
    assertNoPuuid(summary1.body);
    assert.strictEqual(summary1.body.recentMatches.length, 1);
    assert.strictEqual(summary1.body.recentMatches[0].id, "LA2_M1");
    assert.strictEqual(summary1.body.recentMatches[0].durationMinutes, 29);
    assert.strictEqual(summary1.body.recentMatches[0].summary, "MonkeyKing · 5/3/8");
    assert.strictEqual("rankDelta" in summary1.body.recentMatches[0], false, "primera lectura omite rankDelta");

    // Lectura 2 (resync completa): GOLD II 62 LP, [m2, remake, m1] -> 1 partida nueva real -> +22 LP.
    nowMs += 5 * MINUTE_MS;
    const m2 = sampleMatch("LA2_M2", {
      playedAt: new Date(nowMs - 3_600_000),
      durationMinutes: roundDurationMinutes(1770), // 29 min 30 s -> 30
    });
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 62 }),
    };
    fake.state.recentMatchIds = { kind: "ok", matchIds: ["LA2_M2", "LA2_REMAKE", "LA2_M1"] };
    fake.state.matchById = (id) => {
      if (id === "LA2_M2") return { kind: "ok", match: m2 };
      if (id === "LA2_REMAKE") return { kind: "remake" };
      if (id === "LA2_M1") return { kind: "ok", match: m1 };
      return { kind: "not_found" };
    };
    assert.strictEqual((await sync(ana, account.id)).status, 200);

    const summary2 = await withSession(ana.agent.get("/api/users/me/games/lol"), ana.csrf);
    assert.strictEqual(summary2.status, 200);
    assert.strictEqual(summary2.body.recentMatches[0].id, "LA2_M2");
    assert.strictEqual(summary2.body.recentMatches[0].durationMinutes, 30);
    assert.strictEqual(summary2.body.recentMatches[0].rankDelta, 22);
    assert.strictEqual("rankDelta" in summary2.body.recentMatches[1], false);

    // Lectura 3 (D102: partida omitida -> NO completa): [m3, m_bad, m2, m1] con GOLD II 80 LP.
    // No es resync parcial (sin syncNotice), pero m3 queda sin rankDelta y baseline sigue en lectura 2 (62 LP).
    nowMs += 5 * MINUTE_MS;
    const m3 = sampleMatch("LA2_M3", { playedAt: new Date(nowMs - 1_200_000) });
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 80 }),
    };
    fake.state.recentMatchIds = { kind: "ok", matchIds: ["LA2_M3", "LA2_BAD", "LA2_M2", "LA2_M1"] };
    fake.state.matchById = (id) => {
      if (id === "LA2_M3") return { kind: "ok", match: m3 };
      if (id === "LA2_BAD") return { kind: "invalid_data" };
      if (id === "LA2_M2") return { kind: "ok", match: m2 };
      if (id === "LA2_M1") return { kind: "ok", match: m1 };
      return { kind: "not_found" };
    };
    const res3 = await sync(ana, account.id);
    assert.strictEqual(res3.status, 200);
    assert.strictEqual("syncNotice" in res3.body, false, "partida suelta omitida no hace parcial el bloque (D83/D102)");

    const summary3 = await withSession(ana.agent.get("/api/users/me/games/lol"), ana.csrf);
    assert.strictEqual(summary3.body.recentMatches[0].id, "LA2_M3");
    assert.strictEqual("rankDelta" in summary3.body.recentMatches[0], false, "D102: lectura con omitida deja sin variación");
    assert.strictEqual(summary3.body.recentMatches[1].rankDelta, 22, "D37: variación asignada inmutable");

    // Lectura 4 (D78: falla rango -> parcial): no actualiza baseline ni asigna variación a m3.
    nowMs += 5 * MINUTE_MS;
    fake.state.soloRankByPuuid = { kind: "unavailable" };
    fake.state.recentMatchIds = { kind: "ok", matchIds: ["LA2_M3", "LA2_M2", "LA2_M1"] };
    const res4 = await sync(ana, account.id);
    assert.strictEqual(res4.status, 200);
    assert.strictEqual(res4.body.syncNotice, RIOT_NOTICES.partialSync);

    // Lectura 5 (D81: siguiente lectura completa, sin espera tras parcial): GOLD II 85 LP, [m3, m2, m1].
    // Solo m3 es nueva respecto a baseline de lectura 2 (62 LP) -> m3 recibe +23 LP; m2 sigue +22.
    nowMs += 10_000;
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 85 }),
    };
    const res5 = await sync(ana, account.id);
    assert.strictEqual(res5.status, 200);
    assert.strictEqual("syncNotice" in res5.body, false);

    const summary5 = await withSession(ana.agent.get("/api/users/me/games/lol"), ana.csrf);
    assert.strictEqual(summary5.body.recentMatches[0].id, "LA2_M3");
    assert.strictEqual(summary5.body.recentMatches[0].rankDelta, 23);
    assert.strictEqual(summary5.body.recentMatches[1].rankDelta, 22);

    // RF-32 + D52: pasar a sin clasificar no añade punto y trend = 0; volver al mismo rango (GOLD II 85) no añade punto.
    const historyCountBeforeUnranked = res5.body.rankHistory.length;
    nowMs += 5 * MINUTE_MS;
    fake.state.soloRankByPuuid = { kind: "ok", rank: null };
    const unrankedSync = await sync(ana, account.id);
    assert.strictEqual(unrankedSync.status, 200);
    assert.strictEqual(unrankedSync.body.currentRank, null);
    assert.strictEqual(unrankedSync.body.rankHistory.length, historyCountBeforeUnranked);

    const unrankedSummary = await withSession(ana.agent.get("/api/users/me/games/lol"), ana.csrf);
    assert.strictEqual(unrankedSummary.status, 200);
    assert.strictEqual(unrankedSummary.body.account.currentRank, null);
    assert.strictEqual(unrankedSummary.body.trend, 0);

    nowMs += 5 * MINUTE_MS;
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 85 }),
    };
    const backToSame = await sync(ana, account.id);
    assert.strictEqual(backToSame.status, 200);
    assert.strictEqual(backToSame.body.rankHistory.length, historyCountBeforeUnranked, "D52: no duplica último punto");
  });
});

describe("RF-29 (D59): vincular, editar región o desvincular cuenta manual de LoL anula el desafío abierto", () => {
  test("vincular LoL manual anula el desafío abierto y adelanta deleteAt a at + 24 h", async () => {
    const ana = await signUp(app, ANA);
    const ch = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: RIOT_PUUID,
      riotId: RIOT_ID,
      region: "LAS",
      iconId: 3,
      now: new Date(nowMs),
    });

    nowMs += 2 * MINUTE_MS;
    await linkOk(ana, { gameId: "lol", handle: "Manual#LAS", region: "LAS" });

    const stored = await RiotChallenge.findById(ch._id);
    assert.strictEqual(stored?.status, "cancelled");
    assert.strictEqual(stored?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);

    const current = await currentChallenge(ana);
    assert.strictEqual(current.status, 200);
    assert.deepStrictEqual(current.body, { challenge: null });
  });

  test("editar la región de la cuenta manual de LoL anula el desafío abierto", async () => {
    const ana = await signUp(app, ANA);
    const manualId = await linkOk(ana, { gameId: "lol", handle: "Manual#LAS", region: "LAS" });
    const ch = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: RIOT_PUUID,
      riotId: RIOT_ID,
      region: "LAS",
      iconId: 4,
      now: new Date(nowMs),
    });

    nowMs += MINUTE_MS;
    const edited = await withSession(ana.agent.put(`/api/accounts/${manualId}`), ana.csrf).send({
      region: "BR",
    });
    assert.strictEqual(edited.status, 200);

    const stored = await RiotChallenge.findById(ch._id);
    assert.strictEqual(stored?.status, "cancelled");
    assert.strictEqual(stored?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);
  });

  test("desvincular la cuenta manual de LoL anula el desafío abierto", async () => {
    const ana = await signUp(app, ANA);
    const manualId = await linkOk(ana, { gameId: "lol", handle: "Manual#LAS", region: "LAS" });
    const ch = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: RIOT_PUUID,
      riotId: RIOT_ID,
      region: "LAS",
      iconId: 6,
      now: new Date(nowMs),
    });

    nowMs += MINUTE_MS;
    const deleted = await withSession(ana.agent.delete(`/api/accounts/${manualId}`), ana.csrf);
    assert.strictEqual(deleted.status, 204);

    const stored = await RiotChallenge.findById(ch._id);
    assert.strictEqual(stored?.status, "cancelled");
    assert.strictEqual(stored?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);
  });

  test("vincular, editar o desvincular otro juego (CS2/R6) NO anula el desafío abierto de LoL", async () => {
    const ana = await signUp(app, ANA);
    const ch = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: RIOT_PUUID,
      riotId: RIOT_ID,
      region: "LAS",
      iconId: 8,
      now: new Date(nowMs),
    });

    const cs2Id = await linkOk(ana, {
      gameId: "cs2",
      handle: "76561190000000001",
      region: "South America",
    });
    assert.strictEqual(
      (await withSession(ana.agent.put(`/api/accounts/${cs2Id}`), ana.csrf).send({ region: "North America" }))
        .status,
      200,
    );
    assert.strictEqual(
      (await withSession(ana.agent.delete(`/api/accounts/${cs2Id}`), ana.csrf)).status,
      204,
    );

    const stored = await RiotChallenge.findById(ch._id);
    assert.strictEqual(stored?.status, "open");
  });
});

describe("RF-13, RF-33 y RF-44 en GET /api/matches (y auditoría RNF-3)", () => {
  test("cuenta sin clasificar: 409 al buscar (después de 400 de filtros y sin clave) y excluida como candidata", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await verifyLolAccount(ana, { puuid: RIOT_PUUID, riotId: RIOT_ID, rank: { kind: "ok", rank: null } });
    await linkOk(beto, { gameId: "lol", handle: "Beto#LAS", region: "LAS" });

    // RF-33: dueño sin clasificar recibe 409.
    const ownSearch = await withSession(ana.agent.get("/api/matches?game=lol"), ana.csrf);
    assert.strictEqual(ownSearch.status, 409);
    assert.deepStrictEqual(ownSearch.body, { error: RIOT_ERRORS.unrankedForMatches });

    // D61: 400 de validación de filtros va ANTES del 409.
    const badFilter = await withSession(
      ana.agent.get("/api/matches?game=lol&minSharedHours=-1"),
      ana.csrf,
    );
    assert.strictEqual(badFilter.status, 400);

    // RF-13: Ana queda fuera como candidata cuando Beto busca en LoL.
    const betoSearch = await withSession(
      beto.agent.get("/api/matches?game=lol&maxRankDistance=100"),
      beto.csrf,
    );
    assert.strictEqual(betoSearch.status, 200);
    assert.deepStrictEqual(betoSearch.body, []);

    // D57: el 409 NO depende de la clave de Riot (instancia sin riotIntegration).
    const carla = await signUp(appWithoutRiot, CARLA);
    await GameAccount.create({
      user: carla.id,
      gameId: "lol",
      handle: "SinClave#LAS",
      region: "LAS",
      currentRank: null,
      rankHistory: [],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: new Date(nowMs),
      lastSuccessfulSyncAt: new Date(nowMs),
      verification: { source: "riot", externalId: OTHER_RIOT_PUUID, verifiedAt: new Date(nowMs) },
      profile: { level: 80, iconId: 2 },
    });
    const noKeySearch = await withSession(carla.agent.get("/api/matches?game=lol"), carla.csrf);
    assert.strictEqual(noKeySearch.status, 409);
    assert.deepStrictEqual(noKeySearch.body, { error: RIOT_ERRORS.unrankedForMatches });
  });

  test("RF-44: rango pendiente → 409 y fuera como candidata hasta resincronizar; partidas/perfil pendientes NO excluyen (D67, D80)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);

    // Ana: rango pendiente (RF-27).
    const anaAccount = await verifyLolAccount(ana, {
      puuid: RIOT_PUUID,
      riotId: "Ana#LAS",
      rank: { kind: "unavailable" },
    });
    // Beto: solo partidas y perfil pendientes (rango leído bien: GOLD II).
    fake.state.recentMatchIds = { kind: "unavailable" };
    await verifyLolAccount(beto, {
      puuid: OTHER_RIOT_PUUID,
      riotId: "Beto#LAS",
      level: null, // profile pendiente
      rank: { kind: "ok", rank: sampleRank({ tier: "GOLD", division: "II", points: 50, normalized: 47 }) },
    });
    // Forzar matches pendiente también en Beto (para probar ambos: matches + profile pendientes).
    await GameAccount.updateOne({ user: beto.id, gameId: "lol" }, { $set: { pendingBlocks: ["matches", "profile"] } });

    // Carla: cuenta manual de LoL con rango cercano.
    await linkOk(carla, { gameId: "lol", handle: "Carla#LAS", region: "LAS" });

    // Ana (rango pendiente) recibe 409 al buscar.
    const anaSearch = await withSession(ana.agent.get("/api/matches?game=lol"), ana.csrf);
    assert.strictEqual(anaSearch.status, 409);
    assert.deepStrictEqual(anaSearch.body, { error: RIOT_ERRORS.unrankedForMatches });

    // Beto (solo partidas y perfil pendientes) SÍ puede buscar y aparece como candidato de Carla (D67, D80).
    const betoSearch = await withSession(
      beto.agent.get("/api/matches?game=lol&maxRankDistance=100"),
      beto.csrf,
    );
    assert.strictEqual(betoSearch.status, 200);
    assert.deepStrictEqual(
      betoSearch.body.map((item: { user: { username: string } }) => item.user.username),
      ["Carla"],
    );
    assertNoPuuid(betoSearch.body, RIOT_PUUID);
    assertNoPuuid(betoSearch.body, OTHER_RIOT_PUUID);

    const carlaSearchBefore = await withSession(
      carla.agent.get("/api/matches?game=lol&maxRankDistance=100"),
      carla.csrf,
    );
    assert.strictEqual(carlaSearchBefore.status, 200);
    assert.deepStrictEqual(
      carlaSearchBefore.body.map((item: { user: { username: string } }) => item.user.username),
      ["Beto"],
    );
    assertNoPuuid(carlaSearchBefore.body, OTHER_RIOT_PUUID);

    // Ana resincroniza y obtiene rango → vuelve a poder buscar y aparece para Carla (RF-44).
    fake.state.accountByPuuid = {
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "Ana", tagLine: "LAS", riotId: "Ana#LAS" },
    };
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 7, level: 120 } };
    fake.state.soloRankByPuuid = {
      kind: "ok",
      rank: sampleRank({ tier: "GOLD", division: "II", points: 45, normalized: 47 }),
    };
    fake.state.recentMatchIds = { kind: "ok", matchIds: [] };
    assert.strictEqual((await sync(ana, anaAccount.id)).status, 200);

    const anaSearchAfter = await withSession(
      ana.agent.get("/api/matches?game=lol&maxRankDistance=100"),
      ana.csrf,
    );
    assert.strictEqual(anaSearchAfter.status, 200);
    assert.strictEqual(anaSearchAfter.body.length, 2);

    // Auditoría RNF-3 en /api/accounts, /api/accounts/:id, /api/users/me/games/lol y /api/matches
    const listAccounts = await withSession(ana.agent.get("/api/accounts"), ana.csrf);
    const getAccount = await withSession(ana.agent.get(`/api/accounts/${anaAccount.id}`), ana.csrf);
    const gameSummary = await withSession(ana.agent.get("/api/users/me/games/lol"), ana.csrf);
    assertNoPuuid(listAccounts.body, RIOT_PUUID);
    assertNoPuuid(listAccounts.body, OTHER_RIOT_PUUID);
    assertNoPuuid(getAccount.body, RIOT_PUUID);
    assertNoPuuid(gameSummary.body, RIOT_PUUID);
    assertNoPuuid(anaSearchAfter.body, RIOT_PUUID);
    assertNoPuuid(anaSearchAfter.body, OTHER_RIOT_PUUID);
  });
});

// Spec 020 (T5): el modo de cada partida se guarda al verificar y al resincronizar (RF-2) y las guardadas antes de la
// spec, que no lo tienen, se leen como Solo/Dúo y se reescriben con modo (RF-3; plan 020, D-P2).
describe("Spec 020, RF-2 y RF-3: se guarda el modo de cada partida", () => {
  async function storedMatches(): Promise<Array<{ matchId: string; mode?: string; rankDelta?: number }>> {
    const account = await GameAccount.findOne({ gameId: "lol" }).lean();
    assert.ok(account, "la cuenta de LoL existe");
    return account.matches.map(({ matchId, mode, rankDelta }) => ({
      matchId,
      ...(mode === undefined ? {} : { mode }),
      ...(rankDelta == null ? {} : { rankDelta }),
    }));
  }

  test("la verificación guarda el modo de cada partida", async () => {
    const ana = await signUp(app, ANA);
    const solo = sampleMatch("LA2_S1", { playedAt: new Date(nowMs - 3_000_000) });
    const aram = sampleMatch("LA2_A1", { playedAt: new Date(nowMs - 2_000_000), mode: "aram" });
    const other = sampleMatch("LA2_O1", { playedAt: new Date(nowMs - 1_000_000), mode: "other" });
    await verifyLolAccount(ana, {
      matchIds: ["LA2_O1", "LA2_A1", "LA2_S1"],
      matchesById: { LA2_S1: solo, LA2_A1: aram, LA2_O1: other },
    });

    const stored = await storedMatches();
    assert.deepStrictEqual(
      stored.map(({ matchId, mode }) => [matchId, mode]),
      [
        ["LA2_O1", "other"],
        ["LA2_A1", "aram"],
        ["LA2_S1", "solo"],
      ],
    );
  });

  test("la resincronización guarda el modo de las partidas nuevas y reescribe con modo las que no lo tenían, sin tocar su variación", async () => {
    const ana = await signUp(app, ANA);
    const old1 = sampleMatch("LA2_OLD1", { playedAt: new Date(nowMs - 7_200_000) });
    const old2 = sampleMatch("LA2_OLD2", { playedAt: new Date(nowMs - 6_000_000) });
    const account = await verifyLolAccount(ana, {
      matchIds: ["LA2_OLD2", "LA2_OLD1"],
      matchesById: { LA2_OLD1: old1, LA2_OLD2: old2 },
    });

    // Estado previo a la spec 020: sin modo en las partidas guardadas, una de ellas con variación asignada.
    await GameAccount.collection.updateOne({ gameId: "lol" }, { $unset: { "matches.$[].mode": "" } });
    await GameAccount.collection.updateOne({ gameId: "lol" }, { $set: { "matches.0.rankDelta": 22 } }); // LA2_OLD2, la más reciente
    assert.deepStrictEqual(
      (await storedMatches()).map((m) => m.mode),
      [undefined, undefined],
      "preparación: las partidas guardadas no tienen modo",
    );

    // Resincronización con una partida nueva de ARAM y otra de Flex, y las dos anteriores.
    nowMs += 5 * MINUTE_MS;
    const aram = sampleMatch("LA2_NEW_ARAM", { playedAt: new Date(nowMs - 2_000_000), mode: "aram" });
    const flex = sampleMatch("LA2_NEW_FLEX", { playedAt: new Date(nowMs - 1_000_000), mode: "flex" });
    const byId: Record<string, RiotMatchRecord> = {
      LA2_NEW_FLEX: flex,
      LA2_NEW_ARAM: aram,
      LA2_OLD2: old2,
      LA2_OLD1: old1,
    };
    fake.state.recentMatchIds = { kind: "ok", matchIds: Object.keys(byId) };
    fake.state.matchById = (id) => {
      const found = byId[id];
      return found === undefined ? { kind: "not_found" } : { kind: "ok", match: found };
    };
    assert.strictEqual((await sync(ana, account.id)).status, 200);

    const stored = await storedMatches();
    const byMatch = new Map(stored.map((m) => [m.matchId, m]));
    assert.strictEqual(byMatch.get("LA2_NEW_FLEX")?.mode, "flex");
    assert.strictEqual(byMatch.get("LA2_NEW_ARAM")?.mode, "aram");
    assert.strictEqual(byMatch.get("LA2_OLD2")?.mode, "solo", "una guardada sin modo era Solo/Dúo (RF-3)");
    assert.strictEqual(byMatch.get("LA2_OLD1")?.mode, "solo", "una guardada sin modo era Solo/Dúo (RF-3)");
    assert.strictEqual(byMatch.get("LA2_OLD2")?.rankDelta, 22, "la variación ya asignada se conserva (spec 014, D37)");
    assert.strictEqual(byMatch.get("LA2_NEW_FLEX")?.rankDelta, undefined, "las de otros modos no tienen variación");
    assert.strictEqual(byMatch.get("LA2_NEW_ARAM")?.rankDelta, undefined, "las de otros modos no tienen variación");
    assert.strictEqual(stored.length, 4);
  });
});

// Spec 020 (T7): resumen por juego de una cuenta de LoL con datos de Riot (RF-12, RF-16, RF-17; RNF-1, RNF-5).
describe("Spec 020, RF-12, RF-16 y RNF-1: el resumen por juego entrega las partidas con su modo", () => {
  const MIXED_MODES = ["aram", "flex", "normal", "other", "aram"] as const;
  const SUMMARY_PATH = "/api/users/me/games/lol";

  /** 20 partidas, de la más reciente (índice 0) a la más antigua: las pares de Solo/Dúo y las impares de otros modos. */
  function mixedMatches() {
    return Array.from({ length: 20 }, (_, i) => {
      const solo = i % 2 === 0;
      return sampleMatch(`LA2_MX${String(i).padStart(2, "0")}`, {
        playedAt: new Date(nowMs - (i + 1) * 600_000),
        // Las de Solo/Dúo se ganan si i % 4 === 0; las de otros modos se ganan todas (no deben contar).
        result: solo ? (i % 4 === 0 ? "win" : "loss") : "win",
        mode: solo ? "solo" : (MIXED_MODES[(i - 1) / 2 % MIXED_MODES.length] ?? "other"),
      });
    });
  }

  function byIdOf(matches: RiotMatchRecord[]): Record<string, RiotMatchRecord> {
    return Object.fromEntries(matches.map((m) => [m.id, m]));
  }

  test("una cuenta con 20 partidas de modos mezclados: las 20 con su modo, de la más reciente a la más antigua, y % solo de las 8 últimas de Solo/Dúo", async () => {
    const ana = await signUp(app, ANA);
    const matches = mixedMatches();
    await verifyLolAccount(ana, {
      matchIds: matches.map((m) => m.id),
      matchesById: byIdOf(matches),
    });

    const res = await withSession(ana.agent.get(SUMMARY_PATH), ana.csrf);
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(Object.keys(res.body).sort(), ["account", "recentMatches", "trend", "winRate"]);
    assertNoPuuid(res.body); // RNF-5

    const shown = res.body.recentMatches as Array<Record<string, unknown>>;
    assert.strictEqual(shown.length, 20, "se entregan todas las guardadas, no solo 8");
    assert.deepStrictEqual(
      shown.map((m) => m.id),
      matches.map((m) => m.id),
      "de la más reciente a la más antigua",
    );
    assert.deepStrictEqual(
      shown.map((m) => m.mode),
      matches.map((m) => m.mode),
    );
    for (const m of shown) {
      assert.deepStrictEqual(
        Object.keys(m).sort(),
        ["durationMinutes", "gameId", "id", "mode", "playedAt", "result", "summary"],
        "sin rankDelta en la primera lectura y sin identificadores internos",
      );
    }
    // Las 8 primeras de Solo/Dúo son i = 0, 2, …, 14; ganadas las de i = 0, 4, 8 y 12: 4 de 8 → 50.
    assert.strictEqual(res.body.winRate, 50);
  });

  test("sin ninguna partida de Solo/Dúo, winRate es null (RF-12) y el resto del resumen sigue igual", async () => {
    const ana = await signUp(app, ANA);
    const matches = [
      sampleMatch("LA2_N1", { playedAt: new Date(nowMs - 600_000), mode: "aram" }),
      sampleMatch("LA2_N2", { playedAt: new Date(nowMs - 1_200_000), mode: "flex", result: "loss" }),
    ];
    await verifyLolAccount(ana, { matchIds: matches.map((m) => m.id), matchesById: byIdOf(matches) });

    const res = await withSession(ana.agent.get(SUMMARY_PATH), ana.csrf);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.winRate, null);
    assert.deepStrictEqual(
      res.body.recentMatches.map((m: { id: string; mode: string }) => [m.id, m.mode]),
      [
        ["LA2_N1", "aram"],
        ["LA2_N2", "flex"],
      ],
    );
    assert.ok(res.body.account.currentRank, "el rango sigue mostrándose");
  });

  test("una cuenta verificada sin ninguna partida: winRate es null y recentMatches vacía", async () => {
    const ana = await signUp(app, ANA);
    await verifyLolAccount(ana, { matchIds: [], matchesById: {} });

    const res = await withSession(ana.agent.get(SUMMARY_PATH), ana.csrf);
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.recentMatches, []);
    assert.strictEqual(res.body.winRate, null);
  });

  test("las partidas guardadas sin modo (anteriores a la spec) salen como «solo» y cuentan para el porcentaje (RF-3)", async () => {
    const ana = await signUp(app, ANA);
    const matches = [
      sampleMatch("LA2_L1", { playedAt: new Date(nowMs - 600_000) }),
      sampleMatch("LA2_L2", { playedAt: new Date(nowMs - 1_200_000), result: "loss" }),
      sampleMatch("LA2_L3", { playedAt: new Date(nowMs - 1_800_000) }),
    ];
    await verifyLolAccount(ana, { matchIds: matches.map((m) => m.id), matchesById: byIdOf(matches) });
    await GameAccount.collection.updateOne({ gameId: "lol" }, { $unset: { "matches.$[].mode": "" } });

    const res = await withSession(ana.agent.get(SUMMARY_PATH), ana.csrf);
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(
      res.body.recentMatches.map((m: { mode: string }) => m.mode),
      ["solo", "solo", "solo"],
    );
    assert.strictEqual(res.body.winRate, 67); // 2 de 3
  });

  test("una cuenta de LoL simulada, una de CS2 y una de R6 devuelven el resumen de siempre: sin `mode` y con winRate numérico (RF-16)", async () => {
    const ana = await signUp(app, ANA);
    const handles = {
      lol: { gameId: "lol", handle: "Manual#LAS", region: "LAS" },
      r6: { gameId: "r6", handle: "jugador2", region: "LATAM" },
      cs2: { gameId: "cs2", handle: "76561190000000001", region: "South America" },
    } as const;
    for (const body of Object.values(handles)) await linkOk(ana, body);

    for (const gameId of ["lol", "r6", "cs2"] as const) {
      const res = await withSession(ana.agent.get(`/api/users/me/games/${gameId}`), ana.csrf);
      assert.strictEqual(res.status, 200, gameId);
      assert.deepStrictEqual(Object.keys(res.body).sort(), ["account", "recentMatches", "trend", "winRate"], gameId);
      assert.strictEqual(typeof res.body.winRate, "number", gameId);
      assert.ok(res.body.recentMatches.length >= 1 && res.body.recentMatches.length <= 8, gameId);
      for (const m of res.body.recentMatches) {
        assert.strictEqual("mode" in m, false, `${gameId}: una partida simulada no lleva modo`);
      }
    }
  });

  test("RNF-1: una resincronización con 20 partidas de modos mezclados usa 24 consultas, con una sola lista sin cola por modo", async () => {
    const ana = await signUp(app, ANA);
    const matches = mixedMatches();
    const account = await verifyLolAccount(ana, { matchIds: [], matchesById: {} });

    nowMs += 5 * MINUTE_MS;
    fake.state.recentMatchIds = { kind: "ok", matchIds: matches.map((m) => m.id) };
    const byId = byIdOf(matches);
    fake.state.matchById = (id) => {
      const found = byId[id];
      return found === undefined ? { kind: "not_found" } : { kind: "ok", match: found };
    };
    assert.strictEqual((await sync(ana, account.id)).status, 200);

    assert.strictEqual(fake.state.recentMatchIdsCalls.length, 1, "una sola consulta de la lista, no una por modo");
    assert.strictEqual(fake.state.matchByIdCalls.length, 20);
    const total =
      fake.state.accountByPuuidCalls.length +
      fake.state.summonerByPuuidCalls.length +
      fake.state.soloRankCalls.length +
      fake.state.recentMatchIdsCalls.length +
      fake.state.matchByIdCalls.length;
    assert.strictEqual(total, 24, "cuenta, perfil, rango, lista y 20 partidas (spec 014, RNF-1, D84)");
  });
});
