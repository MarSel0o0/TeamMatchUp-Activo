// Arranque con renovación de clave de Riot en `.env` (spec 014, T1: RF-17, RF-38, RNF-4).
// Dos arranques reales del servidor sobre 127.0.0.1 contra la base de prueba con claves falsas
// distintas, comprobando que la nueva clave entra en vigor sin otro cambio ni fugas en registros.
import { after, afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo, Server as NetServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";
import { createApp } from "../../src/app.ts";
import { startServer } from "../../src/server.ts";
import { loadConfig } from "../../src/utils/config.ts";
import type { Config } from "../../src/utils/config.ts";
import type { Logger } from "../../src/utils/logger.ts";
import { getFreePort, testConfig } from "./helpers.ts";

const HOST = "127.0.0.1";
const KEY_ONE = "RGAPI-falsa-prueba-00000000-0000-0000-0000-000000000001";
const KEY_TWO = "RGAPI-falsa-prueba-00000000-0000-0000-0000-000000000002";

const opened: NetServer[] = [];

function closeServer(server: NetServer): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}

function spyLog() {
  const entries: string[] = [];
  const info = mock.fn((...params: unknown[]) => {
    entries.push(params.map(String).join(" "));
  });
  const error = mock.fn((...params: unknown[]) => {
    entries.push(params.map(String).join(" "));
  });
  const log: Logger = { info, error };
  return { log, entries };
}

function requestLoopback(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: HOST, port, path, headers: { Connection: "close" } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.once("error", reject);
  });
}

function buildEnvFile(base: Config, port: number, riotApiKey?: string): string {
  const lines = [
    "NODE_ENV=test",
    `PORT=${port}`,
    `HOST=${HOST}`,
    `JWT_SECRET=${base.jwtSecret}`,
    `TEST_MONGODB_URI=${base.db.uri}`,
    `TEST_MONGODB_DBNAME=${base.db.name}`,
  ];
  if (riotApiKey !== undefined) lines.push(`RIOT_API_KEY=${riotApiKey}`);
  return `${lines.join("\n")}\n`;
}

async function bootFromEnvFile(envFilePath: string): Promise<{ config: Config; server: http.Server; entries: string[] }> {
  const loaded = loadConfig({ envFilePath, processEnv: {} });
  assert.equal(loaded.ok, true, loaded.ok ? "" : loaded.errors.join(" | "));
  if (!loaded.ok) throw new Error("inalcanzable");

  const { log, entries } = spyLog();
  const app = createApp(loaded.config);
  const server = await startServer(loaded.config, { app, log });
  opened.push(server);
  return { config: loaded.config, server, entries };
}

async function shutdown(server: http.Server): Promise<void> {
  const index = opened.indexOf(server);
  if (index !== -1) opened.splice(index, 1);
  await closeServer(server);
  await mongoose.disconnect();
}

afterEach(async () => {
  mock.restoreAll();
  await Promise.all(opened.splice(0).map(closeServer));
  await mongoose.disconnect();
});

after(() => mongoose.disconnect());

describe("arranque con renovación de RIOT_API_KEY (spec 014, RF-17, RF-38, RNF-4)", () => {
  test("RF-17 / RNF-4: dos arranques en 127.0.0.1 con claves falsas distintas en .env cargan la clave nueva sin otro cambio ni fugas", async (t) => {
    const base = testConfig();
    const port = await getFreePort(HOST);
    const dir = await mkdtemp(join(tmpdir(), "tmu-riot-restart-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const envFilePath = join(dir, ".env");

    // Primer arranque con la clave 1 (sin PUBLIC_URL: P14-10).
    await writeFile(envFilePath, buildEnvFile(base, port, KEY_ONE));
    const first = await bootFromEnvFile(envFilePath);
    assert.deepStrictEqual(first.config.riot, { apiKey: KEY_ONE });
    assert.equal(first.config.steam, null);
    assert.equal((first.server.address() as AddressInfo).address, HOST);
    assert.equal((first.server.address() as AddressInfo).port, port);

    const firstResponse = await requestLoopback(port, "/api/no-existe");
    assert.equal(firstResponse.status, 404);
    assert.ok(!firstResponse.body.includes(KEY_ONE), "la respuesta HTTP no debe incluir la clave de Riot");
    assert.ok(!first.entries.join("\n").includes(KEY_ONE), "los registros no deben incluir la clave de Riot");

    await shutdown(first.server);

    // Se reemplaza únicamente RIOT_API_KEY en el mismo .env y se vuelve a arrancar.
    await writeFile(envFilePath, buildEnvFile(base, port, KEY_TWO));
    const second = await bootFromEnvFile(envFilePath);
    assert.deepStrictEqual(second.config.riot, { apiKey: KEY_TWO });
    assert.notEqual(second.config.riot?.apiKey, first.config.riot?.apiKey);
    assert.equal((second.server.address() as AddressInfo).address, HOST);
    assert.equal((second.server.address() as AddressInfo).port, port);

    const secondResponse = await requestLoopback(port, "/api/no-existe");
    assert.equal(secondResponse.status, 404);
    for (const secret of [KEY_ONE, KEY_TWO]) {
      assert.ok(!secondResponse.body.includes(secret), "la respuesta HTTP no debe incluir ninguna clave de Riot");
      assert.ok(!second.entries.join("\n").includes(secret), "los registros no deben incluir ninguna clave de Riot");
    }

    await shutdown(second.server);
  });

  test("RF-38 / RF-17: arrancar sin RIOT_API_KEY deja riot en null y reiniciar tras agregarla la activa sin PUBLIC_URL", async (t) => {
    const base = testConfig();
    const port = await getFreePort(HOST);
    const dir = await mkdtemp(join(tmpdir(), "tmu-riot-enable-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const envFilePath = join(dir, ".env");

    await writeFile(envFilePath, buildEnvFile(base, port));
    const withoutKey = await bootFromEnvFile(envFilePath);
    assert.equal(withoutKey.config.riot, null);
    assert.equal((await requestLoopback(port, "/api/no-existe")).status, 404);
    await shutdown(withoutKey.server);

    await writeFile(envFilePath, buildEnvFile(base, port, KEY_TWO));
    const withKey = await bootFromEnvFile(envFilePath);
    assert.deepStrictEqual(withKey.config.riot, { apiKey: KEY_TWO });
    assert.equal((await requestLoopback(port, "/api/no-existe")).status, 404);
    assert.ok(!withKey.entries.join("\n").includes(KEY_TWO), "los registros no deben incluir la clave de Riot");
    await shutdown(withKey.server);
  });
});
