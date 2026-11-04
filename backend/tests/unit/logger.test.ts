import { describe, test, mock } from "node:test";
import assert from "node:assert/strict";
import { createLogger, logger } from "../../src/utils/logger.ts";

describe("createLogger (RNF-1)", () => {
  test("silencioso: no llama a info ni a error", () => {
    const info = mock.fn();
    const error = mock.fn();
    const log = createLogger({ isSilent: () => true, info, error });

    log.info("mensaje", 1);
    log.error("fallo", new Error("detalle"));

    assert.strictEqual(info.mock.callCount(), 0);
    assert.strictEqual(error.mock.callCount(), 0);
  });

  test("no silencioso: llama a info y error con los mismos argumentos", () => {
    const info = mock.fn();
    const error = mock.fn();
    const log = createLogger({ isSilent: () => false, info, error });
    const original = new Error("detalle");

    log.info("servidor escuchando en", "http://127.0.0.1:3001");
    log.error("error no previsto:", original);

    assert.strictEqual(info.mock.callCount(), 1);
    assert.deepStrictEqual(info.mock.calls[0]?.arguments, [
      "servidor escuchando en",
      "http://127.0.0.1:3001",
    ]);
    assert.strictEqual(error.mock.callCount(), 1);
    assert.strictEqual(error.mock.calls[0]?.arguments[0], "error no previsto:");
    assert.strictEqual(error.mock.calls[0]?.arguments[1], original);
  });
});

describe("logger por defecto (RNF-1)", () => {
  test("durante npm test (NODE_ENV=test) no escribe en la consola", (t) => {
    assert.strictEqual(process.env.NODE_ENV, "test");
    const consoleLog = t.mock.method(console, "log", () => {});
    const consoleError = t.mock.method(console, "error", () => {});

    logger.info("no debe verse");
    logger.error("tampoco debe verse", new Error("detalle"));

    assert.strictEqual(consoleLog.mock.callCount(), 0);
    assert.strictEqual(consoleError.mock.callCount(), 0);
  });
});
