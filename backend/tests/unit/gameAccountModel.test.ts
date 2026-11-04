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
  "origins",
];

const RIOT_VERIFICATION = { source: "riot", externalId: "puuid-secreto-1", verifiedAt: NOW } as const;

function lolAccount(userId = new mongoose.Types.ObjectId(), extra: Record<string, unknown> = {}) {
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
    ...extra,
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
  test("tiene exactamente id, userId, gameId, handle, region, currentRank, rankHistory, lastSyncedAt, verified y origins (sin verificar)", () => {
    const account = lolAccount();
    const json: Record<string, unknown> = account.toJSON();
    assert.deepStrictEqual(Object.keys(json), PUBLIC_KEYS);
  });

  test("id y userId son texto en minúsculas", () => {
    const userId = new mongoose.Types.ObjectId();
    const account = lolAccount(userId);
    const json: Record<string, unknown> = account.toJSON();
    assert.strictEqual(json.id, account._id.toString());
    assert.strictEqual(json.userId, userId.toHexString());
    assert.match(String(json.id), /^[0-9a-f]{24}$/);
    assert.match(String(json.userId), /^[0-9a-f]{24}$/);
  });

  test("ya no sale `simulated`: el origen es por bloque (spec 012, RF-5)", () => {
    assert.ok(!("simulated" in lolAccount().toJSON()));
    assert.ok(!("simulated" in lolAccount(undefined, { verification: RIOT_VERIFICATION }).toJSON()));
  });

  test("conserva identificador, región y juego; sin verificación, verified es false", () => {
    const json: Record<string, unknown> = lolAccount().toJSON();
    assert.strictEqual(json.gameId, "lol");
    assert.strictEqual(json.handle, "Jugador1#LAS");
    assert.strictEqual(json.region, "LAS");
    assert.strictEqual(json.verified, false);
  });

  test("no tiene _id, __v, user, matches, readingNumber, handleKey, verification ni externalId", () => {
    const account = lolAccount(undefined, { verification: RIOT_VERIFICATION });
    const json: Record<string, unknown> = account.toJSON();
    for (const hidden of ["_id", "__v", "user", "matches", "readingNumber", "handleKey", "verification"]) {
      assert.ok(!(hidden in json), `toJSON no debe incluir ${hidden}`);
    }
    const text = JSON.stringify(account);
    for (const hidden of [
      '"_id"',
      '"__v"',
      '"user"',
      '"matches":[', // el arreglo de partidas; `origins.matches` sí sale
      '"readingNumber"',
      '"handleKey"',
      '"externalId"',
      "puuid-secreto-1",
      "m-1-0",
      "Ahri",
    ]) {
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
    assert.strictEqual(json.verified, false);
    assert.strictEqual(json.lastSyncedAt, NOW.toISOString());
  });

  test("toGameAccountJson es igual a toJSON()", () => {
    const account = lolAccount();
    const json: Record<string, unknown> = account.toJSON();
    assert.deepStrictEqual({ ...toGameAccountJson(account) }, json);
  });

  test("simulated y verified no se guardan: no son campos del esquema", () => {
    assert.strictEqual(GameAccount.schema.path("simulated"), undefined);
    assert.strictEqual(GameAccount.schema.path("verified"), undefined); // se deriva de `verification` (P12-1)
  });
});

