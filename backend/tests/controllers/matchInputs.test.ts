// Lectura de datos para el motor de coincidencias (spec 005, plan, secciones 4 y 8).
// RF-4, RF-6, RF-13, RF-17, DP5-10.
// - Sin Express: se llama a `loadMatchInputs` directamente contra la base de prueba.
// - Los usuarios y las cuentas se crean con los modelos; rangos, verificada y disponibilidad
//   los elige la prueba.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { connectDatabase } from "../../src/server.ts";
import { loadMatchInputs, toCandidateUser } from "../../src/services/matchInputs.ts";
import type { GameId } from "../../src/domain/games.ts";
import { FIXED_NOW, ISO_MS_Z, nonExistingId } from "./helpers.ts";
import { testConfig } from "../server/helpers.ts";

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
  await mongoose.connection.close();
});

const CANDIDATE_USER_KEYS = ["avatarColor", "bio", "createdAt", "displayName", "id", "timezone", "username"];
const ACCOUNT_KEYS = [
  "currentRank",
  "gameId",
  "handle",
  "id",
  "lastSyncedAt",
  "origins",
  "rankHistory",
  "region",
  "userId",
  "verified",
];
const VERIFIED_EXTRA_KEYS = ["verifiedAt", "verifiedWith"];

interface NewUser {
  name: string;
  availability?: string[];
  displayName?: string;
  bio?: string;
  avatarColor?: string;
  timezone?: string;
}

async function createUser(data: NewUser) {
  const key = data.name.toLowerCase();
  return User.create({
    email: `${key}@example.com`,
    username: data.name,
    usernameKey: key,
    passwordHash: "hash-que-no-debe-salir",
    displayName: data.displayName ?? data.name,
    availability: data.availability ?? [],
    ...(data.bio === undefined ? {} : { bio: data.bio }),
    ...(data.avatarColor === undefined ? {} : { avatarColor: data.avatarColor }),
    ...(data.timezone === undefined ? {} : { timezone: data.timezone }),
  });
}

interface NewAccount {
  user: mongoose.Types.ObjectId | string;
  gameId?: GameId;
  normalized?: number;
  verified?: boolean;
  handle?: string;
}

async function createAccount(data: NewAccount) {
  const recordedAt = new Date(FIXED_NOW);
  const snapshot = { tier: "Oro", division: "II", points: 40, normalized: data.normalized ?? 50, recordedAt };
  return GameAccount.create({
    user: data.user,
    gameId: data.gameId ?? "lol",
    handle: data.handle ?? `handle-${String(data.user)}`,
    region: "LAS",
    currentRank: snapshot,
    rankHistory: [snapshot],
    matches: [
      {
        matchId: "m-1",
        gameId: data.gameId ?? "lol",
        playedAt: recordedAt,
        result: "win",
        summary: "partida de prueba",
        durationMinutes: 30,
        rankDelta: 1,
      },
    ],
    readingNumber: 3,
    lastSyncedAt: recordedAt,
    ...(data.verified === true
      ? { verification: { source: "riot", externalId: `ext-${String(data.user)}`, verifiedAt: recordedAt } }
      : {}),
  });
}

describe("matchInputs: sesión y cuenta propia", () => {
  test("usuario sin cuenta en el juego pedido: noAccount (RF-6)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id, gameId: "r6" });
    const beto = await createUser({ name: "Beto" });
    await createAccount({ user: beto._id, gameId: "lol" });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.deepStrictEqual(result, { kind: "noAccount" });
  });

  test("usuario sin ninguna cuenta: noAccount", async () => {
    const ana = await createUser({ name: "Ana" });

    assert.deepStrictEqual(await loadMatchInputs(ana.id, "cs2"), { kind: "noAccount" });
  });

  test("usuario borrado: noSession, aunque conserve una cuenta huérfana (RF-13)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });
    await User.deleteOne({ _id: ana._id });

    assert.deepStrictEqual(await loadMatchInputs(ana.id, "lol"), { kind: "noSession" });
  });

  test("usuario que nunca existió: noSession", async () => {
    assert.deepStrictEqual(await loadMatchInputs(nonExistingId(), "lol"), { kind: "noSession" });
  });

  test("devuelve la cuenta propia serializada y sus bloques leídos de availability", async () => {
    const ana = await createUser({ name: "Ana", availability: ["2-20", "0-5", "0-23"] });
    const own = await createAccount({ user: ana._id, normalized: 61, verified: true, handle: "ana#LAS" });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.strictEqual(result.viewer.userId, ana.id);
    assert.deepStrictEqual(result.viewer.blocks, ["2-20", "0-5", "0-23"]);
    assert.strictEqual(result.viewer.account.id, own.id);
    assert.strictEqual(result.viewer.account.userId, ana.id);
    assert.strictEqual(result.viewer.account.currentRank?.normalized, 61);
    assert.strictEqual(result.viewer.account.verified, true);
    assert.strictEqual(result.viewer.account.handle, "ana#LAS");
    assert.deepStrictEqual(result.candidates, []);
  });

  test("usuario sin disponibilidad guardada: bloques vacíos", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(result.viewer.blocks, []);
  });
});

