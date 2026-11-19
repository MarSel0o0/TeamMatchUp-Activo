// Resincronizar una cuenta de CS2 verificada con Steam y Leetify (spec 015, T5):
// `POST /api/accounts/:id/sync`. RF-1, RF-9, RF-11, RF-16, RF-17, RF-18, RF-19, RF-22, RNF-4,
// RNF-7; plan, §4.2, P15-6. Steam y Leetify se simulan con clientes falsos (RNF-1).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { LEETIFY_NOTICES } from "../../src/domain/leetify.ts";
import type { LeetifyReading } from "../../src/domain/leetify.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { createAccountLock } from "../../src/services/accountLock.ts";
import { syncSteamAccount } from "../../src/services/cs2Sync.ts";
import type { LeetifyClient } from "../../src/services/leetifyClient.ts";
import type { RealResult, RealSource } from "../../src/services/realSources.ts";
import type { SteamClient } from "../../src/services/steamClient.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, authApp, closeTestServers, linkOk, signUp, sync, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import {
  PUBLIC_PROFILE,
  PUBLIC_URL,
  STEAM_ID,
  fakeLeetifyClient,
  fakeSteamClient,
  steamApp,
  steamLoginQuery,
  tokenOf,
} from "./steamHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date(FIXED_NOW);
const MINUTE = 60 * 1000;

const STEAM_DOWN = "Steam no está disponible por ahora, intenta más tarde";
const GONE = "la cuenta ya no existe en Steam";
const WAIT_5 = "espera 5 minutos antes de volver a resincronizar";

let nowMs = FIXED_NOW;

const steam = fakeSteamClient();
const leetify = fakeLeetifyClient();
const app = await steamApp(steam.client, leetify.client);

interface SyncBody {
  currentRank: { tier: string; points: number } | null;
  rankHistory: { points: number }[];
  premierStatus?: string;
  profile?: Record<string, unknown>;
  lastSyncedAt: string;
  syncNotice?: string;
  origins: Record<string, string>;
}

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await SteamAttempt.deleteMany({});
  steam.state.profileCalls.length = 0;
  steam.state.profile = fakeSteamClient().state.profile;
  leetify.state.calls.length = 0;
  leetify.state.reading = { kind: "rated", rating: 21000 };
  nowMs = FIXED_NOW;
  mock.method(clock, "now", () => new Date(nowMs));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

/** Cuenta de CS2 verificada en `NOW` con perfil y la lectura de Leetify dada (`"legacy"`: anterior a la 015). */
async function verifiedCs2(session: SignedUp, reading: LeetifyReading | "legacy" = { kind: "rated", rating: 19309 }) {
  const premier = reading === "legacy" ? undefined : reading;
  const result = await verifyAccount({
    userId: session.id,
    gameId: "cs2",
    handle: STEAM_ID,
    verification: { source: "steam", externalId: STEAM_ID },
    real: { handle: STEAM_ID, profile: { ...PUBLIC_PROFILE } },
    ...(premier === undefined ? {} : { premier }),
    now: NOW,
  });
  assert.ok(result.ok);
  return result.account.id;
}

/** Verificación completa con Steam (spec 013): abre el intento y vuelve de Steam con él. */
async function verifyWithSteam(session: SignedUp) {
  const start = await withSession(session.agent.post("/api/steam/start"), session.csrf);
  assert.equal(start.status, 200);
  const token = tokenOf((start.body as { url: string }).url);
  return withSession(session.agent.post("/api/steam/complete"), session.csrf).send({
    query: steamLoginQuery(token),
  });
}

function points(body: SyncBody): number[] {
  return body.rankHistory.map((point) => point.points);
}

