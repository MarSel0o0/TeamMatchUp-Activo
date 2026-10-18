import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MESSAGES, mapErrorToResponse } from "../../src/utils/errors.ts";

describe("mapErrorToResponse", () => {
  test("RF-5: JSON mal formado → 400", () => {
    assert.deepStrictEqual(mapErrorToResponse({ type: "entity.parse.failed" }), {
      status: 400,
      error: "JSON mal formado",
    });
  });

  test("RF-16: cuerpo demasiado grande → 413", () => {
    assert.deepStrictEqual(mapErrorToResponse({ type: "entity.too.large" }), {
      status: 413,
      error: "cuerpo demasiado grande",
    });
  });

  test("RF-17: compresión o juego de caracteres no soportado → 415", () => {
    for (const type of ["encoding.unsupported", "charset.unsupported"]) {
      assert.deepStrictEqual(mapErrorToResponse({ type }), {
        status: 415,
        error: "codificación no soportada",
      });
    }
  });

  test("RF-6: errores no previstos → 500 genérico sin el mensaje original", () => {
    const casos: unknown[] = [new Error("E11000 secreto"), "texto", null, { type: "otro" }, undefined, 42];
    for (const caso of casos) {
      const respuesta = mapErrorToResponse(caso);
      assert.deepStrictEqual(respuesta, { status: 500, error: "error interno del servidor" });
      assert.doesNotMatch(JSON.stringify(respuesta), /E11000|secreto|texto|otro/);
    }
  });

  test("RF-6: un `type` que no es texto no se trata como previsto", () => {
    assert.deepStrictEqual(mapErrorToResponse({ type: 400 }), {
      status: 500,
      error: "error interno del servidor",
    });
  });
});

describe("MESSAGES (RNF-3)", () => {
  test("los mensajes son los acordados", () => {
    assert.deepStrictEqual(MESSAGES, {
      unknownEndpoint: "endpoint desconocido",
      malformedJson: "JSON mal formado",
      payloadTooLarge: "cuerpo demasiado grande",
      unsupportedEncoding: "codificación no soportada",
      internal: "error interno del servidor",
    });
  });

  test("cada mensaje empieza en minúscula (salvo la sigla JSON) y no termina en punto", () => {
    for (const mensaje of Object.values(MESSAGES)) {
      const sinSigla = mensaje.replace(/^JSON /, "");
      assert.match(sinSigla, /^\p{Ll}/u, `"${mensaje}" debe empezar en minúscula`);
      assert.doesNotMatch(mensaje, /\.$/, `"${mensaje}" no debe terminar en punto`);
    }
  });
});
