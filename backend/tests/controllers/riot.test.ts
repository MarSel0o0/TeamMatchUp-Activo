// Rutas de Riot Games: `/api/riot` (spec 014, T6).
// Cubre `GET /api/riot` (RF-38), `GET /api/riot/challenges/current` (RF-45) y
// `POST /api/riot/challenges` (RF-1, RF-3..RF-6, RF-18..RF-22, RF-34, RF-37, RF-38, RF-43, RF-49,
// RF-52, RNF-1, RNF-2, RNF-3, RNF-6, RNF-7; plan §§2.2, 5.1, 8.1).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import {
  CHALLENGE_HOURLY_WINDOW_MS,
  CHALLENGE_RETENTION_MS,
  CHALLENGE_TTL_MS,
} from "../../src/domain/riotChallenge.ts";
import { RATE_LIMIT_1SEC, RATE_LIMIT_2MIN } from "../../src/domain/riotRateLimiter.ts";
import { RIOT_ERRORS } from "../../src/domain/riotRules.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { RiotChallenge } from "../../src/models/riotChallenge.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import { createChallengeAndCancelPrevious } from "../../src/services/riotChallenges.ts";
import { createRiotLimiter } from "../../src/services/riotLimiter.ts";
import { verifyAccount } from "../../src/services/verifyAccount.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  HEX24_LOWER,
  ISO_MS_Z,
  authApp,
  closeTestServers,
  linkOk,
  signUp,
  withSession,
} from "./helpers.ts";
import {
  OTHER_RIOT_PUUID,
  RIOT_ID,
  RIOT_PUUID,
  assertNoPuuid,
  createChallenge,
  currentChallenge,
  fakeRiotClient,
  riotApp,
  SHORT_OPERATION_TIMEOUT_MS,
  riotStatus,
} from "./riotHelpers.ts";

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date(FIXED_NOW);
const MINUTE_MS = 60_000;

let nowMs = FIXED_NOW;
let nextPickIndex = 0;

const fake = fakeRiotClient();
const app = await riotApp({
  client: fake.client,
  pickIndex: (length) => nextPickIndex % length,
});
const appWithoutRiot = await authApp();

before(async () => {
  await connectDatabase(testConfig().db);
  await prepareDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await RiotChallenge.deleteMany({});
  fake.reset();
  nowMs = FIXED_NOW;
  nextPickIndex = 0;
  mock.method(clock, "now", () => new Date(nowMs));
});

afterEach(() => mock.restoreAll());

after(async () => {
  await closeTestServers();
  await RiotChallenge.deleteMany({});
  await mongoose.disconnect();
});

async function verifyLolFor(
  userId: string,
  handle: string,
  externalId: string,
  region: string = "LAS",
): Promise<void> {
  const result = await verifyAccount({
    userId,
    gameId: "lol",
    handle,
    region,
    verification: { source: "riot", externalId },
    real: { handle },
    now: NOW,
  });
  assert.equal(result.ok, true);
}

