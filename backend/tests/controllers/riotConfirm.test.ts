// Confirmación de desafíos de Riot Games: `POST /api/riot/challenges/:id/confirm` y extensión de
// `verifyAccount` (spec 014, T7).
// Cubre RF-7..RF-12, RF-16, RF-23..RF-27, RF-29, RF-30..RF-32, RF-34, RF-36..RF-38, RF-48..RF-50,
// RF-52, RNF-1, RNF-2, RNF-3, RNF-6, RNF-7; D69, D80, D82, D83, D89, D91, D92, D94, D95, D97,
// D98, D102, D104; plan §§2.2, 5.2 y 8.1.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import {
  CHALLENGE_RETENTION_MS,
  CHALLENGE_TTL_MS,
  MAX_CONFIRM_ATTEMPTS,
} from "../../src/domain/riotChallenge.ts";
import type { RiotMatchRecord, RiotRankSnapshot } from "../../src/domain/riotData.ts";
import { RATE_LIMIT_2MIN, RESERVE_CONFIRM } from "../../src/domain/riotRateLimiter.ts";
import { RIOT_ERRORS, RIOT_NOTICES } from "../../src/domain/riotRules.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { RiotChallenge } from "../../src/models/riotChallenge.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import {
  cancelChallenge,
  cancelOpenChallengesForUsers,
  createChallengeAndCancelPrevious,
} from "../../src/services/riotChallenges.ts";
import { createRiotLimiter } from "../../src/services/riotLimiter.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  authApp,
  closeTestServers,
  linkOk,
  nonExistingId,
  signUp,
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
const NOW = new Date(FIXED_NOW);
const MINUTE_MS = 60_000;

let nowMs = FIXED_NOW;
let nextPickIndex = 0;

const fake = fakeRiotClient();
const app = await riotApp({
  client: fake.client,
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
  nowMs = FIXED_NOW;
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
    points: 45,
    normalized: 47,
    recordedAt: new Date(nowMs),
    canonicalTier: "Gold",
    ...overrides,
  };
}

function sampleMatch(index: number, overrides: Partial<RiotMatchRecord> = {}): RiotMatchRecord {
  return {
    id: `LA2_${1000 + index}`,
    gameId: "lol",
    playedAt: new Date(FIXED_NOW - index * 3_600_000),
    result: index % 2 === 0 ? "win" : "loss",
    summary: `Ahri · ${8 + index}/2/5`,
    durationMinutes: 29,
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

async function openChallengeFor(
  userId: string,
  overrides: {
    puuid?: string;
    riotId?: string;
    region?: string;
    iconId?: number;
    now?: Date;
  } = {},
) {
  return createChallengeAndCancelPrevious({
    userId,
    puuid: overrides.puuid ?? RIOT_PUUID,
    riotId: overrides.riotId ?? RIOT_ID,
    region: overrides.region ?? "LAS",
    iconId: overrides.iconId ?? 7,
    now: overrides.now ?? new Date(nowMs),
  });
}

async function verifyLolFor(
  userId: string,
  handle: string,
  externalId: string,
  region: string = "LAS",
): Promise<void> {
  const result = await verifyAccount({
    userId,
    gameId: "lol",
    handle,
    region,
    verification: { source: "riot", externalId },
    real: { handle },
    now: NOW,
  });
  assert.equal(result.ok, true);
}

function setupMatchingRiot(iconId: number, options: {
  level?: number | null;
  riotId?: { gameName: string; tagLine: string };
  rank?: RiotRankSnapshot | null;
  matches?: RiotMatchRecord[];
} = {}) {
  const gameName = options.riotId?.gameName ?? "JugadorUno";
  const tagLine = options.riotId?.tagLine ?? "LAS";
  fake.state.summonerByPuuid = {
    kind: "ok",
    summoner: {
      profileIconId: iconId,
      level: options.level === undefined ? 120 : options.level,
    },
  };
  fake.state.accountByPuuid = {
    kind: "ok",
    account: {
      puuid: RIOT_PUUID,
      gameName,
      tagLine,
      riotId: `${gameName}#${tagLine}`,
    },
  };
  fake.state.soloRankByPuuid = {
    kind: "ok",
    rank: options.rank === undefined ? sampleRank() : options.rank,
  };
  const matches = options.matches ?? [sampleMatch(1), sampleMatch(2)];
  const byId = new Map(matches.map((match) => [match.id, match]));
  fake.state.soloMatchIds = {
    kind: "ok",
    matchIds: matches.map((match) => match.id),
  };
  fake.state.matchById = (matchId) => {
    const match = byId.get(matchId);
    return match === undefined ? { kind: "not_found" } : { kind: "ok", match };
  };
}

describe("sesión y anti-CSRF en POST /api/riot/challenges/:id/confirm", () => {
  test("sin sesión → 401 sin consultar a Riot ni sumar intentos", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id);

    const res = await supertest(app).post(`/api/riot/challenges/${ch.id}/confirm`);
    assert.equal(res.status, 401);
    assert.equal(fake.totalCalls(), 0);
    assert.equal((await RiotChallenge.findById(ch.id))?.attempts, 0);
  });

  test("con cookie pero sin X-CSRF-Token → 401 sin consultar a Riot ni sumar intentos", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id);

    const res = await ana.agent.post(`/api/riot/challenges/${ch.id}/confirm`);
    assert.equal(res.status, 401);
    assert.equal(fake.totalCalls(), 0);
    assert.equal((await RiotChallenge.findById(ch.id))?.attempts, 0);
  });
});

