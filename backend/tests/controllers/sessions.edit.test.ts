// Agenda de sesiones: editar y cancelar (spec 006, T7). RF-7, RF-8, RF-9, RF-10, RF-19, RF-20
// (editar, cancelar), RF-24 (escritura), RF-26; plan, secciones 5 (editar, cancelar), 6
// (`mutateSession`), 7 y P6-2.
// - Usuarios por la API de registro (`signUp`); las sesiones se preparan con `insertSession`.
// - Cada error comprueba que la base queda sin cambios (`rawSessionsInDb` antes y después).
// - El reintento optimista se prueba de forma determinista: `PlaySession.findById` se sustituye
//   para que, justo después de la primera lectura, una escritura ajena cambie el documento.
import { after, before, beforeEach, describe, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { SESSION_ERRORS, validateSessionEdit } from "../../src/domain/sessionRules.ts";
import { applyEdit } from "../../src/domain/sessionState.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { mutateSession } from "../../src/services/sessionWrites.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  HEX24_LOWER,
  authApp,
  closeTestServers,
  insertSession,
  nonExistingId,
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

const VIEW_KEYS = [
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
];

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

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

function recordOf(response: Response): Record<string, unknown> {
  const body: unknown = response.body;
  assert.ok(typeof body === "object" && body !== null && !Array.isArray(body), "debería ser un objeto");
  return { ...body };
}

// `PUT /api/sessions/:id` con la sesión de `user`; sin `body`, la petición no lleva cuerpo.
function put(user: SignedUp, id: string, body?: unknown): supertest.Test {
  const request = withSession(user.agent.put(`${SESSIONS}/${id}`), user.csrf);
  return body === undefined ? request : request.send(body as object);
}

// `DELETE /api/sessions/:id`.
function cancel(user: SignedUp, id: string): supertest.Test {
  return withSession(user.agent.delete(`${SESSIONS}/${id}`), user.csrf);
}

// Anfitrión (Ana) con una sesión de 4 cupos, y Beto y Carla como otros usuarios existentes.
interface Scene {
  ana: SignedUp;
  beto: SignedUp;
  carla: SignedUp;
}

async function scene(): Promise<Scene> {
  return { ana: await signUp(app, ANA), beto: await signUp(app, BETO), carla: await signUp(app, CARLA) };
}

// Exige un 400 con `message` y la base sin cambios.
async function assertEditRejected(
  user: SignedUp,
  id: string,
  body: unknown,
  status: number,
  message: string,
): Promise<void> {
  const before = await rawSessionsInDb();
  assertStatusError(await put(user, id, body), status, message);
  assert.deepStrictEqual(await rawSessionsInDb(), before);
}

describe("editar con datos válidos (RF-7)", () => {
  test("solo slots: cambia los cupos y conserva todo lo demás", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id, title: "Ranked de noche", notes: "Jungla", slots: 4 });
    const response = await put(ana, session.id, { slots: 5 });
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    const body = recordOf(response);
    assert.deepStrictEqual(Object.keys(body), VIEW_KEYS);
    assert.strictEqual(body["id"], session.id);
    assert.match(String(body["id"]), HEX24_LOWER);
    assert.strictEqual(body["gameId"], "lol");
    assert.strictEqual(body["hostId"], ana.id);
    assert.strictEqual(body["title"], "Ranked de noche");
    assert.strictEqual(body["notes"], "Jungla");
    assert.strictEqual(body["day"], 2);
    assert.strictEqual(body["startHour"], 21);
    assert.strictEqual(body["durationHours"], 2);
    assert.strictEqual(body["slots"], 5);
    assert.strictEqual(body["status"], "open");
    assert.strictEqual(body["createdAt"], new Date(FIXED_NOW).toISOString());

    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.slots, 5);
    assert.strictEqual(stored.title, "Ranked de noche");
    assert.strictEqual(stored.notes, "Jungla");
    assert.strictEqual(stored.host.toString(), ana.id);
    assert.deepStrictEqual(
      stored.participants.map((id) => id.toString()),
      [ana.id],
    );
  });

  test("todos los campos editables a la vez, recortados; el juego no cambia", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id, gameId: "r6" });
    const response = await put(ana, session.id, {
      title: "  Nuevo título  ",
      notes: "  Nuevas notas ",
      day: 6,
      startHour: 0,
      durationHours: 4,
      slots: 6,
    });
    assert.strictEqual(response.status, 200);
    const body = recordOf(response);
    assert.strictEqual(body["gameId"], "r6");
    assert.strictEqual(body["title"], "Nuevo título");
    assert.strictEqual(body["notes"], "Nuevas notas");
    assert.strictEqual(body["day"], 6);
    assert.strictEqual(body["startHour"], 0);
    assert.strictEqual(body["durationHours"], 4);
    assert.strictEqual(body["slots"], 6);
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.title, "Nuevo título");
    assert.strictEqual(stored.notes, "Nuevas notas");
    assert.strictEqual(stored.gameId, "r6");
  });

  test("cupos = participantes → status full (respuesta y base)", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    const response = await put(ana, session.id, { slots: 2 });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(recordOf(response)["status"], "full");
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.status, "full");
    assert.strictEqual(stored.slots, 2);
  });

  test("subir los cupos de una sesión llena → status open", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 2 });
    assert.strictEqual(session.status, "full");
    const response = await put(ana, session.id, { slots: 3 });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(recordOf(response)["status"], "open");
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.status, "open");
  });

  test("notes '' y '   ' → 200 con notas ''", async () => {
    const { ana } = await scene();
    for (const notes of ["", "   "]) {
      const session = await insertSession({ host: ana.id, notes: "algo" });
      const response = await put(ana, session.id, { notes });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(recordOf(response)["notes"], "");
      const stored = await PlaySession.findById(session.id).lean();
      assert.strictEqual(stored?.notes, "");
    }
  });
});

