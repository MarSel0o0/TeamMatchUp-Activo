// Intentos de verificación con Steam: modelo y servicio contra MongoDB (spec 013, T3).
// RF-1, RF-6, RF-7, RNF-7; plan, P13-1 a P13-5 y 4.2.
// - Un intento por usuario (D11): abrir otro anula el anterior (índice único en `user` y `upsert`).
// - En la base solo queda el hash SHA-256 del token (P13-2).
// - `consumeAttempt` es de un solo uso aunque dos peticiones lo intenten a la vez (P13-4).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { ATTEMPT_TTL_MS } from "../../src/domain/steamAttempt.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { connectDatabase, prepareDatabase } from "../../src/server.ts";
import {
  consumeAttempt,
  discardAttempt,
  findAttempt,
  hashToken,
  openAttempt,
} from "../../src/services/steamAttempts.ts";
import { testConfig } from "../server/helpers.ts";

const NOW = new Date("2026-11-18T12:00:00.000Z");
const ANA = new mongoose.Types.ObjectId().toHexString();
const BETO = new mongoose.Types.ObjectId().toHexString();

before(async () => {
  await connectDatabase(testConfig().db);
  await SteamAttempt.init();
});

beforeEach(async () => {
  await SteamAttempt.deleteMany({});
});

after(async () => {
  await SteamAttempt.deleteMany({});
  await mongoose.disconnect();
});

function rawAttempts() {
  return SteamAttempt.collection.find({}).toArray();
}

