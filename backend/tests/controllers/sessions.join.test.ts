// Agenda de sesiones: sumarse y salir (spec 006, T8). RF-11 a RF-14, RF-17, RF-19 y RF-20
// (sumarse, salir), RF-21, RF-24, DP6-10, DP6-38, DP6-39; plan, secciones 3.5, 5 (sumarse, salir),
// 6 (`joinSession`, `removeUserFromSessions`) y 7.
// - Usuarios por la API de registro (`signUp`); las sesiones se preparan con `insertSession`.
// - Cada error comprueba que la base queda sin cambios (`rawSessionsInDb` antes y después).
// - La compensación de sumarse se prueba de forma determinista: `PlaySession.findById` se sustituye
//   para que, justo después de una lectura, ocurra una operación ajena (borrar al usuario).
import { after, before, beforeEach, describe, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { SESSION_ERRORS } from "../../src/domain/sessionRules.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { joinSession, removeUserFromSessions } from "../../src/services/sessionWrites.ts";
import { testConfig } from "../server/helpers.ts";
import {
  HEX24_LOWER,
  authApp,
  closeTestServers,
  insertSession,
  linkAccountFor,
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
const DANI = { email: "dani@example.com", username: "Dani" } as const;

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

// Identificadores de los participantes que muestra la vista, en su orden.
function viewParticipantIds(response: Response): string[] {
  const list = recordOf(response)["participants"];
  assert.ok(Array.isArray(list), "participants debería ser una lista");
  return list.map((item: unknown): string => {
    assert.ok(typeof item === "object" && item !== null, "cada participante debería ser un objeto");
    const id: unknown = Reflect.get(item, "id");
    assert.ok(typeof id === "string", "cada participante debería traer su id");
    return id;
  });
}

// `POST /api/sessions/:id/join` con la sesión de `user`; sin `body`, la petición no lleva cuerpo.
function join(user: SignedUp, id: string, body?: unknown): supertest.Test {
  const request = withSession(user.agent.post(`${SESSIONS}/${id}/join`), user.csrf);
  return body === undefined ? request : request.send(body as object);
}

// `POST /api/sessions/:id/leave`.
function leave(user: SignedUp, id: string, body?: unknown): supertest.Test {
  const request = withSession(user.agent.post(`${SESSIONS}/${id}/leave`), user.csrf);
  return body === undefined ? request : request.send(body as object);
}

// `GET /api/sessions/:id`.
function getSession(user: SignedUp, id: string): supertest.Test {
  return withSession(user.agent.get(`${SESSIONS}/${id}`), user.csrf);
}

// `PUT /api/sessions/:id`.
function edit(user: SignedUp, id: string, body: unknown): supertest.Test {
  return withSession(user.agent.put(`${SESSIONS}/${id}`), user.csrf).send(body as object);
}

interface Scene {
  ana: SignedUp;
  beto: SignedUp;
  carla: SignedUp;
  dani: SignedUp;
}

async function scene(): Promise<Scene> {
  return {
    ana: await signUp(app, ANA),
    beto: await signUp(app, BETO),
    carla: await signUp(app, CARLA),
    dani: await signUp(app, DANI),
  };
}

// Exige `status` con `message` y la base sin cambios.
async function assertRejected(
  request: supertest.Test,
  status: number,
  message: string,
): Promise<void> {
  const before = await rawSessionsInDb();
  assertStatusError(await request, status, message);
  assert.deepStrictEqual(await rawSessionsInDb(), before);
}

// Lee con `findOne`: algunas pruebas sustituyen `PlaySession.findById` (ver `interleaveOnRead`).
function storedSession(id: string) {
  return PlaySession.findOne({ _id: id }).lean();
}

async function storedParticipants(id: string): Promise<string[]> {
  const stored = await storedSession(id);
  assert.ok(stored !== null, "la sesión debería existir");
  return stored.participants.map((participant) => participant.toString());
}

describe("sumarse (RF-11)", () => {
  test("200 con la sesión (13 campos), el usuario al final de los participantes y la base actualizada", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });

    const first = await join(beto, session.id);
    assert.strictEqual(first.status, 200);
    assert.match(first.headers["content-type"] ?? "", /application\/json/);
    assert.deepStrictEqual(Object.keys(recordOf(first)), VIEW_KEYS);
    assert.match(String(recordOf(first)["id"]), HEX24_LOWER);
    assert.strictEqual(recordOf(first)["id"], session.id);
    assert.strictEqual(recordOf(first)["status"], "open");
    assert.deepStrictEqual(viewParticipantIds(first), [ana.id, beto.id]);

    const second = await join(carla, session.id);
    assert.strictEqual(second.status, 200);
    assert.deepStrictEqual(viewParticipantIds(second), [ana.id, beto.id, carla.id]);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id, carla.id]);

    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.status, "open");
    assert.strictEqual(stored.slots, 4);
    assert.strictEqual(stored.host.toString(), ana.id);
  });

  test("el último cupo deja la sesión full (respuesta y base); salir después la devuelve a open", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 2 });

    const joined = await join(beto, session.id);
    assert.strictEqual(joined.status, 200);
    assert.strictEqual(recordOf(joined)["status"], "full");
    assert.strictEqual((await storedSession(session.id))?.status, "full");

    const left = await leave(beto, session.id);
    assert.strictEqual(left.status, 200);
    assert.strictEqual(recordOf(left)["status"], "open");
    assert.deepStrictEqual(viewParticipantIds(left), [ana.id]);
    const stored = await storedSession(session.id);
    assert.strictEqual(stored?.status, "open");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id]);
  });

  test("sumarse no exige cuenta vinculada en el juego (DP6-4)", async () => {
    const { ana, beto } = await scene();
    await linkAccountFor(ana, "r6");
    const session = await insertSession({ host: ana.id, gameId: "r6" });
    assert.strictEqual(await GameAccount.countDocuments({ user: beto.id }), 0);
    const response = await join(beto, session.id);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, beto.id]);
  });

  test("sumarse solo cambia a la sesión elegida", async () => {
    const { ana, beto } = await scene();
    const target = await insertSession({ host: ana.id, title: "La elegida" });
    const other = await insertSession({ host: ana.id, title: "La otra" });
    assert.strictEqual((await join(beto, target.id)).status, 200);
    assert.deepStrictEqual(await storedParticipants(target.id), [ana.id, beto.id]);
    assert.deepStrictEqual(await storedParticipants(other.id), [ana.id]);
  });
});

