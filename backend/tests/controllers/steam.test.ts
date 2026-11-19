// Rutas de Steam: `/api/steam` (spec 013). T5: estado e inicio del intento. RF-1, RF-3, RF-22,
// RNF-2, RNF-6; plan, 4.1. Steam se simula con un cliente falso (RNF-3).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import { ATTEMPT_TTL_MS } from "../../src/domain/steamAttempt.ts";
import { STEAM_OPENID_URL } from "../../src/domain/steamOpenId.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { findAttempt } from "../../src/services/steamAttempts.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, authApp, closeTestServers, linkOk, signUp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import { PUBLIC_URL, STEAM_ID, fakeSteamClient, steamApp } from "./steamHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const NOW = new Date(FIXED_NOW);
const NOT_CONFIGURED = "Steam no está configurado en este servidor";
const ALREADY_VERIFIED = "ya tienes una cuenta de CS2 verificada; desvincúlala antes de verificar otra";

// Instante de las peticiones: las pruebas lo adelantan para vencer un intento.
let nowMs = FIXED_NOW;

const fake = fakeSteamClient();
const app = await steamApp(fake.client);
const appWithoutSteam = await authApp();

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await SteamAttempt.deleteMany({});
  fake.state.assertionCalls.length = 0;
  fake.state.profileCalls.length = 0;
  fake.state.assertion = "valid";
  fake.state.profile = fakeSteamClient().state.profile;
  nowMs = FIXED_NOW;
  mock.method(clock, "now", () => new Date(nowMs));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await SteamAttempt.deleteMany({});
  await mongoose.disconnect();
});

function status(session: SignedUp) {
  return withSession(session.agent.get("/api/steam"), session.csrf);
}

function start(session: SignedUp) {
  return withSession(session.agent.post("/api/steam/start"), session.csrf);
}

function tokenOf(url: string): string {
  const returnTo = new URL(url).searchParams.get("openid.return_to");
  assert.ok(returnTo, "la URL de Steam no lleva openid.return_to");
  const token = new URL(returnTo).searchParams.get("attempt");
  assert.ok(token, "el return_to no lleva el token del intento");
  return token;
}

describe("sesión y comprobante en las rutas de Steam (RNF-6)", () => {
  test("sin sesión: GET /api/steam y POST /api/steam/start → 401", async () => {
    assert.equal((await supertest(app).get("/api/steam")).status, 401);
    assert.equal((await supertest(app).post("/api/steam/start")).status, 401);
  });

  test("con la cookie pero sin el comprobante anti-CSRF → 401, y no se abre ningún intento", async () => {
    const ana = await signUp(app, ANA);
    assert.equal((await ana.agent.get("/api/steam")).status, 401);
    assert.equal((await ana.agent.post("/api/steam/start")).status, 401);
    assert.equal(await SteamAttempt.countDocuments({}), 0);
  });

  test("con un comprobante equivocado → 401", async () => {
    const ana = await signUp(app, ANA);
    const response = await ana.agent.post("/api/steam/start").set("X-CSRF-Token", "otro");
    assert.equal(response.status, 401);
    assert.equal(await SteamAttempt.countDocuments({}), 0);
  });

  test("la credencial de un usuario eliminado → 401 «token inválido»", async () => {
    const ana = await signUp(app, ANA);
    await User.deleteMany({});
    const response = await start(ana);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "token inválido" });
  });
});

describe("GET /api/steam (RF-22)", () => {
  test("con Steam configurado: available true", async () => {
    const ana = await signUp(app, ANA);
    const response = await status(ana);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: true });
  });

  test("sin Steam configurado: available false", async () => {
    const ana = await signUp(appWithoutSteam, ANA);
    const response = await withSession(ana.agent.get("/api/steam"), ana.csrf);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: false });
  });

  test("no expone la clave ni la dirección de la instancia", async () => {
    const ana = await signUp(app, ANA);
    const response = await status(ana);
    assert.equal(JSON.stringify(response.body).includes(PUBLIC_URL), false);
  });
});

