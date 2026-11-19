import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_ERRORS } from "../../src/domain/accountRules.ts";
import { STEAM_ERRORS, parseCompleteBody } from "../../src/domain/steamRules.ts";

// Spec 013, RF-3, RF-6, RF-8, RF-9, RF-20, RF-22; plan, 4.1, 4.2 y 5.6 (`steamRules`).

describe("STEAM_ERRORS y los textos literales de RF-20", () => {
  test("RF-6: el texto del rechazo es el literal de la spec", () => {
    assert.equal(STEAM_ERRORS.verificationFailed, "no se pudo verificar con Steam, vuelve a intentarlo");
  });

  test("RF-8: la cuenta ya verificada por otro usuario usa el texto de la 012", () => {
    assert.equal(ACCOUNT_ERRORS.verifiedElsewhere, "esta cuenta ya está verificada por otro usuario");
  });

  test("RF-9: Steam no disponible usa el texto de la 012 con el nombre de Steam", () => {
    assert.equal(ACCOUNT_ERRORS.sourceUnavailable("Steam"), "Steam no está disponible por ahora, intenta más tarde");
  });

  test("RF-23: la cuenta que ya no existe en Steam usa el texto de la 012", () => {
    assert.equal(ACCOUNT_ERRORS.sourceAccountGone("Steam"), "la cuenta ya no existe en Steam");
  });

  test("RF-3: rechaza abrir un intento con una cuenta de CS2 ya verificada (texto acordado, O-3)", () => {
    assert.equal(
      STEAM_ERRORS.alreadyVerified,
      "ya tienes una cuenta de CS2 verificada; desvincúlala antes de verificar otra",
    );
  });

  test("RF-22: Steam sin configurar en este servidor", () => {
    assert.equal(STEAM_ERRORS.notConfigured, "Steam no está configurado en este servidor");
  });

  test("los textos van sin punto final y en minúscula inicial, salvo el nombre propio «Steam»", () => {
    for (const text of Object.values(STEAM_ERRORS)) {
      assert.match(text, /^([a-zá-ú]|Steam )/);
      assert.doesNotMatch(text, /\.$/);
    }
  });
});

describe("parseCompleteBody (RF-6)", () => {
  const OPENID = { "openid.mode": "id_res", "openid.sig": "x" };

  test("cuerpo válido: devuelve solo attempt y los parámetros openid.*", () => {
    const result = parseCompleteBody({ query: { attempt: "abc", ...OPENID, otro: "ignorado", utm: "x" } });
    assert.deepEqual(result, { ok: true, query: { attempt: "abc", ...OPENID } });
  });

  test("una consulta vacía es válida (vuelve sin respuesta, RF-5)", () => {
    assert.deepEqual(parseCompleteBody({ query: {} }), { ok: true, query: {} });
  });

  test("no es un objeto, o no trae query: inválido", () => {
    for (const body of [undefined, null, "x", 3, true, [], {}, { query: null }, { query: "x" }, { query: [] }, { query: 3 }]) {
      assert.deepEqual(parseCompleteBody(body), { ok: false }, JSON.stringify(body));
    }
  });

  test("un valor que no es texto, aunque sea de otra clave de la consulta, invalida el cuerpo", () => {
    assert.deepEqual(parseCompleteBody({ query: { attempt: ["a", "b"] } }), { ok: false });
    assert.deepEqual(parseCompleteBody({ query: { "openid.mode": 5 } }), { ok: false });
    assert.deepEqual(parseCompleteBody({ query: { "openid.mode": null } }), { ok: false });
    assert.deepEqual(parseCompleteBody({ query: { "openid.mode": { a: 1 } } }), { ok: false });
  });

  test("más de 40 claves o un valor de más de 2048 caracteres: inválido", () => {
    const muchas = Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`openid.k${i}`, "v"]));
    assert.deepEqual(parseCompleteBody({ query: muchas }), { ok: false });
    const justas = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`openid.k${i}`, "v"]));
    assert.equal(parseCompleteBody({ query: justas }).ok, true);
    assert.deepEqual(parseCompleteBody({ query: { "openid.sig": "a".repeat(2049) } }), { ok: false });
    assert.equal(parseCompleteBody({ query: { "openid.sig": "a".repeat(2048) } }).ok, true);
  });

  test("una clave de más de 64 caracteres: inválido", () => {
    assert.deepEqual(parseCompleteBody({ query: { [`openid.${"k".repeat(60)}`]: "v" } }), { ok: false });
  });

  test("__proto__ no contamina nada: se trata como una clave más y se descarta", () => {
    const body: unknown = JSON.parse('{"query":{"attempt":"abc","__proto__":"x","openid.mode":"id_res"}}');
    const result = parseCompleteBody(body);
    assert.deepEqual(result, { ok: true, query: { attempt: "abc", "openid.mode": "id_res" } });
    assert.equal(Object.getPrototypeOf({}), Object.prototype);
    assert.equal(({} as Record<string, unknown>)["x"], undefined);
  });

  test("no modifica el cuerpo recibido", () => {
    const body = Object.freeze({ query: Object.freeze({ attempt: "abc", ...OPENID }) });
    assert.equal(parseCompleteBody(body).ok, true);
  });
});
