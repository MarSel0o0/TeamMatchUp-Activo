// Servidor de prueba en loopback IPv4 (spec 004, plan P-18; tarea T8b). Sin RF: regresión de
// los fallos intermitentes de supertest (404 vacío o "socket hang up") cuando escuchaba en "::".
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import type { RequestListener } from "node:http";
import { closeTestServers, listenOnLoopback } from "../controllers/helpers.ts";

const listener: RequestListener = (_request, response) => {
  response.end("ok");
};

after(() => closeTestServers());

describe("listenOnLoopback (P-18)", () => {
  test("devuelve un servidor ya escuchando en 127.0.0.1 (IPv4) con puerto asignado", async () => {
    const server = await listenOnLoopback(listener);
    assert.ok(server.listening);
    const address = server.address() as AddressInfo | null;
    assert.ok(address !== null && typeof address === "object", "address() no debería ser null");
    assert.strictEqual(address.address, "127.0.0.1");
    assert.strictEqual(address.family, "IPv4");
    assert.notStrictEqual(address.port, 0);
  });

  test("tras closeTestServers() el servidor deja de escuchar", async () => {
    const server = await listenOnLoopback(listener);
    assert.ok(server.listening);
    await closeTestServers();
    assert.strictEqual(server.listening, false);
  });

  test("riesgo documentado: con 127.0.0.1:P ocupado, listen(P, 127.0.0.1) da EADDRINUSE", async () => {
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", () => resolve());
    });
    try {
      const { port } = blocker.address() as AddressInfo;
      const second = createServer();
      const code = await new Promise<string | undefined>((resolve) => {
        second.once("error", (error: NodeJS.ErrnoException) => resolve(error.code));
        second.listen(port, "127.0.0.1", () => {
          second.close();
          resolve(undefined);
        });
      });
      assert.strictEqual(code, "EADDRINUSE");
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });
});
