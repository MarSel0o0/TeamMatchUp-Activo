// Migración del arranque: cuentas de CS2 verificadas con rango simulado pasan a «rango no
// disponible» (spec 015, T3, RF-20, D9; plan, sección 4.4). Contra la base de prueba, sin red y
// sin consultar Leetify (la migración no recibe ningún cliente).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, migrateAccounts, prepareDatabase } from "../../src/server.ts";
import { testConfig } from "./helpers.ts";

const NOW = new Date("2026-11-19T12:00:00.000Z");
const SIMULATED = { tier: "Purple", points: 17250, normalized: 50, recordedAt: NOW };
const OLDER = { tier: "Blue", points: 12000, normalized: 33, recordedAt: new Date("2026-11-01T12:00:00.000Z") };
const REAL = { tier: "Gold", points: 36210, normalized: 100, recordedAt: NOW };
const MATCH = {
  matchId: "m-1-0",
  gameId: "cs2",
  playedAt: NOW,
  result: "win",
  summary: "Mirage · 13-9",
  durationMinutes: 38,
  rankDelta: 120,
} as const;

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
});

after(async () => {
  await GameAccount.deleteMany({});
  await mongoose.disconnect();
});

let counter = 0;

/** Cuenta tal como la dejó la spec 013: verificada con Steam y con rango y partidas simulados. */
function legacySteam(extra: Record<string, unknown> = {}) {
  counter += 1;
  const steamId = `7656119800000${String(counter).padStart(4, "0")}`;
  return {
    user: new mongoose.Types.ObjectId(),
    gameId: "cs2",
    handle: steamId,
    region: "South America",
    currentRank: SIMULATED,
    rankHistory: [OLDER, SIMULATED],
    matches: [MATCH],
    readingNumber: 3,
    lastSyncedAt: NOW,
    verification: { source: "steam", externalId: steamId, verifiedAt: NOW },
    profile: { displayName: "Vicho", hoursTotal: 312 },
    ...extra,
  };
}

async function raw(id: unknown) {
  const doc = await GameAccount.collection.findOne({ _id: id as mongoose.Types.ObjectId });
  assert.ok(doc, "la cuenta debe existir");
  return doc;
}

describe("migrateAccounts: cuentas de Steam con rango simulado (RF-20, D9)", () => {
  test("pasan a rango no disponible: sin rango vigente, sin historial simulado", async () => {
    const legacy = await GameAccount.create(legacySteam());
    await migrateAccounts();
    const doc = await raw(legacy._id);
    assert.strictEqual(doc.premier, "unavailable");
    assert.strictEqual(doc.currentRank, null);
    assert.deepStrictEqual(doc.rankHistory, []);
  });

  test("no tocan nada más: partidas, perfil, verificación, fecha y contador", async () => {
    const legacy = await GameAccount.create(legacySteam());
    const before_ = await raw(legacy._id);
    await migrateAccounts();
    const after_ = await raw(legacy._id);
    for (const field of ["matches", "profile", "verification", "lastSyncedAt", "readingNumber", "handle", "region", "user"]) {
      assert.deepStrictEqual(after_[field], before_[field], field);
    }
  });

  test("tras migrar la cuenta se lee como rango no disponible, con origen de Leetify", async () => {
    const legacy = await GameAccount.create(legacySteam());
    await migrateAccounts();
    const account = await GameAccount.findById(legacy._id);
    const json: Record<string, unknown> = JSON.parse(JSON.stringify(account));
    assert.strictEqual(json.currentRank, null);
    assert.strictEqual(json.premierStatus, "unavailable");
    assert.deepStrictEqual(json.origins, { identity: "steam", rank: "leetify", matches: "leetify", profile: "steam" });
  });

  test("migra todas las que cumplen, no solo la primera", async () => {
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push((await GameAccount.create(legacySteam()))._id);
    await migrateAccounts();
    for (const id of ids) assert.strictEqual((await raw(id)).premier, "unavailable");
  });

  test("sin consultar a nadie: es una operación de base, sin cliente ni red", () => {
    assert.strictEqual(migrateAccounts.length, 0);
  });
});

describe("migrateAccounts: lo que no migra (RF-20, RF-22)", () => {
  test("una cuenta de CS2 sin verificar sigue simulada y sin `premier`", async () => {
    const manual = legacySteam();
    const account = await GameAccount.create({
      user: manual.user,
      gameId: manual.gameId,
      handle: manual.handle,
      region: manual.region,
      currentRank: manual.currentRank,
      rankHistory: manual.rankHistory,
      matches: manual.matches,
      readingNumber: manual.readingNumber,
      lastSyncedAt: manual.lastSyncedAt,
    });
    await migrateAccounts();
    const doc = await raw(account._id);
    assert.ok(!("premier" in doc));
    assert.deepStrictEqual(doc.rankHistory.length, 2);
    assert.strictEqual((doc.currentRank as { points: number }).points, SIMULATED.points);
  });

  test("una cuenta de LoL verificada con Riot queda igual", async () => {
    const account = await GameAccount.create({
      user: new mongoose.Types.ObjectId(),
      gameId: "lol",
      handle: "Jugador#LAS",
      region: "LAS",
      currentRank: { tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW },
      rankHistory: [{ tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW }],
      matches: [],
      lastSyncedAt: NOW,
      verification: { source: "riot", externalId: "puuid-1", verifiedAt: NOW },
    });
    await migrateAccounts();
    const doc = await raw(account._id);
    assert.ok(!("premier" in doc));
    assert.strictEqual(doc.rankHistory.length, 1);
    assert.notStrictEqual(doc.currentRank, null);
  });

  test("las que ya tienen `premier` conservan su estado y su rango vigente", async () => {
    const rated = await GameAccount.create(
      legacySteam({ premier: "rated", currentRank: REAL, rankHistory: [REAL] }),
    );
    const unrated = await GameAccount.create(
      legacySteam({ premier: "unrated", currentRank: null, rankHistory: [OLDER] }),
    );
    await migrateAccounts();
    const ratedDoc = await raw(rated._id);
    assert.strictEqual(ratedDoc.premier, "rated");
    assert.strictEqual((ratedDoc.currentRank as { points: number }).points, REAL.points);
    const unratedDoc = await raw(unrated._id);
    assert.strictEqual(unratedDoc.premier, "unrated");
    assert.strictEqual(unratedDoc.currentRank, null);
  });
});

