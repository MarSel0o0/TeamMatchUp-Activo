// `verifyAccount` y el 409 del vínculo manual. Spec 012, T7: RF-1, RF-8, RF-10, RF-11, RF-12,
// RF-13; plan, secciones 3.2 y 3.3, R1. Sin red: los datos "reales" los arma la prueba.
import { after, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount, toGameAccountJson } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import type { VerifyInput } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  authApp,
  closeTestServers,
  link,
  linkOk,
  nonExistingId,
  rawAccountsInDb,
  signUp,
  unlink,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const CARLA = { email: "carla@example.com", username: "Carla" } as const;

const NOW = new Date(FIXED_NOW);
const ELSEWHERE = "esta cuenta ya está verificada por otro usuario";

const app = await authApp();

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  mock.method(clock, "now", () => new Date(FIXED_NOW));
});

after(async () => {
  mock.restoreAll();
  await closeTestServers();
  await mongoose.disconnect();
});

const REAL_RANK = { tier: "Platinum", division: "IV", points: 12, normalized: 60, recordedAt: NOW };

function riotInput(userId: string, overrides: Partial<VerifyInput> = {}): VerifyInput {
  return {
    userId,
    gameId: "lol",
    handle: "Verificada#LAS",
    region: "LAS",
    verification: { source: "riot", externalId: "puuid-1" },
    real: {
      handle: "Verificada#LAS",
      rank: REAL_RANK,
      matches: [
        { id: "r-1", gameId: "lol", playedAt: NOW, result: "win", summary: "Ahri", durationMinutes: 30, rankDelta: 0 },
      ],
      profile: { level: 100 },
    },
    now: NOW,
    ...overrides,
  };
}

function steamInput(userId: string, overrides: Partial<VerifyInput> = {}): VerifyInput {
  return {
    userId,
    gameId: "cs2",
    handle: "76561190000000001",
    verification: { source: "steam", externalId: "76561190000000001" },
    real: { handle: "76561190000000001", profile: { displayName: "Ana", hoursTotal: 500 } },
    now: NOW,
    ...overrides,
  };
}

async function accountsOf(userId: string) {
  return GameAccount.find({ user: userId });
}

describe("alta de una cuenta verificada (RF-1, RF-8)", () => {
  test("sin cuenta previa con una fuente que trae todo (Riot): rango, historial, partidas y perfil reales", async () => {
    const ana = await signUp(app, ANA);
    const result = await verifyAccount(riotInput(ana.id));
    assert.ok(result.ok);
    const stored = await accountsOf(ana.id);
    assert.strictEqual(stored.length, 1);
    const [account] = stored;
    assert.strictEqual(account?.verification?.source, "riot");
    assert.strictEqual(account?.verification?.externalId, "puuid-1");
    assert.deepStrictEqual(account?.verification?.verifiedAt, NOW);
    assert.strictEqual(account?.handle, "Verificada#LAS");
    assert.strictEqual(account?.handleKey, "verificada#las");
    assert.strictEqual(account?.region, "LAS");
    assert.strictEqual(account?.currentRank?.tier, "Platinum");
    assert.strictEqual(account?.rankHistory.length, 1);
    assert.deepStrictEqual(account?.matches.map((m) => m.matchId), ["r-1"]);
    assert.strictEqual(account?.profile?.level, 100);
  });

  test("con una fuente sin rango (Steam): rango, historial y partidas son la lectura simulada 0", async () => {
    const ana = await signUp(app, ANA);
    const result = await verifyAccount(steamInput(ana.id));
    assert.ok(result.ok);
    const account = (await accountsOf(ana.id))[0];
    assert.ok(account !== undefined);
    assert.strictEqual(account.readingNumber, 0);
    assert.ok(account.rankHistory.length === 1);
    assert.ok(account.matches.length >= 1); // la lectura simulada 0 trae al menos una partida
    assert.strictEqual(account.region, "South America"); // primera región del juego (sin `region`)
    assert.strictEqual(account.profile?.displayName, "Ana");
    // Spec 015, RF-6, P15-7: el rango de Steam lo atribuye Leetify. Sin `premier` el servicio no
    // toca el rango (plan, §2); `/api/steam/complete` siempre pasa la lectura (RF-3, P15-9).
    assert.deepStrictEqual(toGameAccountJson(result.account).origins, {
      identity: "steam",
      rank: "leetify",
      matches: "simulated",
      profile: "steam",
    });
  });

  test("devuelve la cuenta verificada con verified true", async () => {
    const ana = await signUp(app, ANA);
    const result = await verifyAccount(riotInput(ana.id));
    assert.ok(result.ok);
    assert.strictEqual(JSON.parse(JSON.stringify(result.account)).verified, true);
  });
});

