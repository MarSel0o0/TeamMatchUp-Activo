// Agenda de sesiones: listar y obtener (spec 006, T5). RF-1, RF-2, RF-3, RF-4, RF-18, RF-19
// (obtener), RF-22, RF-24 (lectura), RNF-1; plan, secciones 5, 6, 7 y 9.
// - Usuarios por la API de registro (`signUp`); sesiones preparadas con `insertSession`.
// - RF-24: el estado intermedio de la cascada se prepara con `User.deleteOne` directo.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { SESSION_ERRORS } from "../../src/domain/sessionRules.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  ISO_MS_Z,
  authApp,
  closeTestServers,
  deleteMe,
  forgeToken,
  insertSession,
  nonExistingId,
  noneToken,
  rawCookieRequest,
  rawSessionsInDb,
  signUp,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const CARLA = { email: "carla@example.com", username: "Carla" } as const;

const SESSIONS = "/api/sessions";

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
  await PlaySession.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await PlaySession.deleteMany({});
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

// `GET` del usuario de la sesión con su comprobante.
function get(user: SignedUp, path: string): supertest.Test {
  return withSession(user.agent.get(`${SESSIONS}${path}`), user.csrf);
}

// Cuerpo de una respuesta que debe ser un arreglo de sesiones.
function listBody(response: Response): Array<Record<string, unknown>> {
  assert.strictEqual(response.status, 200);
  const body: unknown = response.body;
  assert.ok(Array.isArray(body), "la respuesta debería ser un arreglo");
  return body.map((item: unknown) => {
    assert.ok(typeof item === "object" && item !== null && !Array.isArray(item));
    return { ...item };
  });
}

function ids(list: ReadonlyArray<Record<string, unknown>>): unknown[] {
  return list.map((item) => item["id"]);
}