describe("sumarse: errores 409 (RF-12, DP6-10)", () => {
  test("el anfitrión en su propia sesión → 409 'Ya estás inscrito en esta sesión.' y la base sin cambios", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    await assertRejected(join(ana, session.id), 409, SESSION_ERRORS.alreadyJoined);
  });

  test("un participante ya inscrito → 409 'ya inscrito' y la base sin cambios", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    await assertRejected(join(beto, session.id), 409, SESSION_ERRORS.alreadyJoined);
  });

  test("inscrito en una sesión llena → 409 'ya inscrito', no 'ya no admite' (DP6-10)", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 2 });
    assert.strictEqual(session.status, "full");
    await assertRejected(join(beto, session.id), 409, SESSION_ERRORS.alreadyJoined);
    await assertRejected(join(ana, session.id), 409, SESSION_ERRORS.alreadyJoined);
  });

  test("no inscrito en una sesión llena → 409 'Esta sesión ya no admite jugadores.' y la base sin cambios", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 2 });
    await assertRejected(join(carla, session.id), 409, SESSION_ERRORS.full);
  });

  test("dos veces seguidas: 200 y después 409 'ya inscrito'", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    assert.strictEqual((await join(beto, session.id)).status, 200);
    await assertRejected(join(beto, session.id), 409, SESSION_ERRORS.alreadyJoined);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id]);
  });
});

describe("salir (RF-13, RF-14, RF-17)", () => {
  test("un participante sale: 200, sin él en la lista y el orden de los demás intacto", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    const response = await leave(beto, session.id);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.deepStrictEqual(Object.keys(recordOf(response)), VIEW_KEYS);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, carla.id]);
    assert.strictEqual(recordOf(response)["status"], "open");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, carla.id]);
  });

  test("al salir de una sesión llena el estado se recalcula a open (respuesta y base)", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 3 });
    assert.strictEqual(session.status, "full");
    const response = await leave(carla, session.id);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(recordOf(response)["status"], "open");
    assert.strictEqual((await storedSession(session.id))?.status, "open");
  });

  test("quien salió puede volver a sumarse, y entra al final", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    assert.strictEqual((await leave(beto, session.id)).status, 200);
    const again = await join(beto, session.id);
    assert.strictEqual(again.status, 200);
    assert.deepStrictEqual(viewParticipantIds(again), [ana.id, carla.id, beto.id]);
  });

  test("no inscrito → 409 'No estás inscrito en esta sesión.' y la base sin cambios (RF-17)", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    await assertRejected(leave(carla, session.id), 409, SESSION_ERRORS.notJoined);
  });

  test("el anfitrión → 409 'Eres quien organiza: cancela la sesión en lugar de salir.' y la base sin cambios (RF-14)", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    await assertRejected(leave(ana, session.id), 409, SESSION_ERRORS.hostLeave);
  });

  test("el anfitrión de una sesión llena tampoco sale (RF-14 antes que RF-17)", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 2 });
    await assertRejected(leave(ana, session.id), 409, SESSION_ERRORS.hostLeave);
  });
});

