// Modelos `RiotChallenge` y extensión de `GameAccount`, más el servicio `services/riotChallenges.ts`
// contra MongoDB (spec 014, T4).
// RF-1, RF-4, RF-7, RF-10, RF-12, RF-13, RF-21, RF-23, RF-24, RF-27, RF-28, RF-29, RF-30, RF-31,
// RF-34, RF-36, RF-43, RF-45, RF-48, RF-53, RNF-3; D87, D97, D100, D104; plan §§3.1, 3.2, P14-1, P14-4.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  CHALLENGE_HOURLY_WINDOW_MS,
  CHALLENGE_RETENTION_MS,
  CHALLENGE_TTL_MS,
  hourlyRateLimitWait,
} from "../../src/domain/riotChallenge.ts";
import { GameAccount, toGameAccountJson } from "../../src/models/gameAccount.ts";
import { RiotChallenge, toRiotChallengeJson } from "../../src/models/riotChallenge.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import {
  cancelChallenge,
  cancelOpenChallengesForUsers,
  completeChallenge,
  countRecentChallenges,
  createChallengeAndCancelPrevious,
  findChallengeByIdForUser,
  findOpenChallenge,
  incrementChallengeAttempts,
  openChallengesForPuuid,
} from "../../src/services/riotChallenges.ts";
import { testConfig } from "../server/helpers.ts";

const NOW = new Date("2026-11-19T12:00:00.000Z");
const ANA = new mongoose.Types.ObjectId().toHexString();
const BETO = new mongoose.Types.ObjectId().toHexString();
const CARO = new mongoose.Types.ObjectId().toHexString();
const PUUID_1 = "puuid-secreto-riot-0001";
const PUUID_2 = "puuid-secreto-riot-0002";

function plusMs(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms);
}

before(async () => {
  await connectDatabase(testConfig().db);
  await RiotChallenge.init();
  await GameAccount.init();
});

beforeEach(async () => {
  await RiotChallenge.deleteMany({});
  await GameAccount.deleteMany({});
});

after(async () => {
  await RiotChallenge.deleteMany({});
  await GameAccount.deleteMany({});
  await mongoose.disconnect();
});