describe("sesión y comprobante anti-CSRF en /api/riot", () => {
  test("sin sesión: GET /, GET /challenges/current y POST /challenges → 401", async () => {
    assert.equal((await supertest(app).get("/api/riot")).status, 401);
    assert.equal((await supertest(app).get("/api/riot/challenges/current")).status, 401);
    assert.equal(
      (await supertest(app).post("/api/riot/challenges").send({ riotId: RIOT_ID, region: "LAS" }))
        .status,
      401,
    );
    assert.equal(fake.totalCalls(), 0);
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("con cookie pero sin X-CSRF-Token → 401 sin consultar a Riot ni crear desafío", async () => {
    const ana = await signUp(app, ANA);
    assert.equal((await ana.agent.get("/api/riot")).status, 401);
    assert.equal((await ana.agent.get("/api/riot/challenges/current")).status, 401);
    assert.equal(
      (await ana.agent.post("/api/riot/challenges").send({ riotId: RIOT_ID, region: "LAS" }))
        .status,
      401,
    );
    assert.equal(fake.totalCalls(), 0);
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("con X-CSRF-Token equivocado → 401", async () => {
    const ana = await signUp(app, ANA);
    const response = await ana.agent
      .post("/api/riot/challenges")
      .set("X-CSRF-Token", "invalido")
      .send({ riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 401);
    assert.equal(fake.totalCalls(), 0);
  });

  test("credencial de usuario eliminado → 401 «token inválido»", async () => {
    const ana = await signUp(app, ANA);
    await User.deleteMany({});
    const response = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "token inválido" });
    assert.equal(fake.totalCalls(), 0);
  });

  test("el dueño del desafío es siempre el usuario de la sesión (ignora user/userId del cuerpo)", async () => {
    const ana = await signUp(app, ANA);
    const otroId = new mongoose.Types.ObjectId().toHexString();
    const response = await createChallenge(ana, {
      riotId: RIOT_ID,
      region: "LAS",
      user: otroId,
      userId: otroId,
    });
    assert.equal(response.status, 201);
    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 1);
    assert.equal(await RiotChallenge.countDocuments({ user: otroId }), 0);
  });
});

describe("GET /api/riot (RF-38)", () => {
  test("con Riot configurado devuelve available: true", async () => {
    const ana = await signUp(app, ANA);
    const response = await riotStatus(ana);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: true });
    assert.equal(fake.totalCalls(), 0);
  });

  test("sin Riot configurado devuelve available: false", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const response = await withSession(ana.agent.get("/api/riot"), ana.csrf);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { available: false });
  });
});

describe("GET /api/riot/challenges/current (RF-45, RNF-3)", () => {
  test("sin desafíos devuelve { challenge: null } sin consultar a Riot", async () => {
    const ana = await signUp(app, ANA);
    const response = await currentChallenge(ana);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { challenge: null });
    assert.equal(fake.totalCalls(), 0);
  });

  test("devuelve el desafío abierto con remainingSeconds actualizado, riotId de Riot y region, sin puuid", async () => {
    const ana = await signUp(app, ANA);
    fake.state.accountByRiotId = {
      kind: "ok",
      account: {
        puuid: RIOT_PUUID,
        gameName: "FakerReal",
        tagLine: "KR1",
        riotId: "FakerReal#KR1",
      },
    };
    const created = await createChallenge(ana, { riotId: "fakerreal#kr1", region: "KR" });
    assert.equal(created.status, 201);
    const createdId = (created.body as { id: string }).id;
    const callsBefore = fake.totalCalls();

    nowMs = FIXED_NOW + 90_000; // pasaron 90 s → quedan 510 s
    const response = await currentChallenge(ana);
    assert.equal(response.status, 200);
    assert.equal(fake.totalCalls(), callsBefore);
    assertNoPuuid(response.body);

    const body = response.body as { challenge: Record<string, unknown> };
    assert.deepEqual(Object.keys(body.challenge).sort(), [
      "expiresAt",
      "iconId",
      "id",
      "region",
      "remainingSeconds",
      "riotId",
    ]);
    assert.equal(body.challenge.id, createdId);
    assert.equal(body.challenge.riotId, "FakerReal#KR1");
    assert.equal(body.challenge.region, "KR");
    assert.equal(body.challenge.remainingSeconds, 510);
    assert.equal(body.challenge.expiresAt, new Date(FIXED_NOW + CHALLENGE_TTL_MS).toISOString());
  });

  test("vencido a los 10:00 exactos (D15), anulado o completado → { challenge: null }", async () => {
    const ana = await signUp(app, ANA);
    const created = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(created.status, 201);

    // 10:00 exactos → vencido
    nowMs = FIXED_NOW + CHALLENGE_TTL_MS;
    assert.deepEqual((await currentChallenge(ana)).body, { challenge: null });

    // Anulado aún vigente → null
    nowMs = FIXED_NOW + 1_000;
    await RiotChallenge.updateMany({ user: ana.id }, { $set: { status: "cancelled" } });
    assert.deepEqual((await currentChallenge(ana)).body, { challenge: null });

    // Completado aún vigente → null
    await RiotChallenge.updateMany({ user: ana.id }, { $set: { status: "completed" } });
    assert.deepEqual((await currentChallenge(ana)).body, { challenge: null });
  });

  test("no devuelve desafíos abiertos de otro usuario", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    assert.equal((await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" })).status, 201);
    const response = await currentChallenge(beto);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { challenge: null });
  });

  test("funciona sin clave de Riot (D57) y sin consultar al cliente", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const doc = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: RIOT_PUUID,
      riotId: "Guardado#LAS",
      region: "LAS",
      iconId: 7,
      now: new Date(nowMs),
    });

    const response = await withSession(ana.agent.get("/api/riot/challenges/current"), ana.csrf);
    assert.equal(response.status, 200);
    assertNoPuuid(response.body);
    assert.deepEqual(response.body, {
      challenge: {
        id: doc._id.toString(),
        iconId: 7,
        expiresAt: new Date(FIXED_NOW + CHALLENGE_TTL_MS).toISOString(),
        remainingSeconds: 600,
        riotId: "Guardado#LAS",
        region: "LAS",
      },
    });
  });

  test("no se ve bloqueado por RF-49 mientras hay un pedido en curso del mismo usuario", async () => {
    const ana = await signUp(app, ANA);
    const existing = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: RIOT_PUUID,
      riotId: RIOT_ID,
      region: "LAS",
      iconId: 5,
      now: new Date(nowMs),
    });

    let releaseRiot: () => void = () => undefined;
    let enteredRiot: () => void = () => undefined;
    const riotEntered = new Promise<void>((resolve) => {
      enteredRiot = resolve;
    });
    const riotReleased = new Promise<void>((resolve) => {
      releaseRiot = resolve;
    });
    fake.state.accountByRiotId = async () => {
      enteredRiot();
      await riotReleased;
      return {
        kind: "ok",
        account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
      };
    };

    const pendingPost = createChallenge(ana, { riotId: RIOT_ID, region: "LAS" }).then((r) => r);
    const settledEarly = await Promise.race([
      riotEntered.then(() => false),
      pendingPost.then(() => true, () => true),
    ]);
    if (settledEarly) {
      const early = await pendingPost;
      assert.fail(`POST /api/riot/challenges terminó (${early.status}) antes de consultar a Riot`);
    }

    const currentRes = await currentChallenge(ana);
    assert.equal(currentRes.status, 200);
    assert.equal((currentRes.body as { challenge: { id: string } }).challenge.id, existing._id.toString());

    releaseRiot();
    const postRes = await pendingPost;
    assert.equal(postRes.status, 201);
  });
});