describe("lectura de Leetify al resincronizar (RF-1, RF-9, RF-11)", () => {
  test("rating nuevo: rango vigente nuevo e historial vacío (D27); perfil de Steam actualizado y sin aviso", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    steam.state.profile = { ok: true, data: { handle: STEAM_ID, profile: { displayName: "Vicho 2" } } };
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    const body = response.body as SyncBody;
    assert.equal(body.currentRank?.points, 21000);
    assert.equal(body.currentRank?.tier, "Pink"); // 21000 → escalón 4 (RF-4)
    assert.deepEqual(points(body), []); // D27: sin historial real
    assert.deepEqual(body.profile, { displayName: "Vicho 2" });
    assert.equal(body.lastSyncedAt, new Date(nowMs).toISOString());
    assert.equal("syncNotice" in body, false);
    assert.equal(body.origins["rank"], "leetify");
    assert.deepEqual(leetify.state.calls, [STEAM_ID]);
    assert.deepEqual(steam.state.profileCalls, [STEAM_ID]);
  });

  test("RF-11, D27: el mismo rating deja el historial vacío", async () => {
    leetify.state.reading = { kind: "rated", rating: 19309 };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const body = (await sync(ana, id)).body as SyncBody;
    assert.equal(body.currentRank?.points, 19309);
    assert.deepEqual(points(body), []);
  });

  test("RF-11, D27: un rating más bajo (datos atrasados) es el rango nuevo y no agrega punto", async () => {
    leetify.state.reading = { kind: "rated", rating: 18000 };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const body = (await sync(ana, id)).body as SyncBody;
    assert.equal(body.currentRank?.points, 18000);
    assert.deepEqual(points(body), []);
  });

  test("RF-9, D27: con rating → sin rango Premier; el rating se borra y no hay historial", async () => {
    leetify.state.reading = { kind: "unrated" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const body = (await sync(ana, id)).body as SyncBody;
    assert.equal(body.currentRank, null);
    assert.equal(body.premierStatus, "unrated");
    assert.deepEqual(points(body), []);
    const stored = await GameAccount.findById(id);
    assert.equal(stored?.premier, "unrated");
    assert.equal(stored?.currentRank, null); // RF-9: el rating se borra
    assert.deepEqual(stored?.rankHistory, []);
  });

  test("rango no disponible → con rating: rango vigente e historial vacío (D27)", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana, { kind: "failed" });
    nowMs = FIXED_NOW + 5 * MINUTE;
    const body = (await sync(ana, id)).body as SyncBody;
    assert.equal(body.currentRank?.points, 21000);
    assert.equal("premierStatus" in body, false);
    assert.deepEqual(points(body), []);
    assert.equal((await GameAccount.findById(id))?.premier, "rated");
  });

  test("RF-11, RF-20, D27: una cuenta sin estado de Leetify (anterior a la 015) no mezcla puntos simulados", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana, "legacy");
    assert.ok((await GameAccount.findById(id))?.currentRank, "rango simulado previo");
    nowMs = FIXED_NOW + 5 * MINUTE;
    const body = (await sync(ana, id)).body as SyncBody;
    assert.deepEqual(points(body), []);
    assert.equal((await GameAccount.findById(id))?.premier, "rated");
  });
});

describe("Leetify falla y Steam respondió (RF-16, RF-17, RF-18)", () => {
  test("200 con el aviso, perfil de Steam al día, rango sin cambios e historial vacío (D27)", async () => {
    leetify.state.reading = { kind: "failed" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    steam.state.profile = { ok: true, data: { handle: STEAM_ID, profile: { displayName: "Vicho 2" } } };
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    const body = response.body as SyncBody;
    assert.equal(body.syncNotice, LEETIFY_NOTICES.syncFailed);
    assert.equal(body.currentRank?.points, 19309);
    assert.deepEqual(points(body), []);
    assert.deepEqual(body.profile, { displayName: "Vicho 2" });
    assert.equal((await GameAccount.findById(id))?.premier, "rated"); // RF-18: sigue con rating
  });

  test("RF-17: la espera mínima corre aunque Leetify falle", async () => {
    leetify.state.reading = { kind: "failed" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    assert.equal((await sync(ana, id)).status, 200);
    const again = await sync(ana, id);
    assert.equal(again.status, 429);
    assert.deepEqual(again.body, { error: WAIT_5 });
    assert.equal(leetify.state.calls.length, 1);
  });

  test("con el rango no disponible y Leetify caído, sigue no disponible", async () => {
    leetify.state.reading = { kind: "failed" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana, { kind: "failed" });
    nowMs = FIXED_NOW + 5 * MINUTE;
    const body = (await sync(ana, id)).body as SyncBody;
    assert.equal(body.premierStatus, "unavailable");
    assert.equal(body.syncNotice, LEETIFY_NOTICES.syncFailed);
  });
});

describe("Steam primero (RF-17)", () => {
  test("Steam no disponible → 503, sin consultar a Leetify y sin cambios", async () => {
    steam.state.profile = { ok: false, reason: "unavailable" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: STEAM_DOWN });
    assert.equal(leetify.state.calls.length, 0);
    const stored = await GameAccount.findById(id);
    assert.equal(stored?.lastSyncedAt.getTime(), FIXED_NOW);
    assert.equal(stored?.currentRank?.points, 19309);
  });

  test("Steam no encuentra la cuenta → 404, sin consultar a Leetify", async () => {
    steam.state.profile = { ok: false, reason: "gone" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: GONE });
    assert.equal(leetify.state.calls.length, 0);
  });

  test("la espera se comprueba antes de consultar a nadie", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + MINUTE;
    assert.equal((await sync(ana, id)).status, 429);
    assert.equal(steam.state.profileCalls.length, 0);
    assert.equal(leetify.state.calls.length, 0);
  });

  test("solo el dueño: otro usuario recibe 403 y no se consulta a Steam ni a Leetify", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    assert.equal((await sync(beto, id)).status, 403);
    assert.equal(steam.state.profileCalls.length, 0);
    assert.equal(leetify.state.calls.length, 0);
  });
});

