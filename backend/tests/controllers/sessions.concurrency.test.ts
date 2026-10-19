// Agenda de sesiones: concurrencia (spec 006, T9). RF-25, RF-8, RF-11, RF-12, RF-9, RF-24;
// DP6-11, DP6-12; plan, secciones 6 ("Concurrencia") y 9.
// - Casos de RF-25 con `Promise.all` entre dos usuarios (o el mismo usuario dos veces), repetidos
//   10 veces con las sesiones reiniciadas en cada repetición: se afirman invariantes (un 200 y un
//   409, nunca más participantes que cupos, la sesión cancelada no existe), no un orden.
// - El reintento optimista se prueba de forma determinista: `overlapFirstSessionFindById` detiene
//   la primera operación justo después de leer la sesión, deja que la segunda termine y la primera
//   sigue con la lectura vieja: `save()` falla por versión y la regla se aplica sobre el estado nuevo.
// - Los textos de error se escriben como literales de la spec (plan, P-23).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type supertest from "supertest";
import type { Response } from "supertest";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { testConfig } from "../server/helpers.ts";
import {
  authApp,
  closeTestServers,
  insertSession,
  overlapFirstSessionFindById,
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
const REPETITIONS = 10;

const FULL = "Esta sesión ya no admite jugadores.";
const ALREADY_JOINED = "Ya estás inscrito en esta sesión.";
const BELOW_PARTICIPANTS = "No puedes dejar menos cupos que jugadores inscritos.";
const NOT_FOUND = "Sesión no encontrada.";

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

interface Scene {
  ana: SignedUp;
  beto: SignedUp;
  carla: SignedUp;
}

async function scene(): Promise<Scene> {
  return {
    ana: await signUp(app, ANA),
    beto: await signUp(app, BETO),
    carla: await signUp(app, CARLA),
  };
}

// `POST /api/sessions/:id/join`.
function join(user: SignedUp, id: string): supertest.Test {
  return withSession(user.agent.post(`${SESSIONS}/${id}/join`), user.csrf);
}

// `PUT /api/sessions/:id`.
function edit(user: SignedUp, id: string, body: unknown): supertest.Test {
  return withSession(user.agent.put(`${SESSIONS}/${id}`), user.csrf).send(body as object);
}

// `DELETE /api/sessions/:id`.
function cancel(user: SignedUp, id: string): supertest.Test {
  return withSession(user.agent.delete(`${SESSIONS}/${id}`), user.csrf);
}

function errorOf(response: Response): unknown {
  const body: unknown = response.body;
  return typeof body === "object" && body !== null ? Reflect.get(body, "error") : undefined;
}

function assertError(response: Response, status: number, message: string, label: string): void {
  assert.strictEqual(response.status, status, label);
  assert.deepStrictEqual(response.body, { error: message }, label);
}

// Documento guardado de la sesión, leído con `findOne` (algunas pruebas sustituyen `findById`).
async function stored(id: string) {
  return PlaySession.findOne({ _id: id }).lean();
}

async function storedParticipants(id: string): Promise<string[]> {
  const session = await stored(id);
  assert.ok(session !== null, "la sesión debería existir");
  return session.participants.map((participant) => participant.toString());
}

// Nunca más participantes que cupos y el estado guardado coincide con ocupación (RF-8, RF-12).
async function assertConsistent(id: string, label: string): Promise<void> {
  const session = await stored(id);
  assert.ok(session !== null, `${label}: la sesión debería existir`);
  assert.ok(session.participants.length <= session.slots, `${label}: más participantes que cupos`);
  assert.strictEqual(session.status, session.participants.length === session.slots ? "full" : "open", label);
  assert.strictEqual(new Set(session.participants.map(String)).size, session.participants.length, `${label}: repetidos`);
}

describe("overlapFirstSessionFindById (el propio ayudante)", () => {
  test("la segunda operación se completa entre la lectura y la continuación de la primera", async (t) => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const events: string[] = [];
    const result = await overlapFirstSessionFindById(
      t,
      async () => {
        events.push("primera: empieza");
        const read = await PlaySession.findById(session.id);
        events.push(`primera: continúa (${read === null ? "sin sesión" : "con sesión"})`);
        return "A";
      },
      async () => {
        events.push("segunda: empieza");
        const read = await PlaySession.findById(session.id); // pasa directo, sin esperar
        events.push(`segunda: termina (${read === null ? "sin sesión" : "con sesión"})`);
        return "B";
      },
    );
    assert.deepStrictEqual(result, { first: "A", second: "B" });
    assert.deepStrictEqual(events, [
      "primera: empieza",
      "segunda: empieza",
      "segunda: termina (con sesión)",
      "primera: continúa (con sesión)",
    ]);
  });

  test("las llamadas posteriores conservan la consulta de Mongoose (.lean() sigue disponible)", async (t) => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    let leanTitle: string | undefined;
    await overlapFirstSessionFindById(
      t,
      async () => {
        await PlaySession.findById(session.id);
        leanTitle = (await PlaySession.findById(session.id).lean())?.title; // reintento: pasa directo
      },
      async () => "B",
    );
    assert.strictEqual(leanTitle, "Ranked de noche");
  });

  test("si la primera operación termina sin leer la sesión, falla en vez de colgarse", async (t) => {
    await assert.rejects(
      overlapFirstSessionFindById(
        t,
        async () => "sin leer",
        async () => "B",
      ),
      /no leyó la sesión/,
    );
  });
});

