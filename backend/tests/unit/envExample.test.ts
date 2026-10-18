import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { parseConfig } from "../../src/utils/config.ts";

const EXAMPLE_PATH = fileURLToPath(new URL("../../.env.example", import.meta.url));

const EXPECTED_KEYS = [
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

describe(".env.example (RF-9)", () => {
  test("existe en backend/", () => {
    assert.equal(existsSync(EXAMPLE_PATH), true);
  });

  test("define exactamente las seis variables, con NODE_ENV=development", () => {
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
});