describe("POST /api/riot/challenges — creación, reemplazo y exclusión de íconos (RF-1, RF-4, RF-19, RF-34, RNF-3)", () => {
  test("201 crea desafío con riotId recortado/normalizado por Riot, vencimiento 10 min, deleteAt +24 h y sin puuid", async () => {
    const ana = await signUp(app, ANA);
    fake.state.accountByRiotId = {
      kind: "ok",
      account: {
        puuid: RIOT_PUUID,
        gameName: "MiNombre",
        tagLine: "LaS1",
        riotId: "MiNombre#LaS1",
      },
    };
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 0, level: 55 } };
    nextPickIndex = 0; // disponibles 1..28 → elige 1

    const response = await createChallenge(ana, { riotId: "  minombre#las1  ", region: " las " });
    assert.equal(response.status, 201);
    assertNoPuuid(response.body);

    const body = response.body as Record<string, unknown>;
    assert.deepEqual(Object.keys(body).sort(), [
      "expiresAt",
      "iconId",
      "id",
      "region",
      "remainingSeconds",
      "riotId",
    ]);
    assert.match(String(body.id), HEX24_LOWER);
    assert.equal(body.iconId, 1);
    assert.equal(body.riotId, "MiNombre#LaS1");
    assert.equal(body.region, "LAS");
    assert.equal(body.remainingSeconds, 600);
    assert.match(String(body.expiresAt), ISO_MS_Z);
    assert.equal(body.expiresAt, new Date(FIXED_NOW + CHALLENGE_TTL_MS).toISOString());

    // Se consultó a Riot con el Riot ID recortado y la región normalizada.
    assert.deepEqual(fake.state.accountByRiotIdCalls, [
      { riotId: { gameName: "minombre", tagLine: "las1" }, region: "LAS" },
    ]);
    assert.deepEqual(fake.state.summonerByPuuidCalls, [{ puuid: RIOT_PUUID, region: "LAS" }]);

    // En la base: puuid guardado, retención 24 h tras vencimiento.
    const saved = await RiotChallenge.findById(body.id).lean();
    assert.ok(saved);
    assert.equal(saved.puuid, RIOT_PUUID);
    assert.equal(saved.status, "open");
    assert.equal(saved.attempts, 0);
    assert.equal(saved.deleteAt.getTime(), FIXED_NOW + CHALLENGE_TTL_MS + CHALLENGE_RETENTION_MS);
  });

  test("permite crear desafío teniendo cuenta manual de LoL en la misma región (RF-20)", async () => {
    const ana = await signUp(app, ANA);
    await linkOk(ana, { gameId: "lol", handle: "OtroManual#LAS", region: "LAS" });
    const response = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 201);
  });

  test("RF-4 / RF-19: reemplazar desafío abierto anula el previo (deleteAt = at + 24 h) y excluye su ícono", async () => {
    const ana = await signUp(app, ANA);
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 0, level: 80 } };
    nextPickIndex = 0; // excluye 0 → elige 1

    const first = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(first.status, 201);
    const firstBody = first.body as { id: string; iconId: number };
    assert.equal(firstBody.iconId, 1);

    nowMs = FIXED_NOW + 2 * MINUTE_MS;
    nextPickIndex = 0; // excluye 0 (equipado) y 1 (abierto propio) → elige 2
    const second = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(second.status, 201);
    const secondBody = second.body as { id: string; iconId: number };
    assert.equal(secondBody.iconId, 2);

    const prevDoc = await RiotChallenge.findById(firstBody.id).lean();
    assert.ok(prevDoc);
    assert.equal(prevDoc.status, "cancelled");
    assert.equal(prevDoc.deleteAt.getTime(), nowMs + CHALLENGE_RETENTION_MS);
  });

  test("RF-4: si el nuevo pedido se rechaza, el desafío abierto previo sigue abierto", async () => {
    const ana = await signUp(app, ANA);
    const first = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(first.status, 201);
    const firstId = (first.body as { id: string }).id;

    fake.state.accountByRiotId = { kind: "not_found" };
    const failed = await createChallenge(ana, { riotId: "NoExiste#LAS", region: "LAS" });
    assert.equal(failed.status, 404);

    const stillOpen = await RiotChallenge.findById(firstId).lean();
    assert.equal(stillOpen?.status, "open");
  });

  test("RF-19: excluye íconos de desafíos abiertos de otros usuarios para la misma cuenta de Riot", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 0, level: 99 } };
    nextPickIndex = 0;

    const first = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(first.status, 201);
    assert.equal((first.body as { iconId: number }).iconId, 1);

    const second = await createChallenge(beto, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(second.status, 201);
    assert.equal((second.body as { iconId: number }).iconId, 2);
  });

  test("RF-19: con ícono equipado fuera de 0..28, los 29 íconos de inicio quedan disponibles; sin pickIndex inyectado usa crypto.randomInt", async () => {
    const defaultPickFake = fakeRiotClient({
      summonerByPuuid: { kind: "ok", summoner: { profileIconId: 5000, level: 150 } },
    });
    const defaultPickApp = await riotApp({ client: defaultPickFake.client });
    const ana = await signUp(defaultPickApp, ANA);

    const response = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 201);
    const iconId = (response.body as { iconId: number }).iconId;
    assert.equal(Number.isInteger(iconId), true);
    assert.ok(iconId >= 0 && iconId <= 28);
  });
});

