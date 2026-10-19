// Modelo `PlaySession` sin base de datos (spec 006, RF-5; plan, sección 4).
// `validateSync` sobre documentos no guardados: el esquema es una red de seguridad; los
// textos que ve el cliente salen de `domain/sessionRules.ts`.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { PlaySession } from "../../src/models/playSession.ts";

const NOW = new Date("2026-10-19T12:00:00.000Z");

function validData() {
  const host = new mongoose.Types.ObjectId();
  return {
    gameId: "lol",
    host,
    title: "Ranked de noche",
    notes: "",
    day: 2,
    startHour: 21,
    durationHours: 2,
    slots: 5,
    participants: [host],
    status: "open",
    createdAt: NOW,
  };
}

function errorPaths(data: Record<string, unknown>): string[] {
  const error = new PlaySession(data).validateSync();
  // Mongoose devuelve `undefined` (no `null`) cuando no hay errores.
  return error ? Object.keys(error.errors) : [];
}

describe("PlaySession (esquema)", () => {
  test("un documento valido no da errores", () => {
    assert.deepStrictEqual(errorPaths(validData()), []);
  });

  test("status fuera de open|full da error", () => {
    assert.deepStrictEqual(errorPaths({ ...validData(), status: "closed" }), ["status"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), status: "full" }), []);
  });

  test("day 7 da error y los extremos 0 y 6 no", () => {
    assert.deepStrictEqual(errorPaths({ ...validData(), day: 7 }), ["day"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), day: 0 }), []);
    assert.deepStrictEqual(errorPaths({ ...validData(), day: 6 }), []);
  });

  test("slots 1 da error y los extremos 2 y 6 no", () => {
    assert.deepStrictEqual(errorPaths({ ...validData(), slots: 1 }), ["slots"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), slots: 7 }), ["slots"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), slots: 2 }), []);
    assert.deepStrictEqual(errorPaths({ ...validData(), slots: 6 }), []);
  });

  test("hora y duracion fuera de rango o no enteras dan error", () => {
    assert.deepStrictEqual(errorPaths({ ...validData(), startHour: 24 }), ["startHour"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), startHour: 1.5 }), ["startHour"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), durationHours: 0 }), ["durationHours"]);
    assert.deepStrictEqual(errorPaths({ ...validData(), durationHours: 5 }), ["durationHours"]);
  });

  test("juego fuera de lol|r6|cs2 da error", () => {
    assert.deepStrictEqual(errorPaths({ ...validData(), gameId: "dota" }), ["gameId"]);
  });

  test("faltan los campos obligatorios", () => {
    assert.deepStrictEqual(
      errorPaths({}).sort(),
      ["createdAt", "day", "durationHours", "gameId", "host", "slots", "startHour", "status", "title"].sort(),
    );
  });

  test("notas ausentes quedan en cadena vacia", () => {
    const data: Record<string, unknown> = validData();
    delete data.notes;
    assert.strictEqual(new PlaySession(data).notes, "");
  });

  test("DP6-7: un titulo de 60 emojis no da error de largo", () => {
    const title = "\u{1F600}".repeat(60);
    assert.strictEqual(title.length, 120);
    assert.deepStrictEqual(errorPaths({ ...validData(), title }), []);
  });

  test("notas de 160 emojis no dan error de largo", () => {
    assert.deepStrictEqual(errorPaths({ ...validData(), notes: "\u{1F600}".repeat(160) }), []);
  });

  test("RF-25: usa concurrencia optimista y no agrega marcas de tiempo propias", () => {
    assert.strictEqual(PlaySession.schema.get("optimisticConcurrency"), true);
    assert.strictEqual(PlaySession.schema.get("timestamps"), false);
  });
});
