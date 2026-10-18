// Reloj de las cuentas de juego (spec 004, RNF-1, RNF-9; plan, P-5 y sección 9).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { clock } from "../../src/utils/clock.ts";

describe("clock", () => {
  test("now devuelve el instante actual como Date", () => {
    const before = Date.now();
    const value = clock.now();
    const after = Date.now();
    assert.ok(value instanceof Date);
    assert.ok(value.getTime() >= before && value.getTime() <= after);
  });

  test("las pruebas pueden fijarlo con t.mock.method y se restaura al terminar", (t) => {
    const fixed = new Date("2026-03-15T18:30:00.000Z");
    t.mock.method(clock, "now", () => new Date(fixed));
    assert.strictEqual(clock.now().toISOString(), fixed.toISOString());
    t.mock.restoreAll();
    assert.notStrictEqual(clock.now().toISOString(), fixed.toISOString());
  });
});