describe("POST /api/riot/challenges — orden exacto de RF-22 (paso 1 sin Riot)", () => {
  test("1. 400 formato (RF-18: Riot ID antes que región) gana sobre ya verificada, sin clave y no llama a Riot", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    await verifyLolFor(ana.id, RIOT_ID, RIOT_PUUID);

    const badBoth = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: "sinhashtag", region: "MARS" });
    assert.equal(badBoth.status, 400);
    assert.deepEqual(badBoth.body, { error: RIOT_ERRORS.invalidRiotId });

    const badRegion = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: RIOT_ID, region: "MARS" });
    assert.equal(badRegion.status, 400);
    assert.deepEqual(badRegion.body, { error: RIOT_ERRORS.invalidRegion });

    assert.equal(fake.totalCalls(), 0);
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("2. 409 lock (RF-49, D70) gana sobre ya verificada/región/5-hora, no consulta a Riot y no bloquea a otro usuario", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);

    let entered: () => void = () => undefined;
    let release: () => void = () => undefined;
    const firstEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const firstReleased = new Promise<void>((resolve) => {
      release = resolve;
    });

    let callCount = 0;
    fake.state.accountByRiotId = async () => {
      callCount += 1;
      if (callCount === 1) {
        entered();
        await firstReleased;
      }
      return {
        kind: "ok",
        account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
      };
    };

    const firstReq = createChallenge(ana, { riotId: RIOT_ID, region: "LAS" }).then((r) => r);
    const settledEarly = await Promise.race([
      firstEntered.then(() => false),
      firstReq.then(() => true, () => true),
    ]);
    if (settledEarly) {
      const early = await firstReq;
      assert.fail(`POST /api/riot/challenges terminó (${early.status}) antes de consultar a Riot`);
    }

    // Petición simultánea del mismo usuario → 409 lock, sin consultar a Riot.
    const secondAna = await createChallenge(ana, { riotId: RIOT_ID, region: "NA" });
    assert.equal(secondAna.status, 409);
    assert.deepEqual(secondAna.body, { error: RIOT_ERRORS.inProgress });
    assert.equal(fake.state.accountByRiotIdCalls.length, 1);

    // Un 400 de formato aún gana sobre el lock (RF-22: 1 antes que 2).
    const badFormat = await createChallenge(ana, { riotId: "ab#1", region: "LAS" });
    assert.equal(badFormat.status, 400);
    assert.deepEqual(badFormat.body, { error: RIOT_ERRORS.invalidRiotId });

    // Otro usuario NO queda bloqueado.
    const betoRes = await createChallenge(beto, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(betoRes.status, 201);

    release();
    const firstRes = await firstReq;
    assert.equal(firstRes.status, 201);
  });

  test("3. 409 ya tienes una cuenta de Riot verificada (RF-6) gana sobre 5/hora y sin clave; CS2 verificada no bloquea", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    // CS2 verificada NO bloquea LoL (llega hasta 503 sin clave).
    const cs2 = await verifyAccount({
      userId: ana.id,
      gameId: "cs2",
      handle: "76561198000000001",
      verification: { source: "steam", externalId: "76561198000000001" },
      real: { handle: "76561198000000001" },
      now: NOW,
    });
    assert.equal(cs2.ok, true);
    const resCs2 = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: RIOT_ID, region: "LAS" });
    assert.equal(resCs2.status, 503);

    // Con LoL verificada y 5 desafíos creados en la última hora → gana 409 RF-6.
    await verifyLolFor(ana.id, RIOT_ID, RIOT_PUUID);
    for (let i = 0; i < 5; i += 1) {
      await createChallengeAndCancelPrevious({
        userId: ana.id,
        puuid: OTHER_RIOT_PUUID,
        riotId: "Otro#LAS",
        region: "LAS",
        iconId: i,
        now: new Date(FIXED_NOW - (5 - i) * MINUTE_MS),
      });
    }
    const response = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: "Nuevo#LAS", region: "LAS" });
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: RIOT_ERRORS.alreadyVerified });
    assert.equal(fake.totalCalls(), 0);
  });

  test("4. 409 región distinta de vínculo manual (RF-20, D49) gana sobre 5/hora, otro verificó y sin clave", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const beto = await signUp(appWithoutRiot, BETO);
    await linkOk(ana, { gameId: "lol", handle: "ManualAna#EUW", region: "EUW" });
    await verifyLolFor(beto.id, RIOT_ID, RIOT_PUUID, "LAS");
    for (let i = 0; i < 5; i += 1) {
      await createChallengeAndCancelPrevious({
        userId: ana.id,
        puuid: OTHER_RIOT_PUUID,
        riotId: "Otro#EUW",
        region: "EUW",
        iconId: i,
        now: new Date(FIXED_NOW - (5 - i) * MINUTE_MS),
      });
    }

    const response = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: RIOT_ERRORS.manualRegionMismatch("EUW") });
    assert.equal(fake.totalCalls(), 0);
  });

  test("5. 429 cinco por hora (RF-21, D34): solo cuenta desafíos creados, singular/plural y gana sobre 409 texto y 503 sin clave", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await verifyLolFor(beto.id, "Ajeno#NA1", OTHER_RIOT_PUUID, "NA");

    // 3 peticiones rechazadas antes (404) NO cuentan para el límite de 5.
    fake.state.accountByRiotId = { kind: "not_found" };
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" })).status, 404);
    }

    // Crear 5 desafíos en la última hora (el más antiguo en t = FIXED_NOW).
    fake.reset();
    for (let i = 0; i < 5; i += 1) {
      nowMs = FIXED_NOW + i * MINUTE_MS;
      const res = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
      assert.equal(res.status, 201);
    }
    const callsBeforeLimit = fake.totalCalls();

    // 6.º pedido a los 4 min 30 s → faltan 55 min 30 s → redondea arriba a 56 minutos.
    // Aunque el Riot ID es de Beto (paso 6), gana el 429 del paso 5.
    nowMs = FIXED_NOW + 4 * MINUTE_MS + 30_000;
    const sixth = await createChallenge(ana, { riotId: "ajeno#na1", region: "LAS" });
    assert.equal(sixth.status, 429);
    assert.deepEqual(sixth.body, {
      error: "ya pediste 5 íconos en la última hora, espera 56 minutos antes de pedir otro",
    });
    assert.equal(fake.totalCalls(), callsBeforeLimit);

    // A los 59 min 20 s del primero → faltan 40 s → singular "1 minuto".
    nowMs = FIXED_NOW + 59 * MINUTE_MS + 20_000;
    const singular = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(singular.status, 429);
    assert.deepEqual(singular.body, {
      error: "ya pediste 5 íconos en la última hora, espera 1 minuto antes de pedir otro",
    });

    // Cumplida exactamente 1 hora del primero → vuelve a permitir.
    nowMs = FIXED_NOW + CHALLENGE_HOURLY_WINDOW_MS;
    const allowed = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(allowed.status, 201);
  });

  test("6. 409 otro verificó por texto del Riot ID sin distinguir mayúsculas ni región (RF-5, D51) y gana sobre 503 sin clave", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const beto = await signUp(appWithoutRiot, BETO);
    await verifyLolFor(beto.id, "Faker#KR1", OTHER_RIOT_PUUID, "KR");

    // Pide en LAS y con otras mayúsculas + espacios → igual detectado sin consultar a Riot.
    const response = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: "  fAkEr#kr1 ", region: "LAS" });
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: RIOT_ERRORS.verifiedElsewhere });
    assert.equal(fake.totalCalls(), 0);
  });

  test("7. 503 sin clave de Riot (RF-38)", async () => {
    const ana = await signUp(appWithoutRiot, ANA);
    const response = await withSession(
      ana.agent.post("/api/riot/challenges"),
      ana.csrf,
    ).send({ riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: RIOT_ERRORS.unavailable });
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("8. 503 limitador propio sin hueco para 2 consultas (RF-37, D84) sin llamar a Riot ni contar para 5/hora", async () => {
    const limiterNow = 1_000_000;
    const limiter = createRiotLimiter({
      nowMs: () => limiterNow,
      sleep: async () => undefined,
    });
    // Consumir 99 de 100 consultas → queda solo 1 hueco, insuficiente para reserva de 2.
    const r = limiter.reserve(RATE_LIMIT_2MIN - 1);
    assert.ok(r);

    const localFake = fakeRiotClient();
    const limitedApp = await riotApp({ client: localFake.client, limiter });
    const ana = await signUp(limitedApp, ANA);

    const response = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { error: RIOT_ERRORS.busy });
    assert.equal(localFake.totalCalls(), 0);
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });
});