describe("RF-26 paso 1 — validaciones sin consultar a Riot (no cuentan como intento)", () => {
  test("404 RF-23: id inválido, inexistente o de otro usuario (principio 5)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const chAna = await openChallengeFor(ana.id);

    for (const badId of ["no-es-un-id", nonExistingId(), chAna.id]) {
      const caller: SignedUp = badId === chAna.id ? beto : ana;
      const res = await confirmChallenge(caller, badId);
      assert.equal(res.status, 404, badId);
      assert.deepEqual(res.body, { error: RIOT_ERRORS.challengeNotFound });
      assertNoPuuid(res.body);
    }

    assert.equal(fake.totalCalls(), 0);
    const stored = await RiotChallenge.findById(chAna.id);
    assert.equal(stored?.attempts, 0);
    assert.equal(stored?.status, "open");
  });

  test("409 RF-48: desafío ya completado, antes de lock/vencido/sin clave y sin sumar intentos", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const ch = await openChallengeFor(ana.id);
    await RiotChallenge.updateOne({ _id: ch._id }, { $set: { status: "completed" } });
    nowMs = FIXED_NOW + CHALLENGE_TTL_MS + 10_000;

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.challengeCompleted });
    assert.equal(fake.totalCalls(), 0);
    assert.equal((await RiotChallenge.findById(ch.id))?.attempts, 0);
  });

  test("409 RF-25/RF-49: confirmación simultánea del mismo usuario no consulta a Riot ni suma intento", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    const gate = deferred<{ kind: "ok"; summoner: { profileIconId: number; level: number } }>();
    const reachedRiot = deferred<void>();

    fake.state.summonerByPuuid = async () => {
      reachedRiot.resolve();
      return gate.promise;
    };

    const firstPromise = confirmChallenge(ana, ch.id).then((res) => res);
    await Promise.race([
      reachedRiot.promise,
      firstPromise.then((res) => {
        throw new Error(`confirmación terminó antes de consultar a Riot (status ${res.status})`);
      }),
    ]);

    // Segunda confirmación simultánea → 409 inmediato sin contar intento.
    const second = await confirmChallenge(ana, ch.id);
    assert.equal(second.status, 409);
    assert.deepEqual(second.body, { error: RIOT_ERRORS.inProgress });

    // También un pedido de desafío simultáneo mientras se confirma → 409 (RF-49).
    const concurrentCreate = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(concurrentCreate.status, 409);
    assert.deepEqual(concurrentCreate.body, { error: RIOT_ERRORS.inProgress });

    // Pero GET /challenges/current sigue respondiendo normalmente (RF-45, D90).
    const current = await currentChallenge(ana);
    assert.equal(current.status, 200);
    assert.equal(current.body.challenge?.id, ch.id);

    gate.resolve({ kind: "ok", summoner: { profileIconId: 0, level: 120 } });
    const first = await firstPromise;
    assert.equal(first.status, 400);
    assert.deepEqual(first.body, { error: RIOT_ERRORS.iconMismatch });

    // Solo la primera contó como intento (1 llamada a Riot).
    assert.equal(fake.totalCalls(), 1);
    assert.equal((await RiotChallenge.findById(ch.id))?.attempts, 1);
  });

  test("429 RF-10: 10 confirmaciones contadas anula el desafío sin consultar a Riot y gana sobre vencido y sin clave", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const ch = await openChallengeFor(ana.id);
    await RiotChallenge.updateOne(
      { _id: ch._id },
      { $set: { attempts: MAX_CONFIRM_ATTEMPTS } },
    );

    nowMs = FIXED_NOW + 2 * MINUTE_MS;
    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 429);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.tooManyAttempts });

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, MAX_CONFIRM_ATTEMPTS);
    assert.equal(stored?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);
  });

  test("400 RF-9: desafío vencido a los 10:00 exactos o ya anulado, sin consultar a Riot ni contar intento", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const ch = await openChallengeFor(ana.id);
    // Otro usuario ya verificó también → vencido (400) debe ganar sobre 409 otro verificó y 503 sin clave.
    const beto = await signUp(appWithoutRiot, BETO);
    await verifyLolFor(beto.id, RIOT_ID, RIOT_PUUID);

    nowMs = FIXED_NOW + CHALLENGE_TTL_MS; // 10:00 exactos
    const resExpired = await confirmChallenge(ana, ch.id);
    assert.equal(resExpired.status, 400);
    assert.deepEqual(resExpired.body, { error: RIOT_ERRORS.challengeExpired });
    assert.equal((await RiotChallenge.findById(ch.id))?.attempts, 0);

    // Desafío anulado antes de vencer.
    nowMs = FIXED_NOW + MINUTE_MS;
    const chCancelled = await openChallengeFor(ana.id, { puuid: OTHER_RIOT_PUUID });
    await cancelChallenge(chCancelled.id, new Date(nowMs));
    const resCancelled = await confirmChallenge(ana, chCancelled.id);
    assert.equal(resCancelled.status, 400);
    assert.deepEqual(resCancelled.body, { error: RIOT_ERRORS.challengeExpired });
    assert.equal((await RiotChallenge.findById(chCancelled.id))?.attempts, 0);
  });

  test("409 RF-24 (D91): otro usuario verificó antes de Riot anula el desafío sin contar intento y gana sobre 503 sin clave", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const beto = await signUp(appWithoutRiot, BETO);
    const ch = await openChallengeFor(ana.id);
    await verifyLolFor(beto.id, RIOT_ID, RIOT_PUUID);

    nowMs = FIXED_NOW + MINUTE_MS;
    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.verifiedElsewhere });

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, 0);
    assert.equal(stored?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);
  });

  test("503 RF-38: sin clave de Riot no cuenta intento y mantiene desafío abierto", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const ch = await openChallengeFor(ana.id);

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 503);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.unavailable });

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "open");
    assert.equal(stored?.attempts, 0);
  });

  test("503 RF-37: limitador propio sin hueco para reservar 24 consultas rechaza sin consultar a Riot ni contar intento", async () => {
    const limiter = createRiotLimiter({
      nowMs: () => nowMs,
      sleep: async () => undefined,
    });
    // Consumimos 77 consultas en la ventana de 2 min: quedan 23 < 24 requeridas.
    const used = limiter.reserve(RATE_LIMIT_2MIN - RESERVE_CONFIRM + 1);
    assert.ok(used !== null);
    const limitedApp = await riotApp({ client: fake.client, limiter });

    const ana = await signUp(limitedApp, ANA);
    const ch = await openChallengeFor(ana.id);

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 503);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.busy });
    assert.equal(fake.totalCalls(), 0);

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "open");
    assert.equal(stored?.attempts, 0);
    limiter.release(used);
  });
});