describe("identificador y existencia (RF-19, RF-20, RF-24)", () => {
  test("id mal formado → 400 'id con formato inválido' al sumarse y al salir, y la base sin cambios", async () => {
    const { ana, beto } = await scene();
    await insertSession({ host: ana.id });
    for (const id of ["abc", "123", "zzzzzzzzzzzzzzzzzzzzzzzz", "%zz"]) {
      await assertRejected(join(beto, id), 400, SESSION_ERRORS.badId);
      await assertRejected(leave(beto, id), 400, SESSION_ERRORS.badId);
    }
  });

  test("id con formato válido pero inexistente → 404 'Sesión no encontrada.'", async () => {
    const { ana, beto } = await scene();
    await insertSession({ host: ana.id });
    await assertRejected(join(beto, nonExistingId()), 404, SESSION_ERRORS.notFound);
    await assertRejected(leave(beto, nonExistingId()), 404, SESSION_ERRORS.notFound);
  });

  test("anfitrión eliminado (User.deleteOne) → 404 al sumarse y al salir, como si no existiera, y no cambia", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    await User.deleteOne({ _id: ana.id });
    await assertRejected(join(carla, session.id), 404, SESSION_ERRORS.notFound);
    await assertRejected(leave(beto, session.id), 404, SESSION_ERRORS.notFound);
    // La existencia va antes que RF-17 y que RF-12: ni "no inscrito" ni "ya inscrito".
    await assertRejected(leave(carla, session.id), 404, SESSION_ERRORS.notFound);
    await assertRejected(join(beto, session.id), 404, SESSION_ERRORS.notFound);
  });

  test("el id manda sobre el estado: 400 antes que 404, aunque no estés inscrito", async () => {
    const { beto } = await scene();
    await assertRejected(leave(beto, "abc"), 400, SESSION_ERRORS.badId);
    await assertRejected(leave(beto, nonExistingId()), 404, SESSION_ERRORS.notFound);
  });
});

describe("el cuerpo se ignora (RF-15, RF-21)", () => {
  test("sumarse con identificadores de otro usuario en el cuerpo: se suma quien tiene la sesión", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const response = await join(beto, session.id, {
      userId: carla.id,
      user: carla.id,
      hostId: carla.id,
      host: carla.id,
      participants: [carla.id],
      participantIds: [carla.id],
      status: "full",
      slots: 2,
      id: nonExistingId(),
      createdAt: "2000-01-01T00:00:00.000Z",
    });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, beto.id]);
    const body = recordOf(response);
    assert.strictEqual(body["hostId"], ana.id);
    assert.strictEqual(body["status"], "open");
    assert.strictEqual(body["slots"], 4);
    assert.strictEqual(body["id"], session.id);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id]);
  });

  test("salir con identificadores de otro usuario en el cuerpo: sale quien tiene la sesión", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id, carla.id], slots: 4 });
    const response = await leave(beto, session.id, { userId: carla.id, hostId: carla.id, participants: [] });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, carla.id]);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, carla.id]);
  });

  test("un cuerpo que pretende ser el anfitrión no evita el 409 de RF-14", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const before = await rawSessionsInDb();
    assertStatusError(await leave(ana, session.id, { userId: beto.id }), 409, SESSION_ERRORS.hostLeave);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("JSON bien formado que no es objeto ([], 5, \"x\", null) se ignora: 200", async () => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, carla.id], slots: 6 });
    for (const raw of ["[]", "5", '"x"', "null", "true"]) {
      const joined = await withSession(beto.agent.post(`${SESSIONS}/${session.id}/join`), beto.csrf)
        .set("Content-Type", "application/json")
        .send(raw);
      assert.strictEqual(joined.status, 200, `sumarse con cuerpo ${raw}`);
      const left = await withSession(beto.agent.post(`${SESSIONS}/${session.id}/leave`), beto.csrf)
        .set("Content-Type", "application/json")
        .send(raw);
      assert.strictEqual(left.status, 200, `salir con cuerpo ${raw}`);
    }
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, carla.id]);
  });

  test("cuerpo vacío o de otro tipo de contenido también se ignora", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const joined = await withSession(beto.agent.post(`${SESSIONS}/${session.id}/join`), beto.csrf)
      .set("Content-Type", "text/plain")
      .send("hola");
    assert.strictEqual(joined.status, 200);
    const left = await withSession(beto.agent.post(`${SESSIONS}/${session.id}/leave`), beto.csrf).send({});
    assert.strictEqual(left.status, 200);
  });
});