describe("conversión de la cuenta propia (RF-13)", () => {
  async function manualLol(user: SignedUp, handle = "Manual#LAS", region = "LAS") {
    return linkOk(user, { gameId: "lol", handle, region });
  }

  test("misma identidad: sigue habiendo una sola cuenta, con el mismo _id, ahora verificada", async () => {
    const ana = await signUp(app, ANA);
    const id = await manualLol(ana, "Verificada#LAS");
    const result = await verifyAccount(riotInput(ana.id));
    assert.ok(result.ok);
    const stored = await accountsOf(ana.id);
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0]?.id, id);
    assert.strictEqual(stored[0]?.verification?.externalId, "puuid-1");
    assert.strictEqual(stored[0]?.rankHistory.length, 1); // se descartó el historial simulado (RF-8)
    assert.strictEqual(stored[0]?.currentRank?.tier, "Platinum");
  });

  test("otra identidad: se reemplaza el identificador por el verificado y se recalcula handleKey", async () => {
    const ana = await signUp(app, ANA);
    const id = await manualLol(ana, "Uno#LAS");
    const result = await verifyAccount(riotInput(ana.id, { handle: "Dos#LAS", real: { handle: "Dos#LAS", rank: REAL_RANK } }));
    assert.ok(result.ok);
    const stored = await accountsOf(ana.id);
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0]?.id, id);
    assert.strictEqual(stored[0]?.handle, "Dos#LAS");
    assert.strictEqual(stored[0]?.handleKey, "dos#las");
  });

  test("sin región en la entrada conserva la región de la cuenta; con región la reemplaza", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const first = await verifyAccount(steamInput(ana.id));
    assert.ok(first.ok);
    assert.strictEqual((await accountsOf(ana.id))[0]?.region, "Europe");
    const second = await verifyAccount(steamInput(ana.id, { region: "Asia" }));
    assert.ok(second.ok);
    assert.strictEqual((await accountsOf(ana.id))[0]?.region, "Asia");
  });

  test("conserva el número de lectura simulada de la cuenta", async () => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    await GameAccount.updateOne({ _id: id }, { $set: { readingNumber: 7 } });
    const result = await verifyAccount(steamInput(ana.id));
    assert.ok(result.ok);
    assert.strictEqual((await accountsOf(ana.id))[0]?.readingNumber, 7);
  });
});

describe("exclusividad (RF-10)", () => {
  test("otro usuario ya verificó ese identificador real: 409 y nada cambia", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    assert.ok((await verifyAccount(riotInput(ana.id))).ok);
    await linkOk(beto, { gameId: "lol", handle: "Otra#LAS", region: "LAS" });
    const before = await rawAccountsInDb();

    const result = await verifyAccount(riotInput(beto.id));

    assert.deepStrictEqual(result, { ok: false, status: 409, error: ELSEWHERE });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("el mismo identificador real en otro juego no choca", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    assert.ok((await verifyAccount(riotInput(ana.id))).ok);
    const cs = steamInput(beto.id, { verification: { source: "steam", externalId: "puuid-1" } });
    assert.ok((await verifyAccount(cs)).ok);
  });

  test("dos verificaciones simultáneas del mismo identificador real: una gana y la otra recibe 409", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const results = await Promise.all([verifyAccount(riotInput(ana.id)), verifyAccount(riotInput(beto.id))]);
    const winners = results.filter((result) => result.ok);
    const losers = results.filter((result) => !result.ok);
    assert.strictEqual(winners.length, 1);
    assert.deepStrictEqual(losers, [{ ok: false, status: 409, error: ELSEWHERE }]);
    assert.strictEqual(await GameAccount.countDocuments({ "verification.externalId": "puuid-1" }), 1);
  });

  test("el mismo usuario verifica dos veces a la vez: una sola cuenta, sin error", async () => {
    const ana = await signUp(app, ANA);
    const results = await Promise.all([verifyAccount(riotInput(ana.id)), verifyAccount(riotInput(ana.id))]);
    assert.ok(results.every((result) => result.ok));
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 1);
  });

  test("volver a verificar la propia cuenta con la misma identidad la refresca", async () => {
    const ana = await signUp(app, ANA);
    assert.ok((await verifyAccount(riotInput(ana.id))).ok);
    const again = await verifyAccount(riotInput(ana.id, { real: { handle: "Verificada#LAS", rank: { ...REAL_RANK, points: 80 } } }));
    assert.ok(again.ok);
    assert.strictEqual((await accountsOf(ana.id))[0]?.currentRank?.points, 80);
    assert.strictEqual(await GameAccount.countDocuments({}), 1);
  });
});

