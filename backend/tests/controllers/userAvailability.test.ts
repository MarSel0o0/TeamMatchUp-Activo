// Leer y reemplazar la disponibilidad: `GET`/`PUT /api/users/:id/availability` (spec 003,
// plan §3.6, §3.7 y §6.2). RF-10, RF-12, RF-13, RF-14, RF-18, RF-20, RNF-1, RNF-3.
// Cada escritura se comprueba en la respuesta y en la base (documento crudo del driver).
// El 404 por un borrado en curso (RF-22) se prueba en `userDeletion.test.ts` (T9).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { AVAILABILITY_MESSAGES } from "../../src/services/availability.ts";
import { USER_TARGET_MESSAGES } from "../../src/services/userTarget.ts";
import { testConfig } from "../server/helpers.ts";
import { authApp, nonExistingId, signUp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const MALFORMED = "JSON mal formado";
const TOO_LARGE = "cuerpo demasiado grande";
const BODY_LIMIT = 102_400;

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(() => mongoose.disconnect());

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

// 200 con la lista directa (no dentro de un objeto) e igual a `expected` (RF-12, RF-13).
function assertBlocks(response: Response, expected: readonly string[]): void {
  assert.strictEqual(response.status, 200);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.ok(Array.isArray(response.body), "se esperaba una lista directa");
  assert.deepStrictEqual(response.body, expected);
}

// Documento tal como está en la base, sin pasar por Mongoose.
async function stored(id: string): Promise<Record<string, unknown> | null> {
  return User.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
}

async function storedOrFail(id: string): Promise<Record<string, unknown>> {
  const document = await stored(id);
  assert.ok(document !== null, "el usuario debería seguir en la base");
  return document;
}

async function storedBlocks(id: string): Promise<unknown> {
  return (await storedOrFail(id))["availability"];
}

function read(session: SignedUp, segment: string) {
  return withSession(session.agent.get(`/api/users/${segment}/availability`), session.csrf);
}

function put(session: SignedUp, segment: string, body?: unknown) {
  const request = withSession(session.agent.put(`/api/users/${segment}/availability`), session.csrf);
  return body === undefined ? request : request.send(body as object);
}

// Guarda una disponibilidad previa y comprueba que quedó en la base.
async function seed(session: SignedUp, blocks: readonly string[]): Promise<void> {
  assertBlocks(await put(session, "me", { blocks }), blocks);
  assert.deepStrictEqual(await storedBlocks(session.id), blocks);
}

describe("RF-12: leer la disponibilidad", () => {
  test("nunca guardada → 200 []", async () => {
    const ana = await signUp(app, ANA);
    assertBlocks(await read(ana, "me"), []);
  });

  test("documento sin el campo en la base → 200 []", async () => {
    const ana = await signUp(app, ANA);
    await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(ana.id) }, { $unset: { availability: "" } });
    assert.ok(!("availability" in (await storedOrFail(ana.id))), "el documento no debería tener el campo");
    assertBlocks(await read(ana, "me"), []);
  });

  test("la de otro usuario → 200 con su lista en el orden guardado", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await seed(beto, ["6-23", "0-0", "3-10"]);
    assertBlocks(await read(ana, beto.id), ["6-23", "0-0", "3-10"]);
    assertBlocks(await read(ana, beto.id.toUpperCase()), ["6-23", "0-0", "3-10"]);
  });

  test("la de otro usuario que nunca la guardó → 200 []", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    assertBlocks(await read(ana, beto.id), []);
  });

  const OWN_SEGMENTS: readonly (readonly [string, (session: SignedUp) => string])[] = [
    ["me", () => "me"],
    ["m%65", () => "m%65"],
    ["id propio", (session) => session.id],
    ["id propio en mayúsculas", (session) => session.id.toUpperCase()],
  ];
  for (const [label, segment] of OWN_SEGMENTS) {
    test(`propia por ${label} → 200 con la lista guardada`, async () => {
      const ana = await signUp(app, ANA);
      await seed(ana, ["2-20", "1-5"]);
      assertBlocks(await read(ana, segment(ana)), ["2-20", "1-5"]);
    });
  }
});

