// Pruebas de las reglas de las condiciones previas (spec 018, RF-2, RF-4, RF-6; plan §3 y §10).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkDatabaseName,
  checkMongoLocation,
  formatPreflightErrors,
  missingPackages,
} from "./preflight.ts";

// --- checkDatabaseName -------------------------------------------------------------------

test("un nombre con «e2e» que no coincide con ninguno configurado vale", () => {
  assert.equal(checkDatabaseName("teammatchup_e2e", ["teammatchup", "teammatchup_test"]), null);
});

test("«E2E» en mayúsculas también vale", () => {
  assert.equal(checkDatabaseName("TeamMatchUp_E2E", []), null);
});

test("sin «e2e» es un error que dice la regla", () => {
  const error = checkDatabaseName("teammatchup", []);
  assert.notEqual(error, null);
  assert.match(error ?? "", /e2e/);
});

test("«e2» o «e 2e» no cuentan como «e2e»", () => {
  assert.notEqual(checkDatabaseName("teammatchup_e2", []), null);
  assert.notEqual(checkDatabaseName("teammatchup_e_2e", []), null);
});

test("igual al de desarrollo configurado es un error aunque contenga «e2e»", () => {
  const error = checkDatabaseName("teammatchup_e2e", ["teammatchup_e2e"]);
  assert.notEqual(error, null);
  assert.match(error ?? "", /configurad/);
});

test("igual al de pruebas configurado con otras mayúsculas es un error", () => {
  const error = checkDatabaseName("teammatchup_e2e", ["teammatchup", "TeamMatchUp_E2E"]);
  assert.notEqual(error, null);
  assert.match(error ?? "", /configurad/);
});

test("compara con todos los nombres configurados, no solo con el primero", () => {
  assert.notEqual(checkDatabaseName("x_e2e", ["a", "b", "c", "X_E2E"]), null);
});

test("los nombres configurados vacíos no cuentan", () => {
  assert.equal(checkDatabaseName("teammatchup_e2e", ["", "teammatchup"]), null);
});

// --- checkMongoLocation ------------------------------------------------------------------

for (const uri of [
  "mongodb://127.0.0.1:27017",
  "mongodb://127.0.0.1",
  "mongodb://localhost:27018/",
  "mongodb://LOCALHOST:27017/admin?directConnection=true",
  "mongodb://127.0.0.1:27017,localhost:27018/?replicaSet=rs0",
  "mongodb://usuario:clave@127.0.0.1:27017/admin",
]) {
  test(`ubicación local ${uri} vale`, () => {
    assert.equal(checkMongoLocation(uri), null);
  });
}

const remoteUris = [
  "mongodb://db.example.com:27017",
  "mongodb://127.0.0.1:27017,db.example.com:27017/?replicaSet=rs0",
  "mongodb+srv://cluster0.example.mongodb.net/",
  "mongodb+srv://localhost/",
  "mongodb://usuario:s3creta@db.example.com:27017/admin",
  "mongodb://127.0.0.2:27017",
  "mongodb://localhost.example.com:27017",
  "mongodb://[::1]:27017",
  "http://127.0.0.1:27017",
  "127.0.0.1:27017",
  "mongodb://",
  "mongodb://:27017",
  "",
];

for (const uri of remoteUris) {
  test(`ubicación ${JSON.stringify(uri)} es un error`, () => {
    assert.notEqual(checkMongoLocation(uri), null);
  });
}

test("mongodb+srv:// dice que busca los servidores por DNS", () => {
  assert.match(checkMongoLocation("mongodb+srv://cluster0.example.mongodb.net/") ?? "", /DNS/);
});

test("el mensaje nunca contiene la ubicación ni sus credenciales", () => {
  for (const uri of remoteUris) {
    const error = checkMongoLocation(uri) ?? "";
    for (const fragment of ["db.example.com", "s3creta", "usuario", "cluster0", "example"]) {
      assert.equal(error.includes(fragment), false, `«${fragment}» aparece en «${error}»`);
    }
    if (uri !== "") assert.equal(error.includes(uri), false);
  }
});

// --- missingPackages ---------------------------------------------------------------------

test("devuelve las dependencias y dependencias de desarrollo que no están instaladas", () => {
  const manifest = {
    name: "x",
    dependencies: { express: "5.1.0", mongoose: "8.0.0" },
    devDependencies: { typescript: "5.9.3", eslint: "9.39.5" },
  };
  const installed = new Set(["express", "typescript"]);
  assert.deepEqual(
    missingPackages(manifest, (name) => installed.has(name)),
    ["mongoose", "eslint"],
  );
});

test("con todo instalado no falta nada", () => {
  const manifest = { dependencies: { a: "1.0.0" }, devDependencies: { b: "1.0.0" } };
  assert.deepEqual(missingPackages(manifest, () => true), []);
});

test("un paquete en las dos listas se nombra una sola vez", () => {
  const manifest = { dependencies: { a: "1.0.0" }, devDependencies: { a: "1.0.0" } };
  assert.deepEqual(missingPackages(manifest, () => false), ["a"]);
});

test("sin listas, o con un manifiesto que no es un objeto, no falta nada", () => {
  assert.deepEqual(missingPackages({ name: "x" }, () => false), []);
  assert.deepEqual(missingPackages(null, () => false), []);
  assert.deepEqual(missingPackages("texto", () => false), []);
  assert.deepEqual(missingPackages({ dependencies: ["a"] }, () => false), []);
});

test("los nombres con ámbito se conservan", () => {
  const manifest = { devDependencies: { "@playwright/test": "1.57.0" } };
  assert.deepEqual(missingPackages(manifest, () => false), ["@playwright/test"]);
});

// --- formatPreflightErrors ---------------------------------------------------------------

test("formatea «la suite no arranca:» y una línea por condición", () => {
  assert.equal(
    formatPreflightErrors(["primera condición", "segunda condición"]),
    "la suite no arranca:\n- primera condición\n- segunda condición\n",
  );
});
