// Pruebas de la lectura de backend/.env y de los nombres de base configurados (spec 018, RF-6;
// plan §4.2, «nombresConfigurados»).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configuredDatabaseNames, readEnvFile } from "./backendEnv.ts";

test("readEnvFile devuelve un objeto vacío si el archivo no existe", () => {
  const dir = mkdtempSync(join(tmpdir(), "e2e-backendenv-"));
  try {
    assert.deepEqual(readEnvFile(join(dir, ".env")), {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readEnvFile lee las variables con el formato de dotenv, sin tocar el entorno", () => {
  const dir = mkdtempSync(join(tmpdir(), "e2e-backendenv-"));
  const file = join(dir, ".env");
  writeFileSync(
    file,
    "# comentario\nMONGODB_DBNAME=teammatchup\nTEST_MONGODB_DBNAME=\"teammatchup_test\"\nVACIA=\n",
  );
  try {
    assert.deepEqual(readEnvFile(file), {
      MONGODB_DBNAME: "teammatchup",
      TEST_MONGODB_DBNAME: "teammatchup_test",
      VACIA: "",
    });
    assert.equal(process.env["VACIA"], undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("configuredDatabaseNames reúne los nombres del entorno y del archivo", () => {
  const names = configuredDatabaseNames(
    { MONGODB_DBNAME: "dev_proceso", TEST_MONGODB_DBNAME: "test_proceso", OTRA: "x" },
    { MONGODB_DBNAME: "dev_archivo", TEST_MONGODB_DBNAME: "test_archivo" },
  );
  assert.deepEqual(
    [...names].sort(),
    ["dev_archivo", "dev_proceso", "test_archivo", "test_proceso"],
  );
});

test("configuredDatabaseNames ignora los vacíos y los no definidos, y no repite", () => {
  const names = configuredDatabaseNames(
    { MONGODB_DBNAME: "teammatchup", TEST_MONGODB_DBNAME: "" },
    { MONGODB_DBNAME: "teammatchup" },
  );
  assert.deepEqual(names, ["teammatchup"]);
});

test("configuredDatabaseNames sin nada configurado da una lista vacía", () => {
  assert.deepEqual(configuredDatabaseNames({}, {}), []);
});