describe("edición sin cambios (RF-15, RF-26)", () => {
  test("{} → 200 con la sesión y la base idéntica", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const before = await rawSessionsInDb();
    const response = await put(ana, session.id, {});
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(Object.keys(recordOf(response)), VIEW_KEYS);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("sin cuerpo → 200 y la base idéntica", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    const response = await put(ana, session.id);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(recordOf(response)["id"], session.id);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("solo campos ignorados (gameId inexistente incluido) → 200 y la base idéntica", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, gameId: "lol" });
    const before = await rawSessionsInDb();
    const response = await put(ana, session.id, {
      gameId: "no-existe",
      hostId: beto.id,
      host: beto.id,
      participants: [beto.id],
      status: "full",
      id: nonExistingId(),
      createdAt: "2000-01-01T00:00:00.000Z",
      extra: 1,
    });
    assert.strictEqual(response.status, 200);
    const body = recordOf(response);
    assert.strictEqual(body["gameId"], "lol");
    assert.strictEqual(body["hostId"], ana.id);
    assert.strictEqual(body["status"], "open");
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("gameId junto a un campo válido: el juego no se lee ni se valida, el campo válido sí se aplica", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id, gameId: "cs2" });
    const response = await put(ana, session.id, { gameId: 42, day: 5 });
    assert.strictEqual(response.status, 200);
    const body = recordOf(response);
    assert.strictEqual(body["gameId"], "cs2");
    assert.strictEqual(body["day"], 5);
  });
});

describe("datos inválidos al editar (RF-7, DP6-1; base sin cambios)", () => {
  const cases: ReadonlyArray<readonly [string, unknown, string]> = [
    ["notes null", { notes: null }, SESSION_ERRORS.notes],
    ["notes que no es texto", { notes: 5 }, SESSION_ERRORS.notes],
    ["notes de 161 caracteres", { notes: "x".repeat(161) }, SESSION_ERRORS.notes],
    ["title null", { title: null }, SESSION_ERRORS.title],
    ["title ''", { title: "" }, SESSION_ERRORS.title],
    ["title de 2 caracteres", { title: "ab" }, SESSION_ERRORS.title],
    ["day '3'", { day: "3" }, SESSION_ERRORS.day],
    ["day 7", { day: 7 }, SESSION_ERRORS.day],
    ["startHour 24", { startHour: 24 }, SESSION_ERRORS.startHour],
    ["durationHours 0", { durationHours: 0 }, SESSION_ERRORS.durationHours],
    ["slots 7", { slots: 7 }, SESSION_ERRORS.slots],
  ];
  for (const [name, body, message] of cases) {
    test(`${name} → 400 con su texto y la base sin cambios`, async () => {
      const { ana } = await scene();
      const session = await insertSession({ host: ana.id });
      await assertEditRejected(ana, session.id, body, 400, message);
    });
  }

  test("varios campos inválidos: gana el primero del orden (título antes que cupos)", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    await assertEditRejected(ana, session.id, { slots: 99, title: null }, 400, SESSION_ERRORS.title);
  });
});