describe("POST /api/riot/challenges — orden exacto de RF-22 (paso 2 consultando a Riot)", () => {
  test("9a. 503 por fallo de Riot en Account-v1 (unavailable o invalid_data) y libera la consulta sobrante (D69)", async () => {
    const limiter = createRiotLimiter({
      nowMs: () => 1_000_000,
      sleep: async () => undefined,
    });
    // Dejamos exactamente 3 huecos en la ventana de 2 min.
    const hold = limiter.reserve(RATE_LIMIT_2MIN - 3);
    assert.ok(hold);

    const localFake = fakeRiotClient({ accountByRiotId: { kind: "unavailable" } });
    const limitedApp = await riotApp({ client: localFake.client, limiter });
    const ana = await signUp(limitedApp, ANA);

    const first = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(first.status, 503);
    assert.deepEqual(first.body, { error: RIOT_ERRORS.unavailable });
    assert.equal(localFake.state.summonerByPuuidCalls.length, 0);

    // Como se usó 1 consulta y la 2.ª reservada se liberó en `finally` (D69), quedan 2 huecos
    // exactos y el siguiente pedido SÍ cabe.
    localFake.state.accountByRiotId = {
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
    };
    const second = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(second.status, 201);
  });

  test("9b. 503 por invalid_data en Account-v1 o Summoner-v4 (incluido nivel ilegible, RF-52)", async () => {
    const ana = await signUp(app, ANA);

    fake.state.accountByRiotId = { kind: "invalid_data" };
    const badAcct = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(badAcct.status, 503);
    assert.deepEqual(badAcct.body, { error: RIOT_ERRORS.unavailable });

    fake.reset();
    fake.state.summonerByPuuid = { kind: "invalid_data" };
    const badSumm = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(badSumm.status, 503);
    assert.deepEqual(badSumm.body, { error: RIOT_ERRORS.unavailable });

    // Nivel ilegible (`level: null`) también es 503 al pedir el desafío (RF-52, plan §5.1 paso 10).
    fake.reset();
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 5, level: null } };
    const badLevel = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(badLevel.status, 503);
    assert.deepEqual(badLevel.body, { error: RIOT_ERRORS.unavailable });

    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("9c. 503 cuando la operación supera el plazo máximo de 60 s (RNF-7), esperando a Riot o al limitador, y libera lock y reserva", async () => {
    const slowFake = fakeRiotClient({
      accountByRiotId: (_riotId, _region, signal) =>
        new Promise((resolve) => {
          signal?.addEventListener("abort", () => resolve({ kind: "unavailable" }), { once: true });
        }),
    });
    const slowApp = await riotApp({ client: slowFake.client }, { operationTimeoutMs: SHORT_OPERATION_TIMEOUT_MS });
    const ana = await signUp(slowApp, ANA);

    const timedOut = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(timedOut.status, 503);
    assert.deepEqual(timedOut.body, { error: RIOT_ERRORS.unavailable });

    // El lock se liberó: la siguiente petición rápida funciona.
    slowFake.state.accountByRiotId = {
      kind: "ok",
      account: { puuid: RIOT_PUUID, gameName: "JugadorUno", tagLine: "LAS", riotId: RIOT_ID },
    };
    const recovered = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(recovered.status, 201);

    // También cuando el tiempo se agota esperando en el limitador de 20/s (RNF-7).
    const fixedClock = 5_000_000;
    const busyLimiter = createRiotLimiter({
      nowMs: () => fixedClock,
      sleep: (_ms, signal) =>
        new Promise<void>((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")), {
            once: true,
          });
        }),
    });
    const seedRes = busyLimiter.reserve(RATE_LIMIT_1SEC);
    assert.ok(seedRes);
    for (let i = 0; i < RATE_LIMIT_1SEC; i += 1) {
      await busyLimiter.acquire(seedRes);
    }

    const waitingFake = fakeRiotClient();
    const waitingApp = await riotApp(
      { client: waitingFake.client, limiter: busyLimiter },
      { operationTimeoutMs: SHORT_OPERATION_TIMEOUT_MS },
    );
    const beto = await signUp(waitingApp, BETO);
    const waitTimedOut = await createChallenge(beto, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(waitTimedOut.status, 503);
    assert.deepEqual(waitTimedOut.body, { error: RIOT_ERRORS.unavailable });
    assert.equal(waitingFake.totalCalls(), 0);
  });

  test("10. 404 si Riot no encuentra el Riot ID o no tiene perfil en la región (RF-3, D4)", async () => {
    const ana = await signUp(app, ANA);

    // No existe la cuenta global: no llama a Summoner-v4.
    fake.state.accountByRiotId = { kind: "not_found" };
    const noAccount = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(noAccount.status, 404);
    assert.deepEqual(noAccount.body, { error: RIOT_ERRORS.accountNotFound });
    assert.equal(fake.state.summonerByPuuidCalls.length, 0);

    // Existe globalmente, pero sin perfil de LoL en esa región.
    fake.reset();
    fake.state.summonerByPuuid = { kind: "not_found" };
    const noSummoner = await createChallenge(ana, { riotId: RIOT_ID, region: "KR" });
    assert.equal(noSummoner.status, 404);
    assert.deepEqual(noSummoner.body, { error: RIOT_ERRORS.accountNotFound });
    assert.equal(fake.state.summonerByPuuidCalls.length, 1);

    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("11. 409 otro verificó por cuenta interna de Riot (puuid) aunque cambió el Riot ID (RF-5)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await verifyLolFor(beto.id, "NombreAntiguo#LAS", RIOT_PUUID, "LAS");

    // El texto es distinto ("NombreNuevo#LAS"), pasa el paso 6, pero Riot devuelve el mismo puuid.
    fake.state.accountByRiotId = {
      kind: "ok",
      account: {
        puuid: RIOT_PUUID,
        gameName: "NombreNuevo",
        tagLine: "LAS",
        riotId: "NombreNuevo#LAS",
      },
    };
    const response = await createChallenge(ana, { riotId: "NombreNuevo#LAS", region: "LAS" });
    assert.equal(response.status, 409);
    assert.deepEqual(response.body, { error: RIOT_ERRORS.verifiedElsewhere });
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("12. 429 sin íconos libres (RF-43, D26): calcula espera por el más antiguo, mantiene abierto el propio y no cuenta para 5/hora", async () => {
    const ana = await signUp(app, ANA);
    // Ana ya tiene un desafío abierto para otra cuenta (con ícono 28): no debe anularse.
    const ownOpen = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: OTHER_RIOT_PUUID,
      riotId: "OtraCuenta#LAS",
      region: "LAS",
      iconId: 28,
      now: new Date(FIXED_NOW - 1 * MINUTE_MS),
    });

    // Cuenta RIOT_PUUID tiene puesto el ícono 0 y 27 desafíos abiertos de otros usuarios con íconos 1..27.
    // El más antiguo se creó hace 6 min 30 s → vence en 3 min 30 s → redondea arriba a 4 minutos.
    fake.state.summonerByPuuid = { kind: "ok", summoner: { profileIconId: 0, level: 200 } };
    for (let iconId = 1; iconId <= 27; iconId += 1) {
      const createdAt =
        iconId === 1
          ? new Date(FIXED_NOW - 6 * MINUTE_MS - 30_000)
          : new Date(FIXED_NOW - 2 * MINUTE_MS);
      await createChallengeAndCancelPrevious({
        userId: new mongoose.Types.ObjectId().toHexString(),
        puuid: RIOT_PUUID,
        riotId: RIOT_ID,
        region: "LAS",
        iconId,
        now: createdAt,
      });
    }

    const response = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(response.status, 429);
    assert.deepEqual(response.body, {
      error: "no quedan íconos libres para esta cuenta, espera 4 minutos antes de pedir otro",
    });

    // No creó desafío para Ana, mantuvo el suyo abierto, y no contó para el límite por hora.
    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 1);
    const stillOwn = await RiotChallenge.findById(ownOpen._id).lean();
    assert.equal(stillOwn?.status, "open");

    // Singular "1 minuto" cuando el desafío abierto más antiguo vence en 40 s.
    nowMs = FIXED_NOW + 2 * MINUTE_MS + 50_000; // faltan 40 s para el más antiguo
    const singular = await createChallenge(ana, { riotId: RIOT_ID, region: "LAS" });
    assert.equal(singular.status, 429);
    assert.deepEqual(singular.body, {
      error: "no quedan íconos libres para esta cuenta, espera 1 minuto antes de pedir otro",
    });
  });
});
