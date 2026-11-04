import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEV_JWT_SECRET,
  formatConfigErrors,
  isBlank,
  isValidHostSyntax,
  loadConfig,
  parseConfig,
  parsePort,
  type ConfigResult,
  type EnvSource,
} from "../../src/utils/config.ts";

const DEV_URI = "mongodb://127.0.0.1:27017";
const TEST_URI = "mongodb://127.0.0.1:27018";
// Secreto cualquiera distinto del de desarrollo: válido en los tres entornos.
const SECRET = "secreto-de-prueba-unitaria";
const RF28_MESSAGE = "JWT_SECRET tiene el valor de desarrollo, que no se admite en producción";

function devEnv(overrides: EnvSource = {}): EnvSource {
  return {
    NODE_ENV: "development",
    PORT: "3001",
    JWT_SECRET: SECRET,
    MONGODB_URI: DEV_URI,
    MONGODB_DBNAME: "teammatchup",
    ...overrides,
  };
}

function prodEnv(overrides: EnvSource = {}): EnvSource {
  return devEnv({ NODE_ENV: "production", ...overrides });
}

function testEnv(overrides: EnvSource = {}): EnvSource {
  return {
    NODE_ENV: "test",
    PORT: "3001",
    JWT_SECRET: SECRET,
    TEST_MONGODB_URI: TEST_URI,
    TEST_MONGODB_DBNAME: "teammatchup_test",
    ...overrides,
  };
}

function expectErrors(result: ConfigResult): string[] {
  assert.equal(result.ok, false, "se esperaba una configuración inválida");
  if (result.ok) throw new Error("inalcanzable");
  return result.errors;
}

function expectConfig(result: ConfigResult) {
  if (!result.ok) assert.fail(`se esperaba una configuración válida: ${result.errors.join(" | ")}`);
  return result.config;
}

function allErrors(result: ConfigResult): string {
  return expectErrors(result).join("\n");
}

describe("isBlank", () => {
  test("undefined, vacía o solo espacios → true", () => {
    for (const value of [undefined, "", " ", "   ", "\t "]) assert.equal(isBlank(value), true);
  });
  test("con contenido → false", () => {
    for (const value of ["a", " a ", "0"]) assert.equal(isBlank(value), false);
  });
});

describe("parsePort", () => {
  test("RF-11: extremos del rango válidos", () => {
    assert.equal(parsePort("1"), 1);
    assert.equal(parsePort("65535"), 65535);
    assert.equal(parsePort("3001"), 3001);
  });
  test("RF-11: fuera de rango, decimales, negativos, texto o con espacios → null", () => {
    for (const raw of ["0", "65536", "3001.5", "-1", "abc", " 3001", "3001 ", "1e3", "+80"]) {
      assert.equal(parsePort(raw), null, raw);
    }
  });
});

describe("isValidHostSyntax", () => {
  test("RF-12: IP y nombres de máquina válidos", () => {
    for (const host of ["localhost", "0.0.0.0", "127.0.0.1", "::1", "::", "api.example.com", "a-b.c", "999.999.1.1x"]) {
      assert.equal(isValidHostSyntax(host), true, host);
    }
  });
  test("RF-12: sintaxis inválida", () => {
    for (const host of ["999.999.1.1", "256.1.1.1", "mal host", "-abc", "abc-", "a..b", " localhost", "x".repeat(64)]) {
      assert.equal(isValidHostSyntax(host), false, host);
    }
  });
});