describe("desvincula las cuentas sin verificar de otros (RF-11)", () => {
  test("borra las de otros usuarios con el mismo juego e identificador, sin distinguir mayúsculas", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);
    await linkOk(beto, { gameId: "lol", handle: "verificada#las", region: "NA" });
    await linkOk(carla, { gameId: "lol", handle: "  VERIFICADA#LAS ", region: "EUW" });

    assert.ok((await verifyAccount(riotInput(ana.id))).ok);

    assert.strictEqual(await GameAccount.countDocuments({ user: beto.id }), 0);
    assert.strictEqual(await GameAccount.countDocuments({ user: carla.id }), 0);
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 1);
  });

  test("no toca la cuenta propia, otro juego, otro identificador ni las verificadas", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);
    await linkOk(beto, { gameId: "lol", handle: "Distinta#LAS", region: "LAS" }); // otro identificador
    await linkOk(beto, { gameId: "r6", handle: "verificada", region: "LATAM" }); // otro juego
    assert.ok((await verifyAccount(riotInput(carla.id, { handle: "Verificada#LAS", verification: { source: "riot", externalId: "puuid-c" } }))).ok);
    // Ana verifica otra cuenta real que casualmente se llama igual: la verificada de Carla no se borra.
    const result = await verifyAccount(riotInput(ana.id, { verification: { source: "riot", externalId: "puuid-a" } }));
    assert.ok(result.ok);

    assert.strictEqual(await GameAccount.countDocuments({ user: beto.id }), 2);
    assert.strictEqual(await GameAccount.countDocuments({ user: carla.id }), 1);
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 1);
  });

  test("si la verificación se rechaza (409), no se borra ninguna cuenta ajena", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);
    assert.ok((await verifyAccount(riotInput(ana.id))).ok);
    // Carla tiene una cuenta sin verificar con ese identificador (creada sin pasar por la API).
    await GameAccount.create({
      user: carla.id,
      gameId: "lol",
      handle: "Verificada#LAS",
      region: "LAS",
      currentRank: REAL_RANK,
      rankHistory: [REAL_RANK],
      matches: [],
      readingNumber: 0,
      lastSyncedAt: NOW,
    });
    const rejected = await verifyAccount(riotInput(beto.id));
    assert.deepStrictEqual(rejected, { ok: false, status: 409, error: ELSEWHERE });
    assert.strictEqual(await GameAccount.countDocuments({ user: carla.id }), 1);
  });
});

describe("usuario inexistente", () => {
  test("404 «usuario no encontrado» y no queda ninguna cuenta", async () => {
    const result = await verifyAccount(riotInput(nonExistingId()));
    assert.deepStrictEqual(result, { ok: false, status: 404, error: "usuario no encontrado" });
    assert.strictEqual(await GameAccount.countDocuments({}), 0);
  });
});

describe("vincular a mano un identificador verificado por otro (RF-12)", () => {
  async function verifiedByAna() {
    const ana = await signUp(app, ANA);
    assert.ok((await verifyAccount(riotInput(ana.id))).ok);
    return ana;
  }

  test("409 con el mismo identificador, también con otras mayúsculas y espacios; no se crea nada", async () => {
    await verifiedByAna();
    const beto = await signUp(app, BETO);
    for (const handle of ["Verificada#LAS", "verificada#las", "  VERIFICADA#LAS  "]) {
      const response = await link(beto, { gameId: "lol", handle, region: "LAS" });
      assert.strictEqual(response.status, 409, handle);
      assert.deepStrictEqual(response.body, { error: ELSEWHERE });
    }
    assert.strictEqual(await GameAccount.countDocuments({ user: beto.id }), 0);
  });

  test("el mismo identificador en otro juego se puede vincular", async () => {
    await verifiedByAna();
    const beto = await signUp(app, BETO);
    const response = await link(beto, { gameId: "r6", handle: "verificada", region: "LATAM" });
    assert.strictEqual(response.status, 201);
  });

  test("un identificador libre o sin verificar de otro se puede vincular", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkOk(ana, { gameId: "lol", handle: "Compartido#LAS", region: "LAS" });
    assert.strictEqual((await link(beto, { gameId: "lol", handle: "Compartido#LAS", region: "LAS" })).status, 201);
  });

  test("después de que el dueño desvincula, ya se puede vincular (RF-3)", async () => {
    const ana = await verifiedByAna();
    const beto = await signUp(app, BETO);
    assert.strictEqual((await link(beto, { gameId: "lol", handle: "Verificada#LAS", region: "LAS" })).status, 409);
    const verified = await GameAccount.findOne({ user: ana.id });
    assert.strictEqual((await unlink(ana, String(verified?.id))).status, 204);
    const response = await link(beto, { gameId: "lol", handle: "Verificada#LAS", region: "LAS" });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.verified, false);
  });

  test("los datos inválidos se rechazan con 400 antes que el 409 (spec 004, RF-29)", async () => {
    await verifiedByAna();
    const beto = await signUp(app, BETO);
    const response = await link(beto, { gameId: "lol", handle: "Verificada#LAS", region: "nope" });
    assert.strictEqual(response.status, 400);
  });

  test("el 409 va antes que el duplicado propio", async () => {
    await verifiedByAna();
    const beto = await signUp(app, BETO);
    await linkOk(beto, { gameId: "lol", handle: "Otra#LAS", region: "LAS" });
    const response = await link(beto, { gameId: "lol", handle: "Verificada#LAS", region: "LAS" });
    assert.strictEqual(response.status, 409);
  });
});
