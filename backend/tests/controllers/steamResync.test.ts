// Resincronizar una cuenta de CS2 verificada con Steam (spec 013, T7): `POST /api/accounts/:id/sync`.
// RF-12, RF-14, RF-23 (y RF-18 de la 012 para la cuenta sin verificar); plan, 4.4 y P13-16.
// Steam se simula con un cliente falso (RNF-3).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, closeTestServers, linkOk, signUp, sync, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import { PUBLIC_PROFILE, STEAM_ID, fakeSteamClient, steamApp } from "./steamHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date(FIXED_NOW);
const MINUTE = 60 * 1000;

const STEAM_DOWN = "Steam no está disponible por ahora, intenta más tarde";
const GONE = "la cuenta ya no existe en Steam";

let nowMs = FIXED_NOW;

const fake = fakeSteamClient();
const app = await steamApp(fake.client);

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  fake.state.assertionCalls.length = 0;
  fake.state.profileCalls.length = 0;
  fake.state.profile = fakeSteamClient().state.profile;
  nowMs = FIXED_NOW;
  mock.method(clock, "now", () => new Date(nowMs));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

/** Cuenta de CS2 verificada con Steam, con o sin datos de perfil, leída en `NOW`. */
async function verifiedCs2(session: SignedUp, withProfile = true): Promise<string> {
  const result = await verifyAccount({
    userId: session.id,
    gameId: "cs2",
    handle: STEAM_ID,
    verification: { source: "steam", externalId: STEAM_ID },
    real: withProfile ? { handle: STEAM_ID, profile: { ...PUBLIC_PROFILE } } : { handle: STEAM_ID },
    now: NOW,
  });
  assert.ok(result.ok);
  return result.account.id;
}

function readProfile(profile: Record<string, unknown>): void {
  fake.state.profile = { ok: true, data: { handle: STEAM_ID, profile } };
}

describe("resincronizar con Steam (RF-14)", () => {
  test("pasados los 5 minutos, actualiza nombre, avatar, país y horas desde Steam", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 5 * MINUTE;
    readProfile({
      displayName: "Vicho 2",
      avatarUrl: "https://avatars.fastly.steamstatic.com/nuevo_full.jpg",
      country: "AR",
      hoursTotal: 400,
      hoursRecent: 3,
    });
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    const account = response.body as Record<string, unknown>;
    assert.deepEqual(account["profile"], {
      displayName: "Vicho 2",
      avatarUrl: "https://avatars.fastly.steamstatic.com/nuevo_full.jpg",
      country: "AR",
      hoursTotal: 400,
      hoursRecent: 3,
    });
    assert.equal(account["lastSyncedAt"], new Date(nowMs).toISOString());
    assert.equal(account["verified"], true);
    assert.equal(account["handle"], STEAM_ID);
    assert.deepEqual(fake.state.profileCalls, [STEAM_ID]);
  });

  test("un dato que Steam ya no entrega (país oculto) desaparece del perfil guardado", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 6 * MINUTE;
    readProfile({ displayName: "Vicho", avatarUrl: PUBLIC_PROFILE.avatarUrl });
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    assert.deepEqual((response.body as { profile: unknown }).profile, {
      displayName: "Vicho",
      avatarUrl: PUBLIC_PROFILE.avatarUrl,
    });
  });

  test("RF-13: el rango, el historial y las partidas de CS2 siguen simulados y no se tocan", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    const before = await GameAccount.findById(id);
    nowMs = FIXED_NOW + 5 * MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 200);
    const after = await GameAccount.findById(id);
    assert.deepEqual(JSON.parse(JSON.stringify(after?.currentRank)), JSON.parse(JSON.stringify(before?.currentRank)));
    assert.equal(after?.rankHistory.length, before?.rankHistory.length);
    assert.equal(after?.matches.length, before?.matches.length);
    // Spec 015, RF-6, P15-7: el rango de Steam lo atribuye Leetify. Esta app no tiene cliente de
    // Leetify: la lectura falla y el rango no cambia (RF-16, RF-18; casos en `cs2Resync.test.ts`).
    assert.deepEqual((response.body as { origins: unknown }).origins, {
      identity: "steam",
      rank: "leetify",
      matches: "leetify",
      profile: "steam",
    });
  });
});