describe("sesión y cuerpo mal formado (RF-18, RF-20, RF-23, DP6-39)", () => {
  test("sin credencial → 401 'sesión no iniciada' al sumarse y al salir, y la base sin cambios", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    assertStatusError(
      await supertest(app).post(`${SESSIONS}/${session.id}/join`),
      401,
      SESSION_MESSAGES.notLoggedIn,
    );
    assertStatusError(
      await supertest(app).post(`${SESSIONS}/${session.id}/leave`),
      401,
      SESSION_MESSAGES.notLoggedIn,
    );
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("sin credencial y con id mal formado → 401 (la sesión va antes que el id)", async () => {
    assertStatusError(await supertest(app).post(`${SESSIONS}/abc/join`), 401, SESSION_MESSAGES.notLoggedIn);
    assertStatusError(await supertest(app).post(`${SESSIONS}/abc/leave`), 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("credencial válida de un usuario eliminado → 401 'token inválido', no 'sesión no iniciada', y sin cambios", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4 });
    await User.deleteOne({ _id: beto.id });
    await assertRejected(join(beto, session.id), 401, SESSION_MESSAGES.invalidToken);
    await assertRejected(leave(beto, session.id), 401, SESSION_MESSAGES.invalidToken);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id]);
  });

  test("cuerpo JSON mal formado → 400 'JSON mal formado' antes del 401, del id y de la existencia", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    for (const action of ["join", "leave"]) {
      const withCredential = await withSession(beto.agent.post(`${SESSIONS}/${session.id}/${action}`), beto.csrf)
        .set("Content-Type", "application/json")
        .send("{");
      assertStatusError(withCredential, 400, SESSION_ERRORS.badJson);
      const anonymous = await supertest(app)
        .post(`${SESSIONS}/${session.id}/${action}`)
        .set("Content-Type", "application/json")
        .send("{ no es json");
      assertStatusError(anonymous, 400, SESSION_ERRORS.badJson);
      const badId = await withSession(beto.agent.post(`${SESSIONS}/abc/${action}`), beto.csrf)
        .set("Content-Type", "application/json")
        .send("{");
      assertStatusError(badId, 400, SESSION_ERRORS.badJson);
    }
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });
});

describe("participantes eliminados y cupos guardados (RF-24, DP6-38)", () => {
  // Sesión de 3 cupos con Ana, Beto y Carla guardados; Carla se elimina sin cascada: 2 visibles.
  async function withDeletedParticipant() {
    const people = await scene();
    const session = await insertSession({
      host: people.ana.id,
      participants: [people.ana.id, people.beto.id, people.carla.id],
      slots: 3,
    });
    assert.strictEqual(session.status, "full");
    await User.deleteOne({ _id: people.carla.id });
    return { ...people, session };
  }

  test("la sesión sigue visible con 2 participantes y estado full guardado", async () => {
    const { ana, beto, session } = await withDeletedParticipant();
    const response = await getSession(ana, session.id);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, beto.id]);
    assert.strictEqual(recordOf(response)["status"], "full");
  });

  test("sumarse cuenta los guardados: 409 'ya no admite jugadores' aunque se vean 2 de 3", async () => {
    const { dani, session } = await withDeletedParticipant();
    await assertRejected(join(dani, session.id), 409, SESSION_ERRORS.full);
  });

  test("editar a 2 cupos cuenta los guardados: 400 'menos cupos que jugadores inscritos' (RF-8)", async () => {
    const { ana, session } = await withDeletedParticipant();
    await assertRejected(edit(ana, session.id, { slots: 2 }), 400, SESSION_ERRORS.slotsBelowParticipants);
  });

  test("tras removeUserFromSessions la sesión vuelve a open y sumarse se resuelve con 2 inscritos", async () => {
    const { ana, beto, carla, dani, session } = await withDeletedParticipant();
    await removeUserFromSessions(carla.id);
    const stored = await storedSession(session.id);
    assert.strictEqual(stored?.status, "open");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id]);

    const response = await join(dani, session.id);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, beto.id, dani.id]);
    assert.strictEqual(recordOf(response)["status"], "full");
  });

  test("tras removeUserFromSessions editar a 2 cupos se resuelve con 2 inscritos: 200 y full", async () => {
    const { ana, beto, carla, session } = await withDeletedParticipant();
    await removeUserFromSessions(carla.id);
    const response = await edit(ana, session.id, { slots: 2 });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(recordOf(response)["slots"], 2);
    assert.strictEqual(recordOf(response)["status"], "full");
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id, beto.id]);
  });

  test("salir con otro participante eliminado: el eliminado se conserva guardado y el estado se recalcula con él", async () => {
    const { ana, beto, carla, session } = await withDeletedParticipant();
    const response = await leave(beto, session.id);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(viewParticipantIds(response), [ana.id]);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, carla.id]);
    assert.strictEqual(recordOf(response)["status"], "open");
  });
});

