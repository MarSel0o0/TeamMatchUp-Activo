// Resincronizar una cuenta verificada con una fuente real falsa: `POST /api/accounts/:id/sync`.
// Spec 012, T6: RF-15 a RF-21, RNF-1, RNF-5; plan, sección 3.1, P12-5, P12-7. Ninguna prueba
// usa la red: las fuentes son objetos de la prueba.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { clock } from "../../src/utils/clock.ts";
import type { RealResult, RealSource, RealSourceAccount } from "../../src/services/realSources.ts";
import type { SourceId } from "../../src/domain/sources.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  authApp,
  closeTestServers,
  rawAccountsInDb,
  signUp,
  sync,
  withSession,
} from "./helpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NOW = new Date(FIXED_NOW);

type Behavior = (account: RealSourceAccount, signal: AbortSignal) => Promise<RealResult>;

/** Fuente real falsa: cuenta las consultas y responde lo que diga `behavior`. */
class FakeSource implements RealSource {
  readonly calls: RealSourceAccount[] = [];
  behavior: Behavior = async () => ({ ok: true, data: { handle: "x" } });
  readonly id: SourceId;
  constructor(id: SourceId) {
    this.id = id;
  }
  read(account: RealSourceAccount, signal: AbortSignal): Promise<RealResult> {
    this.calls.push(account);
    return this.behavior(account, signal);
  }
}

const riot = new FakeSource("riot");
const steam = new FakeSource("steam");

let app: Server;
let appWithoutSources: Server;
let appWithShortTimeout: Server;

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
  app = await authApp({ sources: { lol: riot, cs2: steam } });
  appWithoutSources = await authApp();
  appWithShortTimeout = await authApp({ sources: { lol: riot }, sourceTimeoutMs: 40 });
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  riot.calls.length = 0;
  steam.calls.length = 0;
  riot.behavior = async () => ({ ok: true, data: { handle: "x" } });
  steam.behavior = async () => ({ ok: true, data: { handle: "x" } });
  mock.method(clock, "now", () => new Date(FIXED_NOW));
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function rank(overrides: Partial<{ tier: string; division: string; points: number; normalized: number }> = {}) {
  return { tier: "Gold", division: "II", points: 40, normalized: 50, recordedAt: new Date(FIXED_NOW - 3_600_000), ...overrides };
}

interface Seed {
  gameId?: "lol" | "cs2";
  source?: SourceId;
  handle?: string;
  externalId?: string;
  lastSyncedAt?: Date;
}

/** Cuenta verificada de `userId`, sincronizada hace una hora salvo que se diga otra cosa. */
async function verifiedAccount(userId: string, seed: Seed = {}) {
  const gameId = seed.gameId ?? "lol";
  return GameAccount.create({
    user: userId,
    gameId,
    handle: seed.handle ?? (gameId === "lol" ? "Jugador#LAS" : "76561190000000001"),
    region: gameId === "lol" ? "LAS" : "South America",
    currentRank: rank(),
    rankHistory: [rank()],
    matches: [],
    readingNumber: 0,
    lastSyncedAt: seed.lastSyncedAt ?? new Date(FIXED_NOW - 3_600_000),
    verification: {
      source: seed.source ?? (gameId === "lol" ? "riot" : "steam"),
      externalId: seed.externalId ?? `ext-${userId}`,
      verifiedAt: new Date(FIXED_NOW - 7_200_000),
    },
    // Spec 013, RF-12 y D6: la espera mínima solo cuenta para una cuenta con datos de perfil (una
    // lectura real exitosa los trae siempre). Sin perfil se puede resincronizar de inmediato
    // (`tests/controllers/steamResync.test.ts`).
    profile: { displayName: "Perfil de prueba" },
  });
}

async function unverifiedAccount(userId: string) {
  return GameAccount.create({
    user: userId,
    gameId: "lol",
    handle: "Manual#LAS",
    region: "LAS",
    currentRank: rank(),
    rankHistory: [rank()],
    matches: [],
    readingNumber: 0,
    lastSyncedAt: new Date(FIXED_NOW - 3_600_000),
  });
}