describe("RF-5, RF-20: identificador inválido o inexistente al leer", () => {
  const invalid = [
    "aaaaaaaaaaaa",
    "a".repeat(23),
    "a".repeat(25),
    `${"a".repeat(23)}z`,
    `${"a".repeat(23)}g`,
    "Me",
    "ME",
    "%20me",
    "%zz",
    "%E0%A4",
    "%",
  ];
  for (const segment of invalid) {
    test(`GET /api/users/${segment}/availability → 400 id con formato inválido`, async () => {
      const ana = await signUp(app, ANA);
      assertStatusError(await read(ana, segment), 400, USER_TARGET_MESSAGES.invalidId);
    });
  }

  test("id con formato válido que no existe → 404 usuario no encontrado", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await read(ana, nonExistingId()), 404, USER_TARGET_MESSAGES.userNotFound);
  });

  test("id inexistente en mayúsculas → 404 (no 400)", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await read(ana, nonExistingId().toUpperCase()), 404, USER_TARGET_MESSAGES.userNotFound);
  });
});

describe("RF-13: reemplazar la propia disponibilidad", () => {
  test('["3-10","1-5","3-10"] → 200 ["3-10","1-5"] y así en la base', async () => {
    const ana = await signUp(app, ANA);
    const response = await put(ana, "me", { blocks: ["3-10", "1-5", "3-10"] });
    assertBlocks(response, ["3-10", "1-5"]);
    assert.deepStrictEqual(await storedBlocks(ana.id), ["3-10", "1-5"]);
    assertBlocks(await read(ana, "me"), ["3-10", "1-5"]);
  });

  test("reemplaza por completo la anterior y conserva el orden enviado", async () => {
    const ana = await signUp(app, ANA);
    await seed(ana, ["1-1", "2-2"]);
    const response = await put(ana, "me", { blocks: ["6-0", "0-23", "2-2"] });
    assertBlocks(response, ["6-0", "0-23", "2-2"]);
    assert.deepStrictEqual(await storedBlocks(ana.id), ["6-0", "0-23", "2-2"]);
  });

  test("[] vacía la disponibilidad", async () => {
    const ana = await signUp(app, ANA);
    await seed(ana, ["2-20"]);
    assertBlocks(await put(ana, "me", { blocks: [] }), []);
    assert.deepStrictEqual(await storedBlocks(ana.id), []);
  });

  test("el resto del perfil no cambia", async () => {
    const ana = await signUp(app, ANA);
    const before = await storedOrFail(ana.id);
    assertBlocks(await put(ana, "me", { blocks: ["2-20"] }), ["2-20"]);
    assert.deepStrictEqual(await storedOrFail(ana.id), { ...before, availability: ["2-20"] });
  });

  test("RNF-1: el campo user de otro se ignora y solo cambia la propia", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await seed(beto, ["4-4"]);
    const betoBefore = await storedOrFail(beto.id);
    const response = await put(ana, "me", { blocks: ["2-20"], user: beto.id, id: beto.id, extra: 1 });
    assertBlocks(response, ["2-20"]);
    assert.deepStrictEqual(await storedBlocks(ana.id), ["2-20"]);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("lista grande por debajo de 102 400 bytes → 200 sin tope de elementos", async () => {
    const ana = await signUp(app, ANA);
    const week: string[] = [];
    for (let day = 0; day <= 6; day += 1) {
      for (let hour = 0; hour <= 23; hour += 1) week.push(`${day}-${hour}`);
    }
    const blocks: string[] = [];
    while (Buffer.byteLength(JSON.stringify({ blocks: [...blocks, ...week] })) <= BODY_LIMIT) blocks.push(...week);
    const body = JSON.stringify({ blocks });
    assert.ok(blocks.length > 10_000);
    assert.ok(Buffer.byteLength(body) <= BODY_LIMIT);
    const response = await put(ana, "me").set("Content-Type", "application/json").send(body);
    assertBlocks(response, week);
    assert.deepStrictEqual(await storedBlocks(ana.id), week);
  });

  test("cuerpo de más de 102 400 bytes con bloques → 413 y se conserva la anterior", async () => {
    const ana = await signUp(app, ANA);
    await seed(ana, ["1-1"]);
    // Cada `"2-20",` ocupa 7 bytes: 14 700 bloques superan el límite.
    const blocks: string[] = Array.from({ length: 14_700 }, () => "2-20");
    const body = JSON.stringify({ blocks });
    assert.ok(Buffer.byteLength(body) > BODY_LIMIT);
    const response = await put(ana, "me").set("Content-Type", "application/json").send(body);
    assertStatusError(response, 413, TOO_LARGE);
    assert.deepStrictEqual(await storedBlocks(ana.id), ["1-1"]);
  });
});

describe("RF-14 y RNF-3: cuerpo inválido → 400 y se conserva la anterior", () => {
  interface InvalidCase {
    label: string;
    message: string;
    send: (session: SignedUp) => ReturnType<typeof put>;
  }
  const json = (body: unknown) => (s: SignedUp) => put(s, "me", body);
  const CASES: readonly InvalidCase[] = [
    { label: "sin cuerpo ni tipo de contenido", message: AVAILABILITY_MESSAGES.blocksMissing, send: (s) => put(s, "me") },
    {
      label: "JSON con cuerpo vacío",
      message: AVAILABILITY_MESSAGES.blocksMissing,
      send: (s) => put(s, "me").set("Content-Type", "application/json").send(""),
    },
    {
      label: "text/plain",
      message: AVAILABILITY_MESSAGES.blocksMissing,
      send: (s) => put(s, "me").set("Content-Type", "text/plain").send('{"blocks":["2-20"]}'),
    },
    { label: "{}", message: AVAILABILITY_MESSAGES.blocksMissing, send: json({}) },
    { label: "lista JSON", message: AVAILABILITY_MESSAGES.blocksMissing, send: json([{ blocks: ["2-20"] }]) },
    { label: "solo campos ignorados", message: AVAILABILITY_MESSAGES.blocksMissing, send: json({ user: "x" }) },
    { label: 'blocks "2-20"', message: AVAILABILITY_MESSAGES.blocksNotList, send: json({ blocks: "2-20" }) },
    { label: "blocks null", message: AVAILABILITY_MESSAGES.blocksNotList, send: json({ blocks: null }) },
    { label: "blocks {}", message: AVAILABILITY_MESSAGES.blocksNotList, send: json({ blocks: {} }) },
    { label: "blocks 5", message: AVAILABILITY_MESSAGES.blocksNotList, send: json({ blocks: 5 }) },
    { label: "un número en la lista", message: AVAILABILITY_MESSAGES.blockInvalid, send: json({ blocks: ["2-20", 5] }) },
    {
      label: "repetidos más un inválido",
      message: AVAILABILITY_MESSAGES.blockInvalid,
      send: json({ blocks: ["2-20", "2-20", "7-10"] }),
    },
    ...["2-05", "7-10", "2-24", " 2-20", "2-20 ", "+2-5", "-0-5", "2-20\n", "20", ""].map(
      (block): InvalidCase => ({
        label: `bloque ${JSON.stringify(block)}`,
        message: AVAILABILITY_MESSAGES.blockInvalid,
        send: json({ blocks: ["1-5", block] }),
      }),
    ),
    ...[null, {}, [], true].map(
      (block): InvalidCase => ({
        label: `elemento ${JSON.stringify(block)}`,
        message: AVAILABILITY_MESSAGES.blockInvalid,
        send: json({ blocks: [block] }),
      }),
    ),
  ];
  for (const { label, message, send } of CASES) {
    test(`${label} → 400 ${message} y la anterior se conserva`, async () => {
      const ana = await signUp(app, ANA);
      await seed(ana, ["1-1", "0-0"]);
      const before = await storedOrFail(ana.id);
      assertStatusError(await send(ana), 400, message);
      assert.deepStrictEqual(await storedOrFail(ana.id), before);
    });
  }

  test("JSON mal formado → 400 JSON mal formado (spec 001) y la anterior se conserva", async () => {
    const ana = await signUp(app, ANA);
    await seed(ana, ["1-1"]);
    const response = await put(ana, "me").set("Content-Type", "application/json").send('{"blocks":');
    assertStatusError(response, 400, MALFORMED);
    assert.deepStrictEqual(await storedBlocks(ana.id), ["1-1"]);
  });
});

describe("RF-10 y RF-18: propiedad, formato y orden de revisión", () => {
  test("otro usuario → 403 y ninguno de los dos cambia", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await seed(beto, ["4-4"]);
    const anaBefore = await storedOrFail(ana.id);
    const betoBefore = await storedOrFail(beto.id);
    assertStatusError(await put(ana, beto.id, { blocks: ["2-20"] }), 403, USER_TARGET_MESSAGES.forbidden);
    assert.deepStrictEqual(await storedOrFail(ana.id), anaBefore);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("otro usuario con su id en mayúsculas → 403", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoBefore = await storedOrFail(beto.id);
    assertStatusError(await put(ana, beto.id.toUpperCase(), { blocks: ["2-20"] }), 403, USER_TARGET_MESSAGES.forbidden);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("id válido inexistente → 403 (no 404) y no se crea nada", async () => {
    const ana = await signUp(app, ANA);
    const before = await storedOrFail(ana.id);
    const missing = nonExistingId();
    assertStatusError(await put(ana, missing, { blocks: ["2-20"] }), 403, USER_TARGET_MESSAGES.forbidden);
    assert.strictEqual(await stored(missing), null);
    assert.strictEqual(await User.collection.countDocuments(), 1);
    assert.deepStrictEqual(await storedOrFail(ana.id), before);
  });

  test("otro usuario con cuerpo inválido → 403, no 400", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoBefore = await storedOrFail(beto.id);
    assertStatusError(await put(ana, beto.id, { blocks: null }), 403, USER_TARGET_MESSAGES.forbidden);
    assertStatusError(await put(ana, beto.id), 403, USER_TARGET_MESSAGES.forbidden);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("id inexistente con cuerpo inválido → 403", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await put(ana, nonExistingId(), { blocks: ["7-10"] }), 403, USER_TARGET_MESSAGES.forbidden);
  });

  for (const segment of ["aaaaaaaaaaaa", "Me", "ME", "%20me", "%zz", "%E0%A4"]) {
    test(`${segment} con cuerpo inválido → 400 id con formato inválido y sin cambios`, async () => {
      const ana = await signUp(app, ANA);
      await seed(ana, ["1-1"]);
      const before = await storedOrFail(ana.id);
      assertStatusError(await put(ana, segment, { blocks: null }), 400, USER_TARGET_MESSAGES.invalidId);
      assert.deepStrictEqual(await storedOrFail(ana.id), before);
    });
  }

  const OWN_SEGMENTS: readonly (readonly [string, (session: SignedUp) => string])[] = [
    ["me", () => "me"],
    ["m%65", () => "m%65"],
    ["id propio", (session) => session.id],
    ["id propio en mayúsculas", (session) => session.id.toUpperCase()],
  ];
  for (const [label, segment] of OWN_SEGMENTS) {
    test(`${label} → 200 con la lista guardada`, async () => {
      const ana = await signUp(app, ANA);
      assertBlocks(await put(ana, segment(ana), { blocks: ["5-18", "5-19"] }), ["5-18", "5-19"]);
      assert.deepStrictEqual(await storedBlocks(ana.id), ["5-18", "5-19"]);
    });
  }
});
