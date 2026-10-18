import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  StartupError,
  describeListenAddress,
  listenFailureMessage,
} from "../../src/server.ts";

describe("describeListenAddress", () => {
  test("RF-18: IPv4 → http://<dirección>:<puerto>", () => {
    assert.equal(
      describeListenAddress({ address: "127.0.0.1", port: 3001, family: "IPv4" }),
      "http://127.0.0.1:3001",
    );
  });

  test("RF-18: IPv6 → dirección entre corchetes", () => {
    assert.equal(
      describeListenAddress({ address: "::", port: 3001, family: "IPv6" }),
      "http://[::]:3001",
    );
  });

  test("RF-18: null → texto de dirección desconocida, sin lanzar", () => {
    assert.equal(describeListenAddress(null), "dirección desconocida");
  });

  test("RF-18: cadena (socket o tubería) → se devuelve tal cual", () => {
    assert.equal(describeListenAddress("/tmp/app.sock"), "/tmp/app.sock");
  });
});

describe("listenFailureMessage", () => {
  test("RF-12: sin HOST → todas las interfaces, puerto y código", () => {
    assert.equal(
      listenFailureMessage(null, 3001, "EADDRINUSE"),
      "no se pudo escuchar en todas las interfaces, puerto 3001 (EADDRINUSE)",
    );
  });

  test("RF-12: con HOST → la dirección, puerto y código", () => {
    assert.equal(
      listenFailureMessage("203.0.113.1", 3001, "EADDRNOTAVAIL"),
      "no se pudo escuchar en 203.0.113.1, puerto 3001 (EADDRNOTAVAIL)",
    );
  });

  test("RF-12: sin código → sin paréntesis", () => {
    assert.equal(
      listenFailureMessage("203.0.113.1", 3001, undefined),
      "no se pudo escuchar en 203.0.113.1, puerto 3001",
    );
  });

  test("RNF-3: minúscula inicial y sin punto final", () => {
    const message = listenFailureMessage(null, 3001, "EADDRINUSE");
    assert.match(message, /^[a-zñáéíóú]/);
    assert.doesNotMatch(message, /\.$/);
  });
});

describe("StartupError", () => {
  test("es un Error con nombre propio y el mensaje recibido", () => {
    const error = new StartupError("la base de datos no está disponible");
    assert.ok(error instanceof Error);
    assert.ok(error instanceof StartupError);
    assert.equal(error.name, "StartupError");
    assert.equal(error.message, "la base de datos no está disponible");
  });
});