describe("cuenta verificada: resincronizar (RF-15)", () => {
  test("200: rango, historial, partidas, identificador y perfil salen de la fuente", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { externalId: "puuid-ana" });
    riot.behavior = async () => ({
      ok: true,
      data: {
        handle: "NuevoNombre#LAS",
        rank: rank({ tier: "Platinum", division: "IV", points: 5, normalized: 60 }),
        matches: [
          { id: "r-1", gameId: "lol", playedAt: new Date(FIXED_NOW - 600_000), result: "win", summary: "Ahri", durationMinutes: 30, rankDelta: 0 },
        ],
        profile: { level: 120, iconId: 7 },
      },
    });

    const response = await sync(ana, account.id);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.handle, "NuevoNombre#LAS");
    assert.strictEqual(response.body.currentRank.tier, "Platinum");
    assert.strictEqual(response.body.rankHistory.length, 2);
    assert.strictEqual(response.body.lastSyncedAt, NOW.toISOString());
    assert.deepStrictEqual(response.body.profile, { level: 120, iconId: 7 });
    assert.strictEqual(response.body.verified, true);
    assert.strictEqual(response.body.verifiedWith, "riot");
    assert.ok(!JSON.stringify(response.body).includes("puuid-ana"));
    const stored = await GameAccount.findById(account.id);
    assert.strictEqual(stored?.handleKey, "nuevonombre#las");
    assert.strictEqual(stored?.matches.length, 1);
    assert.strictEqual(stored?.verification?.externalId, "puuid-ana");
  });

  test("la fuente recibe el juego, el identificador y el externalId de la cuenta", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { externalId: "puuid-ana", handle: "Jugador#LAS" });
    await sync(ana, account.id);
    assert.deepStrictEqual(riot.calls, [{ gameId: "lol", handle: "Jugador#LAS", externalId: "puuid-ana" }]);
  });

  test("mismo rango: el historial no crece (RF-9) pero la fecha de sincronización avanza", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    riot.behavior = async () => ({ ok: true, data: { handle: "Jugador#LAS", rank: rank() } });
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.rankHistory.length, 1);
    assert.strictEqual(response.body.lastSyncedAt, NOW.toISOString());
  });

  test("una fuente que solo trae perfil (Steam) no toca rango ni partidas", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { gameId: "cs2" });
    steam.behavior = async () => ({
      ok: true,
      data: { handle: "76561190000000001", profile: { displayName: "Ana", hoursTotal: 321 } },
    });
    const before = await GameAccount.findById(account.id);
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body.profile, { displayName: "Ana", hoursTotal: 321 });
    assert.deepStrictEqual(response.body.rankHistory, JSON.parse(JSON.stringify(before?.rankHistory)));
    // Spec 015, RF-6, P15-7: el rango de Steam lo atribuye Leetify; el dato sigue simulado hasta la T4.
    assert.deepStrictEqual(response.body.origins, {
      identity: "steam",
      rank: "leetify",
      matches: "leetify",
      profile: "steam",
    });
  });
});

describe("espera mínima (RF-16, RF-18)", () => {
  test("a los 4 min 10 s: 429 «espera 1 minuto…», sin consultar la fuente ni cambiar la cuenta", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { lastSyncedAt: new Date(FIXED_NOW - (4 * MINUTE + 10 * SECOND)) });
    const before = await rawAccountsInDb();
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 429);
    assert.deepStrictEqual(response.body, { error: "espera 1 minuto antes de volver a resincronizar" });
    assert.strictEqual(riot.calls.length, 0);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("recién sincronizada: «espera 5 minutos…»", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { lastSyncedAt: NOW });
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 429);
    assert.deepStrictEqual(response.body, { error: "espera 5 minutos antes de volver a resincronizar" });
  });

  test("a los 5 minutos exactos ya se permite", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { lastSyncedAt: new Date(FIXED_NOW - 5 * MINUTE) });
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(riot.calls.length, 1);
  });

  test("tras una sincronización exitosa la siguiente inmediata recibe 429", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    assert.strictEqual((await sync(ana, account.id)).status, 200);
    const second = await sync(ana, account.id);
    assert.strictEqual(second.status, 429);
    assert.strictEqual(riot.calls.length, 1);
  });

  test("una cuenta sin verificar se resincroniza dos veces seguidas sin espera y sin fuente (RF-18)", async () => {
    const ana = await signUp(app, ANA);
    const account = await unverifiedAccount(ana.id);
    assert.strictEqual((await sync(ana, account.id)).status, 200);
    assert.strictEqual((await sync(ana, account.id)).status, 200);
    assert.strictEqual(riot.calls.length, 0);
    assert.strictEqual(steam.calls.length, 0);
  });
});