describe("RF-26 paso 2 — errores consultando a Riot (confirmación contada)", () => {
  test("503 RF-16 / RF-52 (D94): fallo de Riot o ícono ilegible cuenta intento y mantiene desafío abierto", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });

    fake.state.summonerByPuuid = { kind: "unavailable" };
    const res1 = await confirmChallenge(ana, ch.id);
    assert.equal(res1.status, 503);
    assert.deepEqual(res1.body, { error: RIOT_ERRORS.unavailable });

    fake.state.summonerByPuuid = { kind: "invalid_data" };
    const res2 = await confirmChallenge(ana, ch.id);
    assert.equal(res2.status, 503);
    assert.deepEqual(res2.body, { error: RIOT_ERRORS.unavailable });

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "open");
    assert.equal(stored?.attempts, 2);
    assert.equal(await GameAccount.countDocuments({}), 0);
  });

  test("404 RF-50 (D55, D74): summoner not_found cuenta intento, anula el desafío y no verifica nada", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    fake.state.summonerByPuuid = { kind: "not_found" };

    nowMs = FIXED_NOW + MINUTE_MS;
    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.accountNotFound });

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, 1);
    assert.equal(stored?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);
    assert.equal(await GameAccount.countDocuments({}), 0);
  });

  test("400 RF-8: ícono distinto cuenta intento, mantiene abierto con vencimiento original y no lee más bloques (incl. D94 con nivel null)", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    const originalExpiry = ch.expiresAt.getTime();

    // Incluso con level: null (D94), si el ícono se leyó y NO coincide → 400 RF-8 (no 503).
    fake.state.summonerByPuuid = {
      kind: "ok",
      summoner: { profileIconId: 3, level: null },
    };
    nowMs = FIXED_NOW + 3 * MINUTE_MS;
    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.iconMismatch });

    assert.equal(fake.state.summonerByPuuidCalls.length, 1);
    assert.equal(fake.state.accountByPuuidCalls.length, 0);
    assert.equal(fake.state.soloRankCalls.length, 0);
    assert.equal(fake.state.soloMatchIdsCalls.length, 0);

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "open");
    assert.equal(stored?.attempts, 1);
    assert.equal(stored?.expiresAt.getTime(), originalExpiry);
  });

  test("409 RF-24 (D91): otro usuario verifica mientras se comprueba el ícono → 409 tras ícono coincidente antes de leer datos, anula y cuenta intento", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });

    fake.state.summonerByPuuid = async () => {
      // Beto verifica la misma cuenta mientras Ana espera a Summoner-v4.
      await verifyLolFor(beto.id, "OtroNombre#LAS", RIOT_PUUID);
      return { kind: "ok", summoner: { profileIconId: 7, level: 120 } };
    };

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.verifiedElsewhere });

    // No leyó cuenta, rango ni partidas (D91).
    assert.equal(fake.state.summonerByPuuidCalls.length, 1);
    assert.equal(fake.state.accountByPuuidCalls.length, 0);
    assert.equal(fake.state.soloRankCalls.length, 0);
    assert.equal(fake.state.soloMatchIdsCalls.length, 0);

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, 1);
    assert.equal(await GameAccount.countDocuments({ user: ana.id }), 0);
  });

  test("404 RF-50 (D95): tras confirmar el ícono, Account-v1 by-puuid not_found anula el desafío, cuenta intento y no verifica", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);
    fake.state.accountByPuuid = { kind: "not_found" };

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.accountNotFound });

    assert.equal(fake.state.soloRankCalls.length, 0);
    assert.equal(fake.state.soloMatchIdsCalls.length, 0);

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, 1);
    assert.equal(await GameAccount.countDocuments({ user: ana.id }), 0);
  });
});

