// Arranque en el mismo proceso contra la base de prueba (plan §6.2).
// RF-3, RF-10, RF-12, RF-14, RF-18.
import { after, afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "node:net";
import type { AddressInfo, Server as NetServer } from "node:net";
import mongoose from "mongoose";
import app from "../../src/app.ts";
import { StartupError, startServer } from "../../src/server.ts";
import type { Logger } from "../../src/utils/logger.ts";
import type { Config } from "../../src/utils/config.ts";
import { getFreePort, testConfig } from "./helpers.ts";

const opened: NetServer[] = [];

function closeServer(server: NetServer): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}

function spyLog() {
  const info = mock.fn((..._params: unknown[]) => undefined);
  const error = mock.fn((..._params: unknown[]) => undefined);
  const log: Logger = { info, error };
  return { log, info, error };
}

async function configWith(overrides: Partial<Pick<Config, "host" | "port">>): Promise<Config> {
  const base = testConfig();
  return { ...base, port: await getFreePort(), ...overrides };
}

async function start(config: Config, log: Logger): Promise<http.Server> {
  const server = await startServer(config, { app, log });
  opened.push(server);
  return server;
}

afterEach(async () => {
  mock.restoreAll();
  await Promise.all(opened.splice(0).map(closeServer));
  await mongoose.disconnect();
});

after(() => mongoose.disconnect());

describe("startServer: arranque correcto", () => {
  test("RF-3 / RF-14: conecta a la base de prueba antes de escuchar", async () => {
    const statesAtListen: number[] = [];
    const originalListen = http.Server.prototype.listen;
    mock.method(http.Server.prototype, "listen", function (this: http.Server, ...args: unknown[]) {
      statesAtListen.push(mongoose.connection.readyState);
      return Reflect.apply(originalListen, this, args);
    });
    const { log } = spyLog();

    const server = await start(await configWith({ host: "127.0.0.1" }), log);

    assert.ok(server.listening);
    assert.strictEqual(mongoose.connection.name, process.env.TEST_MONGODB_DBNAME);
    assert.deepStrictEqual(statesAtListen, [mongoose.ConnectionStates.connected]);
  });

  test("RF-10: con HOST escucha en esa dirección", async () => {
    const { log } = spyLog();
    const server = await start(await configWith({ host: "127.0.0.1" }), log);
    assert.strictEqual((server.address() as AddressInfo).address, "127.0.0.1");
  });

  test("RF-10: sin HOST escucha en todas las interfaces", async () => {
    const { log } = spyLog();
    const server = await start(await configWith({ host: null }), log);
    assert.ok(["::", "0.0.0.0"].includes((server.address() as AddressInfo).address));
  });

  test("RF-18: informa una vez la dirección y el puerto reales", async () => {
    const { log, info, error } = spyLog();
    const config = await configWith({ host: "127.0.0.1" });
    await start(config, log);
    assert.strictEqual(info.mock.callCount(), 1);
    assert.strictEqual(error.mock.callCount(), 0);
    const message = String(info.mock.calls[0]?.arguments[0]);
    assert.strictEqual(message, `servidor escuchando en http://127.0.0.1:${config.port}`);
    assert.ok(!message.includes(config.db.uri));
  });
});

describe("startServer: dirección o puerto no utilizables (RF-12)", () => {
  test("puerto ocupado → StartupError con el puerto", async () => {
    const config = await configWith({ host: "127.0.0.1" });
    const blocker = createServer();
    opened.push(blocker);
    await new Promise<void>((resolve) => blocker.listen(config.port, "127.0.0.1", resolve));
    const { log, info } = spyLog();

    await assert.rejects(startServer(config, { app, log }), (error: unknown) => {
      assert.ok(error instanceof StartupError);
      assert.match(error.message, new RegExp(`puerto ${config.port}`));
      assert.match(error.message, /127\.0\.0\.1/);
      assert.ok(!error.message.includes(config.db.uri));
      return true;
    });
    assert.strictEqual(info.mock.callCount(), 0);
    assert.strictEqual(mongoose.connection.readyState, mongoose.ConnectionStates.disconnected);
  });

  test("dirección no asignada (203.0.113.1) → StartupError con la dirección", async () => {
    const config = await configWith({ host: "203.0.113.1" });
    const { log } = spyLog();
    await assert.rejects(startServer(config, { app, log }), (error: unknown) => {
      assert.ok(error instanceof StartupError);
      assert.match(error.message, /203\.0\.113\.1/);
      assert.match(error.message, new RegExp(`puerto ${config.port}`));
      return true;
    });
    assert.strictEqual(mongoose.connection.readyState, mongoose.ConnectionStates.disconnected);
  });

  test("nombre que no resuelve (noexiste.invalid) → StartupError", async () => {
    const config = await configWith({ host: "noexiste.invalid" });
    const { log } = spyLog();
    await assert.rejects(startServer(config, { app, log }), (error: unknown) => {
      assert.ok(error instanceof StartupError);
      assert.match(error.message, /noexiste\.invalid/);
      return true;
    });
  });
});
