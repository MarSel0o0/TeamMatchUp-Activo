// `POST /api/steam/complete` (spec 013, T6): la vuelta de Steam. RF-4 a RF-9, RF-11, RF-12, RF-13,
// RF-17, RF-20, RNF-1, RNF-6; plan, 4.2. Steam se simula con un cliente falso (RNF-3).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import { ATTEMPT_TTL_MS } from "../../src/domain/steamAttempt.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { findAttempt, openAttempt } from "../../src/services/steamAttempts.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import { FIXED_NOW, authApp, closeTestServers, linkOk, signUp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";
import { PUBLIC_URL, STEAM_ID, fakeSteamClient, steamApp, steamLoginQuery, tokenOf } from "./steamHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date(FIXED_NOW);

const NOT_CONFIGURED = "Steam no está configurado en este servidor";
const FAILED = "no se pudo verificar con Steam, vuelve a intentarlo"; // RF-6, RF-20
const ELSEWHERE = "esta cuenta ya está verificada por otro usuario"; // RF-8, RF-20
const STEAM_DOWN = "Steam no está disponible por ahora, intenta más tarde"; // RF-9, RF-20

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

function complete(session: SignedUp, query: Record<string, string>, extra: Record<string, unknown> = {}) {
  return withSession(session.agent.post("/api/steam/complete"), session.csrf).send({ query, ...extra });
}

/** Abre un intento con `POST /start` y devuelve su token. */
async function openToken(session: SignedUp): Promise<string> {
  const response = await withSession(session.agent.post("/api/steam/start"), session.csrf);
  assert.equal(response.status, 200);
  return tokenOf((response.body as { url: string }).url);
}

function cs2Accounts(userId: string) {
  return GameAccount.find({ user: userId, gameId: "cs2" });
}

function assertFailed(response: { status: number; body: unknown }): void {
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: FAILED });
}

async function assertNoCs2(session: SignedUp): Promise<void> {
  assert.equal((await cs2Accounts(session.id)).length, 0, "no debe haber cuenta de CS2");
}

describe("sesión y comprobante (RNF-6, RF-7)", () => {
  test("sin sesión → 401, ninguna cuenta cambia y el intento no se consume", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await supertest(app)
      .post("/api/steam/complete")
      .send({ query: steamLoginQuery(token) });
    assert.equal(response.status, 401);
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
    assert.ok(await findAttempt(token));
  });

  test("con la cookie pero sin comprobante anti-CSRF → 401 y nada cambia", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await ana.agent.post("/api/steam/complete").send({ query: steamLoginQuery(token) });
    assert.equal(response.status, 401);
    await assertNoCs2(ana);
    assert.ok(await findAttempt(token));
  });

  test("sin Steam configurado → 503", async () => {
    const ana = await signUp(appWithoutSteam, ANA);
    const response = await withSession(ana.agent.post("/api/steam/complete"), ana.csrf).send({ query: {} });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: NOT_CONFIGURED });
  });
});