describe("removeUserFromSessions (RF-16, RF-24, plan 6)", () => {
  test("quita al usuario solo de las sesiones donde participa y recalcula el estado de cada una", async () => {
    const { ana, beto, carla } = await scene();
    const full = await insertSession({ host: ana.id, participants: [ana.id, carla.id], slots: 2, title: "Llena" });
    const open = await insertSession({
      host: beto.id,
      participants: [beto.id, carla.id, ana.id],
      slots: 5,
      title: "Abierta",
    });
    const without = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 2, title: "Sin Carla" });
    const withoutBefore = await storedSession(without.id);

    const result = await removeUserFromSessions(carla.id);
    assert.strictEqual(result, undefined);

    assert.deepStrictEqual(await storedParticipants(full.id), [ana.id]);
    assert.strictEqual((await storedSession(full.id))?.status, "open");
    assert.deepStrictEqual(await storedParticipants(open.id), [beto.id, ana.id]);
    assert.strictEqual((await storedSession(open.id))?.status, "open");
    assert.deepStrictEqual(await storedSession(without.id), withoutBefore); // ni versión ni nada
  });

  test("también limpia las sesiones cuyo anfitrión ya no existe (no exige anfitrión)", async () => {
    const { carla } = await scene();
    const ghost = nonExistingId();
    const session = await insertSession({ host: ghost, participants: [ghost, carla.id], slots: 2 });
    assert.strictEqual(session.status, "full");
    await removeUserFromSessions(carla.id);
    assert.deepStrictEqual(await storedParticipants(session.id), [ghost]);
    assert.strictEqual((await storedSession(session.id))?.status, "open");
  });

  test("es idempotente y no hace nada si el usuario no participa en ninguna sesión", async () => {
    const { ana, beto, carla } = await scene();
    await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
    const before = await rawSessionsInDb();
    await removeUserFromSessions(carla.id);
    await removeUserFromSessions(nonExistingId());
    assert.deepStrictEqual(await rawSessionsInDb(), before);

    await insertSession({ host: ana.id, participants: [ana.id, carla.id] });
    await removeUserFromSessions(carla.id);
    const once = await rawSessionsInDb();
    await removeUserFromSessions(carla.id);
    assert.deepStrictEqual(await rawSessionsInDb(), once);
  });

  test("quita al usuario de todas sus sesiones, aunque sean muchas", async () => {
    const { ana, carla } = await scene();
    const ids: string[] = [];
    for (let index = 0; index < 8; index += 1) {
      const session = await insertSession({ host: ana.id, participants: [ana.id, carla.id], title: `Sesión ${index}` });
      ids.push(session.id);
    }
    await removeUserFromSessions(carla.id);
    assert.strictEqual(await PlaySession.countDocuments({ participants: carla.id }), 0);
    for (const id of ids) assert.deepStrictEqual(await storedParticipants(id), [ana.id]);
  });

  test("una sesión borrada entre la búsqueda y la escritura (404) se ignora y no se recrea", async (t) => {
    const { ana, beto, carla } = await scene();
    const gone = await insertSession({ host: ana.id, participants: [ana.id, carla.id], title: "Se cancela" });
    const stays = await insertSession({ host: beto.id, participants: [beto.id, carla.id], title: "Se queda" });
    interleaveOnRead(t, [
      {
        call: 1,
        run: async () => {
          await PlaySession.collection.deleteOne({ _id: new mongoose.Types.ObjectId(gone.id) });
        },
      },
    ]);
    await removeUserFromSessions(carla.id);
    assert.strictEqual(await PlaySession.countDocuments({ _id: gone.id }), 0);
    assert.deepStrictEqual(await storedParticipants(stays.id), [beto.id]);
  });
});

