import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  OBJECT_ID_PATTERN,
  SELF_ALIAS,
  USER_TARGET_MESSAGES,
  decodeSegment,
  matchUserRoute,
  resolveUserTarget,
} from "../../src/services/userTarget.ts";
import { MESSAGES } from "../../src/utils/errors.ts";

const SESSION_ID = "0123456789abcdef01234567";
const OTHER_ID = "fedcba9876543210fedcba98";

describe("matchUserRoute (§2.1, RF-18, RF-20)", () => {
  test("listado: GET / y HEAD /", () => {
    assert.deepEqual(matchUserRoute("GET", "/"), { kind: "list" });
    assert.deepEqual(matchUserRoute("HEAD", "/"), { kind: "list" });
  });

  test("listado: admite una / final (/api/users/ llega como //)", () => {
    assert.deepEqual(matchUserRoute("GET", "//"), { kind: "list" });
    assert.equal(matchUserRoute("POST", "//"), null);
    assert.equal(matchUserRoute("GET", "///"), null);
  });

  test("usuario: GET, HEAD, PATCH y DELETE /<seg>", () => {
    for (const method of ["GET", "HEAD", "PATCH", "DELETE"]) {
      assert.deepEqual(matchUserRoute(method, "/me"), { kind: "user", rawSegment: "me" }, method);
      assert.deepEqual(
        matchUserRoute(method, `/${SESSION_ID}`),
        { kind: "user", rawSegment: SESSION_ID },
        method,
      );
    }
  });

  test("usuario: el segmento se entrega sin decodificar", () => {
    assert.deepEqual(matchUserRoute("GET", "/m%65"), { kind: "user", rawSegment: "m%65" });
    assert.deepEqual(matchUserRoute("PATCH", "/%zz"), { kind: "user", rawSegment: "%zz" });
    assert.deepEqual(matchUserRoute("DELETE", "/%E0%A4"), { kind: "user", rawSegment: "%E0%A4" });
    assert.deepEqual(matchUserRoute("GET", "/%20me"), { kind: "user", rawSegment: "%20me" });
  });

  test("usuario: admite una / final", () => {
    assert.deepEqual(matchUserRoute("GET", "/me/"), { kind: "user", rawSegment: "me" });
    assert.deepEqual(matchUserRoute("DELETE", "/me/"), { kind: "user", rawSegment: "me" });
  });

  test("disponibilidad: GET, HEAD y PUT /<seg>/availability", () => {
    for (const method of ["GET", "HEAD", "PUT"]) {
      assert.deepEqual(
        matchUserRoute(method, "/me/availability"),
        { kind: "availability", rawSegment: "me" },
        method,
      );
    }
  });

  test("disponibilidad: / final y availability sin distinguir mayúsculas", () => {
    assert.deepEqual(matchUserRoute("GET", "/me/availability/"), {
      kind: "availability",
      rawSegment: "me",
    });
    assert.deepEqual(matchUserRoute("PUT", "/me/AVAILABILITY"), {
      kind: "availability",
      rawSegment: "me",
    });
    assert.deepEqual(matchUserRoute("GET", "/%zz/Availability/"), {
      kind: "availability",
      rawSegment: "%zz",
    });
  });

  test("cualquier otro par → null (sigue al 404 de la spec 001)", () => {
    const cases: Array<[string, string]> = [
      ["POST", "/"],
      ["PUT", "/"],
      ["DELETE", "/"],
      ["PATCH", "/"],
      ["POST", "/x"],
      ["PUT", "/x"],
      ["POST", "/me/availability"],
      ["PATCH", "/me/availability"],
      ["DELETE", "/me/availability"],
      ["GET", "/x/availability/y"],
      ["GET", "/x/otro"],
      ["GET", "//availability"],
      ["GET", "/x//"],
      ["OPTIONS", "/me"],
    ];
    for (const [method, path] of cases) {
      assert.equal(matchUserRoute(method, path), null, `${method} ${path}`);
    }
  });
});