describe("RF-7, RF-11..RF-13, RF-29, RF-30..RF-32, RF-34, RF-36 — verificación exitosa", () => {
  test("verificación completa: guarda Riot ID vigente (aunque haya cambiado), rango real, partidas sin rankDelta, perfil, baseline y cooldown sin puuid", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7, riotId: "ViejoNombre#LAS" });
    const challengerRank: RiotRankSnapshot = {
      tier: "CHALLENGER",
      points: 1450,
      normalized: 100,
      recordedAt: new Date(nowMs),
      canonicalTier: "Challenger",
    };
    const m1 = sampleMatch(1);
    const m2 = sampleMatch(2);
    setupMatchingRiot(7, {
      level: 345,
      riotId: { gameName: "NuevoNombre", tagLine: "LAS" },
      rank: challengerRank,
      matches: [m1, m2],
    });
    // Incluimos un remake en la lista para comprobar que se descarta sin invalidar el baseline (D39, D102).
    fake.state.soloMatchIds = { kind: "ok", matchIds: [m1.id, "LA2_REMAKE", m2.id] };
    fake.state.matchById = (matchId) => {
      if (matchId === "LA2_REMAKE") return { kind: "remake" };
      if (matchId === m1.id) return { kind: "ok", match: m1 };
      if (matchId === m2.id) return { kind: "ok", match: m2 };
      return { kind: "not_found" };
    };

    nowMs = FIXED_NOW + 2 * MINUTE_MS;
    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assertNoPuuid(res.body);
    assert.equal(res.body.outcome, "verified");
    assert.equal("notice" in res.body, false);

    const account = res.body.account;
    assert.equal(account.verified, true);
    assert.equal(account.verifiedWith, "riot");
    assert.equal(account.handle, "NuevoNombre#LAS");
    assert.equal(account.region, "LAS");
    assert.deepEqual(account.origins, {
      identity: "riot",
      rank: "riot",
      matches: "riot",
      profile: "riot",
    });
    assert.equal(account.currentRank.tier, "CHALLENGER");
    assert.equal("division" in account.currentRank, false);
    assert.equal(account.currentRank.points, 1450);
    assert.equal("canonicalTier" in account.currentRank, false);
    assert.equal(account.rankHistory.length, 1);
    assert.deepEqual(account.profile, { level: 345, iconId: 7 });
    assert.equal("pendingBlocks" in account, false);

    // Estado interno en MongoDB:
    const storedAccount = await GameAccount.findById(account.id);
    assert.ok(storedAccount !== null);
    assert.equal(storedAccount.verification?.externalId, RIOT_PUUID);
    assert.equal(storedAccount.currentRank?.canonicalTier, "Challenger");
    assert.equal(storedAccount.lastSuccessfulSyncAt?.getTime(), nowMs);
    assert.deepEqual(
      storedAccount.matches.map((m) => ({ id: m.matchId, rankDelta: m.rankDelta })),
      [
        { id: m1.id, rankDelta: undefined },
        { id: m2.id, rankDelta: undefined },
      ],
    );
    assert.equal(storedAccount.riotLpBaseline?.tier, "CHALLENGER");
    assert.equal(storedAccount.riotLpBaseline?.points, 1450);
    assert.deepEqual(storedAccount.riotLpBaseline?.matchIds, [m1.id, m2.id]);

    // Desafío cerrado con deleteAt adelantado (D87) y un intento contado.
    const storedCh = await RiotChallenge.findById(ch.id);
    assert.equal(storedCh?.status, "completed");
    assert.equal(storedCh?.attempts, 1);
    assert.equal(storedCh?.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);

    // GET /api/accounts tampoco expone puuid (RNF-3).
    const accountsRes = await withSession(ana.agent.get("/api/accounts"), ana.csrf);
    assert.equal(accountsRes.status, 200);
    assertNoPuuid(accountsRes.body);
  });

  test("cuenta sin clasificar (RF-13): currentRank null, rankHistory vacío, sin pendingBlocks y sin aviso", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7, { rank: null, matches: [] });

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, "verified");
    assert.equal("notice" in res.body, false);
    assert.equal(res.body.account.currentRank, null);
    assert.deepEqual(res.body.account.rankHistory, []);
    assert.equal("pendingBlocks" in res.body.account, false);

    const stored = await GameAccount.findById(res.body.account.id);
    assert.equal(stored?.lastSuccessfulSyncAt?.getTime(), FIXED_NOW);
    assert.equal(stored?.riotLpBaseline?.tier, null);
    assert.deepEqual(stored?.riotLpBaseline?.matchIds, []);
  });

  test("D82: si falla Account-v1 by-puuid (sin ser 404), guarda el Riot ID del desafío sin aviso, sin pendientes y con cooldown", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7, riotId: "FormaDeRiot#LAS" });
    setupMatchingRiot(7);
    fake.state.accountByPuuid = { kind: "unavailable" };

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, "verified");
    assert.equal("notice" in res.body, false);
    assert.equal(res.body.account.handle, "FormaDeRiot#LAS");
    assert.equal("pendingBlocks" in res.body.account, false);

    const stored = await GameAccount.findById(res.body.account.id);
    assert.equal(stored?.lastSuccessfulSyncAt?.getTime(), FIXED_NOW);
  });

  test("D83 / D102: una partida suelta que falla o es inválida se omite; sin aviso ni pendientes, pero baseline queda null", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    const m1 = sampleMatch(1);
    setupMatchingRiot(7, { matches: [m1] });
    fake.state.soloMatchIds = { kind: "ok", matchIds: [m1.id, "LA2_BROKEN", "LA2_FAIL"] };
    fake.state.matchById = (matchId) => {
      if (matchId === m1.id) return { kind: "ok", match: m1 };
      if (matchId === "LA2_BROKEN") return { kind: "invalid_data" };
      return { kind: "unavailable" };
    };

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal("notice" in res.body, false);
    assert.equal("pendingBlocks" in res.body.account, false);

    const stored = await GameAccount.findById(res.body.account.id);
    assert.deepEqual(
      stored?.matches.map((m) => m.matchId),
      [m1.id],
    );
    // D102: lectura con partida omitida NO sirve de baseline para RF-30, pero sí cuenta como completa para RF-7/cooldown.
    assert.equal(stored?.riotLpBaseline ?? null, null);
    assert.equal(stored?.lastSuccessfulSyncAt?.getTime(), FIXED_NOW);
  });

  test("convierte cuenta manual propia de la misma región y (RF-29 / D89) desvincula manuales ajenas anulando sus desafíos abiertos", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);

    const manualAnaId = await linkOk(ana, { gameId: "lol", handle: "ManualAna#LAS", region: "LAS" });
    // Beto tiene cuenta manual con el mismo Riot ID (distintas mayúsculas y región) Y un desafío abierto de LoL.
    await linkOk(beto, { gameId: "lol", handle: "jugadoruno#las", region: "NA" });
    await linkOk(beto, { gameId: "r6", handle: "jugadoruno", region: "LATAM" });
    const chBeto = await openChallengeFor(beto.id, { puuid: OTHER_RIOT_PUUID, riotId: "Otra#NA", region: "NA" });
    // Carla tiene cuenta manual con otro Riot ID y un desafío abierto: NO debe tocarse.
    await linkOk(carla, { gameId: "lol", handle: "AlguienMas#LAS", region: "LAS" });
    const chCarla = await openChallengeFor(carla.id, { puuid: "puuid-carla", riotId: "AlguienMas#LAS", region: "LAS" });

    const chAna = await openChallengeFor(ana.id, { iconId: 7, riotId: RIOT_ID });
    setupMatchingRiot(7);

    const res = await confirmChallenge(ana, chAna.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.account.id, manualAnaId);
    assert.equal(res.body.account.verified, true);
    assert.equal(res.body.account.handle, RIOT_ID);

    // Beto perdió su cuenta manual de LoL y su desafío abierto fue anulado (RF-29, D89), pero conserva R6.
    assert.equal(await GameAccount.countDocuments({ user: beto.id, gameId: "lol" }), 0);
    assert.equal(await GameAccount.countDocuments({ user: beto.id, gameId: "r6" }), 1);
    assert.equal((await RiotChallenge.findById(chBeto.id))?.status, "cancelled");

    // Carla sigue intacta.
    assert.equal(await GameAccount.countDocuments({ user: carla.id, gameId: "lol" }), 1);
    assert.equal((await RiotChallenge.findById(chCarla.id))?.status, "open");
  });
});

