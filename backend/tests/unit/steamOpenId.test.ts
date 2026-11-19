import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  STEAM_OPENID_URL,
  buildCheckAuthBody,
  buildLoginParams,
  isValidCheckResponse,
  parseSteamResponse,
} from "../../src/domain/steamOpenId.ts";

// Spec 013, RF-1, RF-4, RF-5, RF-6, RNF-1, RNF-4; plan, P13-8 (`steamOpenId`).

const REALM = "https://fullstack.dcc.uchile.cl:7041";
const RETURN_TO = `${REALM}/verificar/steam?attempt=abc123`;
const STEAM_ID = "76561198000000001";
const CLAIMED = `https://steamcommunity.com/openid/id/${STEAM_ID}`;
const SIGNED = "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle";

function validQuery(overrides: Record<string, string | undefined> = {}): Record<string, string> {
  const base: Record<string, string> = {
    attempt: "abc123",
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_OPENID_URL,
    "openid.claimed_id": CLAIMED,
    "openid.identity": CLAIMED,
    "openid.return_to": RETURN_TO,
    "openid.response_nonce": "2026-11-18T12:00:00ZAbCdEf",
    "openid.assoc_handle": "1234567890",
    "openid.signed": SIGNED,
    "openid.sig": "firmaEnBase64=",
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete base[key];
    else base[key] = value;
  }
  return base;
}

describe("buildLoginParams (RF-1)", () => {
  test("pide el inicio de sesión de Steam con la dirección de vuelta y el realm dados", () => {
    assert.deepEqual(buildLoginParams(RETURN_TO, REALM), {
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": RETURN_TO,
      "openid.realm": REALM,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });
  });

  test("el punto de entrada es la página oficial de Steam", () => {
    assert.equal(STEAM_OPENID_URL, "https://steamcommunity.com/openid/login");
  });
});

describe("parseSteamResponse — respuesta válida (RF-4)", () => {
  test("devuelve el SteamID64 de claimed_id y solo los parámetros openid.*", () => {
    const result = parseSteamResponse(validQuery(), RETURN_TO);
    assert.equal(result.kind, "assertion");
    if (result.kind !== "assertion") return;
    assert.equal(result.steamId, STEAM_ID);
    assert.equal(result.params["openid.claimed_id"], CLAIMED);
    assert.equal("attempt" in result.params, false);
    assert.ok(Object.keys(result.params).every((key) => key.startsWith("openid.")));
  });

  test("no modifica la consulta recibida", () => {
    const query = Object.freeze(validQuery());
    assert.equal(parseSteamResponse(query, RETURN_TO).kind, "assertion");
  });
});

describe("parseSteamResponse — cancelación (RF-5)", () => {
  test("openid.mode=cancel → cancelled", () => {
    assert.deepEqual(parseSteamResponse({ attempt: "abc123", "openid.mode": "cancel" }, RETURN_TO), {
      kind: "cancelled",
    });
  });

  test("sin openid.mode (volvió sin respuesta) → cancelled", () => {
    assert.deepEqual(parseSteamResponse({ attempt: "abc123" }, RETURN_TO), { kind: "cancelled" });
    assert.deepEqual(parseSteamResponse({}, RETURN_TO), { kind: "cancelled" });
  });

  test("cualquier otro modo distinto de id_res también se trata como cancelación", () => {
    assert.deepEqual(parseSteamResponse(validQuery({ "openid.mode": "setup_needed" }), RETURN_TO), {
      kind: "cancelled",
    });
  });
});