describe("plazos de 8 s por consulta (RNF-4), con tiempos cortos inyectados", () => {
  test("Leetify no responde a tiempo → 200 con el aviso", async () => {
    const hanging: LeetifyClient = { readPremier: () => new Promise<never>(() => undefined) };
    const slowApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: steam.client },
      leetifyClient: hanging,
      sourceTimeoutMs: 30,
    });
    const ana = await signUp(slowApp, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    assert.equal((response.body as SyncBody).syncNotice, LEETIFY_NOTICES.syncFailed);
  });

  test("Steam no responde a tiempo → 503 y Leetify no se consulta", async () => {
    const hanging: SteamClient = {
      verifyAssertion: steam.client.verifyAssertion,
      readProfile: () => new Promise<never>(() => undefined),
    };
    const slowApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: hanging },
      leetifyClient: leetify.client,
      sourceTimeoutMs: 30,
    });
    const ana = await signUp(slowApp, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    assert.equal((await sync(ana, id)).status, 503);
    assert.equal(leetify.state.calls.length, 0);
  });
});

describe("resincronizaciones simultáneas (RF-19, RNF-7)", () => {
  test("dos a la vez: una 200 y la otra 429 de 5 minutos; Leetify se consulta una vez", async () => {
    let started!: () => void;
    let release!: () => void;
    const profileStarted = new Promise<void>((resolve) => (started = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));
    const blocking: SteamClient = {
      verifyAssertion: steam.client.verifyAssertion,
      readProfile: async (steamId): Promise<RealResult> => {
        started();
        await gate;
        return { ok: true, data: { handle: steamId, profile: { ...PUBLIC_PROFILE } } };
      },
    };
    const lockedApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: blocking },
      leetifyClient: leetify.client,
    });
    const ana = await signUp(lockedApp, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;

    const first = sync(ana, id).then((response) => response);
    await profileStarted;
    const second = await sync(ana, id);
    assert.equal(second.status, 429);
    assert.deepEqual(second.body, { error: WAIT_5 });
    release();
    assert.equal((await first).status, 200);
    assert.equal(leetify.state.calls.length, 1);

    // El bloqueo se libera al terminar: pasada la espera se puede volver a resincronizar.
    nowMs = FIXED_NOW + 10 * MINUTE;
    assert.equal((await sync(ana, id)).status, 200);
  });

  test("P15-13: el mismo id en mayúsculas y en minúsculas comparte el bloqueo", async () => {
    let started!: () => void;
    let release!: () => void;
    const profileStarted = new Promise<void>((resolve) => (started = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));
    const blocking: SteamClient = {
      verifyAssertion: steam.client.verifyAssertion,
      readProfile: async (steamId): Promise<RealResult> => {
        started();
        await gate;
        return { ok: true, data: { handle: steamId, profile: { ...PUBLIC_PROFILE } } };
      },
    };
    const lockedApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: blocking },
      leetifyClient: leetify.client,
    });
    const ana = await signUp(lockedApp, ANA);
    const id = await verifiedCs2(ana);
    assert.match(id, /[a-f]/, "el id de la prueba lleva letras para distinguir mayúsculas");
    nowMs = FIXED_NOW + 5 * MINUTE;

    const first = sync(ana, id.toLowerCase()).then((response) => response);
    await profileStarted;
    const second = await sync(ana, id.toUpperCase());
    assert.equal(second.status, 429);
    assert.deepEqual(second.body, { error: WAIT_5 });
    release();
    assert.equal((await first).status, 200);
    assert.equal(leetify.state.calls.length, 1);
  });

  test("P15-13: un ajeno recibe 403 aunque haya otra resincronización en curso de esa cuenta", async () => {
    let started!: () => void;
    let release!: () => void;
    const profileStarted = new Promise<void>((resolve) => (started = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));
    const blocking: SteamClient = {
      verifyAssertion: steam.client.verifyAssertion,
      readProfile: async (steamId): Promise<RealResult> => {
        started();
        await gate;
        return { ok: true, data: { handle: steamId, profile: { ...PUBLIC_PROFILE } } };
      },
    };
    const lockedApp = await authApp({
      steamIntegration: { publicUrl: PUBLIC_URL, client: blocking },
      leetifyClient: leetify.client,
    });
    const ana = await signUp(lockedApp, ANA);
    const beto = await signUp(lockedApp, BETO);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;

    const first = sync(ana, id).then((response) => response);
    await profileStarted;
    const foreign = await sync(beto, id);
    assert.equal(foreign.status, 403);
    release();
    assert.equal((await first).status, 200);
    assert.equal(leetify.state.calls.length, 1);
  });

  test("P15-13, a nivel de servicio: con el bloqueo tomado, un ajeno recibe 403 y una cuenta ajena inexistente 404, no 429", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const id = await verifiedCs2(ana);
    const lock = createAccountLock();
    const never: RealSource = {
      id: "steam",
      read: () => {
        throw new Error("no debe consultarse a Steam");
      },
    };
    const input = { steamSource: never, leetify: leetify.client, lock, at: new Date(FIXED_NOW + 5 * MINUTE) };
    const missingId = "0".repeat(24);
    assert.ok(lock.tryAcquire(id)); // otra resincronización en curso de esa cuenta
    assert.ok(lock.tryAcquire(missingId));

    // El dueño y la existencia se comprueban antes de mirar el bloqueo: 403 y 404 ganan al 429.
    const foreign = await syncSteamAccount({ ...input, accountId: id, userId: beto.id });
    assert.equal(foreign.ok ? null : foreign.status, 403);
    const missing = await syncSteamAccount({ ...input, accountId: missingId, userId: ana.id });
    assert.equal(missing.ok ? null : missing.status, 404);
    // El dueño sí choca con el bloqueo, también si escribe el id en mayúsculas.
    const owner = await syncSteamAccount({ ...input, accountId: id.toUpperCase(), userId: ana.id });
    assert.equal(owner.ok ? null : owner.status, 429);
    assert.equal(leetify.state.calls.length, 0);
  });

  test("el bloqueo se libera también cuando Steam falla", async () => {
    steam.state.profile = { ok: false, reason: "unavailable" };
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    assert.equal((await sync(ana, id)).status, 503);
    steam.state.profile = fakeSteamClient().state.profile;
    assert.equal((await sync(ana, id)).status, 200);
  });
});

