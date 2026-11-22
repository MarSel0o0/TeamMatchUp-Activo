// Pruebas de readSettings (spec 018, RF-6, RF-7; plan §3 y §10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSettings } from "./settings.ts";

test("sin variables E2E_* usa los valores por defecto", () => {
  const result = readSettings({});
  assert.deepEqual(result, {
    ok: true,
    settings: {
      port: 3901,
      mongoUri: "mongodb://127.0.0.1:27017",
      dbName: "teammatchup_e2e",
      baseURL: "http://127.0.0.1:3901",
    },
  });
});

test("las variables vacías cuentan como no definidas", () => {
  const result = readSettings({ E2E_PORT: "", E2E_MONGODB_URI: "", E2E_MONGODB_DBNAME: "" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.settings.port, 3901);
});

test("lee E2E_PORT, E2E_MONGODB_URI y E2E_MONGODB_DBNAME y calcula baseURL", () => {
  const result = readSettings({
    E2E_PORT: "4123",
    E2E_MONGODB_URI: "mongodb://localhost:27018",
    E2E_MONGODB_DBNAME: "otra_E2E",
  });
  assert.deepEqual(result, {
    ok: true,
    settings: {
      port: 4123,
      mongoUri: "mongodb://localhost:27018",
      dbName: "otra_E2E",
      baseURL: "http://127.0.0.1:4123",
    },
  });
});

test("ignora MONGODB_DBNAME y PORT del entorno: la suite solo usa sus variables E2E_*", () => {
  const result = readSettings({ MONGODB_DBNAME: "teammatchup", PORT: "3001" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.settings.dbName, "teammatchup_e2e");
    assert.equal(result.settings.port, 3901);
  }
});

test("los puertos 1 y 65535 valen", () => {
  assert.equal(readSettings({ E2E_PORT: "1" }).ok, true);
  assert.equal(readSettings({ E2E_PORT: "65535" }).ok, true);
});

for (const port of ["0", "65536", "abc", "39.5", "-1", " 3901", "3901 ", "1e3", "0x10"]) {
  test(`E2E_PORT=${JSON.stringify(port)} es un error que nombra la variable`, () => {
    const result = readSettings({ E2E_PORT: port });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 1);
      assert.match(result.errors[0] ?? "", /E2E_PORT/);
    }
  });
}
