import { describe, test, mock } from "node:test";
import assert from "node:assert/strict";
import type { Logger } from "../../src/utils/logger.ts";
import { createErrorHandler, errorHandler, unknownEndpoint } from "../../src/utils/middleware.ts";
import type { JsonResponder } from "../../src/utils/middleware.ts";

interface FakeResponse extends JsonResponder {
  statusCalls: number[];
  jsonCalls: unknown[];
}

function fakeResponse(headersSent = false): FakeResponse {
  const response: FakeResponse = {
    headersSent,
    statusCalls: [],
    jsonCalls: [],
    status(code: number) {
      response.statusCalls.push(code);
      return response;
    },
    json(body: unknown) {
      response.jsonCalls.push(body);
      return response;
    },
  };
  return response;
}

function spyLogger() {
  const info = mock.fn<Logger["info"]>();
  const error = mock.fn<Logger["error"]>();
  return { info, error };
}

describe("createErrorHandler", () => {
  test("RF-6: error no previsto → 500 genérico y detalle solo al registro", () => {
    const spyLog = spyLogger();
    const handler = createErrorHandler(spyLog);
    const response = fakeResponse();
    const next = mock.fn();
    const original = new Error("detalle interno");

    handler(original, {}, response, next);

    assert.deepStrictEqual(response.statusCalls, [500]);
    assert.strictEqual(response.jsonCalls.length, 1);
    assert.deepStrictEqual(response.jsonCalls[0], { error: "error interno del servidor" });
    const cuerpo = JSON.stringify(response.jsonCalls[0]);
    assert.doesNotMatch(cuerpo, /detalle interno/);
    assert.doesNotMatch(cuerpo, /stack/);
    assert.strictEqual(spyLog.error.mock.callCount(), 1);
    assert.ok(spyLog.error.mock.calls[0]?.arguments.includes(original));
    assert.strictEqual(next.mock.callCount(), 0);
  });

  test("RF-7: con la respuesta ya empezada delega en next(error)", () => {
    const spyLog = spyLogger();
    const handler = createErrorHandler(spyLog);
    const response = fakeResponse(true);
    const next = mock.fn();
    const original = new Error("tarde");

    handler(original, {}, response, next);

    assert.strictEqual(next.mock.callCount(), 1);
    assert.strictEqual(next.mock.calls[0]?.arguments[0], original);
    assert.deepStrictEqual(response.statusCalls, []);
    assert.deepStrictEqual(response.jsonCalls, []);
  });

  test("RF-5: error 4xx previsto no se registra", () => {
    const spyLog = spyLogger();
    const handler = createErrorHandler(spyLog);
    const response = fakeResponse();
    const next = mock.fn();

    handler({ type: "entity.parse.failed" }, {}, response, next);

    assert.deepStrictEqual(response.statusCalls, [400]);
    assert.deepStrictEqual(response.jsonCalls, [{ error: "JSON mal formado" }]);
    assert.strictEqual(spyLog.error.mock.callCount(), 0);
    assert.strictEqual(next.mock.callCount(), 0);
  });

  test("RNF-1: la instancia por defecto no escribe en la consola durante npm test", (t) => {
    const consoleError = t.mock.method(console, "error", () => {});
    const response = fakeResponse();

    errorHandler(new Error("detalle interno"), {}, response, mock.fn());

    assert.deepStrictEqual(response.statusCalls, [500]);
    assert.strictEqual(consoleError.mock.callCount(), 0);
  });
});

describe("unknownEndpoint", () => {
  test("RF-4: responde 404 con el mensaje genérico", () => {
    const response = fakeResponse();

    unknownEndpoint({}, response);

    assert.deepStrictEqual(response.statusCalls, [404]);
    assert.deepStrictEqual(response.jsonCalls, [{ error: "endpoint desconocido" }]);
  });
});
