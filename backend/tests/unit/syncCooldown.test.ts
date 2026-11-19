import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SYNC_COOLDOWN_MS, syncCooldown } from "../../src/domain/syncCooldown.ts";

// Spec 012, RF-16, RF-18; plan, sección 2 (`syncCooldown`).

const LAST = new Date("2026-11-04T12:00:00.000Z");
const after = (ms: number) => new Date(LAST.getTime() + ms);
const SECOND = 1000;
const MINUTE = 60 * SECOND;

// Spec 013, RF-12 y D6: una cuenta verificada sin perfil no tiene una lectura que cuente para la
// espera (`null`), así que el dueño puede resincronizar de inmediato.
describe("syncCooldown sin lectura que cuente (013, RF-12, D6)", () => {
  test("null → permitido, sea cual sea el instante", () => {
    assert.deepEqual(syncCooldown(null, LAST), { allowed: true });
    assert.deepEqual(syncCooldown(null, new Date(0)), { allowed: true });
  });
});

describe("syncCooldown (RF-16)", () => {
  test("la espera mínima es de 5 minutos", () => {
    assert.equal(SYNC_COOLDOWN_MS, 5 * MINUTE);
  });

  test("recién sincronizada: faltan 5 minutos", () => {
    assert.deepEqual(syncCooldown(LAST, after(0)), { allowed: false, minutes: 5 });
  });

  test("a los 4 min 10 s falta 1 minuto (redondeo hacia arriba)", () => {
    assert.deepEqual(syncCooldown(LAST, after(4 * MINUTE + 10 * SECOND)), { allowed: false, minutes: 1 });
  });

  test("a 1 s de cumplirse sigue faltando 1 minuto, nunca 0", () => {
    assert.deepEqual(syncCooldown(LAST, after(5 * MINUTE - SECOND)), { allowed: false, minutes: 1 });
  });

  test("a 1 min exacto faltan 4", () => {
    assert.deepEqual(syncCooldown(LAST, after(MINUTE)), { allowed: false, minutes: 4 });
  });

  test("a 1 min 1 s faltan 4 (3 min 59 s hacia arriba)", () => {
    assert.deepEqual(syncCooldown(LAST, after(MINUTE + SECOND)), { allowed: false, minutes: 4 });
  });

  test("a los 5 minutos exactos ya se permite", () => {
    assert.deepEqual(syncCooldown(LAST, after(5 * MINUTE)), { allowed: true });
  });

  test("pasado el plazo se permite", () => {
    assert.deepEqual(syncCooldown(LAST, after(5 * MINUTE + 1)), { allowed: true });
    assert.deepEqual(syncCooldown(LAST, after(24 * 60 * MINUTE)), { allowed: true });
  });

  test("reloj atrasado (la última sincronización es futura): se permite", () => {
    assert.deepEqual(syncCooldown(LAST, after(-MINUTE)), { allowed: true });
  });

  test("no muta sus argumentos", () => {
    const last = new Date(LAST.getTime());
    const now = after(MINUTE);
    syncCooldown(last, now);
    assert.equal(last.getTime(), LAST.getTime());
    assert.equal(now.getTime(), LAST.getTime() + MINUTE);
  });
});