describe(`dos usuarios compiten (RF-25), ${REPETITIONS} repeticiones por caso`, () => {
  test("último cupo: dos sumarse a la vez → un 200 y un 409 \"Esta sesión ya no admite jugadores.\"", async () => {
    const { ana, beto, carla } = await scene();
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await PlaySession.deleteMany({});
      const session = await insertSession({ host: ana.id, slots: 2 });
      const [byBeto, byCarla] = await Promise.all([join(beto, session.id), join(carla, session.id)]);
      assert.deepStrictEqual([byBeto.status, byCarla.status].sort(), [200, 409], label);
      const [winner, loser] = byBeto.status === 200 ? [beto, byCarla] : [carla, byBeto];
      assertError(loser, 409, FULL, label);
      assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, winner.id], label);
      assert.strictEqual((await stored(session.id))?.status, "full", label);
      await assertConsistent(session.id, label);
    }
  });

  test("mismo usuario dos veces: sumarse a la vez → un 200 y un 409 \"Ya estás inscrito en esta sesión.\"", async () => {
    const { ana, beto } = await scene();
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await PlaySession.deleteMany({});
      const session = await insertSession({ host: ana.id, slots: 4 });
      const [first, second] = await Promise.all([join(beto, session.id), join(beto, session.id)]);
      assert.deepStrictEqual([first.status, second.status].sort(), [200, 409], label);
      assertError(first.status === 409 ? first : second, 409, ALREADY_JOINED, label);
      assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id], label); // una sola vez
      assert.strictEqual((await stored(session.id))?.status, "open", label);
      await assertConsistent(session.id, label);
    }
  });

  test("bajar cupos frente a sumarse: nunca más participantes que cupos; el perdedor responde 400 (RF-8) o 409", async () => {
    const { ana, beto, carla } = await scene();
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await PlaySession.deleteMany({});
      // 2 inscritos de 3 cupos: la edición a 2 cupos y el último cupo no caben a la vez.
      const session = await insertSession({ host: ana.id, slots: 3, participants: [ana.id, beto.id] });
      const [edited, joined] = await Promise.all([edit(ana, session.id, { slots: 2 }), join(carla, session.id)]);
      const participants = await storedParticipants(session.id);
      if (edited.status === 200) {
        // La edición ganó: 2 cupos con 2 inscritos; sumarse ya no cabe.
        assertError(joined, 409, FULL, label);
        assert.deepStrictEqual(participants, [ana.id, beto.id], label);
        assert.strictEqual((await stored(session.id))?.slots, 2, label);
        assert.strictEqual((await stored(session.id))?.status, "full", label);
      } else {
        // Sumarse ganó: 3 inscritos; bajar a 2 cupos rompería RF-8.
        assertError(edited, 400, BELOW_PARTICIPANTS, label);
        assert.strictEqual(joined.status, 200, label);
        assert.deepStrictEqual(participants, [ana.id, beto.id, carla.id], label);
        assert.strictEqual((await stored(session.id))?.slots, 3, label);
        assert.strictEqual((await stored(session.id))?.status, "full", label);
      }
      await assertConsistent(session.id, label);
    }
  });

  test("cancelar frente a sumarse: la cancelación responde 204, la sesión no existe y sumarse responde 200 o 404", async () => {
    const { ana, beto } = await scene();
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await PlaySession.deleteMany({});
      const session = await insertSession({ host: ana.id, slots: 4 });
      const [cancelled, joined] = await Promise.all([cancel(ana, session.id), join(beto, session.id)]);
      assert.strictEqual(cancelled.status, 204, label);
      assert.ok(joined.status === 200 || joined.status === 404, `${label}: sumarse respondió ${joined.status}`);
      if (joined.status === 404) assert.strictEqual(errorOf(joined), NOT_FOUND, label);
      assert.strictEqual(await PlaySession.countDocuments({}), 0, label); // la escritura tardía no la recrea
      assert.deepStrictEqual(await rawSessionsInDb(), [], label);
    }
  });
});