describe("verificación correcta (RF-4, RF-10, RF-13)", () => {
  test("cuenta nueva: verificada con Steam, con los datos reales del perfil", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    assert.equal(response.status, 200);
    const body = response.body as { outcome: string; account: Record<string, unknown> };
    assert.equal(body.outcome, "verified");
    assert.equal(body.account["gameId"], "cs2");
    assert.equal(body.account["handle"], STEAM_ID);
    assert.equal(body.account["userId"], ana.id);
    assert.equal(body.account["verified"], true);
    assert.equal(body.account["verifiedWith"], "steam");
    assert.deepEqual(body.account["origins"], {
      identity: "steam",
      rank: "simulated",
      matches: "simulated",
      profile: "steam",
    });
    assert.deepEqual(body.account["profile"], {
      displayName: "Vicho",
      avatarUrl: "https://avatars.fastly.steamstatic.com/abcdef_full.jpg",
      country: "CL",
      hoursTotal: 312,
      hoursRecent: 18,
    });
  });

  test("guarda el SteamID64 como identificador estable y consume el intento", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    await complete(ana, steamLoginQuery(token));
    const [account] = await cs2Accounts(ana.id);
    assert.equal(account?.verification?.source, "steam");
    assert.equal(account?.verification?.externalId, STEAM_ID);
    assert.equal(account?.region, "South America");
    assert.equal(await findAttempt(token), null);
  });

  test("RF-13: el rango, el historial y las partidas de CS2 siguen simulados, con rango vigente", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    const account = (response.body as { account: { currentRank: unknown; rankHistory: unknown[] } }).account;
    assert.ok(account.currentRank);
    assert.ok(account.rankHistory.length >= 1);
  });

  test("a Steam solo se le piden los openid.* (nunca el intento) y el perfil del SteamID64 confirmado", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    await complete(ana, steamLoginQuery(token));
    assert.equal(fake.state.assertionCalls.length, 1);
    const sent = fake.state.assertionCalls[0] ?? {};
    assert.ok(Object.keys(sent).every((key) => key.startsWith("openid.")));
    assert.equal(sent["openid.claimed_id"], `https://steamcommunity.com/openid/id/${STEAM_ID}`);
    assert.deepEqual(fake.state.profileCalls, [STEAM_ID]);
  });

  test("cuenta manual de CS2 con otro SteamID64: la de Steam la reemplaza (misma cuenta y misma región)", async () => {
    const ana = await signUp(app, ANA);
    const manualId = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    assert.equal(response.status, 200);
    const accounts = await cs2Accounts(ana.id);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0]?.id, manualId);
    assert.equal(accounts[0]?.handle, STEAM_ID);
    assert.equal(accounts[0]?.region, "Europe");
    assert.equal(accounts[0]?.verification?.externalId, STEAM_ID);
  });

  test("cuenta manual con el mismo SteamID64: queda verificada", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "cs2", handle: STEAM_ID, region: "South America" });
    const token = await openToken(ana);
    assert.equal((await complete(ana, steamLoginQuery(token))).status, 200);
    const accounts = await cs2Accounts(ana.id);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0]?.verification?.externalId, STEAM_ID);
  });

  test("las cuentas de otros juegos del usuario no se tocan", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" });
    const token = await openToken(ana);
    await complete(ana, steamLoginQuery(token));
    const lol = await GameAccount.findOne({ user: ana.id, gameId: "lol" });
    assert.equal(lol?.verification, undefined);
  });

  test("RNF-1: la respuesta no trae el identificador interno ni nada de la confirmación con Steam", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const text = JSON.stringify((await complete(ana, steamLoginQuery(token))).body);
    assert.equal(text.includes("externalId"), false);
    assert.equal(text.includes("firmaEnBase64"), false);
    assert.equal(text.includes(token), false);
  });

  test("el usuario sale de la sesión: un userId en el cuerpo no cambia a quién se verifica", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token), { userId: beto.id, user: beto.id });
    assert.equal(response.status, 200);
    assert.equal((await cs2Accounts(ana.id)).length, 1);
    assert.equal((await cs2Accounts(beto.id)).length, 0);
  });

  test("los parámetros ajenos a attempt y openid.* de la consulta se ignoran", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await complete(ana, { ...steamLoginQuery(token), utm_source: "x", otro: "y" });
    assert.equal(response.status, 200);
  });
});