describe("RiotChallenge: esquema, índices y serialización en lista blanca (RF-1, RF-28, RF-45, RNF-3, P14-1)", () => {
  test("prepareDatabase inicializa RiotChallenge para garantizar sus índices antes de escuchar", async (t) => {
    const init = t.mock.method(RiotChallenge, "init");
    await prepareDatabase();
    assert.equal(init.mock.callCount(), 1);
  });

  test("la colección tiene los índices { user, createdAt }, { puuid, status, expiresAt } y TTL en deleteAt (0 s)", async () => {
    const indexes = await RiotChallenge.collection.indexes();
    const byKey = new Map(
      indexes.map((index) => [
        Object.entries(index.key)
          .map(([field, dir]) => `${field}:${String(dir)}`)
          .join(","),
        index,
      ]),
    );
    assert.ok(byKey.has("user:1,createdAt:-1"), "falta índice { user: 1, createdAt: -1 }");
    assert.ok(
      byKey.has("puuid:1,status:1,expiresAt:1"),
      "falta índice { puuid: 1, status: 1, expiresAt: 1 }",
    );
    const ttl = byKey.get("deleteAt:1");
    assert.ok(ttl, "falta índice TTL en deleteAt");
    assert.equal(ttl.expireAfterSeconds, 0);
  });

  test("valida iconId entero 0..28, región de LoL, status válido y attempts entero >= 0", async () => {
    const base = {
      user: ANA,
      puuid: PUUID_1,
      riotId: "Jugador#LAS",
      region: "LAS",
      iconId: 12,
      status: "open",
      attempts: 0,
      createdAt: NOW,
      expiresAt: plusMs(NOW, CHALLENGE_TTL_MS),
      deleteAt: plusMs(NOW, CHALLENGE_TTL_MS + CHALLENGE_RETENTION_MS),
    };

    await new RiotChallenge(base).validate();

    for (const bad of [
      { ...base, iconId: -1 },
      { ...base, iconId: 29 },
      { ...base, iconId: 3.5 },
      { ...base, region: "LATAM" },
      { ...base, status: "expired" },
      { ...base, attempts: -1 },
      { ...base, attempts: 1.5 },
    ]) {
      await assert.rejects(new RiotChallenge(bad).validate(), JSON.stringify(bad));
    }
  });

  test("toRiotChallengeJson serializa en lista blanca sin puuid y con remainingSeconds (D100, RNF-3)", async () => {
    const created = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Jugador#LAS",
      region: "LAS",
      iconId: 7,
      now: NOW,
    });

    const atMid = plusMs(NOW, 90_200); // faltan 509.8 s → 510 s
    const json = toRiotChallengeJson(created, atMid);
    assert.deepEqual(Object.keys(json).sort(), [
      "expiresAt",
      "iconId",
      "id",
      "region",
      "remainingSeconds",
      "riotId",
    ]);
    assert.equal(json.id, created._id.toString());
    assert.equal(json.iconId, 7);
    assert.equal(json.expiresAt.getTime(), NOW.getTime() + CHALLENGE_TTL_MS);
    assert.equal(json.remainingSeconds, 510);
    assert.equal(json.riotId, "Jugador#LAS");
    assert.equal(json.region, "LAS");

    const serialized = JSON.stringify(json);
    assert.equal(serialized.includes(PUUID_1), false);
    assert.equal(serialized.includes("puuid"), false);
    assert.equal(serialized.includes("deleteAt"), false);
    assert.equal(serialized.includes("attempts"), false);

    // Incluso toJSON() directo del documento nunca debe filtrar puuid (RNF-3).
    const directText = JSON.stringify(created.toJSON());
    assert.equal(directText.includes(PUUID_1), false);
    assert.equal(directText.includes("puuid"), false);

    // Pasado el vencimiento, remainingSeconds vale 0.
    const expiredJson = toRiotChallengeJson(created, plusMs(NOW, CHALLENGE_TTL_MS + 5_000));
    assert.equal(expiredJson.remainingSeconds, 0);
  });
});

