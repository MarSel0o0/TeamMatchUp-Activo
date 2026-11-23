// Pruebas de los entornos de compilación y de arranque (spec 018, RF-5, RF-6, RF-8, RF-10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { serverEnv, uiBuildEnv } from "./processEnv.ts";

const settings = { port: 3901, mongoUri: "mongodb://127.0.0.1:27017", dbName: "teammatchup_e2e" };

test("uiBuildEnv fija producción, la API relativa y el modo simulado apagado", () => {
  const env = uiBuildEnv({ PATH: "/usr/bin", VITE_USE_MOCK_API: "true", VITE_API_URL: "http://localhost:3001/api", NODE_ENV: "development" });
  assert.deepEqual(env, {
    PATH: "/usr/bin",
    VITE_USE_MOCK_API: "false",
    VITE_API_URL: "/api",
    NODE_ENV: "production",
  });
});

test("uiBuildEnv no modifica el entorno que recibe", () => {
  const base = { VITE_USE_MOCK_API: "true" };
  uiBuildEnv(base);
  assert.deepEqual(base, { VITE_USE_MOCK_API: "true" });
});

test("serverEnv fija modo, puerto, dirección, base, secreto y claves vacías", () => {
  const env = serverEnv({ PATH: "/usr/bin" }, settings, "secreto-de-prueba");
  assert.deepEqual(env, {
    PATH: "/usr/bin",
    NODE_ENV: "production",
    PORT: "3901",
    HOST: "127.0.0.1",
    MONGODB_URI: "mongodb://127.0.0.1:27017",
    MONGODB_DBNAME: "teammatchup_e2e",
    JWT_SECRET: "secreto-de-prueba",
    STEAM_API_KEY: "",
    RIOT_API_KEY: "",
    LEETIFY_API_KEY: "",
  });
});

test("serverEnv pisa lo que traiga la base: claves de servicios, base, secreto y dirección", () => {
  const env = serverEnv(
    {
      NODE_ENV: "development",
      PORT: "3001",
      HOST: "0.0.0.0",
      MONGODB_URI: "mongodb://db.example.com:27017",
      MONGODB_DBNAME: "teammatchup",
      JWT_SECRET: "secreto-de-desarrollo",
      STEAM_API_KEY: "clave-steam",
      RIOT_API_KEY: "clave-riot",
      LEETIFY_API_KEY: "clave-leetify",
    },
    settings,
    "otro-secreto",
  );
  assert.equal(env.NODE_ENV, "production");
  assert.equal(env.PORT, "3901");
  assert.equal(env.HOST, "127.0.0.1");
  assert.equal(env.MONGODB_URI, "mongodb://127.0.0.1:27017");
  assert.equal(env.MONGODB_DBNAME, "teammatchup_e2e");
  assert.equal(env.JWT_SECRET, "otro-secreto");
  assert.equal(env.STEAM_API_KEY, "");
  assert.equal(env.RIOT_API_KEY, "");
  assert.equal(env.LEETIFY_API_KEY, "");
});

test("serverEnv no modifica el entorno que recibe", () => {
  const base = { STEAM_API_KEY: "clave-steam" };
  serverEnv(base, settings, "s");
  assert.deepEqual(base, { STEAM_API_KEY: "clave-steam" });
});