describe("cancelación (RF-5)", () => {
  test("openid.mode=cancel → cancelled; no cambia ninguna cuenta y descarta el intento", async () => {
    const ana = await signUp(app, ANA);
    const manualId = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const token = await openToken(ana);
    const response = await complete(ana, { attempt: token, "openid.mode": "cancel" });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { outcome: "cancelled" });
    const [account] = await cs2Accounts(ana.id);
    assert.equal(account?.id, manualId);
    assert.equal(account?.verification, undefined);
    assert.equal(await findAttempt(token), null);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("volver sin respuesta de inicio de sesión (solo el intento, o nada) → cancelled", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    assert.deepEqual((await complete(ana, { attempt: token })).body, { outcome: "cancelled" });
    assert.deepEqual((await complete(ana, {})).body, { outcome: "cancelled" });
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("cancelar con el token de otro usuario no descarta su intento", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoToken = await openToken(beto);
    const response = await complete(ana, { attempt: betoToken, "openid.mode": "cancel" });
    assert.deepEqual(response.body, { outcome: "cancelled" });
    assert.equal((await findAttempt(betoToken))?.userId, beto.id);
  });
});

describe("respuestas que se rechazan (RF-6, RF-20)", () => {
  test("sin ningún intento abierto", async () => {
    const ana = await signUp(app, ANA);
    assertFailed(await complete(ana, steamLoginQuery("no-existe")));
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("sin el parámetro attempt", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const withoutAttempt = { ...steamLoginQuery(token) } as Record<string, string>;
    delete withoutAttempt["attempt"];
    assertFailed(await complete(ana, withoutAttempt));
    await assertNoCs2(ana);
  });

  test("un intento de otro usuario: se rechaza y el intento del dueño sigue vigente", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoToken = await openToken(beto);
    assertFailed(await complete(ana, steamLoginQuery(betoToken)));
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
    assert.equal((await complete(beto, steamLoginQuery(betoToken))).status, 200);
  });

  test("un intento ya usado (recargar la página de vuelta)", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    assert.equal((await complete(ana, steamLoginQuery(token))).status, 200);
    fake.state.assertionCalls.length = 0;
    assertFailed(await complete(ana, steamLoginQuery(token)));
    assert.equal((await cs2Accounts(ana.id)).length, 1);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("un intento vencido (10 minutos) se rechaza y se elimina", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    nowMs = FIXED_NOW + ATTEMPT_TTL_MS;
    assertFailed(await complete(ana, steamLoginQuery(token)));
    await assertNoCs2(ana);
    assert.equal(await findAttempt(token), null);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("a 1 ms de vencer el intento todavía sirve", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    nowMs = FIXED_NOW + ATTEMPT_TTL_MS - 1;
    assert.equal((await complete(ana, steamLoginQuery(token))).status, 200);
  });

  test("un intento anulado por uno más nuevo: el viejo se rechaza y el nuevo sigue sirviendo (D11)", async () => {
    const ana = await signUp(app, ANA);
    const first = await openToken(ana);
    const second = await openToken(ana);
    assertFailed(await complete(ana, steamLoginQuery(first)));
    await assertNoCs2(ana);
    assert.equal((await complete(ana, steamLoginQuery(second))).status, 200);
  });

  test("la respuesta vuelve a otra dirección (otro origen, ruta o token): se rechaza antes de llamar a Steam", async () => {
    const ana = await signUp(app, ANA);
    for (const returnTo of [
      "https://evil.example/verificar/steam?attempt=TOKEN",
      "http://localhost:5173/otra/ruta?attempt=TOKEN",
      "http://localhost:5173/verificar/steam?attempt=otro",
      "http://localhost:5173/verificar/steam",
    ]) {
      const token = await openToken(ana);
      const query = { ...steamLoginQuery(token), "openid.return_to": returnTo.replace("TOKEN", token) };
      assertFailed(await complete(ana, query));
    }
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("falta un campo firmado o está mal formado: se rechaza antes de llamar a Steam", async () => {
    const ana = await signUp(app, ANA);
    const casos: Record<string, string>[] = [
      { "openid.signed": "signed,op_endpoint,identity,return_to,response_nonce,assoc_handle" },
      {
        "openid.claimed_id": "https://steamcommunity.com/openid/id/123",
        "openid.identity": "https://steamcommunity.com/openid/id/123",
      },
      { "openid.op_endpoint": "https://evil.example/openid/login" },
      { "openid.sig": "" },
    ];
    for (const caso of casos) {
      const token = await openToken(ana);
      assertFailed(await complete(ana, { ...steamLoginQuery(token), ...caso }));
    }
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("Steam no confirma la firma (is_valid:false): no se lee el perfil de una identidad sin confirmar", async () => {
    fake.state.assertion = "invalid";
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    assertFailed(await complete(ana, steamLoginQuery(token)));
    await assertNoCs2(ana);
    assert.equal(fake.state.assertionCalls.length, 1);
    assert.equal(fake.state.profileCalls.length, 0);
  });

  test("ya tiene una cuenta de CS2 verificada: se rechaza y la cuenta no cambia (RF-3)", async () => {
    const ana = await signUp(app, ANA);
    await verifyAccount({
      userId: ana.id,
      gameId: "cs2",
      handle: "76561198000000009",
      verification: { source: "steam", externalId: "76561198000000009" },
      real: { handle: "76561198000000009" },
      now: NOW,
    });
    const { token } = await openAttempt(ana.id, NOW);
    assertFailed(await complete(ana, steamLoginQuery(token)));
    const [account] = await cs2Accounts(ana.id);
    assert.equal(account?.handle, "76561198000000009");
    assert.equal(account?.verification?.externalId, "76561198000000009");
    assert.equal(fake.state.assertionCalls.length, 0);
  });

  test("un cuerpo que no es una respuesta de Steam se rechaza sin consumir el intento", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const bodies = [{}, { query: "x" }, { query: ["a"] }, { query: { attempt: ["a"] } }, { query: { "openid.mode": 5 } }];
    for (const body of bodies) {
      assertFailed(await withSession(ana.agent.post("/api/steam/complete"), ana.csrf).send(body));
    }
    assert.ok(await findAttempt(token), "el intento sigue abierto");
    assert.equal((await complete(ana, steamLoginQuery(token))).status, 200);
  });

  test("el intento queda usado aunque la respuesta se rechace después (P13-4)", async () => {
    fake.state.assertion = "invalid";
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    assertFailed(await complete(ana, steamLoginQuery(token)));
    assert.equal(await findAttempt(token), null);
    fake.state.assertion = "valid";
    assertFailed(await complete(ana, steamLoginQuery(token)));
    await assertNoCs2(ana);
  });

  test("dos peticiones a la vez con el mismo intento: una verifica y la otra se rechaza", async () => {
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const [one, two] = await Promise.all([
      complete(ana, steamLoginQuery(token)),
      complete(ana, steamLoginQuery(token)),
    ]);
    assert.deepEqual([one.status, two.status].sort(), [200, 400]);
    assert.equal((await cs2Accounts(ana.id)).length, 1);
    assert.equal(fake.state.assertionCalls.length, 1);
  });
});

describe("cuenta de otro usuario y Steam caído (RF-8, RF-9)", () => {
  test("RF-8: el SteamID64 ya verificado por otro usuario → 409 y no cambia nada", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoToken = await openToken(beto);
    assert.equal((await complete(beto, steamLoginQuery(betoToken))).status, 200);

    const manualId = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: ELSEWHERE });
    const [account] = await cs2Accounts(ana.id);
    assert.equal(account?.id, manualId);
    assert.equal(account?.verification, undefined);
    assert.equal((await cs2Accounts(beto.id))[0]?.verification?.externalId, STEAM_ID);
  });

  test("RF-9: Steam no puede confirmar la respuesta → 503 y no cambia ninguna cuenta", async () => {
    fake.state.assertion = "unavailable";
    const ana = await signUp(app, ANA);
    const manualId = await linkOk(ana, { gameId: "cs2", handle: "76561190000000001", region: "Europe" });
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: STEAM_DOWN });
    const [account] = await cs2Accounts(ana.id);
    assert.equal(account?.id, manualId);
    assert.equal(account?.verification, undefined);
    assert.equal(fake.state.profileCalls.length, 0);
  });

  test("RF-9: si Steam no responde dentro del plazo → 503", async () => {
    const hanging = { verifyAssertion: () => new Promise<never>(() => undefined), readProfile: fake.client.readProfile };
    const slowApp = await authApp({ steamIntegration: { publicUrl: PUBLIC_URL, client: hanging }, sourceTimeoutMs: 30 });
    const ana = await signUp(slowApp, ANA);
    const token = await openToken(ana);
    const response = await withSession(ana.agent.post("/api/steam/complete"), ana.csrf).send({
      query: steamLoginQuery(token),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: STEAM_DOWN });
    await assertNoCs2(ana);
  });
});

