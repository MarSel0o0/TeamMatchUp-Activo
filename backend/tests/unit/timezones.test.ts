import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { UTC_ZONE, isValidTimezone } from "../../src/services/timezones.ts";
import { TZDATA_VERSION, ZONE_TAB_NAMES } from "../../src/services/zoneTab.ts";

// Copia literal de `zone.tab` de tzdata2025b.tar.gz (plan §1.1). Solo la leen las pruebas.
const FIXTURE_URL = new URL("../fixtures/tzdata-2025b/zone.tab", import.meta.url);

// Tercera columna (separada por tabuladores) de cada línea que no es comentario.
function fixtureNames(): string[] {
  return readFileSync(FIXTURE_URL, "utf8")
    .split("\n")
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => {
      const name = line.split("\t")[2];
      assert.ok(name !== undefined && name !== "", `línea sin columna TZ: ${line}`);
      return name;
    });
}

describe("datos de zone.tab (RF-16, D5)", () => {
  test("la versión fijada es tzdata 2025b", () => {
    assert.equal(TZDATA_VERSION, "2025b");
  });

  test("el arreglo coincide exactamente con el fixture, en el mismo orden", () => {
    assert.deepEqual([...ZONE_TAB_NAMES], fixtureNames());
  });

  test("el arreglo no tiene nombres repetidos", () => {
    assert.equal(new Set(ZONE_TAB_NAMES).size, ZONE_TAB_NAMES.length);
  });
});

describe("isValidTimezone (RF-16)", () => {
  test("UTC_ZONE es UTC", () => {
    assert.equal(UTC_ZONE, "UTC");
  });

  for (const zone of [
    "America/Santiago",
    "America/Argentina/Buenos_Aires",
    "Europe/Amsterdam",
    "Europe/Oslo",
    "Asia/Kuala_Lumpur",
    "UTC",
  ]) {
    test(`válida: ${JSON.stringify(zone)}`, () => {
      assert.equal(isValidTimezone(zone), true);
    });
  }

  for (const zone of [
    "US/Eastern",
    "America/Buenos_Aires",
    "Asia/Calcutta",
    "GMT",
    "Etc/UTC",
    "Etc/GMT-3",
    "america/santiago",
    "Santiago",
    "GMT-3",
    "CET",
    "EST5EDT",
    "EST",
    "HST",
    "Factory",
    "",
    "America/ Santiago",
    "utc",
  ]) {
    test(`inválida: ${JSON.stringify(zone)}`, () => {
      assert.equal(isValidTimezone(zone), false);
    });
  }

  test("sin canonización del entorno: alias que ICU acepta siguen siendo inválidos", () => {
    // Si el entorno los reconoce, la prueba confirma que no se usan sus datos.
    assert.equal(isValidTimezone("America/Buenos_Aires"), false);
    assert.equal(isValidTimezone("Asia/Calcutta"), false);
  });

  test("el arreglo no tiene nombres sin barra ni del área Etc", () => {
    for (const name of ZONE_TAB_NAMES) {
      assert.ok(name.includes("/"), name);
      assert.ok(!name.startsWith("Etc/"), name);
    }
  });

  test("todas las zonas del arreglo son válidas", () => {
    for (const name of ZONE_TAB_NAMES) {
      assert.equal(isValidTimezone(name), true, name);
    }
  });
});