describe("RF-27 — fallo parcial por bloques con ambos avisos y sin espera mínima", () => {
  test("solo falla rango (unavailable o invalid_data): pendingBlocks ['rank'], aviso parcial, sin espera mínima", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);
    fake.state.soloRankByPuuid = { kind: "invalid_data" }; // p. ej. LP negativos (RF-52)

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, "verified");
    assert.equal(res.body.notice, RIOT_NOTICES.verifiedPartialData);
    assert.equal(res.body.account.currentRank, null);
    assert.deepEqual(res.body.account.rankHistory, []);
    assert.deepEqual(res.body.account.pendingBlocks, ["rank"]);

    const stored = await GameAccount.findById(res.body.account.id);
    assert.equal(stored?.matches.length, 2);
    assert.equal(stored?.lastSuccessfulSyncAt ?? null, null);
    assert.equal(stored?.riotLpBaseline ?? null, null);
  });

  test("solo falla lista de partidas: pendingBlocks ['matches'], aviso parcial, rango guardado, sin espera mínima", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);
    fake.state.soloMatchIds = { kind: "unavailable" };

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.notice, RIOT_NOTICES.verifiedPartialData);
    assert.equal(res.body.account.currentRank.tier, "GOLD");
    assert.deepEqual(res.body.account.pendingBlocks, ["matches"]);

    const stored = await GameAccount.findById(res.body.account.id);
    assert.deepEqual(stored?.matches, []);
    assert.equal(stored?.lastSuccessfulSyncAt ?? null, null);
    assert.equal(stored?.riotLpBaseline ?? null, null);
  });

  test("solo falla perfil (D80, D92, D94: level null con ícono coincidente): pendingBlocks ['profile'], mantiene iconId, aviso parcial, baseline guardado, sin espera mínima", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7, { level: null });

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.notice, RIOT_NOTICES.verifiedPartialData);
    assert.deepEqual(res.body.account.profile, { iconId: 7 });
    assert.equal("level" in res.body.account.profile, false);
    assert.deepEqual(res.body.account.pendingBlocks, ["profile"]);
    assert.equal(res.body.account.currentRank.tier, "GOLD");

    const stored = await GameAccount.findById(res.body.account.id);
    assert.equal(stored?.lastSuccessfulSyncAt ?? null, null);
    // D78/D102: rango y partidas SÍ fueron completos → baseline sí se guarda.
    assert.equal(stored?.riotLpBaseline?.tier, "GOLD");
  });

  test("fallan rango y partidas (con o sin perfil): aviso 'no pudimos leer sus datos' (D79, D80)", async () => {
    // Caso A: perfil ok, rango y partidas fallan.
    const ana = await signUp(app, ANA);
    const chAna = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);
    fake.state.soloRankByPuuid = { kind: "unavailable" };
    fake.state.soloMatchIds = { kind: "unavailable" };

    const resAna = await confirmChallenge(ana, chAna.id);
    assert.equal(resAna.status, 200);
    assert.equal(resAna.body.notice, RIOT_NOTICES.verifiedNoData);
    assert.deepEqual(resAna.body.account.pendingBlocks, ["rank", "matches"]);
    assert.equal((await GameAccount.findById(resAna.body.account.id))?.lastSuccessfulSyncAt ?? null, null);

    // Caso B: rango, partidas y perfil fallan (D80, D92).
    const beto = await signUp(app, BETO);
    const chBeto = await openChallengeFor(beto.id, { puuid: OTHER_RIOT_PUUID, riotId: "Dos#LAS", iconId: 11 });
    setupMatchingRiot(11, { level: null, riotId: { gameName: "Dos", tagLine: "LAS" } });
    fake.state.accountByPuuid = {
      kind: "ok",
      account: { puuid: OTHER_RIOT_PUUID, gameName: "Dos", tagLine: "LAS", riotId: "Dos#LAS" },
    };
    fake.state.soloRankByPuuid = { kind: "unavailable" };
    fake.state.soloMatchIds = { kind: "unavailable" };

    const resBeto = await confirmChallenge(beto, chBeto.id);
    assert.equal(resBeto.status, 200);
    assert.equal(resBeto.body.notice, RIOT_NOTICES.verifiedNoData);
    assert.deepEqual(resBeto.body.account.pendingBlocks, ["rank", "matches", "profile"]);
    assert.deepEqual(resBeto.body.account.profile, { iconId: 11 });
    assert.equal((await GameAccount.findById(resBeto.body.account.id))?.lastSuccessfulSyncAt ?? null, null);
  });
});