describe("hashToken (P13-2)", () => {
  test("es el SHA-256 en hexadecimal del token", () => {
    assert.equal(hashToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.equal(hashToken("abc"), createHash("sha256").update("abc").digest("hex"));
  });
});

describe("openAttempt (RF-1, D11)", () => {
  test("devuelve un token en base64url de 32 bytes y el vencimiento a 10 minutos", async () => {
    const opened = await openAttempt(ANA, NOW);
    assert.match(opened.token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(opened.expiresAt.getTime(), NOW.getTime() + ATTEMPT_TTL_MS);
  });

  test("dos intentos de usuarios distintos no comparten token", async () => {
    const first = await openAttempt(ANA, NOW);
    const second = await openAttempt(BETO, NOW);
    assert.notEqual(first.token, second.token);
    assert.equal((await rawAttempts()).length, 2);
  });

  test("P13-2: en la base solo está el hash; el token en claro no aparece en ningún campo", async () => {
    const { token } = await openAttempt(ANA, NOW);
    const docs = await rawAttempts();
    assert.equal(docs.length, 1);
    assert.equal(docs[0]?.["tokenHash"], hashToken(token));
    assert.equal(JSON.stringify(docs[0]).includes(token), false);
    assert.equal(String(docs[0]?.["user"]), ANA);
    assert.equal((docs[0]?.["expiresAt"] as Date).getTime(), NOW.getTime() + ATTEMPT_TTL_MS);
  });

  test("D11: abrir otro intento anula el anterior, queda un solo documento del usuario", async () => {
    const first = await openAttempt(ANA, NOW);
    const second = await openAttempt(ANA, new Date(NOW.getTime() + 60_000));
    assert.notEqual(first.token, second.token);
    assert.equal((await rawAttempts()).length, 1);
    assert.equal(await findAttempt(first.token), null);
    const found = await findAttempt(second.token);
    assert.equal(found?.userId, ANA);
    assert.equal(found?.expiresAt.getTime(), NOW.getTime() + 60_000 + ATTEMPT_TTL_MS);
  });

  test("abrir un intento no toca el de otro usuario", async () => {
    const betos = await openAttempt(BETO, NOW);
    await openAttempt(ANA, NOW);
    await openAttempt(ANA, NOW);
    assert.equal((await findAttempt(betos.token))?.userId, BETO);
  });

  test("varios intentos del mismo usuario a la vez: ninguno falla y queda uno solo", async () => {
    const opened = await Promise.all(Array.from({ length: 8 }, () => openAttempt(ANA, NOW)));
    assert.equal(new Set(opened.map((attempt) => attempt.token)).size, 8);
    const docs = await rawAttempts();
    assert.equal(docs.length, 1);
    const valid = await Promise.all(opened.map((attempt) => findAttempt(attempt.token)));
    assert.equal(valid.filter((attempt) => attempt !== null).length, 1);
  });
});

describe("findAttempt (RF-6)", () => {
  test("devuelve usuario, vencimiento y el hash del intento abierto", async () => {
    const { token, expiresAt } = await openAttempt(ANA, NOW);
    const found = await findAttempt(token);
    assert.ok(found);
    assert.equal(found.userId, ANA);
    assert.equal(found.expiresAt.getTime(), expiresAt.getTime());
    assert.equal(found.tokenHash, hashToken(token));
    assert.match(found.id, /^[0-9a-f]{24}$/);
  });

  test("un token desconocido, vacío, muy largo o parecido → null", async () => {
    const { token } = await openAttempt(ANA, NOW);
    for (const other of ["", "x", "no-existe", `${token}x`, token.slice(1), "a".repeat(5000)]) {
      assert.equal(await findAttempt(other), null, other.slice(0, 20));
    }
  });
});

describe("consumeAttempt (RF-6, P13-4)", () => {
  test("la primera vez borra el intento y devuelve true; la segunda, false", async () => {
    const { token } = await openAttempt(ANA, NOW);
    const found = await findAttempt(token);
    assert.ok(found);
    assert.equal(await consumeAttempt(found), true);
    assert.equal(await consumeAttempt(found), false);
    assert.equal(await findAttempt(token), null);
    assert.equal((await rawAttempts()).length, 0);
  });

  test("dos peticiones a la vez con el mismo intento: solo una lo consume", async () => {
    const { token } = await openAttempt(ANA, NOW);
    const found = await findAttempt(token);
    assert.ok(found);
    const results = await Promise.all([consumeAttempt(found), consumeAttempt(found), consumeAttempt(found)]);
    assert.deepEqual(results.filter(Boolean), [true]);
  });

  test("un intento ya anulado por otro nuevo no se puede consumir con la lectura vieja", async () => {
    const first = await openAttempt(ANA, NOW);
    const stale = await findAttempt(first.token);
    assert.ok(stale);
    const second = await openAttempt(ANA, NOW);
    assert.equal(await consumeAttempt(stale), false);
    assert.ok(await findAttempt(second.token), "el intento nuevo sigue intacto");
  });

  test("consumir uno no toca el de otro usuario", async () => {
    const anas = await openAttempt(ANA, NOW);
    const betos = await openAttempt(BETO, NOW);
    const found = await findAttempt(anas.token);
    assert.ok(found);
    await consumeAttempt(found);
    assert.equal((await findAttempt(betos.token))?.userId, BETO);
  });
});

describe("discardAttempt (RF-5, RF-7)", () => {
  test("borra el intento propio", async () => {
    const { token } = await openAttempt(ANA, NOW);
    await discardAttempt(ANA, token);
    assert.equal(await findAttempt(token), null);
  });

  test("no borra el intento de otro usuario aunque se conozca su token", async () => {
    const { token } = await openAttempt(ANA, NOW);
    await discardAttempt(BETO, token);
    assert.equal((await findAttempt(token))?.userId, ANA);
  });

  test("un token desconocido no falla ni borra nada", async () => {
    const { token } = await openAttempt(ANA, NOW);
    await discardAttempt(ANA, "no-existe");
    await discardAttempt(ANA, "");
    assert.ok(await findAttempt(token));
  });
});

describe("índices en MongoDB (P13-3, RNF-7)", () => {
  test("prepareDatabase inicializa el modelo para crear sus índices (se hace antes de escuchar)", async (t) => {
    // `Model.init()` se memoiza: no se vuelve a ejecutar tras borrar la colección. Por eso se
    // comprueba que el arranque lo llama y, aparte, que los índices existen en la base.
    const init = t.mock.method(SteamAttempt, "init");
    await prepareDatabase();
    assert.equal(init.mock.callCount(), 1);
  });

  test("la colección tiene el índice único por usuario, el único del hash y el TTL de 0 segundos", async () => {
    const indexes = await SteamAttempt.collection.indexes();
    const byKey = new Map(indexes.map((index) => [Object.keys(index.key).join(","), index]));
    assert.equal(byKey.get("user")?.unique, true);
    assert.equal(byKey.get("tokenHash")?.unique, true);
    assert.equal(byKey.get("expiresAt")?.expireAfterSeconds, 0);
  });

  test("el índice único impide dos intentos del mismo usuario a nivel de base", async () => {
    await SteamAttempt.create({ user: ANA, tokenHash: "a".repeat(64), expiresAt: NOW });
    await assert.rejects(
      SteamAttempt.create({ user: ANA, tokenHash: "b".repeat(64), expiresAt: NOW }),
      (error: unknown) => error instanceof mongoose.mongo.MongoServerError && error.code === 11000,
    );
  });
});
