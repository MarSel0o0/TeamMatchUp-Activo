// Modelo `GameAccount` sin base de datos (spec 004, RF-37, DP-32, DP-33; plan, secciones
// 5 y 11). `toJSON` sobre documentos no guardados; `User` sin `accounts` (T19).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount, toGameAccountJson } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { initialState } from "../../src/domain/accountState.ts";
import { canonicalHandle, simulateReading } from "../../src/domain/rankSimulator.ts";

const NOW = new Date("2026-10-18T12:00:00.000Z");
const EARLIER = new Date("2026-10-18T10:15:30.250Z");
const ISO_MS_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const PUBLIC_KEYS = [
  "id",
  "userId",
  "gameId",
  "handle",
  "region",
  "currentRank",
  "rankHistory",
  "lastSyncedAt",
  "verified",
  "simulated",
];

function lolAccount(userId = new mongoose.Types.ObjectId()) {
  return new GameAccount({
    user: userId,
    gameId: "lol",
    handle: "Jugador1#LAS",
    region: "LAS",
    currentRank: { tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW },
    rankHistory: [
      { tier: "Gold", division: "III", points: 10, normalized: 42, recordedAt: EARLIER },
      { tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW },
    ],
    matches: [
      {
        matchId: "m-1-0",
        gameId: "lol",
        playedAt: NOW,
        result: "win",
        summary: "Ahri · 5/2/7",
        durationMinutes: 31,
        rankDelta: 18,
      },
    ],
    readingNumber: 1,
    lastSyncedAt: NOW,
    verified: true,
  });
}

// Cuenta CS2 construida con las funciones puras (tier sin división).
function cs2Account() {
  const reading = simulateReading({
    gameId: "cs2",
    canonicalHandle: canonicalHandle("76561190000000001"),
    readingNumber: 0,
    now: NOW,
  });
  const state = initialState(reading, NOW);
  return new GameAccount({
    user: new mongoose.Types.ObjectId(),
    gameId: "cs2",
    handle: "76561190000000001",
    region: "SA",
    currentRank: state.currentRank,
    rankHistory: state.rankHistory,
    matches: state.matches.map(({ id, ...rest }) => ({ matchId: id, ...rest })),
    readingNumber: state.readingNumber,
    lastSyncedAt: state.lastSyncedAt,
    verified: state.verified,
  });
}

// El tipo de `toJSON()` de Mongoose no refleja el `transform`; se lee como datos sin tipo.
function serialized(value: unknown): Record<string, unknown> {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  assert.ok(typeof parsed === "object" && parsed !== null && !Array.isArray(parsed));
  return { ...parsed };
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return { ...value };
}

describe("GameAccount: toJSON en lista blanca (RF-37, DP-32, DP-33)", () => {
  test("tiene exactamente id, userId, gameId, handle, region, currentRank, rankHistory, lastSyncedAt, verified y simulated", () => {
    const account = lolAccount();
    const json: Record<string, unknown> = account.toJSON();
    assert.deepStrictEqual(Object.keys(json), PUBLIC_KEYS);
  });

  test("id y userId son texto en minúsculas; simulated es true", () => {
    const userId = new mongoose.Types.ObjectId();
    const account = lolAccount(userId);
    const json: Record<string, unknown> = account.toJSON();
    assert.strictEqual(json.id, account._id.toString());
    assert.strictEqual(json.userId, userId.toHexString());
    assert.match(String(json.id), /^[0-9a-f]{24}$/);
    assert.match(String(json.userId), /^[0-9a-f]{24}$/);
    assert.strictEqual(json.simulated, true);
  });

  test("conserva identificador, región, juego y verificada", () => {
    const json: Record<string, unknown> = lolAccount().toJSON();
    assert.strictEqual(json.gameId, "lol");
    assert.strictEqual(json.handle, "Jugador1#LAS");
    assert.strictEqual(json.region, "LAS");
    assert.strictEqual(json.verified, true);
  });

  test("no tiene _id, __v, user, matches ni readingNumber", () => {
    const account = lolAccount();
    const json: Record<string, unknown> = account.toJSON();
    for (const hidden of ["_id", "__v", "user", "matches", "readingNumber"]) {
      assert.ok(!(hidden in json), `toJSON no debe incluir ${hidden}`);
    }
    const text = JSON.stringify(account);
    for (const hidden of ['"_id"', '"__v"', '"user"', '"matches"', '"readingNumber"', "m-1-0", "Ahri"]) {
      assert.ok(!text.includes(hidden), `la serialización no debe incluir ${hidden}`);
    }
  });

  test("al serializar, las fechas salen en ISO 8601 UTC con milisegundos", () => {
    const json = serialized(lolAccount());
    assert.strictEqual(json.lastSyncedAt, NOW.toISOString());
    assert.match(String(json.lastSyncedAt), ISO_MS_Z);
    const current = record(json.currentRank);
    assert.strictEqual(current.recordedAt, NOW.toISOString());
    assert.ok(Array.isArray(json.rankHistory));
    assert.deepStrictEqual(
      json.rankHistory.map((snapshot) => record(snapshot).recordedAt),
      [EARLIER.toISOString(), NOW.toISOString()],
    );
  });

  test("la fotografía con división tiene tier, division, points, normalized y recordedAt (sin _id)", () => {
    const json = serialized(lolAccount());
    assert.deepStrictEqual(json.currentRank, {
      tier: "Gold",
      division: "II",
      points: 42,
      normalized: 45,
      recordedAt: NOW.toISOString(),
    });
    assert.deepStrictEqual(json.rankHistory, [
      { tier: "Gold", division: "III", points: 10, normalized: 42, recordedAt: EARLIER.toISOString() },
      { tier: "Gold", division: "II", points: 42, normalized: 45, recordedAt: NOW.toISOString() },
    ]);
  });

  test("division ausente no aparece (ni en currentRank ni en rankHistory)", () => {
    const account = cs2Account();
    const json: Record<string, unknown> = account.toJSON();
    const current = record(json.currentRank);
    assert.ok(!("division" in current));
    assert.ok(Array.isArray(json.rankHistory));
    for (const snapshot of json.rankHistory) {
      assert.ok(!("division" in record(snapshot)));
    }
    assert.ok(!JSON.stringify(account).includes("division"));
  });

  test("con una cuenta hecha por initialState coincide con el estado de dominio salvo lo interno", () => {
    const reading = simulateReading({
      gameId: "cs2",
      canonicalHandle: "76561190000000001",
      readingNumber: 0,
      now: NOW,
    });
    const state = initialState(reading, NOW);
    const json = serialized(cs2Account());
    const { tier, points, normalized } = state.currentRank;
    assert.deepStrictEqual(json.currentRank, { tier, points, normalized, recordedAt: NOW.toISOString() });
    assert.deepStrictEqual(json.rankHistory, [{ tier, points, normalized, recordedAt: NOW.toISOString() }]);
    assert.strictEqual(json.verified, state.verified);
    assert.strictEqual(json.lastSyncedAt, NOW.toISOString());
  });

  test("toGameAccountJson es igual a toJSON()", () => {
    const account = lolAccount();
    const json: Record<string, unknown> = account.toJSON();
    assert.deepStrictEqual({ ...toGameAccountJson(account) }, json);
  });

  test("simulated no se guarda: no es un campo del esquema", () => {
    assert.strictEqual(GameAccount.schema.path("simulated"), undefined);
  });
});