describe("matchInputs: candidatos", () => {
  test("la propia cuenta no está entre los candidatos (RF-4)", async () => {
    const ana = await createUser({ name: "Ana" });
    const own = await createAccount({ user: ana._id });
    const beto = await createUser({ name: "Beto" });
    const other = await createAccount({ user: beto._id });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(
      result.candidates.map((candidate) => candidate.account.id),
      [other.id],
    );
    assert.ok(!result.candidates.some((candidate) => candidate.account.id === own.id));
    assert.ok(!result.candidates.some((candidate) => candidate.user.id === ana.id));
  });

  test("solo entran las cuentas del juego pedido", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id, gameId: "r6" });
    const beto = await createUser({ name: "Beto" });
    const betoR6 = await createAccount({ user: beto._id, gameId: "r6" });
    await createAccount({ user: beto._id, gameId: "lol" });
    const carla = await createUser({ name: "Carla" });
    await createAccount({ user: carla._id, gameId: "cs2" });

    const result = await loadMatchInputs(ana.id, "r6");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(
      result.candidates.map((candidate) => candidate.account.id),
      [betoR6.id],
    );
    assert.strictEqual(result.candidates[0]?.account.gameId, "r6");
  });

  test("una cuenta cuyo dueño no existe se omite y el resto sigue (RF-17)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });
    const beto = await createUser({ name: "Beto" });
    const real = await createAccount({ user: beto._id });
    await createAccount({ user: nonExistingId() });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(
      result.candidates.map((candidate) => candidate.account.id),
      [real.id],
    );
  });

  test("dueño eliminado con la cuenta aún en la base: se omite (RF-17)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });
    const beto = await createUser({ name: "Beto" });
    await createAccount({ user: beto._id });
    await User.deleteOne({ _id: beto._id });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(result.candidates, []);
  });

  test("el usuario del candidato tiene exactamente los siete campos públicos (DP5-10)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });
    const beto = await createUser({
      name: "Beto",
      displayName: "Beto Ñandú",
      bio: "Juego de noche",
      avatarColor: "#112233",
      timezone: "America/Bogota",
      availability: ["1-18"],
    });
    await createAccount({ user: beto._id });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    const candidate = result.candidates[0];
    assert.ok(candidate !== undefined, "debería haber un candidato");
    assert.deepStrictEqual(Object.keys(candidate.user).sort(), CANDIDATE_USER_KEYS);
    assert.deepStrictEqual(
      { ...candidate.user, createdAt: undefined },
      {
        id: beto.id,
        username: "Beto",
        displayName: "Beto Ñandú",
        avatarColor: "#112233",
        bio: "Juego de noche",
        timezone: "America/Bogota",
        createdAt: undefined,
      },
    );
    assert.match(candidate.user.createdAt, ISO_MS_Z);
    assert.strictEqual(candidate.user.createdAt, beto.createdAt.toISOString());
    assert.ok(!JSON.stringify(result).includes("example.com"), "no debe salir ningún correo");
    assert.ok(!JSON.stringify(result).includes("hash-que-no-debe-salir"), "no debe salir ningún hash");
  });

  test("los bloques del candidato salen de su availability", async () => {
    const ana = await createUser({ name: "Ana", availability: ["0-5"] });
    await createAccount({ user: ana._id });
    const beto = await createUser({ name: "Beto", availability: ["3-9", "0-5", "6-23"] });
    await createAccount({ user: beto._id });
    const carla = await createUser({ name: "Carla" });
    await createAccount({ user: carla._id });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    const blocksByUser = new Map(result.candidates.map((candidate) => [candidate.user.username, candidate.blocks]));
    assert.deepStrictEqual(blocksByUser.get("Beto"), ["3-9", "0-5", "6-23"]);
    assert.deepStrictEqual(blocksByUser.get("Carla"), []);
    assert.strictEqual(blocksByUser.size, 2);
  });

  test("las cuentas llevan origins (sin simulated) y no llevan matches ni readingNumber (RF-3, spec 012 RF-5)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });
    const beto = await createUser({ name: "Beto" });
    await createAccount({ user: beto._id, verified: true });

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    const accounts = [result.viewer.account, ...result.candidates.map((candidate) => candidate.account)];
    assert.strictEqual(accounts.length, 2);
    for (const account of accounts) {
      assert.ok(!("simulated" in account));
      const keys = account.verified ? [...ACCOUNT_KEYS, ...VERIFIED_EXTRA_KEYS].sort() : ACCOUNT_KEYS;
      assert.deepStrictEqual(Object.keys(account).sort(), keys);
      assert.ok(!("matches" in account));
      assert.ok(!("readingNumber" in account));
    }
    assert.strictEqual(result.candidates[0]?.account.verified, true);
  });

  test("varios candidatos con sus dueños correctos", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id });
    const names = ["Beto", "Carla", "Dario"];
    for (const [index, name] of names.entries()) {
      const owner = await createUser({ name, availability: [`${index}-10`] });
      await createAccount({ user: owner._id, normalized: 10 * (index + 1) });
    }

    const result = await loadMatchInputs(ana.id, "lol");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    const rows = result.candidates
      .map((candidate) => [candidate.user.username, candidate.account.currentRank?.normalized, candidate.blocks])
      .sort();
    assert.deepStrictEqual(rows, [
      ["Beto", 10, ["0-10"]],
      ["Carla", 20, ["1-10"]],
      ["Dario", 30, ["2-10"]],
    ]);
    for (const candidate of result.candidates) {
      assert.strictEqual(candidate.account.userId, candidate.user.id);
    }
  });
});

