// Pruebas de cleanupFailure (spec 018, RF-12, U6; plan §5.3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanupFailure } from "./fixtures.ts";

const user = { email: "e2e-0123456789ab@example.com", username: "e2e_0123456789ab" };

test("con código HTTP: dice que falló la limpieza, qué usuario quedó, el paso y el código", () => {
  const message = cleanupFailure(user, "el inicio de sesión", { kind: "status", status: 401, problem: null });
  assert.equal(
    message,
    "Falló la limpieza, no el escenario: el usuario de prueba e2e-0123456789ab@example.com " +
      "(e2e_0123456789ab) quedó en la base E2E; el inicio de sesión respondió 401",
  );
});

test("sin respuesta: dice el motivo", () => {
  const message = cleanupFailure(user, "la eliminación", { kind: "no-response", reason: "fetch failed" });
  assert.equal(
    message,
    "Falló la limpieza, no el escenario: el usuario de prueba e2e-0123456789ab@example.com " +
      "(e2e_0123456789ab) quedó en la base E2E; la eliminación no respondió: fetch failed",
  );
});

test("con código y un problema en la respuesta: lo añade", () => {
  const message = cleanupFailure(user, "el inicio de sesión", {
    kind: "status",
    status: 200,
    problem: "sin la cookie token",
  });
  assert.ok(message.endsWith("el inicio de sesión respondió 200 (sin la cookie token)"));
});