describe("parseSteamResponse — respuesta inválida (RF-6, RNF-4, P13-8)", () => {
  const invalid = (overrides: Record<string, string | undefined>, expected = RETURN_TO) =>
    assert.deepEqual(parseSteamResponse(validQuery(overrides), expected), { kind: "invalid" });

  test("falta la firma o está vacía", () => {
    invalid({ "openid.sig": undefined });
    invalid({ "openid.sig": "" });
  });

  test("openid.signed no incluye un campo obligatorio (cada uno por separado)", () => {
    for (const field of ["op_endpoint", "claimed_id", "identity", "return_to", "response_nonce", "assoc_handle"]) {
      const signed = SIGNED.split(",").filter((name) => name !== field).join(",");
      invalid({ "openid.signed": signed });
    }
  });

  test("openid.signed ausente", () => {
    invalid({ "openid.signed": undefined });
  });

  test("op_endpoint no es el de Steam", () => {
    invalid({ "openid.op_endpoint": "https://evil.example/openid/login" });
    invalid({ "openid.op_endpoint": undefined });
  });

  test("ns distinto de OpenID 2.0", () => {
    invalid({ "openid.ns": "http://openid.net/signon/1.1" });
    invalid({ "openid.ns": undefined });
  });

  test("return_to distinto del esperado: otro token, otro origen, otra ruta o sin token", () => {
    invalid({ "openid.return_to": `${REALM}/verificar/steam?attempt=otro` });
    invalid({ "openid.return_to": "https://evil.example/verificar/steam?attempt=abc123" });
    invalid({ "openid.return_to": `${REALM}/otra/ruta?attempt=abc123` });
    invalid({ "openid.return_to": `${REALM}/verificar/steam` });
    invalid({ "openid.return_to": undefined });
  });

  test("la dirección esperada también cuenta: con otro token esperado, la misma respuesta es inválida", () => {
    invalid({}, `${REALM}/verificar/steam?attempt=distinto`);
  });

  test("claimed_id con 16 o 18 dígitos, de otro prefijo, de otro dominio o sin https", () => {
    for (const claimed of [
      "https://steamcommunity.com/openid/id/7656119800000000",
      "https://steamcommunity.com/openid/id/765611980000000012",
      "https://steamcommunity.com/openid/id/12345678901234567",
      "https://steamcommunity.com.evil.example/openid/id/76561198000000001",
      "http://steamcommunity.com/openid/id/76561198000000001",
      "https://steamcommunity.com/openid/id/76561198000000001/extra",
      "https://steamcommunity.com/openid/id/76561198000000001?x=1",
      "https://steamcommunity.com/openid/id/abcdefghijklmnopq",
    ]) {
      invalid({ "openid.claimed_id": claimed, "openid.identity": claimed });
    }
    invalid({ "openid.claimed_id": undefined });
  });

  test("identity distinta de claimed_id o ausente", () => {
    invalid({ "openid.identity": "https://steamcommunity.com/openid/id/76561198000000002" });
    invalid({ "openid.identity": undefined });
  });

  test("response_nonce o assoc_handle vacíos o ausentes", () => {
    invalid({ "openid.response_nonce": "" });
    invalid({ "openid.response_nonce": undefined });
    invalid({ "openid.assoc_handle": "" });
    invalid({ "openid.assoc_handle": undefined });
  });
});

describe("buildCheckAuthBody (RF-4, RNF-1)", () => {
  test("repite los parámetros openid.* recibidos y cambia el modo a check_authentication", () => {
    const result = parseSteamResponse(validQuery(), RETURN_TO);
    assert.equal(result.kind, "assertion");
    if (result.kind !== "assertion") return;
    const body = buildCheckAuthBody(result.params);
    assert.equal(body["openid.mode"], "check_authentication");
    assert.equal(body["openid.sig"], "firmaEnBase64=");
    assert.equal(body["openid.signed"], SIGNED);
    assert.equal(body["openid.claimed_id"], CLAIMED);
    assert.equal(body["openid.return_to"], RETURN_TO);
  });

  test("ignora todo lo que no sea openid.* (el intento, cookies, contraseñas…)", () => {
    const body = buildCheckAuthBody({
      ...validQuery(),
      password: "no-debe-salir",
      attempt: "abc123",
      "x-openid.mode": "id_res",
    });
    assert.ok(Object.keys(body).every((key) => key.startsWith("openid.")));
    assert.equal(JSON.stringify(body).includes("no-debe-salir"), false);
  });

  test("no modifica los parámetros recibidos", () => {
    const params = Object.freeze(validQuery());
    buildCheckAuthBody(params);
    assert.equal(params["openid.mode"], "id_res");
  });
});

describe("isValidCheckResponse (RF-4, RF-6)", () => {
  test("is_valid:true en su propia línea", () => {
    assert.equal(isValidCheckResponse("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"), true);
    assert.equal(isValidCheckResponse("ns:http://specs.openid.net/auth/2.0\r\nis_valid:true\r\n"), true);
    assert.equal(isValidCheckResponse("is_valid:true"), true);
  });

  test("is_valid:false, vacío o sin la línea → false", () => {
    assert.equal(isValidCheckResponse("ns:http://specs.openid.net/auth/2.0\nis_valid:false\n"), false);
    assert.equal(isValidCheckResponse(""), false);
    assert.equal(isValidCheckResponse("ns:http://specs.openid.net/auth/2.0\n"), false);
  });

  test("un is_valid:true dentro de otra línea o con sufijo no cuenta", () => {
    assert.equal(isValidCheckResponse("nota: is_valid:true\n"), false);
    assert.equal(isValidCheckResponse("is_valid:true-no\n"), false);
    assert.equal(isValidCheckResponse("is_valid:false\nis_valid:trueX\n"), false);
  });
});
