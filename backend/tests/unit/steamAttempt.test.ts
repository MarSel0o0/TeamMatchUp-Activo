import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ATTEMPT_TTL_MS, attemptExpiry, attemptStatus } from "../../src/domain/steamAttempt.ts";

// Spec 013, RF-1, RF-6 y D11; plan, secciones 3 y 4.2 (`steamAttempt`).

const NOW = new Date("2026-11-18T12:00:00.000Z");
const MINUTE = 60 * 1000;
const OWNER = "66b7f0c2a1d3e4f5a6b7c8d9";
const OTHER = "66b7f0c2a1d3e4f5a6b7c8da";

describe("attemptExpiry (RF-1)", () => {
  test("el intento vale 10 minutos", () => {
    assert.equal(ATTEMPT_TTL_MS, 10 * MINUTE);
  });

  test("vence 10 minutos después del instante dado", () => {
    assert.equal(attemptExpiry(NOW).toISOString(), "2026-11-18T12:10:00.000Z");
  });

  test("no modifica el instante recibido", () => {
    const frozen = new Date(NOW.getTime());
    attemptExpiry(frozen);
    assert.equal(frozen.getTime(), NOW.getTime());
  });
});

describe("attemptStatus (RF-6)", () => {
  const attempt = { userId: OWNER, expiresAt: new Date(NOW.getTime() + 10 * MINUTE) };

  test("del mismo usuario y vigente → ok", () => {
    assert.equal(attemptStatus(attempt, OWNER, NOW), "ok");
  });

  test("a 1 ms de vencer sigue vigente", () => {
    assert.equal(attemptStatus(attempt, OWNER, new Date(attempt.expiresAt.getTime() - 1)), "ok");
  });

  test("justo en el instante de vencimiento ya venció", () => {
    assert.equal(attemptStatus(attempt, OWNER, attempt.expiresAt), "expired");
  });

  test("después del vencimiento → expired", () => {
    assert.equal(attemptStatus(attempt, OWNER, new Date(attempt.expiresAt.getTime() + MINUTE)), "expired");
  });

  test("de otro usuario → foreign", () => {
    assert.equal(attemptStatus(attempt, OTHER, NOW), "foreign");
  });

  test("lo ajeno prevalece sobre lo vencido: no revela si el intento de otro venció", () => {
    const vencido = { userId: OWNER, expiresAt: new Date(NOW.getTime() - MINUTE) };
    assert.equal(attemptStatus(vencido, OTHER, NOW), "foreign");
  });
});