describe("services/riotChallenges: ciclo de vida, D87 y D104", () => {
  test("createChallengeAndCancelPrevious crea el desafío con expiresAt (+10 min) y deleteAt (+10 min + 24 h)", async () => {
    const created = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Faker#KR1",
      region: "KR",
      iconId: 0,
      now: NOW,
    });

    assert.equal(created.user.toString(), ANA);
    assert.equal(created.puuid, PUUID_1);
    assert.equal(created.riotId, "Faker#KR1");
    assert.equal(created.region, "KR");
    assert.equal(created.iconId, 0);
    assert.equal(created.status, "open");
    assert.equal(created.attempts, 0);
    assert.equal(created.createdAt.getTime(), NOW.getTime());
    assert.equal(created.expiresAt.getTime(), NOW.getTime() + CHALLENGE_TTL_MS);
    assert.equal(created.deleteAt.getTime(), NOW.getTime() + CHALLENGE_TTL_MS + CHALLENGE_RETENTION_MS);
  });

  test("RF-4 + D87: crear otro desafío anula el anterior vigente y adelanta su deleteAt a at + 24 h", async () => {
    const first = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 5,
      now: NOW,
    });
    const betos = await createChallengeAndCancelPrevious({
      userId: BETO,
      puuid: PUUID_2,
      riotId: "Beto#LAS",
      region: "LAS",
      iconId: 6,
      now: NOW,
    });

    const twoMinLater = plusMs(NOW, 2 * 60_000);
    const second = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 8,
      now: twoMinLater,
    });

    const reloadedFirst = await RiotChallenge.findById(first._id);
    assert.ok(reloadedFirst);
    assert.equal(reloadedFirst.status, "cancelled");
    assert.equal(reloadedFirst.deleteAt.getTime(), twoMinLater.getTime() + CHALLENGE_RETENTION_MS);

    const open = await findOpenChallenge(ANA, twoMinLater);
    assert.equal(open?._id.toString(), second._id.toString());

    const betoReloaded = await RiotChallenge.findById(betos._id);
    assert.equal(betoReloaded?.status, "open");
  });

  test("D87: crear otro desafío cuando el previo abierto ya venció lo anula sin alargar su deleteAt", async () => {
    const first = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 5,
      now: NOW,
    });
    const originalDeleteAt = first.deleteAt.getTime();

    const fifteenMinLater = plusMs(NOW, 15 * 60_000);
    await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 9,
      now: fifteenMinLater,
    });

    const reloadedFirst = await RiotChallenge.findById(first._id);
    assert.equal(reloadedFirst?.status, "cancelled");
    assert.equal(reloadedFirst?.deleteAt.getTime(), originalDeleteAt);
  });

  test("findOpenChallenge respeta vigencia exacta (a los 10:00 exactos ya venció, D15)", async () => {
    const created = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 3,
      now: NOW,
    });

    const justBefore = plusMs(NOW, CHALLENGE_TTL_MS - 1);
    assert.equal((await findOpenChallenge(ANA, justBefore))?._id.toString(), created._id.toString());

    const exactExpiry = plusMs(NOW, CHALLENGE_TTL_MS);
    assert.equal(await findOpenChallenge(ANA, exactExpiry), null);
    assert.equal(await findOpenChallenge(BETO, justBefore), null);
  });

  test("findChallengeByIdForUser devuelve solo desafíos del usuario dueño (RF-23)", async () => {
    const created = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 4,
      now: NOW,
    });

    assert.equal((await findChallengeByIdForUser(created._id.toString(), ANA))?._id.toString(), created._id.toString());
    assert.equal(await findChallengeByIdForUser(created._id.toString(), BETO), null);
    assert.equal(await findChallengeByIdForUser(new mongoose.Types.ObjectId().toHexString(), ANA), null);
    assert.equal(await findChallengeByIdForUser("id-invalido", ANA), null);
  });

  test("countRecentChallenges cuenta creados en la última hora en cualquier estado (RF-21)", async () => {
    // 1 desafío exactamente hace 1 hora (fuera de ventana)
    await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 1,
      now: plusMs(NOW, -CHALLENGE_HOURLY_WINDOW_MS),
    });
    // 5 desafíos dentro de la última hora (cancelados/completados/abiertos)
    const times = [50, 40, 30, 20, 10].map((minAgo) => plusMs(NOW, -minAgo * 60_000));
    let lastId = "";
    for (let i = 0; i < times.length; i += 1) {
      const ch = await createChallengeAndCancelPrevious({
        userId: ANA,
        puuid: PUUID_1,
        riotId: "Ana#LAS",
        region: "LAS",
        iconId: i + 2,
        now: times[i]!,
      });
      lastId = ch._id.toString();
    }
    await completeChallenge(lastId, ANA, plusMs(NOW, -5 * 60_000));

    // Otro usuario no debe contaminar el conteo.
    await createChallengeAndCancelPrevious({
      userId: BETO,
      puuid: PUUID_2,
      riotId: "Beto#LAS",
      region: "LAS",
      iconId: 10,
      now: plusMs(NOW, -2 * 60_000),
    });

    const recent = await countRecentChallenges(ANA, NOW);
    assert.equal(recent.count, 5);
    assert.equal(recent.createdDates.length, 5);
    assert.equal(hourlyRateLimitWait(recent.createdDates, NOW), 10 * 60_000);
  });

  test("openChallengesForPuuid devuelve solo desafíos abiertos vigentes de ese puuid (RF-19, RF-43)", async () => {
    const expired = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Cuenta#LAS",
      region: "LAS",
      iconId: 1,
      now: plusMs(NOW, -CHALLENGE_TTL_MS), // vence exactamente en NOW
    });
    const openBeto = await createChallengeAndCancelPrevious({
      userId: BETO,
      puuid: PUUID_1,
      riotId: "Cuenta#LAS",
      region: "LAS",
      iconId: 2,
      now: plusMs(NOW, -3 * 60_000),
    });
    const cancelledCaro = await createChallengeAndCancelPrevious({
      userId: CARO,
      puuid: PUUID_1,
      riotId: "Cuenta#LAS",
      region: "LAS",
      iconId: 3,
      now: plusMs(NOW, -2 * 60_000),
    });
    await cancelChallenge(cancelledCaro._id.toString(), plusMs(NOW, -1 * 60_000));

    // Otro puuid
    await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_2,
      riotId: "Otra#LAS",
      region: "LAS",
      iconId: 4,
      now: plusMs(NOW, -1 * 60_000),
    });

    const active = await openChallengesForPuuid(PUUID_1, NOW);
    assert.deepEqual(
      active.map((ch) => ({ id: ch._id.toString(), iconId: ch.iconId })),
      [{ id: openBeto._id.toString(), iconId: 2 }],
    );
    assert.notEqual(expired._id.toString(), openBeto._id.toString());
  });

  test("incrementChallengeAttempts incrementa atómicamente el contador (RF-10)", async () => {
    const created = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 11,
      now: NOW,
    });

    const after1 = await incrementChallengeAttempts(created._id.toString());
    const after2 = await incrementChallengeAttempts(created._id.toString());
    assert.equal(after1?.attempts, 1);
    assert.equal(after2?.attempts, 2);
    assert.equal(await incrementChallengeAttempts("id-invalido"), null);
  });

  test("cancelChallenge adelanta deleteAt si se anula antes de vencer y no toca completados (D87)", async () => {
    const created = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 12,
      now: NOW,
    });
    const cancelAt = plusMs(NOW, 3 * 60_000);
    const cancelled = await cancelChallenge(created._id.toString(), cancelAt);
    assert.ok(cancelled);
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.deleteAt.getTime(), cancelAt.getTime() + CHALLENGE_RETENTION_MS);

    // Repetir cancelación no modifica nada ni alarga deleteAt.
    assert.equal(await cancelChallenge(created._id.toString(), plusMs(NOW, 8 * 60_000)), null);
    const reloaded = await RiotChallenge.findById(created._id);
    assert.equal(reloaded?.deleteAt.getTime(), cancelAt.getTime() + CHALLENGE_RETENTION_MS);

    // Un desafío ya completado no se anula.
    const second = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 13,
      now: plusMs(NOW, 4 * 60_000),
    });
    const closedAt = plusMs(NOW, 5 * 60_000);
    assert.ok(await completeChallenge(second._id.toString(), ANA, closedAt));
    assert.equal(await cancelChallenge(second._id.toString(), plusMs(NOW, 6 * 60_000)), null);
    assert.equal((await RiotChallenge.findById(second._id))?.status, "completed");
  });

  test("cancelOpenChallengesForUsers anula solo los abiertos de los usuarios indicados (RF-29, D87)", async () => {
    const anaOpen = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 14,
      now: NOW,
    });
    const betoOpen = await createChallengeAndCancelPrevious({
      userId: BETO,
      puuid: PUUID_2,
      riotId: "Beto#LAS",
      region: "LAS",
      iconId: 15,
      now: NOW,
    });
    const caroCompleted = await createChallengeAndCancelPrevious({
      userId: CARO,
      puuid: PUUID_2,
      riotId: "Caro#LAS",
      region: "LAS",
      iconId: 16,
      now: NOW,
    });
    await completeChallenge(caroCompleted._id.toString(), CARO, plusMs(NOW, 60_000));

    assert.equal(await cancelOpenChallengesForUsers([], plusMs(NOW, 2 * 60_000)), 0);

    const cancelAt = plusMs(NOW, 2 * 60_000);
    const count = await cancelOpenChallengesForUsers([ANA, CARO], cancelAt);
    assert.equal(count, 1);

    const reloadedAna = await RiotChallenge.findById(anaOpen._id);
    assert.equal(reloadedAna?.status, "cancelled");
    assert.equal(reloadedAna?.deleteAt.getTime(), cancelAt.getTime() + CHALLENGE_RETENTION_MS);

    assert.equal((await RiotChallenge.findById(betoOpen._id))?.status, "open");
    assert.equal((await RiotChallenge.findById(caroCompleted._id))?.status, "completed");
  });

  test("completeChallenge solo gana una vez en concurrencia, falla si se anuló (D104) y aplica D87/D97", async () => {
    // 1. Concurrencia: solo uno cierra
    const ch1 = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 17,
      now: NOW,
    });
    const closeAt = plusMs(NOW, 2 * 60_000);
    const results = await Promise.all([
      completeChallenge(ch1._id.toString(), ANA, closeAt),
      completeChallenge(ch1._id.toString(), ANA, closeAt),
      completeChallenge(ch1._id.toString(), ANA, closeAt),
    ]);
    const winners = results.filter((doc) => doc !== null);
    assert.equal(winners.length, 1);
    assert.equal(winners[0]?.status, "completed");
    assert.equal(winners[0]?.deleteAt.getTime(), closeAt.getTime() + CHALLENGE_RETENTION_MS);

    // 2. D104: si ya se anuló, completeChallenge devuelve null y no lo cambia a completed
    const ch2 = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 18,
      now: plusMs(NOW, 3 * 60_000),
    });
    await cancelChallenge(ch2._id.toString(), plusMs(NOW, 4 * 60_000));
    assert.equal(await completeChallenge(ch2._id.toString(), ANA, plusMs(NOW, 5 * 60_000)), null);
    assert.equal((await RiotChallenge.findById(ch2._id))?.status, "cancelled");

    // 3. Usuario incorrecto no puede cerrarlo
    const ch3 = await createChallengeAndCancelPrevious({
      userId: ANA,
      puuid: PUUID_1,
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 19,
      now: plusMs(NOW, 6 * 60_000),
    });
    assert.equal(await completeChallenge(ch3._id.toString(), BETO, plusMs(NOW, 7 * 60_000)), null);

    // 4. D87 + D97: si se completa después de expiresAt, conserva deleteAt = expiresAt + 24 h
    const afterExpiry = plusMs(ch3.expiresAt, 5_000);
    const closedLate = await completeChallenge(ch3._id.toString(), ANA, afterExpiry);
    assert.ok(closedLate);
    assert.equal(closedLate.status, "completed");
    assert.equal(closedLate.deleteAt.getTime(), ch3.expiresAt.getTime() + CHALLENGE_RETENTION_MS);
  });
});