describe("fuente no disponible (RF-19, RF-20, RNF-5)", () => {
  const UNAVAILABLE = { error: "Riot Games no está disponible por ahora, intenta más tarde" };

  test("503 si la fuente responde `unavailable`: la cuenta queda intacta y el intento no cuenta para la espera", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    riot.behavior = async () => ({ ok: false, reason: "unavailable" });
    const before = await rawAccountsInDb();

    const response = await sync(ana, account.id);

    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(response.body, UNAVAILABLE);
    assert.deepStrictEqual(await rawAccountsInDb(), before);

    riot.behavior = async () => ({ ok: true, data: { handle: "Jugador#LAS", rank: rank({ points: 99 }) } });
    const retry = await sync(ana, account.id);
    assert.strictEqual(retry.status, 200); // no esperó: el intento fallido no actualizó lastSyncedAt
    assert.strictEqual(retry.body.currentRank.points, 99);
  });

  test("503 si la fuente lanza una excepción", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    riot.behavior = async () => {
      throw new Error("ECONNRESET");
    };
    const before = await rawAccountsInDb();
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(response.body, UNAVAILABLE);
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("503 si la fuente no responde dentro del plazo, aunque ignore la señal de cancelación", async () => {
    const ana = await signUp(appWithShortTimeout, ANA);
    const account = await verifiedAccount(ana.id);
    riot.behavior = () => new Promise<RealResult>(() => undefined); // nunca resuelve
    const startedAt = Date.now();
    const response = await withSession(ana.agent.post(`/api/accounts/${account.id}/sync`), ana.csrf);
    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(response.body, UNAVAILABLE);
    assert.ok(Date.now() - startedAt < 2000, "no debe esperar los 8 s de producción");
  });

  test("la fuente recibe una señal que se cancela al vencer el plazo", async () => {
    const ana = await signUp(appWithShortTimeout, ANA);
    const account = await verifiedAccount(ana.id);
    let aborted = false;
    riot.behavior = (_account, signal) =>
      new Promise<RealResult>(() => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
      });
    await withSession(ana.agent.post(`/api/accounts/${account.id}/sync`), ana.csrf);
    assert.strictEqual(aborted, true);
  });

  test("503 si no hay fuente registrada para el juego, con el nombre de la fuente que verificó (RF-20)", async () => {
    const ana = await signUp(appWithoutSources, ANA);
    const account = await verifiedAccount(ana.id, { gameId: "cs2" });
    const before = await rawAccountsInDb();
    const response = await withSession(ana.agent.post(`/api/accounts/${account.id}/sync`), ana.csrf);
    assert.strictEqual(response.status, 503);
    assert.deepStrictEqual(response.body, { error: "Steam no está disponible por ahora, intenta más tarde" });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("503 si la fuente registrada no es la que verificó la cuenta", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { source: "steam" }); // LoL verificada con Steam: incoherente
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 503);
    assert.strictEqual(riot.calls.length, 0);
  });

  test("sin fuentes la app funciona: las cuentas sin verificar se resincronizan igual (RF-20)", async () => {
    const ana = await signUp(appWithoutSources, ANA);
    const account = await unverifiedAccount(ana.id);
    const response = await withSession(ana.agent.post(`/api/accounts/${account.id}/sync`), ana.csrf);
    assert.strictEqual(response.status, 200);
  });
});

describe("la cuenta ya no existe en la fuente (RF-21)", () => {
  test("404 con el nombre de la fuente; la cuenta sigue verificada y con sus últimos datos", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    riot.behavior = async () => ({ ok: false, reason: "gone" });
    const before = await rawAccountsInDb();
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 404);
    assert.deepStrictEqual(response.body, { error: "la cuenta ya no existe en Riot Games" });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
    const stored = await GameAccount.findById(account.id);
    assert.strictEqual(stored?.verification?.source, "riot");
  });
});