describe("datos del perfil (RF-11, RF-12, RF-17)", () => {
  test("RF-12: si falla la lectura del perfil, queda verificada sin datos de perfil", async () => {
    fake.state.profile = { ok: false, reason: "unavailable" };
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    assert.equal(response.status, 200);
    const account = (response.body as { account: Record<string, unknown> }).account;
    assert.equal(account["verified"], true);
    assert.equal("profile" in account, false);
    const [stored] = await cs2Accounts(ana.id);
    assert.equal(stored?.profile, undefined);
    assert.equal(stored?.verification?.externalId, STEAM_ID);
  });

  test("RF-12: si Steam dice que la cuenta no existe al leer el perfil, también queda verificada sin perfil", async () => {
    fake.state.profile = { ok: false, reason: "gone" };
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    assert.equal((await complete(ana, steamLoginQuery(token))).status, 200);
    assert.equal((await cs2Accounts(ana.id))[0]?.profile, undefined);
  });

  test("RF-12: una lectura de perfil que no responde a tiempo no impide verificar", async () => {
    const hanging = { verifyAssertion: fake.client.verifyAssertion, readProfile: () => new Promise<never>(() => undefined) };
    const slowApp = await authApp({ steamIntegration: { publicUrl: PUBLIC_URL, client: hanging }, sourceTimeoutMs: 30 });
    const ana = await signUp(slowApp, ANA);
    const token = await openToken(ana);
    const response = await withSession(ana.agent.post("/api/steam/complete"), ana.csrf).send({
      query: steamLoginQuery(token),
    });
    assert.equal(response.status, 200);
    assert.equal((await cs2Accounts(ana.id))[0]?.profile, undefined);
  });

  test("RF-11: lo que Steam no entrega queda ausente (perfil privado: solo nombre y avatar)", async () => {
    fake.state.profile = {
      ok: true,
      data: {
        handle: STEAM_ID,
        profile: { displayName: "Anon", avatarUrl: "https://avatars.fastly.steamstatic.com/x.jpg" },
      },
    };
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    const profile = (response.body as { account: { profile: Record<string, unknown> } }).account.profile;
    assert.deepEqual(Object.keys(profile).sort(), ["avatarUrl", "displayName"]);
  });

  test("RF-17: una cuenta sin CS2 en su biblioteca muestra 0 h y 0 h", async () => {
    fake.state.profile = {
      ok: true,
      data: { handle: STEAM_ID, profile: { displayName: "Sin CS2", hoursTotal: 0, hoursRecent: 0 } },
    };
    const ana = await signUp(app, ANA);
    const token = await openToken(ana);
    const response = await complete(ana, steamLoginQuery(token));
    const profile = (response.body as { account: { profile: Record<string, unknown> } }).account.profile;
    assert.equal(profile["hoursTotal"], 0);
    assert.equal(profile["hoursRecent"], 0);
  });
});