describe("cupos y participantes (RF-8)", () => {
  test("slots: 1 → el 400 de los cupos (RF-6), no el de RF-8", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    await assertEditRejected(ana, session.id, { slots: 1 }, 400, SESSION_ERRORS.slots);
  });

  test("cupos válidos por debajo de los participantes → 400 RF-8 y la base sin cambios", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    await assertEditRejected(ana, session.id, { slots: 2 }, 400, SESSION_ERRORS.slotsBelowParticipants);
  });

  test("RF-8 no deja pasar otros campos válidos del mismo cuerpo (todo o nada)", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    await assertEditRejected(
      ana,
      session.id,
      { title: "Otro título", slots: 2 },
      400,
      SESSION_ERRORS.slotsBelowParticipants,
    );
  });

  test("datos inválidos y cupos bajo inscritos: gana el error de los datos (datos antes que RF-8)", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    await assertEditRejected(ana, session.id, { title: null, slots: 2 }, 400, SESSION_ERRORS.title);
  });
});

describe("solo el anfitrión edita (RF-10, RF-20)", () => {
  test("no anfitrión → 403 y la base sin cambios", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id });
    await assertEditRejected(beto, session.id, { title: "Secuestrada" }, 403, SESSION_ERRORS.notHostEdit);
  });

  test("no anfitrión con datos inválidos → 403, no el 400 de los datos", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id });
    await assertEditRejected(beto, session.id, { title: null, slots: 99 }, 403, SESSION_ERRORS.notHostEdit);
  });

  test("no anfitrión con cupos bajo los inscritos → 403, no RF-8", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    await assertEditRejected(beto, session.id, { slots: 2 }, 403, SESSION_ERRORS.notHostEdit);
  });

  test("un participante que no es el anfitrión tampoco edita", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    await assertEditRejected(beto, session.id, {}, 403, SESSION_ERRORS.notHostEdit);
  });

  test("hostId en el cuerpo se ignora: no cede ni arrebata la sesión", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id });
    await assertEditRejected(beto, session.id, { hostId: beto.id, host: beto.id }, 403, SESSION_ERRORS.notHostEdit);
  });
});

describe("identificador y existencia al editar (RF-19, RF-20, RF-24)", () => {
  test("id mal formado de sesión ajena, también con datos inválidos → 400 'id con formato inválido'", async () => {
    const { ana, beto } = await scene();
    await insertSession({ host: ana.id });
    for (const id of ["abc", "123", "zzzzzzzzzzzzzzzzzzzzzzzz", "%zz"]) {
      await assertEditRejected(beto, id, { title: null }, 400, SESSION_ERRORS.badId);
    }
  });

  test("id inexistente con datos inválidos → 404", async () => {
    const { beto } = await scene();
    await assertEditRejected(beto, nonExistingId(), { title: null, slots: 1 }, 404, SESSION_ERRORS.notFound);
  });

  test("id inexistente con datos válidos → 404", async () => {
    const { ana } = await scene();
    await assertEditRejected(ana, nonExistingId(), { title: "Algo válido" }, 404, SESSION_ERRORS.notFound);
  });

  test("anfitrión eliminado (User.deleteOne) → 404 'Sesión no encontrada.' aun con datos inválidos, y no cambia", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    await User.deleteOne({ _id: ana.id });
    await assertEditRejected(beto, session.id, { title: "Valido" }, 404, SESSION_ERRORS.notFound);
    await assertEditRejected(beto, session.id, { title: null }, 404, SESSION_ERRORS.notFound);
  });
});