describe("reintento optimista determinista (RF-25, plan sección 9)", () => {
  test("sumarse lee, otro usuario ocupa el último cupo y sumarse sigue → relee y responde 409 full; nada se pierde", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, slots: 2 });
    const { first: stalled, second: completed } = await overlapFirstSessionFindById(
      t,
      () => join(beto, session.id),
      () => join(carla, session.id),
    );
    assert.strictEqual(completed.status, 200);
    assertError(stalled, 409, FULL, "la detenida");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, carla.id]);
    assert.strictEqual((await stored(session.id))?.status, "full");
  });

  test("sumarse lee, otro usuario se suma y sumarse sigue → relee y aplica la regla sobre el estado nuevo: los dos quedan inscritos", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const { first: stalled, second: completed } = await overlapFirstSessionFindById(
      t,
      () => join(beto, session.id),
      () => join(carla, session.id),
    );
    assert.strictEqual(completed.status, 200);
    assert.strictEqual(stalled.status, 200);
    // La escritura vieja (solo ana + beto) no pisa la de carla: se reaplicó sobre [ana, carla].
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, carla.id, beto.id]);
    assert.strictEqual((await stored(session.id))?.status, "open");
    await assertConsistent(session.id, "reintento");
  });

  test("el mismo usuario dos veces: la detenida relee y responde 409 \"Ya estás inscrito en esta sesión.\"", async (t) => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const { first: stalled, second: completed } = await overlapFirstSessionFindById(
      t,
      () => join(beto, session.id),
      () => join(beto, session.id),
    );
    assert.strictEqual(completed.status, 200);
    assertError(stalled, 409, ALREADY_JOINED, "la detenida");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id]);
  });

  test("editar a menos cupos lee, otro usuario se suma y la edición sigue → relee y responde 400 (RF-8); los cupos no bajan", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, slots: 3, participants: [ana.id, beto.id] });
    const { first: edited, second: joined } = await overlapFirstSessionFindById(
      t,
      () => edit(ana, session.id, { slots: 2 }),
      () => join(carla, session.id),
    );
    assert.strictEqual(joined.status, 200);
    assertError(edited, 400, BELOW_PARTICIPANTS, "la edición");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id, carla.id]);
    assert.strictEqual((await stored(session.id))?.slots, 3); // sin la relectura, habría quedado en 2 con 3 inscritos
    await assertConsistent(session.id, "edición");
  });

  test("sumarse lee, otro usuario baja los cupos y sumarse sigue → relee y responde 409 full", async (t) => {
    const { ana, beto, carla } = await scene();
    const session = await insertSession({ host: ana.id, slots: 3, participants: [ana.id, beto.id] });
    const { first: stalled, second: edited } = await overlapFirstSessionFindById(
      t,
      () => join(carla, session.id),
      () => edit(ana, session.id, { slots: 2 }),
    );
    assert.strictEqual(edited.status, 200);
    assertError(stalled, 409, FULL, "la detenida");
    assert.deepStrictEqual(await storedParticipants(session.id), [ana.id, beto.id]);
    assert.strictEqual((await stored(session.id))?.slots, 2);
    await assertConsistent(session.id, "sumarse");
  });

  test("sumarse lee, la sesión se cancela (204) y sumarse sigue → 404 \"Sesión no encontrada.\"; la sesión no se recrea", async (t) => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const { first: stalled, second: cancelled } = await overlapFirstSessionFindById(
      t,
      () => join(beto, session.id),
      () => cancel(ana, session.id),
    );
    assert.strictEqual(cancelled.status, 204);
    assertError(stalled, 404, NOT_FOUND, "la detenida");
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });

  test("la cancelación lee, otro usuario se suma (200) y la cancelación sigue → 204; la sesión no existe", async (t) => {
    const { ana, beto } = await scene();
    const session = await insertSession({ host: ana.id, slots: 4 });
    const { first: cancelled, second: joined } = await overlapFirstSessionFindById(
      t,
      () => cancel(ana, session.id),
      () => join(beto, session.id),
    );
    assert.strictEqual(joined.status, 200);
    assert.strictEqual(cancelled.status, 204);
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });
});