describe("matchInputs: toCandidateUser", () => {
  test("copia solo la lista explícita de campos y pasa la fecha a ISO", () => {
    const createdAt = new Date("2026-03-15T18:30:00.123Z");
    const id = new mongoose.Types.ObjectId();

    const owner = {
      _id: id,
      username: "Beto",
      displayName: "Beto B",
      avatarColor: "#abcdef",
      bio: "hola",
      timezone: "America/Lima",
      createdAt,
      availability: ["0-1"],
      email: "beto@example.com",
      passwordHash: "secreto",
    };

    const candidate = toCandidateUser(owner);

    assert.deepStrictEqual(candidate, {
      id: id.toHexString(),
      username: "Beto",
      displayName: "Beto B",
      avatarColor: "#abcdef",
      bio: "hola",
      timezone: "America/Lima",
      createdAt: "2026-03-15T18:30:00.123Z",
    });
  });
});

// --- CS2 verificada con Steam: rango Premier de Leetify (spec 015, RF-7, RF-8, RF-10, RF-18) ---
type Cs2Premier = "rated" | "unrated" | "unavailable" | "legacy" | "unverified";

let steamCounter = 0;

// `legacy`: cuenta verificada con Steam anterior a la spec 015 (sin `premier`, rango simulado);
// `unverified`: cuenta de CS2 sin verificar (simulada, sin `premier`, RF-22).
async function createCs2Account(user: mongoose.Types.ObjectId, state: Cs2Premier, normalized = 50) {
  const recordedAt = new Date(FIXED_NOW);
  const snapshot = { tier: "Blue", points: 12000, normalized, recordedAt };
  const hasRank = state === "rated" || state === "legacy" || state === "unverified";
  steamCounter += 1;
  return GameAccount.create({
    user,
    gameId: "cs2",
    handle: state === "unverified" ? `cs2-${steamCounter}` : `7656119800000${String(steamCounter).padStart(4, "0")}`,
    region: "LAS",
    currentRank: hasRank ? snapshot : null,
    rankHistory: hasRank ? [snapshot] : [],
    matches: [],
    readingNumber: 0,
    lastSyncedAt: recordedAt,
    ...(state === "unverified"
      ? {}
      : {
          verification: { source: "steam", externalId: `7656119800000${String(steamCounter).padStart(4, "0")}`, verifiedAt: recordedAt },
        }),
    ...(state === "rated" || state === "unrated" || state === "unavailable" ? { premier: state } : {}),
  });
}