describe("sesión y cuerpo al editar (RF-20)", () => {
  test("sin credencial, con datos inválidos → 401 'sesión no iniciada'", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    assertStatusError(
      await supertest(app).put(`${SESSIONS}/${session.id}`).send({ title: null }),
      401,
      SESSION_MESSAGES.notLoggedIn,
    );
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("credencial válida de un usuario eliminado → 401 'token inválido' y la base sin cambios", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    await User.deleteOne({ _id: ana.id });
    await assertEditRejected(ana, session.id, { title: "Valido" }, 401, SESSION_MESSAGES.invalidToken);
  });

  test("cuerpo JSON que no es objeto → 400 'JSON mal formado' (antes de la sesión) y la base sin cambios", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    for (const raw of ["[]", "5", '"x"', "null"]) {
      const response = await withSession(ana.agent.put(`${SESSIONS}/${session.id}`), ana.csrf)
        .set("Content-Type", "application/json")
        .send(raw);
      assertStatusError(response, 400, "JSON mal formado");
    }
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });
});

describe("cancelar (RF-9, RF-10, RF-19, RF-20, RF-24)", () => {
  test("anfitrión → 204 sin cuerpo y la sesión ya no está en la base (ni se obtiene)", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const other = await insertSession({ host: ana.id, title: "Otra sesión" });
    const response = await cancel(ana, session.id);
    assert.strictEqual(response.status, 204);
    assert.deepStrictEqual(response.body, {});
    assert.strictEqual(response.text, "");
    assert.strictEqual(await PlaySession.countDocuments({ _id: session.id }), 0);
    assert.strictEqual(await PlaySession.countDocuments({ _id: other.id }), 1);
    const get = await withSession(ana.agent.get(`${SESSIONS}/${session.id}`), ana.csrf);
    assertStatusError(get, 404, SESSION_ERRORS.notFound);
  });

  test("no anfitrión → 403 'Solo quien organiza puede cancelar la sesión.' y la base sin cambios", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const before = await rawSessionsInDb();
    assertStatusError(await cancel(beto, session.id), 403, SESSION_ERRORS.notHostCancel);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("inexistente → 404", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    assertStatusError(await cancel(ana, nonExistingId()), 404, SESSION_ERRORS.notFound);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
    assert.strictEqual(await PlaySession.countDocuments({ _id: session.id }), 1);
  });

  test("id mal formado, también de sesión ajena y con %zz → 400", async () => {
    const { ana, beto } = await scene();
    await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    for (const id of ["abc", "123", "%zz"]) {
      assertStatusError(await cancel(beto, id), 400, SESSION_ERRORS.badId);
    }
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("anfitrión eliminado → 404 para otro usuario, y la sesión residual no se borra", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    await User.deleteOne({ _id: ana.id });
    const before = await rawSessionsInDb();
    assertStatusError(await cancel(beto, session.id), 404, SESSION_ERRORS.notFound);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("sin credencial → 401 'sesión no iniciada'; usuario eliminado → 401 'token inválido'", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    assertStatusError(await supertest(app).delete(`${SESSIONS}/${session.id}`), 401, SESSION_MESSAGES.notLoggedIn);
    await User.deleteOne({ _id: ana.id });
    assertStatusError(await cancel(ana, session.id), 401, SESSION_MESSAGES.invalidToken);
    assert.strictEqual(await PlaySession.countDocuments({ _id: session.id }), 1);
  });

  test("el cuerpo de la petición se ignora (RF-15)", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id });
    const response = await withSession(ana.agent.delete(`${SESSIONS}/${session.id}`), ana.csrf).send({
      hostId: beto.id,
    });
    assert.strictEqual(response.status, 204);
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });
});

// --- Reintento optimista (RF-25, P6-2) ---

// Sustituye `PlaySession.findById` para que, justo después de la lectura número `onCall`
// (1 por defecto), se ejecute `concurrent()`: la operación en curso sigue con el documento viejo.
// Las demás lecturas pasan directo. Se restaura al terminar la prueba (`t.mock`).
function interleaveOnRead(t: TestContext, concurrent: () => Promise<void>, onCall: (call: number) => boolean): void {
  const original = PlaySession.findById.bind(PlaySession);
  let calls = 0;
  t.mock.method(PlaySession, "findById", async (id: string) => {
    calls += 1;
    const document = await original(id);
    if (onCall(calls)) await concurrent();
    return document;
  });
}

// Escritura ajena con el driver nativo: agrega un participante, recalcula el estado y sube la versión.
function otherWriterJoins(sessionId: string, userId: string): () => Promise<void> {
  return async () => {
    await PlaySession.updateOne(
      { _id: sessionId },
      {
        $push: { participants: new mongoose.Types.ObjectId(userId) },
        $set: { status: "full" },
        $inc: { __v: 1 },
      },
    );
  };
}