describe("orden de las revisiones y propiedad (spec 004, RF-29)", () => {
  test("cuenta de otro usuario: 403 y la fuente no se consulta, aunque esté en espera", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const account = await verifiedAccount(beto.id, { lastSyncedAt: NOW });
    const response = await sync(ana, account.id);
    assert.strictEqual(response.status, 403);
    assert.strictEqual(riot.calls.length, 0);
  });

  test("cuenta inexistente: 404 «cuenta no encontrada»", async () => {
    const ana = await signUp(app, ANA);
    const response = await sync(ana, new mongoose.Types.ObjectId().toString());
    assert.strictEqual(response.status, 404);
    assert.deepStrictEqual(response.body, { error: "cuenta no encontrada" });
  });

  test("identificador mal formado: 400", async () => {
    const ana = await signUp(app, ANA);
    const response = await sync(ana, "no-es-un-id");
    assert.strictEqual(response.status, 400);
  });
});

describe("solo se consulta al resincronizar (RF-17)", () => {
  test("listar, obtener y el resumen por juego no llaman a la fuente", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    const get = (path: string) => withSession(ana.agent.get(path), ana.csrf);

    assert.strictEqual((await get("/api/accounts")).status, 200);
    assert.strictEqual((await get(`/api/accounts/${account.id}`)).status, 200);
    assert.strictEqual((await get("/api/users/me/games/lol")).status, 200);
    assert.strictEqual((await get("/api/matches?game=lol")).status, 200);
    assert.strictEqual(riot.calls.length, 0);
    assert.strictEqual(steam.calls.length, 0);
  });
});

describe("editar una cuenta verificada: PUT /api/accounts/:id (spec 012, T11, RF-14)", () => {
  const VERIFIED_NOT_EDITABLE = "una cuenta verificada no se puede editar: desvincúlala y vuelve a verificarla";

  test("región nueva: 400 «una cuenta verificada no se puede editar…» y la cuenta queda igual", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    const before = await rawAccountsInDb();

    const response = await withSession(ana.agent.put(`/api/accounts/${account.id}`), ana.csrf).send({ region: "EUW" });

    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(response.body, { error: VERIFIED_NOT_EDITABLE });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("identificador nuevo: 400 y la cuenta conserva identificador y verificación", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id, { externalId: "puuid-ana" });
    const before = await rawAccountsInDb();

    const response = await withSession(ana.agent.put(`/api/accounts/${account.id}`), ana.csrf).send({
      handle: "Otro#LAS",
      region: "LAS",
    });

    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(response.body, { error: VERIFIED_NOT_EDITABLE });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
    const stored = await GameAccount.findById(account.id);
    assert.strictEqual(stored?.handle, "Jugador#LAS");
    assert.strictEqual(stored?.verification?.externalId, "puuid-ana");
  });

  test("cuerpo vacío: también 400, porque la regla va antes de mirar el cuerpo", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);
    const before = await rawAccountsInDb();

    const response = await withSession(ana.agent.put(`/api/accounts/${account.id}`), ana.csrf);

    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(response.body, { error: VERIFIED_NOT_EDITABLE });
    assert.deepStrictEqual(await rawAccountsInDb(), before);
  });

  test("no consulta la fuente", async () => {
    const ana = await signUp(app, ANA);
    const account = await verifiedAccount(ana.id);

    await withSession(ana.agent.put(`/api/accounts/${account.id}`), ana.csrf).send({ region: "EUW" });

    assert.strictEqual(riot.calls.length, 0);
  });

  test("una cuenta sin verificar sí se edita (la regla es solo de las verificadas)", async () => {
    const ana = await signUp(app, ANA);
    const account = await unverifiedAccount(ana.id);

    const response = await withSession(ana.agent.put(`/api/accounts/${account.id}`), ana.csrf).send({ region: "EUW" });

    assert.strictEqual(response.status, 200);
    assert.strictEqual((await GameAccount.findById(account.id))?.region, "EUW");
  });
});