async function candidateHandles(userId: string): Promise<string[]> {
  const result = await loadMatchInputs(userId, "cs2");
  assert.strictEqual(result.kind, "ok");
  if (result.kind !== "ok") return [];
  return result.candidates.map((candidate) => candidate.user.username).sort();
}

describe("matchInputs: CS2 con rango Premier de Leetify (spec 015)", () => {
  test("cuenta propia sin rango Premier: noPremier «unrated» (RF-7, RF-10)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "unrated");

    assert.deepStrictEqual(await loadMatchInputs(ana.id, "cs2"), { kind: "noPremier", premier: "unrated" });
  });

  test("cuenta propia con rango no disponible: noPremier «unavailable» (RF-8, RF-10)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "unavailable");

    assert.deepStrictEqual(await loadMatchInputs(ana.id, "cs2"), { kind: "noPremier", premier: "unavailable" });
  });

  test("candidatas sin rating (unrated o unavailable) quedan excluidas (RF-7, RF-8)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "rated");
    for (const [name, state] of [
      ["Beto", "rated"],
      ["Carla", "unrated"],
      ["Dario", "unavailable"],
    ] as const) {
      const owner = await createUser({ name });
      await createCs2Account(owner._id, state);
    }

    assert.deepStrictEqual(await candidateHandles(ana.id), ["Beto"]);
  });

  test("una cuenta con rating, que conserva su rango tras una lectura fallida, sigue como candidata (RF-18)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "rated");
    const beto = await createUser({ name: "Beto" });
    const account = await createCs2Account(beto._id, "rated", 70);
    // Un fallo de Leetify no toca `premier` ni `currentRank` (RF-18): solo avanza la sincronización.
    await GameAccount.updateOne({ _id: account._id }, { $set: { lastSyncedAt: new Date(FIXED_NOW + 3_600_000) } });

    const result = await loadMatchInputs(ana.id, "cs2");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(
      result.candidates.map((candidate) => [candidate.user.username, candidate.account.currentRank?.normalized]),
      [["Beto", 70]],
    );
  });

  test("cuenta de CS2 sin verificar: sin cambios, propia y candidata con su rango simulado (RF-22)", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "unverified");
    const beto = await createUser({ name: "Beto" });
    await createCs2Account(beto._id, "unverified");

    const result = await loadMatchInputs(ana.id, "cs2");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.deepStrictEqual(
      result.candidates.map((candidate) => candidate.user.username),
      ["Beto"],
    );
  });

  test("verificada con Steam sin `premier` (anterior a la 015): su rango es simulado, así que no es candidata", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "rated");
    const beto = await createUser({ name: "Beto" });
    await createCs2Account(beto._id, "legacy");
    const carla = await createUser({ name: "Carla" });
    await createCs2Account(carla._id, "unverified");

    // Beto no entra: se mostraría un rango simulado atribuido a Leetify (constitución, principio 5).
    assert.deepStrictEqual(await candidateHandles(ana.id), ["Carla"]);
  });

  test("verificada con Steam sin `premier` como cuenta propia: noPremier «unavailable» hasta resincronizar", async () => {
    const ana = await createUser({ name: "Ana" });
    await createCs2Account(ana._id, "legacy");

    assert.deepStrictEqual(await loadMatchInputs(ana.id, "cs2"), { kind: "noPremier", premier: "unavailable" });
  });

  test("la regla es solo de CS2: una cuenta de LoL o R6 sin `premier` no se ve afectada", async () => {
    const ana = await createUser({ name: "Ana" });
    await createAccount({ user: ana._id, gameId: "r6" });
    const beto = await createUser({ name: "Beto" });
    await createAccount({ user: beto._id, gameId: "r6", verified: true });

    const result = await loadMatchInputs(ana.id, "r6");

    assert.strictEqual(result.kind, "ok");
    if (result.kind !== "ok") return;
    assert.strictEqual(result.candidates.length, 1);
  });
});