describe("GameAccount: extensiones para Riot (RF-7, RF-12, RF-13, RF-27, RF-30, RF-31, RF-36, RF-53, RNF-3)", () => {
  test("admite cuenta Riot con currentRank null, pendingBlocks, rankDelta ausente y campos internos ocultos", async () => {
    const account = await GameAccount.create({
      user: ANA,
      gameId: "lol",
      handle: "SinRango#LAS",
      region: "LAS",
      currentRank: null,
      rankHistory: [],
      matches: [
        {
          matchId: "LA2_12345",
          gameId: "lol",
          playedAt: NOW,
          result: "win",
          summary: "Ahri · 8/1/6",
          durationMinutes: 30,
        },
      ],
      readingNumber: 0,
      lastSyncedAt: NOW,
      verification: { source: "riot", externalId: PUUID_1, verifiedAt: NOW },
      profile: { iconId: 12 },
      pendingBlocks: ["rank", "profile"],
      lastSuccessfulSyncAt: null,
      riotLpBaseline: { tier: null, matchIds: ["LA2_12345"] },
    });

    assert.equal(account.currentRank, null);
    assert.equal(account.matches[0]?.rankDelta, undefined);
    assert.deepEqual(account.pendingBlocks, ["rank", "profile"]);
    assert.equal(account.lastSuccessfulSyncAt, null);
    assert.equal(account.riotLpBaseline?.tier, null);

    const json = toGameAccountJson(account);
    assert.equal(json.currentRank, null);
    assert.deepEqual(json.pendingBlocks, ["rank", "profile"]);
    assert.deepEqual(json.profile, { iconId: 12 });

    const serialized = JSON.stringify(json);
    for (const secret of [
      "lastSuccessfulSyncAt",
      "riotLpBaseline",
      "canonicalTier",
      "externalId",
      PUUID_1,
      "LA2_12345",
    ]) {
      assert.equal(serialized.includes(secret), false, `no debe serializar ${secret}`);
    }
  });

  test("guarda canonicalTier y LP sin tope (RF-31, RF-36) sin exponer canonicalTier ni pendingBlocks vacíos", async () => {
    const account = await GameAccount.create({
      user: BETO,
      gameId: "lol",
      handle: "Faker#KR1",
      region: "KR",
      currentRank: {
        tier: "CHALLENGER",
        points: 1450,
        normalized: 100,
        recordedAt: NOW,
        canonicalTier: "Challenger",
      },
      rankHistory: [
        {
          tier: "CHALLENGER",
          points: 1450,
          normalized: 100,
          recordedAt: NOW,
          canonicalTier: "Challenger",
        },
      ],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: NOW,
      verification: { source: "riot", externalId: PUUID_2, verifiedAt: NOW },
      profile: { level: 512, iconId: 23 },
      pendingBlocks: [],
      lastSuccessfulSyncAt: NOW,
      riotLpBaseline: { tier: "CHALLENGER", points: 1450, matchIds: [] },
    });

    assert.equal(account.currentRank?.canonicalTier, "Challenger");
    const json = toGameAccountJson(account);
    assert.equal("pendingBlocks" in json, false);
    assert.deepEqual(json.currentRank, {
      tier: "CHALLENGER",
      points: 1450,
      normalized: 100,
      recordedAt: NOW,
    });
    assert.equal(JSON.stringify(json).includes("canonicalTier"), false);
  });

  test("rechaza pendingBlocks con bloque no permitido (como identity)", async () => {
    const account = new GameAccount({
      user: ANA,
      gameId: "lol",
      handle: "Ana#LAS",
      region: "LAS",
      currentRank: null,
      lastSyncedAt: NOW,
      verification: { source: "riot", externalId: PUUID_1, verifiedAt: NOW },
      pendingBlocks: ["identity"],
    });
    await assert.rejects(account.validate());
  });

  test("las cuentas simuladas y de Steam siguen exigiendo currentRank y conservan su JSON intacto", async () => {
    const manualMissingRank = new GameAccount({
      user: ANA,
      gameId: "lol",
      handle: "Manual#LAS",
      region: "LAS",
      currentRank: null,
      lastSyncedAt: NOW,
    });
    await assert.rejects(manualMissingRank.validate());

    const steamMissingRank = new GameAccount({
      user: ANA,
      gameId: "cs2",
      handle: "76561190000000001",
      region: "SA",
      currentRank: null,
      lastSyncedAt: NOW,
      verification: { source: "steam", externalId: "76561190000000001", verifiedAt: NOW },
    });
    await assert.rejects(steamMissingRank.validate());

    const manualOk = new GameAccount({
      user: ANA,
      gameId: "lol",
      handle: "Manual#LAS",
      region: "LAS",
      currentRank: { tier: "Gold", division: "II", points: 40, normalized: 45, recordedAt: NOW },
      rankHistory: [{ tier: "Gold", division: "II", points: 40, normalized: 45, recordedAt: NOW }],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: NOW,
    });
    await manualOk.validate();
    const json = toGameAccountJson(manualOk);
    assert.equal("pendingBlocks" in json, false);
    assert.equal(json.currentRank?.tier, "Gold");
  });
});