describe("sesión (RF-1, RF-18)", () => {
  const routes = [
    ["listar", () => SESSIONS],
    ["obtener", () => `${SESSIONS}/${nonExistingId()}`],
  ] as const;

  for (const [name, path] of routes) {
    test(`${name}: sin credencial → 401 "sesión no iniciada"`, async () => {
      assertStatusError(await supertest(app).get(path()), 401, SESSION_MESSAGES.notLoggedIn);
    });

    test(`${name}: credencial alterada o sin comprobante → 401 "token inválido"`, async () => {
      const ana = await signUp(app, ANA);
      const payload = { id: ana.id, username: "Ana", csrf: "c" };
      const tokens = [forgeToken(payload, { secret: "otro-secreto" }), noneToken(payload), `${ana.cookie}x`];
      for (const token of tokens) {
        assertStatusError(await rawCookieRequest(app, "get", path(), token, "c"), 401, SESSION_MESSAGES.invalidToken);
      }
      // Sin cabecera X-CSRF-Token y con un comprobante que no corresponde.
      assertStatusError(await ana.agent.get(path()), 401, SESSION_MESSAGES.invalidToken);
      assertStatusError(await ana.agent.get(path()).set("X-CSRF-Token", "otro"), 401, SESSION_MESSAGES.invalidToken);
    });

    test(`${name}: credencial expirada → 401 "sesión expirada"`, async () => {
      const ana = await signUp(app, ANA);
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
      const token = forgeToken({ id: ana.id, username: "Ana", csrf: "c" }, { iat: twoHoursAgo });
      assertStatusError(await rawCookieRequest(app, "get", path(), token, "c"), 401, SESSION_MESSAGES.expired);
    });

    test(`${name}: credencial válida de un usuario eliminado → 401 "token inválido", no "sesión no iniciada" (RF-18, DP6-39)`, async () => {
      const ana = await signUp(app, ANA);
      assert.strictEqual((await deleteMe(ana)).status, 204);
      const response = await rawCookieRequest(app, "get", path(), ana.cookie, ana.csrf);
      assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    });
  }

  test("sin credencial y con filtro inválido → 401, la sesión va antes (RF-20)", async () => {
    assertStatusError(await supertest(app).get(`${SESSIONS}?game=nada`), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("usuario eliminado y con filtro inválido → 401 \"token inválido\"", async () => {
    const ana = await signUp(app, ANA);
    await User.deleteOne({ _id: ana.id });
    assertStatusError(await get(ana, "?game=nada"), 401, SESSION_MESSAGES.invalidToken);
  });
});

describe("paso del cuerpo (capa 1 del router)", () => {
  test("GET con cuerpo JSON escalar no se mira: llega a la sesión → 401 (RF-15)", async () => {
    for (const raw of ["3", "null", '"x"', "true", "[]"]) {
      const response = await supertest(app).get(SESSIONS).set("Content-Type", "application/json").send(raw);
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
    }
  });

  test("POST / con un cuerpo que no es objeto → 400 \"JSON mal formado\", también sin credencial (RF-28)", async () => {
    for (const raw of ["[]", "3", '"x"', "true", "null"]) {
      const response = await supertest(app).post(SESSIONS).set("Content-Type", "application/json").send(raw);
      assertStatusError(response, 400, SESSION_ERRORS.badJson);
    }
  });

  test("POST / con un objeto o sin cuerpo y sin credencial → 401", async () => {
    const withObject = await supertest(app).post(SESSIONS).send({});
    assertStatusError(withObject, 401, SESSION_MESSAGES.notLoggedIn);
    assertStatusError(await supertest(app).post(SESSIONS), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("PUT /:id con un cuerpo que no es objeto → 400 \"JSON mal formado\", también sin credencial (RF-28)", async () => {
    for (const raw of ["[]", "3", "null"]) {
      const response = await supertest(app)
        .put(`${SESSIONS}/${nonExistingId()}`)
        .set("Content-Type", "application/json")
        .send(raw);
      assertStatusError(response, 400, SESSION_ERRORS.badJson);
    }
  });

  test("las rutas que no son crear ni editar no miran el cuerpo (sumarse, salir, cancelar)", async () => {
    const id = nonExistingId();
    const requests = [
      supertest(app).post(`${SESSIONS}/${id}/join`),
      supertest(app).post(`${SESSIONS}/${id}/leave`),
      supertest(app).delete(`${SESSIONS}/${id}`),
    ];
    for (const request of requests) {
      const response = await request.set("Content-Type", "application/json").send("3");
      assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
    }
  });
});

describe("listar", () => {
  test("sin sesiones: 200 con lista vacía, de todos los juegos y de un juego (RF-2)", async () => {
    const ana = await signUp(app, ANA);
    for (const query of ["", "?game=all", "?game=lol", "?game=r6", "?game=cs2"]) {
      const response = await get(ana, query);
      assert.strictEqual(response.status, 200, query);
      assert.deepStrictEqual(response.body, [], query);
    }
  });

  test("?game=lol filtra por juego (RF-22)", async () => {
    const ana = await signUp(app, ANA);
    const lol = await insertSession({ host: ana.id, gameId: "lol", day: 1 });
    await insertSession({ host: ana.id, gameId: "r6", day: 2 });
    await insertSession({ host: ana.id, gameId: "cs2", day: 3 });
    const list = listBody(await get(ana, "?game=lol"));
    assert.deepStrictEqual(ids(list), [lol.id]);
    assert.ok(list.every((item) => item["gameId"] === "lol"));
  });

  test("?game=all y sin filtro → todas, incluidas las llenas y las propias o en las que participa (RF-2, RF-22)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const own = await insertSession({ host: ana.id, gameId: "lol", day: 0 });
    const joined = await insertSession({
      host: beto.id,
      gameId: "r6",
      day: 1,
      slots: 4,
      participants: [beto.id, ana.id],
    });
    const full = await insertSession({
      host: beto.id,
      gameId: "cs2",
      day: 2,
      slots: 2,
      participants: [beto.id, ana.id],
    });
    const other = await insertSession({ host: beto.id, gameId: "lol", day: 3 });
    const expected = [own.id, joined.id, full.id, other.id];
    for (const query of ["", "?game=all"]) {
      const list = listBody(await get(ana, query));
      assert.deepStrictEqual(ids(list), expected, query);
    }
    const fullView = listBody(await get(ana, "")).find((item) => item["id"] === full.id);
    assert.strictEqual(fullView?.["status"], "full");
  });

  const invalidFilters: Array<[string, string]> = [
    ["ALL", "?game=ALL"],
    ["LOL", "?game=LOL"],
    [" lol ", "?game=%20lol%20"],
    ["vacío", "?game="],
    ["repetido", "?game=lol&game=cs2"],
    ["xyz", "?game=xyz"],
  ];
  for (const [name, query] of invalidFilters) {
    test(`filtro ${name} → 400 "Juego no válido." (RF-22, DP6-3)`, async () => {
      const ana = await signUp(app, ANA);
      await insertSession({ host: ana.id });
      assertStatusError(await get(ana, query), 400, SESSION_ERRORS.game);
    });
  }

  test("los demás parámetros de la consulta se ignoran (page=2; RF-22, DP6-20)", async () => {
    const ana = await signUp(app, ANA);
    const first = await insertSession({ host: ana.id, day: 0 });
    const second = await insertSession({ host: ana.id, day: 1 });
    for (const query of ["?page=2", "?game=lol&page=2&limit=1", "?game=all&x=y"]) {
      assert.deepStrictEqual(ids(listBody(await get(ana, query))), [first.id, second.id], query);
    }
  });

  test("orden: día, luego hora de inicio (RF-2)", async () => {
    const ana = await signUp(app, ANA);
    const d3h10 = await insertSession({ host: ana.id, day: 3, startHour: 10 });
    const d1h20 = await insertSession({ host: ana.id, day: 1, startHour: 20 });
    const d3h9 = await insertSession({ host: ana.id, day: 3, startHour: 9 });
    const d0h23 = await insertSession({ host: ana.id, day: 0, startHour: 23 });
    const d1h8 = await insertSession({ host: ana.id, day: 1, startHour: 8 });
    const list = listBody(await get(ana, ""));
    assert.deepStrictEqual(ids(list), [d0h23.id, d1h8.id, d1h20.id, d3h9.id, d3h10.id]);
  });

  test("orden: a igual día y hora, la más antigua primero por fecha de creación (DP6-15)", async () => {
    const ana = await signUp(app, ANA);
    // Se insertan de la más nueva a la más antigua: el orden no puede ser el de inserción.
    const newest = await insertSession({ host: ana.id, createdAt: new Date(FIXED_NOW + 2000) });
    const middle = await insertSession({ host: ana.id, createdAt: new Date(FIXED_NOW + 1000) });
    const oldest = await insertSession({ host: ana.id, createdAt: new Date(FIXED_NOW) });
    const list = listBody(await get(ana, ""));
    assert.deepStrictEqual(ids(list), [oldest.id, middle.id, newest.id]);
  });

  test("orden: a igual día, hora y fecha de creación, por identificador de menor a mayor (DP6-15)", async () => {
    const ana = await signUp(app, ANA);
    // Identificadores fijados por la prueba, insertados en orden distinto al esperado.
    const wanted = ["a".repeat(24), "b".repeat(24), "c".repeat(24)];
    for (const id of ["c".repeat(24), "a".repeat(24), "b".repeat(24)]) {
      await PlaySession.create({
        _id: id,
        gameId: "lol",
        host: ana.id,
        title: "Ranked de noche",
        notes: "",
        day: 2,
        startHour: 21,
        durationHours: 2,
        slots: 4,
        participants: [ana.id],
        status: "open",
        createdAt: new Date(FIXED_NOW),
      });
    }
    assert.deepStrictEqual(ids(listBody(await get(ana, ""))), wanted);
  });

  test("el listado no depende del orden en que están guardadas (varios niveles a la vez)", async () => {
    const ana = await signUp(app, ANA);
    const late = await insertSession({ host: ana.id, day: 5, startHour: 1 });
    const soonNew = await insertSession({ host: ana.id, day: 1, startHour: 5, createdAt: new Date(FIXED_NOW + 5) });
    const soonOld = await insertSession({ host: ana.id, day: 1, startHour: 5, createdAt: new Date(FIXED_NOW) });
    assert.deepStrictEqual(ids(listBody(await get(ana, ""))), [soonOld.id, soonNew.id, late.id]);
  });
});

describe("obtener", () => {
  const badIds = ["abc", "me", `${"a".repeat(23)}g`, "a".repeat(25), "-1"];
  for (const bad of badIds) {
    test(`id mal formado (${bad}) → 400 "id con formato inválido" (RF-19)`, async () => {
      const ana = await signUp(app, ANA);
      assertStatusError(await get(ana, `/${bad}`), 400, SESSION_ERRORS.badId);
    });
  }

  test("%zz con sesión → 400 \"id con formato inválido\"; sin sesión → 401", async () => {
    const ana = await signUp(app, ANA);
    assertStatusError(await get(ana, "/%zz"), 400, SESSION_ERRORS.badId);
    assertStatusError(await supertest(app).get(`${SESSIONS}/%zz`), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("id con formato válido que no existe → 404 \"Sesión no encontrada.\" (RF-19)", async () => {
    const ana = await signUp(app, ANA);
    await insertSession({ host: ana.id });
    assertStatusError(await get(ana, `/${nonExistingId()}`), 404, SESSION_ERRORS.notFound);
  });

  test("200 con exactamente las claves de RNF-1, en ese orden, y referencias de usuario completas (RF-3, RF-4)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const session = await insertSession({
      host: ana.id,
      gameId: "r6",
      title: "Ranked de noche",
      notes: "Traer micrófono",
      day: 4,
      startHour: 20,
      durationHours: 3,
      slots: 5,
      participants: [ana.id, beto.id],
    });
    const response = await get(ana, `/${session.id}`);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    const body: unknown = response.body;
    assert.ok(typeof body === "object" && body !== null);
    assert.deepStrictEqual(Object.keys(body), [
      "id",
      "gameId",
      "hostId",
      "host",
      "title",
      "notes",
      "day",
      "startHour",
      "durationHours",
      "slots",
      "participants",
      "status",
      "createdAt",
    ]);
    const anaDoc = await User.findById(ana.id).lean();
    const betoDoc = await User.findById(beto.id).lean();
    assert.ok(anaDoc !== null && betoDoc !== null);
    const ref = (doc: NonNullable<typeof anaDoc>) => ({
      id: String(doc._id),
      username: doc.username,
      displayName: doc.displayName,
      avatarColor: doc.avatarColor,
    });
    assert.deepStrictEqual(response.body, {
      id: session.id,
      gameId: "r6",
      hostId: ana.id,
      host: ref(anaDoc),
      title: "Ranked de noche",
      notes: "Traer micrófono",
      day: 4,
      startHour: 20,
      durationHours: 3,
      slots: 5,
      participants: [ref(anaDoc), ref(betoDoc)],
      status: "open",
      createdAt: new Date(FIXED_NOW).toISOString(),
    });
    assert.match(response.body.createdAt, ISO_MS_Z);
    assert.deepStrictEqual(Object.keys(response.body.host), ["id", "username", "displayName", "avatarColor"]);
    for (const participant of response.body.participants) {
      assert.deepStrictEqual(Object.keys(participant), ["id", "username", "displayName", "avatarColor"]);
    }
  });

  test("las referencias no llevan correo ni hash de contraseña, ni en obtener ni en listar (RNF-1)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const single = await get(ana, `/${session.id}`);
    const list = await get(ana, "");
    for (const response of [single, list]) {
      const text = JSON.stringify(response.body);
      assert.ok(!text.includes("@example.com"), "no debe aparecer ningún correo");
      for (const forbidden of ["email", "passwordHash", "usernameKey", "bio", "timezone", "availability"]) {
        assert.ok(!text.includes(`"${forbidden}"`), `no debe aparecer ${forbidden}`);
      }
    }
  });

  test("el listado entrega la misma representación que obtener (RF-4)", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const single = await get(ana, `/${session.id}`);
    const list = listBody(await get(ana, ""));
    assert.deepStrictEqual(list, [single.body]);
  });

  test("obtener no exige ser el anfitrión ni participante, y acepta el id en mayúsculas", async () => {
    const ana = await signUp(app, ANA);
    const carla = await signUp(app, CARLA);
    const session = await insertSession({ host: ana.id });
    const response = await get(carla, `/${session.id.toUpperCase()}`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.id, session.id);
  });

  test("leer no cambia la base", async () => {
    const ana = await signUp(app, ANA);
    await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    await get(ana, "");
    await get(ana, `/${String(before[0]?._id)}`);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });
});

describe("anfitrión o participante eliminados (RF-24, DP6-34)", () => {
  test("anfitrión eliminado: la sesión se omite del listado y por id da 404; las demás siguen", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const orphan = await insertSession({ host: beto.id, participants: [beto.id, ana.id], day: 0 });
    const alive = await insertSession({ host: ana.id, day: 1 });
    await User.deleteOne({ _id: beto.id });

    assert.deepStrictEqual(ids(listBody(await get(ana, ""))), [alive.id]);
    assert.deepStrictEqual(ids(listBody(await get(ana, "?game=lol"))), [alive.id]);
    assertStatusError(await get(ana, `/${orphan.id}`), 404, SESSION_ERRORS.notFound);
    // La sesión sigue en la base: solo se oculta (la limpia la cascada de RF-16).
    assert.strictEqual(await PlaySession.countDocuments({ _id: orphan.id }), 1);
    assert.strictEqual((await get(ana, `/${alive.id}`)).status, 200);
  });

  test("participante eliminado: la sesión sigue visible (listado y 200 por id) sin ese participante y con el status guardado", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const carla = await signUp(app, CARLA);
    // Dos cupos, llena y con dos participantes guardados.
    const session = await insertSession({
      host: ana.id,
      slots: 2,
      participants: [ana.id, beto.id],
      status: "full",
    });
    const roomy = await insertSession({
      host: ana.id,
      day: 6,
      slots: 4,
      participants: [ana.id, beto.id, carla.id],
      status: "open",
    });
    await User.deleteOne({ _id: beto.id });

    const single = await get(ana, `/${session.id}`);
    assert.strictEqual(single.status, 200);
    assert.deepStrictEqual(
      single.body.participants.map((participant: { id: string }) => participant.id),
      [ana.id],
    );
    assert.strictEqual(single.body.status, "full"); // guardado: no se recalcula al leer (DP6-26)
    assert.strictEqual(single.body.slots, 2);

    const list = listBody(await get(ana, ""));
    assert.deepStrictEqual(ids(list), [session.id, roomy.id]);
    const roomyView = list.find((item) => item["id"] === roomy.id);
    assert.ok(roomyView !== undefined);
    const participants: unknown = roomyView["participants"];
    assert.ok(Array.isArray(participants));
    assert.deepStrictEqual(
      participants.map((participant: { id: string }) => participant.id),
      [ana.id, carla.id],
    );
    assert.strictEqual(roomyView["status"], "open");
    // La lista guardada no cambia al leer.
    const raw = await rawSessionsInDb();
    assert.strictEqual(raw[0]?.participants.length, 2);
  });
});