describe("decodeSegment (Definiciones, RF-5, RF-6)", () => {
  test("decodifica la codificación por porcentaje", () => {
    assert.equal(decodeSegment("m%65"), "me");
    assert.equal(decodeSegment("%20me"), " me");
    assert.equal(decodeSegment("me"), "me");
    assert.equal(decodeSegment(SESSION_ID), SESSION_ID);
  });

  test("codificación mal formada → null", () => {
    for (const raw of ["%zz", "%E0%A4", "%", "me%", "%2"]) {
      assert.equal(decodeSegment(raw), null, raw);
    }
  });
});

describe("resolveUserTarget (RF-5, RF-6, RF-10, RF-18, RF-20)", () => {
  test("me es la referencia propia (exacta)", () => {
    assert.deepEqual(resolveUserTarget("me", SESSION_ID), { ok: true, id: SESSION_ID, own: true });
  });

  test("me resuelve al id de sesión en minúsculas", () => {
    assert.deepEqual(resolveUserTarget("me", SESSION_ID.toUpperCase()), {
      ok: true,
      id: SESSION_ID,
      own: true,
    });
  });

  test("m%65 decodificado equivale a me", () => {
    const decoded = decodeSegment("m%65");
    assert.ok(decoded !== null);
    assert.deepEqual(resolveUserTarget(decoded, SESSION_ID), {
      ok: true,
      id: SESSION_ID,
      own: true,
    });
  });

  test("variantes de me y formatos inválidos → id con formato inválido", () => {
    const invalid = [
      "Me",
      "ME",
      "mE",
      " me",
      "me ",
      "aaaaaaaaaaaa",
      "a".repeat(23),
      "a".repeat(25),
      `${"a".repeat(23)}g`,
      "g".repeat(24),
      `${SESSION_ID}\n`,
      ` ${SESSION_ID}`,
      "",
      "/",
    ];
    for (const decoded of invalid) {
      assert.deepEqual(
        resolveUserTarget(decoded, SESSION_ID),
        { ok: false, error: "id con formato inválido" },
        JSON.stringify(decoded),
      );
    }
  });

  test("id propio en mayúsculas cuenta como propio, con id en minúsculas", () => {
    assert.deepEqual(resolveUserTarget(SESSION_ID.toUpperCase(), SESSION_ID), {
      ok: true,
      id: SESSION_ID,
      own: true,
    });
  });

  test("id propio en minúsculas → propio", () => {
    assert.deepEqual(resolveUserTarget(SESSION_ID, SESSION_ID), {
      ok: true,
      id: SESSION_ID,
      own: true,
    });
  });

  test("otro id válido → no propio (sin comprobar existencia)", () => {
    assert.deepEqual(resolveUserTarget(OTHER_ID, SESSION_ID), {
      ok: true,
      id: OTHER_ID,
      own: false,
    });
    assert.deepEqual(resolveUserTarget(OTHER_ID.toUpperCase(), SESSION_ID), {
      ok: true,
      id: OTHER_ID,
      own: false,
    });
  });
});

describe("constantes y mensajes (RNF-4)", () => {
  test("alias y patrón", () => {
    assert.equal(SELF_ALIAS, "me");
    assert.equal(OBJECT_ID_PATTERN.source, "^[0-9a-fA-F]{24}$");
    assert.equal(OBJECT_ID_PATTERN.flags, "");
  });

  test("textos literales de la spec, reexportados de utils/errors.ts", () => {
    assert.deepEqual(USER_TARGET_MESSAGES, {
      invalidId: "id con formato inválido",
      forbidden: "no tienes permiso para esta operación",
      userNotFound: "usuario no encontrado",
    });
    assert.equal(USER_TARGET_MESSAGES.invalidId, MESSAGES.invalidId);
    assert.equal(USER_TARGET_MESSAGES.forbidden, MESSAGES.forbidden);
  });

  test("cada mensaje en minúscula, sin espacios extremos y sin punto final", () => {
    for (const [key, message] of Object.entries(USER_TARGET_MESSAGES)) {
      assert.match(message, /^\p{Ll}/u, key);
      assert.ok(!message.endsWith("."), key);
      assert.equal(message, message.trim(), key);
    }
  });
});