describe("mutateSession: reintento optimista (RF-25)", () => {
  test("otra escritura gana tras la lectura: la regla se aplica sobre el estado nuevo (RF-8 con el participante agregado)", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    // Al leer (2 inscritos) bajar a 2 cupos es válido; la escritura ajena suma a Carla (3 inscritos).
    interleaveOnRead(t, otherWriterJoins(session.id, carla.id), (call) => call === 1);
    const patch = validateSessionEdit({ slots: 2 });
    const result = await mutateSession(session.id, (s) => applyEdit(s, ana.id, patch), { requireHost: true });
    assert.deepStrictEqual(result, { ok: false, status: 400, error: SESSION_ERRORS.slotsBelowParticipants });
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.slots, 4); // la edición vieja no se escribió
    assert.strictEqual(stored.participants.length, 3);
    assert.strictEqual(stored.status, "full");
  });

  test("otra escritura gana tras la lectura y la regla sigue valiendo: se reintenta y se escribe sobre lo nuevo", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    interleaveOnRead(t, otherWriterJoins(session.id, carla.id), (call) => call === 1);
    const patch = validateSessionEdit({ title: "Título nuevo", slots: 3 });
    const result = await mutateSession(session.id, (s) => applyEdit(s, ana.id, patch), { requireHost: true });
    assert.strictEqual(result.ok, true);
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.title, "Título nuevo");
    assert.strictEqual(stored.slots, 3);
    assert.strictEqual(stored.participants.length, 3); // el participante de la otra escritura se conserva
    assert.strictEqual(stored.status, "full"); // 3 inscritos en 3 cupos
  });

  test("por HTTP: la edición que pierde la carrera responde con la regla sobre el estado nuevo", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    interleaveOnRead(t, otherWriterJoins(session.id, carla.id), (call) => call === 1);
    const response = await put(ana, session.id, { slots: 2 });
    assertStatusError(response, 400, SESSION_ERRORS.slotsBelowParticipants);
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.slots, 4);
  });

  test("agotados los intentos lanza un error (→ 500) y no cambia nada", async (t) => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const bump = async (): Promise<void> => {
      await PlaySession.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(session.id) },
        { $inc: { __v: 1 } },
      );
    };
    interleaveOnRead(t, bump, () => true); // cada lectura queda vieja
    const patch = validateSessionEdit({ slots: 5 });
    await assert.rejects(
      mutateSession(session.id, (s) => applyEdit(s, ana.id, patch), { requireHost: true }, 3),
      /3 intentos/,
    );
    const [stored] = await rawSessionsInDb(); // findById sigue sustituido: se lee con find
    assert.strictEqual(stored?.slots, 4);
  });

  test("la sesión se borra entre la lectura y el guardado → 404 y no se recrea", async (t) => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    interleaveOnRead(
      t,
      async () => {
        await PlaySession.collection.deleteOne({ _id: new mongoose.Types.ObjectId(session.id) });
      },
      (call) => call === 1,
    );
    const response = await put(ana, session.id, { title: "Titulo nuevo" });
    assertStatusError(response, 404, SESSION_ERRORS.notFound);
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });

  test("servicio: sin sesión → 404; anfitrión inexistente con requireHost → 404, y sin requireHost sí se aplica", async () => {
    await scene();
    const missing = await mutateSession(nonExistingId(), (s) => ({ ok: true, value: s }), { requireHost: true });
    assert.deepStrictEqual(missing, { ok: false, status: 404, error: SESSION_ERRORS.notFound });

    const orphan = await insertSession({ host: nonExistingId(), slots: 4 });
    const refused = await mutateSession(orphan.id, (s) => ({ ok: true, value: s }), { requireHost: true });
    assert.deepStrictEqual(refused, { ok: false, status: 404, error: SESSION_ERRORS.notFound });

    const allowed = await mutateSession(orphan.id, (s) => ({ ok: true, value: { ...s, slots: 5 } }), {
      requireHost: false,
    });
    assert.strictEqual(allowed.ok, true);
    assert.strictEqual((await PlaySession.findById(orphan.id).lean())?.slots, 5);
  });
});