describe("GameAccount: verificación y origen por bloque (spec 012, RF-1, RF-5, RF-22, RNF-3)", () => {
  test("sin `verification`: verified false y los cuatro bloques simulados", () => {
    const json: Record<string, unknown> = lolAccount().toJSON();
    assert.strictEqual(json.verified, false);
    assert.deepStrictEqual(json.origins, {
      identity: "simulated",
      rank: "simulated",
      matches: "simulated",
      profile: "simulated",
    });
    assert.ok(!("verifiedWith" in json) && !("verifiedAt" in json) && !("profile" in json));
  });

  test("verificada con Riot: verified true, verifiedWith, verifiedAt y todos los bloques de Riot", () => {
    const json = serialized(lolAccount(undefined, { verification: RIOT_VERIFICATION }));
    assert.deepStrictEqual(Object.keys(json), [...PUBLIC_KEYS, "verifiedWith", "verifiedAt"]);
    assert.strictEqual(json.verified, true);
    assert.strictEqual(json.verifiedWith, "riot");
    assert.strictEqual(json.verifiedAt, NOW.toISOString());
    assert.deepStrictEqual(json.origins, { identity: "riot", rank: "riot", matches: "riot", profile: "riot" });
  });

  test("verificada con Steam: identidad y perfil de Steam; rango y partidas siguen simulados (RF-8)", () => {
    const json = serialized(
      lolAccount(undefined, { verification: { source: "steam", externalId: "76561190000000001", verifiedAt: NOW } }),
    );
    assert.strictEqual(json.verifiedWith, "steam");
    assert.deepStrictEqual(json.origins, {
      identity: "steam",
      rank: "simulated",
      matches: "simulated",
      profile: "steam",
    });
  });

  test("el identificador real (externalId) nunca sale (RNF-3)", () => {
    const text = JSON.stringify(lolAccount(undefined, { verification: RIOT_VERIFICATION }));
    assert.ok(!text.includes("externalId") && !text.includes("puuid-secreto-1"));
  });

  test("el perfil sale solo con los campos presentes y sin _id", () => {
    const profile = { displayName: "Ana", avatarUrl: "https://example.com/a.png", level: 87, hoursTotal: 1234 };
    const json = serialized(lolAccount(undefined, { verification: RIOT_VERIFICATION, profile }));
    assert.deepStrictEqual(json.profile, profile);
    assert.deepStrictEqual(Object.keys(json), [...PUBLIC_KEYS, "verifiedWith", "verifiedAt", "profile"]);
  });

  test("source fuera de steam y riot no es válido; externalId y verifiedAt son obligatorios", async () => {
    const bad = [
      { source: "faceit", externalId: "x", verifiedAt: NOW },
      { source: "riot", verifiedAt: NOW },
      { source: "riot", externalId: "x" },
      { source: "riot", externalId: "", verifiedAt: NOW },
    ];
    for (const verification of bad) {
      await assert.rejects(lolAccount(undefined, { verification }).validate(), JSON.stringify(verification));
    }
    await lolAccount(undefined, { verification: RIOT_VERIFICATION }).validate();
  });

  test("handleKey se calcula al validar a partir del identificador (P12-4)", async () => {
    const account = lolAccount();
    await account.validate();
    assert.strictEqual(account.handleKey, "jugador1#las");
    account.set("handle", "  Otro#TAG ");
    await account.validate();
    assert.strictEqual(account.handleKey, "otro#tag");
  });
});

describe("GameAccount: esquema (plan, sección 5)", () => {
  test("es válido con los campos de una cuenta completa", async () => {
    await lolAccount().validate();
    await cs2Account().validate();
  });

  test("readingNumber vale 0 y no hay verificación por defecto", () => {
    const account = new GameAccount({ gameId: "r6" });
    assert.strictEqual(account.readingNumber, 0);
    assert.strictEqual(account.verification, undefined);
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

  test("índices únicos { user, gameId } (RF-5) y { gameId, verification.externalId } parcial (RF-10)", () => {
    const indexes = GameAccount.schema.indexes();
    const unique = indexes
      .filter(([, options]) => options.unique === true)
      .map(([fields]) => Object.keys(fields).join(","));
    assert.deepStrictEqual(unique.sort(), ["gameId,verification.externalId", "user,gameId"]);
    assert.ok(indexes.some(([fields]) => Object.keys(fields).join(",") === "user"));
    const partial = indexes.find(([fields]) => "verification.externalId" in fields);
    assert.ok(partial !== undefined);
    assert.deepStrictEqual(partial[1].partialFilterExpression, { "verification.externalId": { $type: "string" } });
  });

  test("índice no único { gameId, handleKey } para RF-11 y RF-12", () => {
    const found = GameAccount.schema
      .indexes()
      .find(([fields]) => Object.keys(fields).join(",") === "gameId,handleKey");
    assert.ok(found !== undefined);
    assert.notStrictEqual(found[1].unique, true);
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