describe("D97 y D104 — vencimiento vs anulación durante la confirmación", () => {
  test("D97: empieza vigente a los 9:58 y vence mientras espera a Riot → éxito vale", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);
    fake.state.summonerByPuuid = async () => {
      // Avanza el reloj más allá de los 10:00 mientras espera a Riot.
      nowMs = FIXED_NOW + CHALLENGE_TTL_MS + 5_000;
      return { kind: "ok", summoner: { profileIconId: 7, level: 120 } };
    };

    nowMs = FIXED_NOW + CHALLENGE_TTL_MS - 2_000; // 9 min 58 s
    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, "verified");
    assert.equal((await RiotChallenge.findById(ch.id))?.status, "completed");
  });

  test("D104 (durante Summoner-v4): anulación en paralelo con ícono coincidente → 400 RF-9, cuenta intento, ninguna cuenta verificada", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);

    const gate = deferred<{ kind: "ok"; summoner: { profileIconId: number; level: number } }>();
    const reachedSummoner = deferred<void>();
    fake.state.summonerByPuuid = async () => {
      reachedSummoner.resolve();
      return gate.promise;
    };

    const confirmPromise = confirmChallenge(ana, ch.id).then((res) => res);
    await Promise.race([
      reachedSummoner.promise,
      confirmPromise.then((res) => {
        throw new Error(`confirmación terminó antes de Summoner-v4 (status ${res.status})`);
      }),
    ]);

    // Anulación concurrente (como RF-29) mientras espera al doble con ícono coincidente.
    await cancelOpenChallengesForUsers([ana.id], new Date(nowMs));
    gate.resolve({ kind: "ok", summoner: { profileIconId: 7, level: 120 } });

    const res = await confirmPromise;
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.challengeExpired });
    assert.equal(await GameAccount.countDocuments({ user: ana.id }), 0);
    assert.equal(fake.state.accountByPuuidCalls.length, 0);
    assert.equal(fake.state.soloRankCalls.length, 0);

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, 1);
  });

  test("D104 (paso 3 tras leer datos): anulación durante la lectura de rango/partidas → 400 RF-9, cuenta intento, cuenta manual intacta sin verificar", async () => {
    const ana = await signUp(app, ANA);
    const manualId = await linkOk(ana, { gameId: "lol", handle: "Manual#LAS", region: "LAS" });
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);

    const gate = deferred<{ kind: "ok"; rank: RiotRankSnapshot | null }>();
    const reachedRank = deferred<void>();
    fake.state.soloRankByPuuid = async () => {
      reachedRank.resolve();
      return gate.promise;
    };

    const confirmPromise = confirmChallenge(ana, ch.id).then((res) => res);
    await Promise.race([
      reachedRank.promise,
      confirmPromise.then((res) => {
        throw new Error(`confirmación terminó antes de League-v4 (status ${res.status})`);
      }),
    ]);

    await cancelOpenChallengesForUsers([ana.id], new Date(nowMs));
    gate.resolve({ kind: "ok", rank: sampleRank() });

    const res = await confirmPromise;
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.challengeExpired });

    // La cuenta manual de Ana sigue sin verificar.
    const manual = await GameAccount.findById(manualId);
    assert.equal(manual?.verification, undefined);
    assert.equal(manual?.handle, "Manual#LAS");

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.attempts, 1);
  });

  test("D104 sobre RF-50: anulación durante Account-v1 by-puuid que devuelve not_found → 400 RF-9", async () => {
    const ana = await signUp(app, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);

    const gate = deferred<{ kind: "not_found" }>();
    const reachedAccount = deferred<void>();
    fake.state.accountByPuuid = async () => {
      reachedAccount.resolve();
      return gate.promise;
    };

    const confirmPromise = confirmChallenge(ana, ch.id).then((res) => res);
    await Promise.race([
      reachedAccount.promise,
      confirmPromise.then((res) => {
        throw new Error(`confirmación terminó antes de Account-v1 (status ${res.status})`);
      }),
    ]);

    await cancelOpenChallengesForUsers([ana.id], new Date(nowMs));
    gate.resolve({ kind: "not_found" });

    const res = await confirmPromise;
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.challengeExpired });
    assert.equal((await RiotChallenge.findById(ch.id))?.attempts, 1);
    assert.equal(await GameAccount.countDocuments({ user: ana.id }), 0);
  });
});

