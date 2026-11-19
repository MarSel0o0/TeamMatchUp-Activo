// Modelo `SteamAttempt` sin base de datos (spec 013, RF-1, RF-6, RNF-7; plan, P13-1 a P13-3).
// Solo mira el esquema: los índices reales en MongoDB se comprueban en
// `tests/controllers/steamAttempts.test.ts`.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";

type IndexDefinition = [Record<string, unknown>, Record<string, unknown>];

function indexes(): IndexDefinition[] {
  return SteamAttempt.schema.indexes() as IndexDefinition[];
}

function indexOn(field: string): IndexDefinition | undefined {
  return indexes().find(([keys]) => Object.keys(keys).length === 1 && field in keys);
}

describe("SteamAttempt: esquema", () => {
  const NOW = new Date("2026-11-18T12:00:00.000Z");

  test("guarda solo usuario, hash del token y vencimiento", () => {
    const paths = Object.keys(SteamAttempt.schema.paths).filter((path) => !path.startsWith("_"));
    assert.deepEqual(paths.sort(), ["expiresAt", "tokenHash", "user"]);
  });

  test("los tres campos son obligatorios", () => {
    const attempt = new SteamAttempt({});
    const error = attempt.validateSync();
    assert.ok(error);
    assert.deepEqual(Object.keys(error.errors).sort(), ["expiresAt", "tokenHash", "user"]);
  });

  test("un intento completo es válido y no guarda ningún campo de más", () => {
    const attempt = new SteamAttempt({
      user: new mongoose.Types.ObjectId(),
      tokenHash: "a".repeat(64),
      expiresAt: NOW,
      token: "no-debe-guardarse",
    });
    assert.equal(attempt.validateSync(), undefined);
    assert.equal("token" in attempt.toObject(), false);
  });

  test("P13-3 (D11): índice único en user, un intento abierto por usuario", () => {
    const index = indexOn("user");
    assert.ok(index, "falta el índice sobre user");
    assert.equal(index[1]["unique"], true);
  });

  test("RNF-7: índice TTL sobre expiresAt con expireAfterSeconds 0", () => {
    const index = indexOn("expiresAt");
    assert.ok(index, "falta el índice sobre expiresAt");
    assert.equal(index[1]["expireAfterSeconds"], 0);
  });

  test("P13-2: el hash del token tiene índice único para buscarlo", () => {
    const index = indexOn("tokenHash");
    assert.ok(index, "falta el índice sobre tokenHash");
    assert.equal(index[1]["unique"], true);
  });
});
