// Cuentas verificadas en la base (spec 012, T4): índice único parcial, migración de
// `prepareDatabase`, desvincular una cuenta verificada. RF-2, RF-3, RF-10; plan, P12-1, P12-3,
// P12-4.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount, toGameAccountJson } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, authApp, closeTestServers, signUp, withSession } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function snapshot() {
  return { tier: "Gold", division: "II", points: 40, normalized: 50, recordedAt: new Date(FIXED_NOW) };
}

async function createAccount(
  userId: string,
  data: { gameId?: "lol" | "r6" | "cs2"; handle?: string; externalId?: string } = {},
) {
  const gameId = data.gameId ?? "lol";
  return GameAccount.create({
    user: userId,
    gameId,
    handle: data.handle ?? `Jugador-${userId}#LAS`,
    region: "LAS",
    currentRank: snapshot(),
    rankHistory: [snapshot()],
    matches: [],
    readingNumber: 0,
    lastSyncedAt: new Date(FIXED_NOW),
    ...(data.externalId === undefined
      ? {}
      : { verification: { source: "riot", externalId: data.externalId, verifiedAt: new Date(FIXED_NOW) } }),
  });
}

function duplicateKey(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

describe("índice único parcial { gameId, verification.externalId } (RF-10, P12-3)", () => {
  test("dos cuentas del mismo juego con el mismo externalId → clave duplicada", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id, { externalId: "puuid-1" });
    await assert.rejects(createAccount(beto.id, { externalId: "puuid-1" }), duplicateKey);
    assert.strictEqual(await GameAccount.countDocuments({}), 1);
  });

  test("el mismo externalId en otro juego es válido", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id, { gameId: "lol", externalId: "mismo-id" });
    await createAccount(beto.id, { gameId: "cs2", handle: "76561190000000001", externalId: "mismo-id" });
    assert.strictEqual(await GameAccount.countDocuments({}), 2);
  });

  test("muchas cuentas sin verificar con el mismo identificador conviven", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id, { handle: "Igual#LAS" });
    await createAccount(beto.id, { handle: "igual#las" });
    assert.strictEqual(await GameAccount.countDocuments({ handleKey: "igual#las" }), 2);
  });

  test("una verificada y una sin verificar con el mismo identificador conviven (las limpia verifyAccount)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await createAccount(ana.id, { handle: "Igual#LAS", externalId: "puuid-9" });
    await createAccount(beto.id, { handle: "igual#las" });
    assert.strictEqual(await GameAccount.countDocuments({ handleKey: "igual#las" }), 2);
  });
});

describe("prepareDatabase: migración (RF-2, P12-1, P12-4)", () => {
  async function insertLegacy(userId: string, handle: string, verified: boolean) {
    await GameAccount.collection.insertOne({
      user: new mongoose.Types.ObjectId(userId),
      gameId: "lol",
      handle,
      region: "LAS",
      currentRank: snapshot(),
      rankHistory: [snapshot()],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: new Date(FIXED_NOW),
      verified,
      __v: 0,
    });
  }

  test("completa handleKey y quita el `verified` guardado; las antiguas quedan sin verificar", async () => {
    const ana = await signUp(app, ANA);
    await insertLegacy(ana.id, "  Jugador1#LAS ", true);

    await prepareDatabase();

    const raw = await GameAccount.collection.findOne({ user: new mongoose.Types.ObjectId(ana.id) });
    assert.ok(raw !== null);
    assert.strictEqual(raw.handleKey, "jugador1#las");
    assert.ok(!("verified" in raw));
    const account = await GameAccount.findById(raw._id);
    assert.ok(account !== null);
    assert.strictEqual(toGameAccountJson(account).verified, false);
  });

  test("es idempotente: una segunda pasada no cambia nada y no falla", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await insertLegacy(ana.id, "Uno#LAS", true);
    await createAccount(beto.id, { handle: "Dos#LAS", externalId: "puuid-2" });

    await prepareDatabase();
    const first = await GameAccount.collection.find({}).sort({ _id: 1 }).toArray();
    await prepareDatabase();
    const second = await GameAccount.collection.find({}).sort({ _id: 1 }).toArray();

    assert.deepStrictEqual(second, first);
    assert.strictEqual(second.length, 2);
  });

  test("no toca la verificación real de las cuentas nuevas", async () => {
    const beto = await signUp(app, BETO);
    await createAccount(beto.id, { handle: "Dos#LAS", externalId: "puuid-2" });
    await prepareDatabase();
    const account = await GameAccount.findOne({});
    assert.ok(account !== null);
    assert.strictEqual(toGameAccountJson(account).verified, true);
    assert.strictEqual(account.verification?.externalId, "puuid-2");
  });
});

describe("desvincular una cuenta verificada (RF-3)", () => {
  test("la cuenta se borra con su verificación; al vincular de nuevo queda sin verificar", async () => {
    const ana = await signUp(app, ANA);
    const verified = await createAccount(ana.id, { handle: "Jugador1#LAS", externalId: "puuid-1" });

    const removed = await withSession(ana.agent.delete(`/api/accounts/${verified.id}`), ana.csrf);
    assert.strictEqual(removed.status, 204);
    assert.strictEqual(await GameAccount.countDocuments({}), 0);

    const linked = await withSession(ana.agent.post("/api/accounts"), ana.csrf).send({
      gameId: "lol",
      handle: "Jugador1#LAS",
      region: "LAS",
    });
    assert.strictEqual(linked.status, 201);
    assert.strictEqual(linked.body.verified, false);
    assert.ok(!("verifiedWith" in linked.body));
    const stored = await GameAccount.findOne({});
    assert.ok(stored !== null);
    assert.strictEqual(stored.verification, undefined);
  });
});