describe("RNF-1 (tope de 35 consultas) y D69 (liberación de 23 consultas sobrantes)", () => {
  test("verificación completa en el peor caso (1 creación + 9 fallidas + 1 exitosa con 20 partidas) usa exactamente 35 consultas", async () => {
    let limiterNowMs = FIXED_NOW;
    const sleeps: number[] = [];
    const limiter = createRiotLimiter({
      nowMs: () => limiterNowMs,
      sleep: async (ms) => {
        sleeps.push(ms);
        limiterNowMs += ms;
      },
    });
    const budgetApp = await riotApp({
      client: fake.client,
      limiter,
      pickIndex: () => 0,
    });
    const ana = await signUp(budgetApp, ANA);

    // 1. Creación del desafío: 2 consultas.
    const created = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(created.status, 201);
    const challengeId: string = created.body.id;
    const targetIconId: number = created.body.iconId;
    assert.equal(fake.totalCalls(), 2);

    // 2. 9 confirmaciones fallidas (ícono distinto): 9 × 1 = 9 consultas (23 liberadas cada vez).
    fake.state.summonerByPuuid = {
      kind: "ok",
      summoner: { profileIconId: targetIconId === 0 ? 1 : 0, level: 120 },
    };
    for (let i = 0; i < 9; i += 1) {
      const failRes = await confirmChallenge(ana, challengeId);
      assert.equal(failRes.status, 400);
      assert.deepEqual(failRes.body, { error: RIOT_ERRORS.iconMismatch });
    }
    assert.equal(fake.totalCalls(), 11);

    // 3. 10.ª confirmación exitosa con 20 partidas: 1 + 1 + 1 + 1 + 20 = 24 consultas.
    const twentyMatches = Array.from({ length: 20 }, (_, i) => sampleMatch(i + 1));
    setupMatchingRiot(targetIconId, { matches: twentyMatches });
    const okRes = await confirmChallenge(ana, challengeId);
    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.outcome, "verified");
    assert.equal(fake.totalCalls(), 35);
    assert.equal((await RiotChallenge.findById(challengeId))?.attempts, 10);
    // Superar 20 consultas en el mismo segundo disparó espaciado de <= 1 s (RF-37).
    assert.ok(sleeps.length >= 1);
    assert.ok(sleeps.every((ms) => ms > 0 && ms <= 1_000));
  });

  test("D69: las 23 consultas sobrantes se liberan en cada confirmación fallida (5.ª confirmación sigue teniendo hueco en 100/2 min)", async () => {
    let limiterNowMs = FIXED_NOW;
    const limiter = createRiotLimiter({
      nowMs: () => limiterNowMs,
      sleep: async (ms) => {
        limiterNowMs += ms;
      },
    });
    const budgetApp = await riotApp({ client: fake.client, limiter });
    const ana = await signUp(budgetApp, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });

    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 0, level: 120 } };
    // 4 confirmaciones fallidas: sin liberación consumirían 4 × 24 = 96 y bloquearían la 5.ª (96 + 24 > 100).
    for (let i = 0; i < 4; i += 1) {
      const failRes = await confirmChallenge(ana, ch.id);
      assert.equal(failRes.status, 400);
    }

    setupMatchingRiot(7, { matches: [] });
    const okRes = await confirmChallenge(ana, ch.id);
    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.outcome, "verified");
  });
});