// RF-24 (D27; plan, §4.4): sin historial real guardado. Solo se vacía `rankHistory`.
describe("migrateAccounts: historial de Steam con `premier` (RF-24)", () => {
  test("rated y unrated con historial pasan a historial vacío; el resto queda igual", async () => {
    const rated = await GameAccount.create(
      legacySteam({ premier: "rated", currentRank: REAL, rankHistory: [OLDER, REAL] }),
    );
    const unrated = await GameAccount.create(
      legacySteam({ premier: "unrated", currentRank: null, rankHistory: [OLDER] }),
    );
    const ratedBefore = await raw(rated._id);
    const unratedBefore = await raw(unrated._id);
    await migrateAccounts();
    for (const [id, previous] of [
      [rated._id, ratedBefore],
      [unrated._id, unratedBefore],
    ] as const) {
      const doc = await raw(id);
      assert.deepStrictEqual(doc.rankHistory, []);
      assert.deepStrictEqual({ ...doc, rankHistory: [] }, { ...previous, rankHistory: [] });
    }
  });

  test("conservan `premier`, rango vigente, partidas y verificación", async () => {
    const rated = await GameAccount.create(
      legacySteam({ premier: "rated", currentRank: REAL, rankHistory: [REAL] }),
    );
    await migrateAccounts();
    const doc = await raw(rated._id);
    assert.strictEqual(doc.premier, "rated");
    assert.strictEqual((doc.currentRank as { points: number }).points, REAL.points);
    assert.strictEqual((doc.matches as unknown[]).length, 1);
    assert.strictEqual((doc.verification as { source: string }).source, "steam");
  });

  test("sin verificar y de Riot conservan su historial", async () => {
    const manual = legacySteam();
    const unverified = await GameAccount.create({
      user: manual.user,
      gameId: manual.gameId,
      handle: manual.handle,
      region: manual.region,
      currentRank: manual.currentRank,
      rankHistory: manual.rankHistory,
      matches: manual.matches,
      readingNumber: manual.readingNumber,
      lastSyncedAt: manual.lastSyncedAt,
    });
    const riot = await GameAccount.create({
      user: new mongoose.Types.ObjectId(),
      gameId: "lol",
      handle: "Jugador#LAS",
      region: "LAS",
      currentRank: { tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW },
      rankHistory: [
        { tier: "Silver", division: "I", points: 10, normalized: 40, recordedAt: OLDER.recordedAt },
        { tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW },
      ],
      matches: [],
      lastSyncedAt: NOW,
      verification: { source: "riot", externalId: "puuid-2", verifiedAt: NOW },
    });
    await migrateAccounts();
    assert.strictEqual((await raw(unverified._id)).rankHistory.length, 2);
    assert.strictEqual((await raw(riot._id)).rankHistory.length, 2);
  });

  test("las dos migraciones juntas: sin `premier` y con `premier`, en una sola pasada", async () => {
    const legacy = await GameAccount.create(legacySteam());
    const rated = await GameAccount.create(
      legacySteam({ premier: "rated", currentRank: REAL, rankHistory: [OLDER, REAL] }),
    );
    await migrateAccounts();
    const legacyDoc = await raw(legacy._id);
    assert.strictEqual(legacyDoc.premier, "unavailable");
    assert.strictEqual(legacyDoc.currentRank, null);
    assert.deepStrictEqual(legacyDoc.rankHistory, []);
    const ratedDoc = await raw(rated._id);
    assert.strictEqual(ratedDoc.premier, "rated");
    assert.deepStrictEqual(ratedDoc.rankHistory, []);
  });

  test("una segunda pasada no cambia nada", async () => {
    await GameAccount.create(legacySteam());
    await GameAccount.create(legacySteam({ premier: "rated", currentRank: REAL, rankHistory: [OLDER, REAL] }));
    await GameAccount.create(legacySteam({ premier: "unrated", currentRank: null, rankHistory: [OLDER] }));
    await migrateAccounts();
    const first = await GameAccount.collection.find({}).sort({ _id: 1 }).toArray();
    await migrateAccounts();
    const second = await GameAccount.collection.find({}).sort({ _id: 1 }).toArray();
    assert.deepStrictEqual(second, first);
  });
});

describe("migrateAccounts: idempotencia y arranque (RF-20)", () => {
  test("una segunda pasada no cambia nada ni pisa lo escrito después de la primera", async () => {
    const legacy = await GameAccount.create(legacySteam());
    await migrateAccounts();
    // El dueño resincroniza y obtiene su rating real, sin historial (RF-24).
    await GameAccount.collection.updateOne(
      { _id: legacy._id },
      { $set: { premier: "rated", currentRank: REAL, rankHistory: [] } },
    );
    const snapshot = await raw(legacy._id);
    await migrateAccounts();
    assert.deepStrictEqual(await raw(legacy._id), snapshot);
  });

  test("`prepareDatabase`, que corre al arrancar antes de escuchar, también migra", async () => {
    const legacy = await GameAccount.create(legacySteam());
    await prepareDatabase();
    assert.strictEqual((await raw(legacy._id)).premier, "unavailable");
  });
});