// --- Compensación de sumarse (RF-16, RF-18, DP6-39) ---

interface InterleavedAction {
  call: number; // número de lectura (1 = la primera)
  run: () => Promise<void>;
}

// Sustituye `PlaySession.findById`: justo después de la lectura número `call` se ejecuta `run()`;
// la operación en curso sigue con el documento ya leído. Se restaura al terminar la prueba.
function interleaveOnRead(t: TestContext, actions: readonly InterleavedAction[]): void {
  const original = PlaySession.findById.bind(PlaySession);
  let calls = 0;
  t.mock.method(PlaySession, "findById", async (id: string) => {
    calls += 1;
    const position = calls;
    const document = await original(id);
    for (const action of actions) {
      if (action.call === position) await action.run();
    }
    return document;
  });
}

describe("compensación: el usuario ya no existe al sumarse (RF-16, RF-18, DP6-39)", () => {
  test("servicio: usuario inexistente → 401 'token inválido' y sin participación huérfana", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const before = await rawSessionsInDb();
    const ghost = nonExistingId();
    const result = await joinSession(session.id, ghost);
    assert.deepStrictEqual(result, { ok: false, status: 401, error: SESSION_MESSAGES.invalidToken });
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id]);
    assert.strictEqual((await storedSession(session.id))?.status, "open");
    assert.strictEqual(await PlaySession.countDocuments({ participants: ghost }), 0);
    const after = await rawSessionsInDb();
    assert.deepStrictEqual(
      after.map((s) => s.participants.map((p) => p.toString())),
      before.map((s) => s.participants.map((p) => p.toString())),
    );
  });

  test("servicio: usuario existente → ok con el registro nuevo", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 2 });
    const result = await joinSession(session.id, beto.id);
    assert.ok(result.ok);
    assert.ok("record" in result);
    assert.deepStrictEqual(result.record.participantIds, [ana.id, beto.id]);
    assert.strictEqual(result.record.status, "full");
  });

  test("servicio: los errores de la regla y los 404 pasan tal cual", async () => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id });
    assert.deepStrictEqual(await joinSession(session.id, ana.id), {
      ok: false,
      status: 409,
      error: SESSION_ERRORS.alreadyJoined,
    });
    assert.deepStrictEqual(await joinSession(nonExistingId(), beto.id), {
      ok: false,
      status: 404,
      error: SESSION_ERRORS.notFound,
    });
  });

  test("HTTP: el usuario se elimina entre la lectura y el guardado → 401 'token inválido' y sin participación huérfana", async (t) => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    interleaveOnRead(t, [
      {
        call: 1,
        run: async () => {
          await User.deleteOne({ _id: beto.id });
        },
      },
    ]);
    const response = await join(beto, session.id);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    assert.strictEqual(await User.countDocuments({ _id: beto.id }), 0);
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id]);
    assert.strictEqual(await PlaySession.countDocuments({ participants: beto.id }), 0);
    assert.strictEqual((await storedSession(session.id))?.status, "open");
  });

  test("HTTP: si el sumarse llenó la sesión, la compensación la devuelve a open", async (t) => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 2 });
    interleaveOnRead(t, [
      {
        call: 1,
        run: async () => {
          await User.deleteOne({ _id: beto.id });
        },
      },
    ]);
    const response = await join(beto, session.id);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    const stored = await storedSession(session.id);
    assert.strictEqual(stored?.status, "open");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id]);
  });

  test("HTTP: la sesión se cancela justo durante la compensación (404 ignorado) → 401 y no se recrea", async (t) => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    interleaveOnRead(t, [
      {
        call: 1,
        run: async () => {
          await User.deleteOne({ _id: beto.id });
        },
      },
      {
        call: 2, // la lectura de la compensación
        run: async () => {
          await PlaySession.collection.deleteOne({ _id: new mongoose.Types.ObjectId(session.id) });
        },
      },
    ]);
    const response = await join(beto, session.id);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });
});