describe("POST /api/steam/start (RF-1, RF-3, RF-22)", () => {
  test("sin Steam configurado → 503 y no se abre ningún intento", async () => {
    const ana = await signUp(appWithoutSteam, ANA);
    const response = await withSession(ana.agent.post("/api/steam/start"), ana.csrf);
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: NOT_CONFIGURED });
    assert.equal(await SteamAttempt.countDocuments({}), 0);
  });

  test("devuelve la URL del inicio de sesión de Steam con la dirección de vuelta de la instancia", async () => {
    const ana = await signUp(app, ANA);
    const response = await start(ana);
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body as object), ["url"]);
    const url = new URL((response.body as { url: string }).url);
    assert.equal(`${url.origin}${url.pathname}`, STEAM_OPENID_URL);
    assert.equal(url.searchParams.get("openid.mode"), "checkid_setup");
    assert.equal(url.searchParams.get("openid.ns"), "http://specs.openid.net/auth/2.0");
    assert.equal(url.searchParams.get("openid.realm"), PUBLIC_URL);
    assert.equal(
      url.searchParams.get("openid.identity"),
      "http://specs.openid.net/auth/2.0/identifier_select",
    );
    const token = tokenOf(url.toString());
    assert.equal(url.searchParams.get("openid.return_to"), `${PUBLIC_URL}/verificar/steam?attempt=${token}`);
  });

  test("abre un intento del usuario de la sesión, válido por 10 minutos (RF-1)", async () => {
    const ana = await signUp(app, ANA);
    const response = await start(ana);
    const attempt = await findAttempt(tokenOf((response.body as { url: string }).url));
    assert.ok(attempt);
    assert.equal(attempt.userId, ana.id);
    assert.equal(attempt.expiresAt.getTime(), FIXED_NOW + ATTEMPT_TTL_MS);
  });

  test("el usuario de la sesión es el dueño del intento; el cuerpo no puede cambiarlo (constitución, 5)", async () => {
    const ana = await signUp(app, ANA);
    const otro = new mongoose.Types.ObjectId().toHexString();
    const response = await withSession(ana.agent.post("/api/steam/start"), ana.csrf).send({
      userId: otro,
      user: otro,
    });
    const attempt = await findAttempt(tokenOf((response.body as { url: string }).url));
    assert.equal(attempt?.userId, ana.id);
    assert.equal(await SteamAttempt.countDocuments({ user: otro }), 0);
  });

  test("D11: dos inicios seguidos dejan un solo intento y el primer token deja de servir", async () => {
    const ana = await signUp(app, ANA);
    const first = tokenOf(((await start(ana)).body as { url: string }).url);
    const second = tokenOf(((await start(ana)).body as { url: string }).url);
    assert.notEqual(first, second);
    assert.equal(await findAttempt(first), null);
    assert.equal((await findAttempt(second))?.userId, ana.id);
    assert.equal(await SteamAttempt.countDocuments({}), 1);
  });

  test("no consulta a Steam: solo prepara la redirección", async () => {
    const ana = await signUp(app, ANA);
    await start(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
    assert.equal(fake.state.profileCalls.length, 0);
  });

  test("RF-3: con una cuenta de CS2 ya verificada → 409 y no se abre ningún intento", async () => {
    const ana = await signUp(app, ANA);
    const result = await verifyAccount({
      userId: ana.id,
      gameId: "cs2",
      handle: STEAM_ID,
      verification: { source: "steam", externalId: STEAM_ID },
      real: { handle: STEAM_ID },
      now: NOW,
    });
    assert.equal(result.ok, true);
    const response = await start(ana);
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: ALREADY_VERIFIED });
    assert.equal(await SteamAttempt.countDocuments({}), 0);
  });

  test("RF-2: con una cuenta de CS2 vinculada a mano (sin verificar) sí se puede abrir el intento", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "South America" });
    const response = await start(ana);
    assert.equal(response.status, 200);
    assert.equal(await SteamAttempt.countDocuments({ user: ana.id }), 1);
  });

  test("RF-2: sin ninguna cuenta de CS2 también se puede", async () => {
    const ana = await signUp(app, ANA);
    assert.equal((await start(ana)).status, 200);
  });

  test("una cuenta verificada de otro juego (LoL) no impide verificar CS2", async () => {
    const ana = await signUp(app, ANA);
    await verifyAccount({
      userId: ana.id,
      gameId: "lol",
      handle: "Verificada#LAS",
      region: "LAS",
      verification: { source: "riot", externalId: "puuid-1" },
      real: { handle: "Verificada#LAS" },
      now: NOW,
    });
    assert.equal((await start(ana)).status, 200);
  });

  test("la cuenta verificada de CS2 de otro usuario no impide abrir el intento", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, { email: "beto@example.com", username: "Beto" });
    await verifyAccount({
      userId: beto.id,
      gameId: "cs2",
      handle: STEAM_ID,
      verification: { source: "steam", externalId: STEAM_ID },
      real: { handle: STEAM_ID },
      now: NOW,
    });
    assert.equal((await start(ana)).status, 200);
  });
});
