// `requireObjectBody` (spec 006, RF-20, RF-28; plan, sección 6 "Paso del cuerpo"):
// middleware con objetos falsos, sin Express ni base de datos.
import { describe, test, mock } from "node:test";
import assert from "node:assert/strict";
import { requireObjectBody } from "../../src/utils/middleware.ts";
import type { JsonResponder } from "../../src/utils/middleware.ts";

interface FakeResponse extends JsonResponder {
  statusCalls: number[];
  jsonCalls: unknown[];
}

function fakeResponse(): FakeResponse {
  const response: FakeResponse = {
    headersSent: false,
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

describe("requireObjectBody", () => {
  test("cuerpo ausente (undefined) y objeto vacio continuan", () => {
    for (const request of [{}, { body: undefined }, { body: {} }, { body: { title: "x" } }]) {
      const response = fakeResponse();
      const next = mock.fn();
      requireObjectBody(request, response, next);
      assert.strictEqual(next.mock.callCount(), 1);
      assert.deepStrictEqual(response.statusCalls, []);
      assert.deepStrictEqual(response.jsonCalls, []);
    }
  });

  test("[], null, 3, \"x\" y true responden 400 JSON mal formado y no llaman a next", () => {
    for (const body of [[], null, 3, "x", true, 0, "", false]) {
      const response = fakeResponse();
      const next = mock.fn();
      requireObjectBody({ body }, response, next);
      assert.strictEqual(next.mock.callCount(), 0, `body ${JSON.stringify(body)}`);
      assert.deepStrictEqual(response.statusCalls, [400], `body ${JSON.stringify(body)}`);
      assert.deepStrictEqual(response.jsonCalls, [{ error: "JSON mal formado" }]);
    }
  });
});