describe("RNF-7 / D98 — plazo máximo de 60 s antes y después de confirmar el ícono", () => {
  test("plazo superado ANTES de confirmar el ícono → 503 RF-16, cuenta intento, sin cambios en cuentas", async () => {
    const shortTimeoutApp = await riotApp(
      { client: fake.client },
      { operationTimeoutMs: SHORT_OPERATION_TIMEOUT_MS },
    );
    const ana = await signUp(shortTimeoutApp, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });

    fake.state.summonerByPuuid = async () =>
      new Promise(() => {
        // Nunca resuelve: fuerza el agotamiento del plazo global de la operación.
      });

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 503);
    assert.deepEqual(res.body, { error: RIOT_ERRORS.unavailable });

    const stored = await RiotChallenge.findById(ch.id);
    assert.equal(stored?.status, "open");
    assert.equal(stored?.attempts, 1);
    assert.equal(await GameAccount.countDocuments({ user: ana.id }), 0);
  });

  test("plazo superado DESPUÉS de confirmar el ícono (al leer rango) → RF-27 con rango y partidas pendientes", async () => {
    const shortTimeoutApp = await riotApp(
      { client: fake.client },
      { operationTimeoutMs: SHORT_OPERATION_TIMEOUT_MS },
    );
    const ana = await signUp(shortTimeoutApp, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);

    fake.state.soloRankByPuuid = async () =>
      new Promise(() => {
        // Se cuelga tras confirmar el ícono y leer el Riot ID vigente.
      });

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, "verified");
    assert.equal(res.body.notice, RIOT_NOTICES.verifiedNoData);
    assert.deepEqual(res.body.account.pendingBlocks, ["rank", "matches"]);
    assert.equal(res.body.account.currentRank, null);
    assert.deepEqual(res.body.account.profile, { level: 120, iconId: 7 });
    assert.equal(fake.state.soloMatchIdsCalls.length, 0);

    const stored = await GameAccount.findById(res.body.account.id);
    assert.equal(stored?.lastSuccessfulSyncAt ?? null, null);
  });

  test("plazo superado DESPUÉS de confirmar el ícono (al leer lista de partidas) → RF-27 con solo partidas pendientes", async () => {
    const shortTimeoutApp = await riotApp(
      { client: fake.client },
      { operationTimeoutMs: SHORT_OPERATION_TIMEOUT_MS },
    );
    const ana = await signUp(shortTimeoutApp, ANA);
    const ch = await openChallengeFor(ana.id, { iconId: 7 });
    setupMatchingRiot(7);

    fake.state.soloMatchIds = async () =>
      new Promise(() => {
        // Se cuelga después de haber leído bien el rango.
      });

    const res = await confirmChallenge(ana, ch.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, "verified");
    assert.equal(res.body.notice, RIOT_NOTICES.verifiedPartialData);
    assert.deepEqual(res.body.account.pendingBlocks, ["matches"]);
    assert.equal(res.body.account.currentRank.tier, "GOLD");
  });
});
