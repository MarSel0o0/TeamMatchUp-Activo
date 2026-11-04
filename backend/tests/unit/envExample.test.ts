import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { DEV_JWT_SECRET, parseConfig } from "../../src/utils/config.ts";

const EXAMPLE_PATH = fileURLToPath(new URL("../../.env.example", import.meta.url));

const EXPECTED_KEYS = [
  "JWT_SECRET",
  "MONGODB_DBNAME",
  "MONGODB_URI",
  "NODE_ENV",
  "PORT",
  "TEST_MONGODB_DBNAME",
  "TEST_MONGODB_URI",
];

function readExample(): { text: string; values: Record<string, string> } {
  const text = readFileSync(EXAMPLE_PATH, "utf8");
  return { text, values: dotenv.parse(text) };
}

describe(".env.example (001-RF-9, RF-27, RF-28)", () => {
  test("existe en backend/", () => {
    assert.equal(existsSync(EXAMPLE_PATH), true);
  });

  test("define exactamente las siete variables, con NODE_ENV=development", () => {
    const { values } = readExample();
    assert.deepEqual(Object.keys(values).sort(), EXPECTED_KEYS);
    assert.equal(values.NODE_ENV, "development");
  });

  test("HOST aparece solo comentada como opcional", () => {
    const { text, values } = readExample();
    assert.equal(Object.hasOwn(values, "HOST"), false);
    assert.match(text, /^#\s*HOST=/m);
  });

  test("sus valores son válidos en development y en test (sin chocar con RF-15)", () => {
    const { values } = readExample();
    const dev = parseConfig(values);
    assert.equal(dev.ok, true, dev.ok ? "" : dev.errors.join(" | "));
    const test_ = parseConfig({ ...values, NODE_ENV: "test" });
    assert.equal(test_.ok, true, test_.ok ? "" : test_.errors.join(" | "));
    if (dev.ok && test_.ok) assert.notDeepEqual(dev.config.db, test_.config.db);
  });

  test("RF-27: JWT_SECRET es el valor de desarrollo y una línea de comentario anterior lo marca como tal", () => {
    const { text, values } = readExample();
    assert.equal(values.JWT_SECRET, DEV_JWT_SECRET);
    const lines = text.split("\n");
    const keyLine = lines.findIndex((line) => line.startsWith("JWT_SECRET="));
    assert.ok(keyLine > 0, "falta la línea JWT_SECRET=");
    const comments: string[] = [];
    for (let i = keyLine - 1; i >= 0 && (lines[i] ?? "").startsWith("#"); i--) comments.push(lines[i] ?? "");
    assert.ok(
      comments.some((line) => /desarrollo/i.test(line)),
      "ningún comentario justo antes de JWT_SECRET la marca como valor de desarrollo",
    );
  });

  test("RF-28: con NODE_ENV=production sus valores son inválidos por el secreto de desarrollo", () => {
    const { values } = readExample();
    const prod = parseConfig({ ...values, NODE_ENV: "production" });
    assert.equal(prod.ok, false);
    if (!prod.ok) {
      assert.deepEqual(prod.errors, ["JWT_SECRET tiene el valor de desarrollo, que no se admite en producción"]);
    }
  });
});