describe("GameAccount: esquema (plan, sección 5)", () => {
  test("es válido con los campos de una cuenta completa", async () => {
    await lolAccount().validate();
    await cs2Account().validate();
  });

  test("readingNumber vale 0 y verified false por defecto", () => {
    const account = new GameAccount({ gameId: "r6" });
    assert.strictEqual(account.readingNumber, 0);
    assert.strictEqual(account.verified, false);
  });

  test("gameId fuera de lol, r6 y cs2 no es válido", async () => {
    const account = lolAccount();
    account.set("gameId", "valorant");
    await assert.rejects(account.validate());
  });

  test("readingNumber negativo o no entero no es válido", async () => {
    for (const value of [-1, 1.5]) {
      const account = lolAccount();
      account.set("readingNumber", value);
      await assert.rejects(account.validate(), `readingNumber ${value}`);
    }
  });

  test("normalized fuera de 0–100 no es válido", async () => {
    const account = lolAccount();
    account.set("currentRank.normalized", 101);
    await assert.rejects(account.validate());
  });

  test("más de 20 partidas no es válido", async () => {
    const account = lolAccount();
    const matches = Array.from({ length: 21 }, (_, index) => ({
      matchId: `m-0-${index}`,
      gameId: "lol",
      playedAt: NOW,
      result: "loss",
      summary: "Lux · 0/1/2",
      durationMinutes: 25,
      rankDelta: -15,
    }));
    account.set("matches", matches);
    await assert.rejects(account.validate());
  });

  test("sin user, handle, region, currentRank o lastSyncedAt no es válido", async () => {
    for (const field of ["user", "handle", "region", "currentRank", "lastSyncedAt"]) {
      const account = lolAccount();
      account.set(field, undefined);
      await assert.rejects(account.validate(), `sin ${field}`);
    }
  });

  test("índice único { user, gameId } (RF-5) y user indexado", () => {
    const indexes = GameAccount.schema.indexes();
    const unique = indexes
      .filter(([, options]) => options.unique === true)
      .map(([fields]) => Object.keys(fields).join(","));
    assert.deepStrictEqual(unique, ["user,gameId"]);
    assert.ok(indexes.some(([fields]) => Object.keys(fields).join(",") === "user"));
  });

  test("usa concurrencia optimista (DP-29)", () => {
    assert.strictEqual(GameAccount.schema.get("optimisticConcurrency"), true);
  });

  test("las partidas se guardan con matchId y sin _id propio", () => {
    const account = lolAccount();
    const [first] = account.matches;
    assert.ok(first !== undefined);
    assert.strictEqual(first.matchId, "m-1-0");
    assert.strictEqual(record(account.toObject().matches[0])._id, undefined);
  });
});

describe("User: sin lista de cuentas (spec 004, plan, R9)", () => {
  function newUser() {
    return new User({
      email: "ana@example.com",
      username: "Ana",
      usernameKey: "ana",
      passwordHash: "$2b$10$hashdeprueba",
      displayName: "Ana",
    });
  }

  test("el esquema no tiene el campo accounts", () => {
    assert.strictEqual(User.schema.path("accounts"), undefined);
  });

  test("un usuario nuevo no tiene la clave accounts, ni en el objeto ni en toJSON", () => {
    const user = newUser();
    user.set("createdAt", NOW);
    assert.ok(!("accounts" in user.toObject()));
    assert.ok(!("accounts" in user.toJSON()));
  });

  test("un valor accounts asignado se descarta (esquema estricto) y no se serializa", () => {
    const user = newUser();
    const accountId = new mongoose.Types.ObjectId();
    user.set("createdAt", NOW);
    user.set("accounts", [accountId]);
    assert.ok(!("accounts" in user.toObject()));
    const text = JSON.stringify(user);
    assert.ok(!text.includes("accounts"));
    assert.ok(!text.includes(accountId.toHexString()));
  });
});