describe("D28: dos lecturas de Leetify toleradas (RNF-7)", () => {
  test("verificada sin perfil de Steam: la resincronización inmediata lee Leetify y la siguiente da 429", async () => {
    steam.state.profile = { ok: false, reason: "unavailable" };
    const ana = await signUp(app, ANA);
    const verified = await verifyWithSteam(ana);
    assert.equal(verified.status, 200);
    const created = verified.body as { account: { id: string } & SyncBody };
    assert.equal("profile" in created.account, false); // verificada sin datos de perfil (D6)
    assert.deepEqual(leetify.state.calls, [STEAM_ID]); // primera lectura: la de la verificación

    steam.state.profile = fakeSteamClient().state.profile; // Steam vuelve; la hora no avanza
    const id = created.account.id;
    const immediate = await sync(ana, id);
    assert.equal(immediate.status, 200);
    assert.deepEqual((immediate.body as SyncBody).profile, { ...PUBLIC_PROFILE });
    assert.deepEqual(leetify.state.calls, [STEAM_ID, STEAM_ID]); // segunda y última lectura

    const next = await sync(ana, id);
    assert.equal(next.status, 429);
    assert.deepEqual(next.body, { error: WAIT_5 });
    assert.equal(leetify.state.calls.length, 2); // D28: dos lecturas en total, no tres
  });
});

describe("cuentas sin verificar (RF-22)", () => {
  test("CS2 sin verificar: lectura simulada, sin Steam ni Leetify", async () => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    const body = response.body as SyncBody & { verified: boolean };
    assert.equal(body.verified, false);
    assert.equal(body.origins["rank"], "simulated");
    assert.ok(body.currentRank);
    assert.equal(steam.state.profileCalls.length, 0);
    assert.equal(leetify.state.calls.length, 0);
    assert.equal((await GameAccount.findById(id))?.premier, undefined);
  });
});