describe("la espera mínima de 5 minutos (spec 012, RF-16)", () => {
  test("a los 4 min 10 s → 429 «espera 1 minuto» y no consulta a Steam", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 4 * MINUTE + 10_000;
    const response = await sync(ana, id);
    assert.equal(response.status, 429);
    assert.deepEqual(response.body, { error: "espera 1 minuto antes de volver a resincronizar" });
    assert.equal(fake.state.profileCalls.length, 0);
  });

  test("al minuto → 429 «espera 4 minutos»", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 429);
    assert.deepEqual(response.body, { error: "espera 4 minutos antes de volver a resincronizar" });
  });
});

describe("verificada sin datos de perfil: sin espera (RF-12, D6)", () => {
  test("se puede resincronizar de inmediato y deja el perfil guardado", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana, false);
    assert.equal((await GameAccount.findById(id))?.profile, undefined);
    const response = await sync(ana, id); // el mismo instante de la verificación
    assert.equal(response.status, 200);
    assert.deepEqual((response.body as { profile: unknown }).profile, { ...PUBLIC_PROFILE });
    assert.deepEqual(fake.state.profileCalls, [STEAM_ID]);
  });

  test("una vez con perfil, la espera de 5 minutos vuelve a contar", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana, false);
    assert.equal((await sync(ana, id)).status, 200);
    const second = await sync(ana, id);
    assert.equal(second.status, 429);
    assert.deepEqual(second.body, { error: "espera 5 minutos antes de volver a resincronizar" });
  });

  test("si Steam sigue sin responder, los intentos no cuentan para la espera (503 cada vez)", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana, false);
    fake.state.profile = { ok: false, reason: "unavailable" };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await sync(ana, id);
      assert.equal(response.status, 503);
      assert.deepEqual(response.body, { error: STEAM_DOWN });
    }
    assert.equal(fake.state.profileCalls.length, 3);
    assert.equal((await GameAccount.findById(id))?.profile, undefined);
  });
});

describe("fallos de Steam al resincronizar (RF-23, spec 012 RF-19)", () => {
  test("RF-23: Steam no devuelve ningún perfil → 404 y la cuenta sigue verificada con sus últimos datos", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    fake.state.profile = { ok: false, reason: "gone" };
    nowMs = FIXED_NOW + 10 * MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: GONE });
    const stored = await GameAccount.findById(id);
    assert.equal(stored?.verification?.externalId, STEAM_ID);
    assert.equal(stored?.profile?.displayName, "Vicho");
    assert.equal(stored?.profile?.hoursTotal, 312);
    assert.equal(stored?.lastSyncedAt.getTime(), FIXED_NOW);
  });

  test("Steam no disponible → 503 y la cuenta y su fecha de lectura no cambian", async () => {
    const ana = await signUp(app, ANA);
    const id = await verifiedCs2(ana);
    fake.state.profile = { ok: false, reason: "unavailable" };
    nowMs = FIXED_NOW + 10 * MINUTE;
    const response = await sync(ana, id);
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: STEAM_DOWN });
    const stored = await GameAccount.findById(id);
    assert.equal(stored?.profile?.displayName, "Vicho");
    assert.equal(stored?.lastSyncedAt.getTime(), FIXED_NOW);
  });
});

describe("otros casos de la resincronización", () => {
  test("cuenta de CS2 sin verificar (vínculo manual): lectura simulada, sin espera y sin llamar a Steam (spec 012, RF-18)", async () => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const first = await sync(ana, id);
    const second = await sync(ana, id);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(fake.state.profileCalls.length, 0);
    assert.equal((first.body as { verified: boolean }).verified, false);
  });

  test("solo el dueño resincroniza: otro usuario recibe 403 y Steam no se consulta", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const id = await verifiedCs2(ana);
    nowMs = FIXED_NOW + 10 * MINUTE;
    const response = await sync(beto, id);
    assert.equal(response.status, 403);
    assert.equal(fake.state.profileCalls.length, 0);
  });

  test("las lecturas de cuentas no consultan a Steam (spec 012, RF-17)", async () => {
    const ana = await signUp(app, ANA);
    await verifiedCs2(ana);
    nowMs = FIXED_NOW + 10 * MINUTE;
    const list = await withSession(ana.agent.get("/api/accounts?user=me"), ana.csrf);
    assert.equal(list.status, 200);
    assert.equal(fake.state.profileCalls.length, 0);
  });
});