describe("parseConfig", () => {
  test("RF-1: toma port, host y db del objeto recibido", () => {
    const config = expectConfig(parseConfig(devEnv({ HOST: "127.0.0.1" })));
    assert.deepStrictEqual(config, {
      nodeEnv: "development",
      port: 3001,
      host: "127.0.0.1",
      db: { uri: DEV_URI, name: "teammatchup" },
      jwtSecret: SECRET,
    });
    const otra = expectConfig(
      parseConfig(
        devEnv({
          PORT: "4000",
          HOST: "localhost",
          MONGODB_URI: "mongodb://otra:27017",
          MONGODB_DBNAME: "otra",
          JWT_SECRET: "otro-secreto",
        }),
      ),
    );
    assert.deepStrictEqual(otra, {
      nodeEnv: "development",
      port: 4000,
      host: "localhost",
      db: { uri: "mongodb://otra:27017", name: "otra" },
      jwtSecret: "otro-secreto",
    });
  });

  test("001-RF-1: jwtSecret sale del objeto recibido, sin recortar", () => {
    assert.equal(expectConfig(parseConfig(devEnv({ JWT_SECRET: "  con espacios " }))).jwtSecret, "  con espacios ");
    assert.equal(expectConfig(parseConfig(testEnv({ JWT_SECRET: "otro" }))).jwtSecret, "otro");
  });

  const matriz: { nombre: string; env: () => EnvSource; obligatorias: string[] }[] = [
    { nombre: "development", env: () => devEnv(), obligatorias: ["NODE_ENV", "PORT", "JWT_SECRET", "MONGODB_URI", "MONGODB_DBNAME"] },
    {
      nombre: "production",
      env: () => prodEnv(),
      obligatorias: ["NODE_ENV", "PORT", "JWT_SECRET", "MONGODB_URI", "MONGODB_DBNAME"],
    },
    {
      nombre: "test",
      env: () => testEnv(),
      obligatorias: ["NODE_ENV", "PORT", "JWT_SECRET", "TEST_MONGODB_URI", "TEST_MONGODB_DBNAME"],
    },
  ];

  for (const { nombre, env, obligatorias } of matriz) {
    for (const variable of obligatorias) {
      for (const valor of [undefined, "", "   "]) {
        test(`RF-2/RF-17: en ${nombre}, ${variable} ${valor === undefined ? "ausente" : `= ${JSON.stringify(valor)}`} → la nombra como faltante`, () => {
          const errors = expectErrors(parseConfig({ ...env(), [variable]: valor }));
          const faltantes = errors.find((e) => e.startsWith("faltan variables de entorno obligatorias:"));
          assert.ok(faltantes, errors.join(" | "));
          assert.match(faltantes, new RegExp(`\\b${variable}\\b`));
        });
      }
    }
  }

  test("RF-2: dos faltantes a la vez → las nombra ambas en un solo mensaje", () => {
    const errors = expectErrors(parseConfig(devEnv({ PORT: undefined, MONGODB_DBNAME: " " })));
    assert.deepStrictEqual(errors, ["faltan variables de entorno obligatorias: PORT, MONGODB_DBNAME"]);
    const errorsTest = expectErrors(parseConfig(testEnv({ TEST_MONGODB_URI: "", TEST_MONGODB_DBNAME: undefined })));
    assert.deepStrictEqual(errorsTest, ["faltan variables de entorno obligatorias: TEST_MONGODB_URI, TEST_MONGODB_DBNAME"]);
  });

  test("RF-2: sin NODE_ENV (con JWT_SECRET) → nombra NODE_ENV y no exige variables de base", () => {
    const errors = expectErrors(parseConfig({ PORT: "3001", JWT_SECRET: SECRET }));
    assert.deepStrictEqual(errors, ["faltan variables de entorno obligatorias: NODE_ENV"]);
  });

  test("RF-17: sin NODE_ENV ni JWT_SECRET → nombra ambas", () => {
    const errors = expectErrors(parseConfig({ PORT: "3001" }));
    assert.deepStrictEqual(errors, ["faltan variables de entorno obligatorias: NODE_ENV, JWT_SECRET"]);
  });

  test("RF-2/RF-17: sin NODE_ENV, PORT ni JWT_SECRET → las nombra en orden y ninguna variable de base", () => {
    const errors = expectErrors(parseConfig({ NODE_ENV: "  " }));
    assert.deepStrictEqual(errors, ["faltan variables de entorno obligatorias: NODE_ENV, PORT, JWT_SECRET"]);
    assert.doesNotMatch(errors.join("\n"), /MONGODB/);
  });

  test("001-RF-2: orden NODE_ENV, PORT, JWT_SECRET y después las variables de base", () => {
    const errors = expectErrors(parseConfig({ NODE_ENV: "development" }));
    assert.deepStrictEqual(errors, [
      "faltan variables de entorno obligatorias: PORT, JWT_SECRET, MONGODB_URI, MONGODB_DBNAME",
    ]);
    const errorsTest = expectErrors(parseConfig({ NODE_ENV: "test", PORT: "3001" }));
    assert.deepStrictEqual(errorsTest, [
      "faltan variables de entorno obligatorias: JWT_SECRET, TEST_MONGODB_URI, TEST_MONGODB_DBNAME",
    ]);
  });

  for (const valor of ["Test", "TEST", "prod", "dev", " test", "test ", "Production"]) {
    test(`RF-20: NODE_ENV=${JSON.stringify(valor)} → inválida y sin exigir variables de base`, () => {
      const errors = expectErrors(parseConfig({ NODE_ENV: valor, PORT: "3001", JWT_SECRET: SECRET }));
      assert.deepStrictEqual(errors, ["NODE_ENV debe ser exactamente development, test o production"]);
    });
  }

  test("RF-17: NODE_ENV inválida también exige JWT_SECRET", () => {
    const errors = expectErrors(parseConfig({ NODE_ENV: "prod", PORT: "3001" }));
    assert.deepStrictEqual(errors, [
      "faltan variables de entorno obligatorias: JWT_SECRET",
      "NODE_ENV debe ser exactamente development, test o production",
    ]);
  });

  test("RF-20: NODE_ENV inválida y PORT ausente → ambos errores", () => {
    const errors = expectErrors(parseConfig({ NODE_ENV: "prod", JWT_SECRET: SECRET }));
    assert.deepStrictEqual(errors, [
      "faltan variables de entorno obligatorias: PORT",
      "NODE_ENV debe ser exactamente development, test o production",
    ]);
  });

  test("RF-3: en test usa el par TEST_ y no exige MONGODB_*", () => {
    const config = expectConfig(parseConfig(testEnv()));
    assert.equal(config.nodeEnv, "test");
    assert.deepStrictEqual(config.db, { uri: TEST_URI, name: "teammatchup_test" });
    const conAmbos = expectConfig(parseConfig(testEnv({ MONGODB_URI: DEV_URI, MONGODB_DBNAME: "teammatchup" })));
    assert.deepStrictEqual(conAmbos.db, { uri: TEST_URI, name: "teammatchup_test" });
  });

  test("RF-3: en development y production usa el par sin prefijo y no exige TEST_*", () => {
    for (const env of [devEnv(), prodEnv()]) {
      const config = expectConfig(parseConfig(env));
      assert.deepStrictEqual(config.db, { uri: DEV_URI, name: "teammatchup" });
    }
    const conAmbos = expectConfig(parseConfig(devEnv({ TEST_MONGODB_URI: TEST_URI, TEST_MONGODB_DBNAME: "x_test" })));
    assert.deepStrictEqual(conAmbos.db, { uri: DEV_URI, name: "teammatchup" });
    assert.equal(expectConfig(parseConfig(prodEnv())).nodeEnv, "production");
  });

  for (const port of ["0", "65536", "3001.5", "-1", "abc"]) {
    test(`RF-11: PORT=${port} → mensaje con PORT y el rango`, () => {
      const errors = expectErrors(parseConfig(devEnv({ PORT: port })));
      assert.deepStrictEqual(errors, ["PORT debe ser un número entero entre 1 y 65535"]);
    });
  }

  test("RF-11: PORT=1 y PORT=65535 válidos", () => {
    assert.equal(expectConfig(parseConfig(devEnv({ PORT: "1" }))).port, 1);
    assert.equal(expectConfig(parseConfig(devEnv({ PORT: "65535" }))).port, 65535);
  });

  test("RF-10: HOST ausente, vacío o solo espacios → host null", () => {
    for (const host of [undefined, "", "   "]) {
      assert.equal(expectConfig(parseConfig(devEnv({ HOST: host }))).host, null);
    }
    assert.equal(expectConfig(parseConfig(devEnv({ HOST: "127.0.0.1" }))).host, "127.0.0.1");
  });

  for (const host of ["999.999.1.1", "256.1.1.1", "mal host"]) {
    test(`RF-12: HOST=${JSON.stringify(host)} → mensaje con la dirección y el puerto`, () => {
      const errors = expectErrors(parseConfig(devEnv({ HOST: host })));
      assert.deepStrictEqual(errors, [`HOST no es una dirección válida: no se puede escuchar en ${host}:3001`]);
    });
  }

  test("RF-12: localhost, 0.0.0.0 y ::1 válidos", () => {
    for (const host of ["localhost", "0.0.0.0", "::1"]) {
      assert.equal(expectConfig(parseConfig(devEnv({ HOST: host }))).host, host);
    }
  });

  test("RF-15: en test con los dos pares iguales → error sin mostrar la URI", () => {
    const errors = expectErrors(
      parseConfig(testEnv({ MONGODB_URI: TEST_URI, MONGODB_DBNAME: "teammatchup_test" })),
    );
    assert.deepStrictEqual(errors, [
      "la base de prueba no puede ser la de desarrollo: TEST_MONGODB_URI y TEST_MONGODB_DBNAME coinciden con MONGODB_URI y MONGODB_DBNAME",
    ]);
    assert.doesNotMatch(errors.join("\n"), /mongodb:\/\//);
  });

  test("RF-15: misma URI con otro nombre de base → válida", () => {
    expectConfig(parseConfig(testEnv({ MONGODB_URI: TEST_URI, MONGODB_DBNAME: "teammatchup" })));
  });

  test("RF-15: se compara tal cual (localhost frente a 127.0.0.1 no se detecta)", () => {
    expectConfig(
      parseConfig(
        testEnv({
          TEST_MONGODB_URI: "mongodb://localhost:27017",
          MONGODB_URI: "mongodb://127.0.0.1:27017",
          MONGODB_DBNAME: "teammatchup_test",
        }),
      ),
    );
  });

  test("RF-15: sin variables de desarrollo → válida", () => {
    expectConfig(parseConfig(testEnv()));
  });

  test("RF-15: en development con los pares iguales no aplica", () => {
    expectConfig(parseConfig(devEnv({ TEST_MONGODB_URI: DEV_URI, TEST_MONGODB_DBNAME: "teammatchup" })));
  });

  for (const valor of [DEV_JWT_SECRET, `  ${DEV_JWT_SECRET} `, `\t${DEV_JWT_SECRET}`]) {
    test(`RF-28: en production, JWT_SECRET=${JSON.stringify(valor)} → inválida con el mensaje de producción`, () => {
      const errors = expectErrors(parseConfig(prodEnv({ JWT_SECRET: valor })));
      assert.deepStrictEqual(errors, [RF28_MESSAGE]);
      assert.match(errors[0] ?? "", /JWT_SECRET/);
      assert.match(errors[0] ?? "", /producción/);
    });
  }

  test("RF-28: en production con otro valor → válida y jwtSecret igual al valor", () => {
    const valor = "un-secreto-de-produccion-distinto";
    assert.equal(expectConfig(parseConfig(prodEnv({ JWT_SECRET: valor }))).jwtSecret, valor);
    // Solo cuenta el valor exacto recortado; un valor que lo contiene no es el de desarrollo.
    const contiene = `${DEV_JWT_SECRET}-2`;
    assert.equal(expectConfig(parseConfig(prodEnv({ JWT_SECRET: contiene }))).jwtSecret, contiene);
  });

  test("RF-28: en production se acumula con otros errores", () => {
    const errors = expectErrors(parseConfig(prodEnv({ JWT_SECRET: DEV_JWT_SECRET, PORT: "abc", MONGODB_URI: "" })));
    assert.deepStrictEqual(errors, [
      "faltan variables de entorno obligatorias: MONGODB_URI",
      "PORT debe ser un número entero entre 1 y 65535",
      RF28_MESSAGE,
    ]);
  });

  test("RF-27: en development y test el valor de desarrollo es válido", () => {
    assert.equal(expectConfig(parseConfig(devEnv({ JWT_SECRET: DEV_JWT_SECRET }))).jwtSecret, DEV_JWT_SECRET);
    assert.equal(expectConfig(parseConfig(testEnv({ JWT_SECRET: DEV_JWT_SECRET }))).jwtSecret, DEV_JWT_SECRET);
  });

  test("RF-27: DEV_JWT_SECRET es exactamente el valor de desarrollo acordado", () => {
    assert.equal(DEV_JWT_SECRET, "solo-desarrollo-no-usar-en-produccion");
  });

  test("ningún mensaje de error contiene las URI de la base", () => {
    const secreta = "mongodb://usuario:clave@host:27017";
    const casos: EnvSource[] = [
      devEnv({ MONGODB_URI: secreta, PORT: "abc", HOST: "mal host", MONGODB_DBNAME: "" }),
      testEnv({ TEST_MONGODB_URI: secreta, MONGODB_URI: secreta, MONGODB_DBNAME: "teammatchup_test", PORT: "0" }),
    ];
    for (const env of casos) assert.doesNotMatch(allErrors(parseConfig(env)), /clave|mongodb:\/\//);
  });

  test("la función no modifica el objeto recibido", () => {
    const env = Object.freeze(devEnv());
    expectConfig(parseConfig(env));
  });
});

describe("formatConfigErrors", () => {
  test("RNF-3: varios errores a la vez, con encabezado y uno por línea", () => {
    const errors = expectErrors(parseConfig({ NODE_ENV: "prod", PORT: "abc", HOST: "mal host", JWT_SECRET: SECRET }));
    const mensaje = formatConfigErrors(errors);
    assert.equal(
      mensaje,
      [
        "configuración inválida, el servidor no arranca:",
        "- NODE_ENV debe ser exactamente development, test o production",
        "- PORT debe ser un número entero entre 1 y 65535",
      ].join("\n"),
    );
  });

  test("faltantes, puerto inválido y base de prueba igual en un solo mensaje", () => {
    const mensaje = formatConfigErrors(
      expectErrors(parseConfig(testEnv({ PORT: "65536", TEST_MONGODB_DBNAME: "", MONGODB_URI: TEST_URI }))),
    );
    assert.match(mensaje, /^configuración inválida, el servidor no arranca:\n/);
    assert.match(mensaje, /faltan variables de entorno obligatorias: TEST_MONGODB_DBNAME/);
    assert.match(mensaje, /PORT debe ser un número entero entre 1 y 65535/);
  });
});

describe("loadConfig", () => {
  let dir = "";
  let envFilePath = "";

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "tmu-config-"));
    envFilePath = join(dir, ".env");
    await writeFile(
      envFilePath,
      [
        "NODE_ENV=development",
        "PORT=3001",
        `JWT_SECRET=${SECRET}`,
        `MONGODB_URI=${DEV_URI}`,
        "MONGODB_DBNAME=teammatchup",
        `TEST_MONGODB_URI=${TEST_URI}`,
        "TEST_MONGODB_DBNAME=teammatchup_test",
        "",
      ].join("\n"),
    );
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("RF-8: sin variables en el proceso, toma las del archivo", () => {
    const config = expectConfig(loadConfig({ envFilePath, processEnv: {} }));
    assert.equal(config.nodeEnv, "development");
    assert.equal(config.port, 3001);
    assert.deepEqual(config.db, { uri: DEV_URI, name: "teammatchup" });
    assert.equal(config.jwtSecret, SECRET);
  });

  test("RF-21 y RF-8: NODE_ENV=test del proceso prevalece sobre development del archivo", () => {
    const processEnv: Record<string, string | undefined> = { NODE_ENV: "test" };
    const config = expectConfig(loadConfig({ envFilePath, processEnv }));
    assert.equal(config.nodeEnv, "test");
    assert.deepEqual(config.db, { uri: TEST_URI, name: "teammatchup_test" });
    assert.equal(processEnv.NODE_ENV, "test");
  });

  test("RF-21: una variable vacía en el proceso cuenta como definida y no se completa", () => {
    const errors = expectErrors(loadConfig({ envFilePath, processEnv: { PORT: "" } }));
    assert.deepEqual(errors, ["faltan variables de entorno obligatorias: PORT"]);
  });

  test("archivo inexistente: solo cuenta el entorno del proceso, sin lanzar", () => {
    const missingPath = join(dir, "no-existe.env");
    const config = expectConfig(loadConfig({ envFilePath: missingPath, processEnv: testEnv() }));
    assert.equal(config.nodeEnv, "test");
    const errors = expectErrors(loadConfig({ envFilePath: missingPath, processEnv: {} }));
    assert.deepEqual(errors, ["faltan variables de entorno obligatorias: NODE_ENV, PORT, JWT_SECRET"]);
  });

  test("RNF-3: los errores no incluyen las URI de la base", () => {
    const errors = expectErrors(
      loadConfig({ envFilePath, processEnv: { NODE_ENV: "test", TEST_MONGODB_URI: DEV_URI, TEST_MONGODB_DBNAME: "teammatchup" } }),
    );
    const mensaje = formatConfigErrors(errors);
    assert.match(mensaje, /la base de prueba no puede ser la de desarrollo/);
    assert.doesNotMatch(mensaje, /mongodb:\/\//);
  });
});
