// Agenda de sesiones: cascada al eliminar el usuario (spec 006, T9). RF-16, RF-18, RF-24, RF-25;
// DP6-39; plan, secciones 6 ("Cascada") y 9; riesgo aceptado Q3.
// - `DELETE /api/users/:id` agrega C4 a la cascada de la 004: C1 `GameAccount.deleteMany` -> C2
//   `User.deleteOne` -> C3 `GameAccount.deleteMany` (`finally`) -> C4 `PlaySession.deleteMany({ host })` y
//   `removeUserFromSessions`. Las pruebas sustituyen esos métodos con `t.mock.method` (delegan en el real
//   o lanzan), como `userDeletionCascade.test.ts`.
// - Nada depende del azar salvo las carreras de `Promise.all` (10 repeticiones), donde solo se afirman
//   invariantes del estado final.
// - Los textos de error se escriben como literales de la spec (plan, P-23).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import type { TestContext } from "node:test";
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
  deleteMe,
  insertSession,
  linkAccountFor,
  parseSetCookie,
  rawCookieRequest,
  rawSessionsInDb,
  sessionSetCookie,
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
const REPETITIONS = 10;
const FORCED_FAILURE = "fallo forzado de la prueba";
const INVALID_TOKEN = "token inválido";

const VALID = {
  gameId: "lol",
  title: "Ranked de noche",
  notes: "",
  day: 2,
  startHour: 21,
  durationHours: 2,
  slots: 4,
} as const;

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

function objectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

function createSessionRequest(user: SignedUp, body: unknown): supertest.Test {
  return withSession(user.agent.post(SESSIONS), user.csrf).send(body as object);
}

function joinRequest(user: SignedUp, id: string): supertest.Test {
  return withSession(user.agent.post(`${SESSIONS}/${id}/join`), user.csrf);
}

function getRequest(user: SignedUp, path: string): supertest.Test {
  return withSession(user.agent.get(path), user.csrf);
}

function errorOf(response: Response): unknown {
  const body: unknown = response.body;
  return typeof body === "object" && body !== null ? Reflect.get(body, "error") : undefined;
}

// Un 500 sin cookie de sesión borrada (la sesión sigue sirviendo si el usuario sigue existiendo).
function assertServerError(response: Response): void {
  assert.strictEqual(response.status, 500);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.strictEqual(typeof errorOf(response), "string");
  assert.strictEqual(sessionSetCookie(response), undefined, "el 500 no debe borrar la cookie");
}

// 204 con la cookie de sesión borrada (valor vacío y fecha pasada).
function assertCookieCleared(response: Response): void {
  assert.strictEqual(response.status, 204);
  const header = sessionSetCookie(response);
  assert.ok(header !== undefined, "la eliminación debe borrar la cookie");
  const cookie = parseSetCookie(header);
  assert.strictEqual(cookie.value, "");
  assert.ok(Date.parse(cookie.attributes.get("expires") ?? "") <= Date.now());
}

function participantsOf(id: string): Promise<string[] | null> {
  return PlaySession.findOne({ _id: id })
    .lean()
    .then((session) => (session === null ? null : session.participants.map((participant) => participant.toString())));
}

interface Scenario {
  ana: SignedUp;
  beto: SignedUp;
  carla: SignedUp;
  dani: SignedUp;
  hostedByAna: string; // organizada por Ana, con Beto inscrito
  hostedByAnaToo: string; // otra organizada por Ana, sola
  betoFull: string; // de Beto, llena con Ana (2 de 2)
  carlaFull: string; // de Carla, llena con Ana y Dani (3 de 3)
  betoUntouched: string; // de Beto, sin Ana
}

// Ana con cuentas de dos juegos, y sesiones suyas y ajenas donde participa.
async function scenario(): Promise<Scenario> {
  const ana = await signUp(app, ANA);
  const beto = await signUp(app, BETO);
  const carla = await signUp(app, CARLA);
  const dani = await signUp(app, DANI);
  await linkAccountFor(ana, "lol");
  await linkAccountFor(ana, "r6");
  await linkAccountFor(beto, "lol");
  const hostedByAna = await insertSession({ host: ana.id, participants: [ana.id, beto.id], slots: 4, title: "Organiza Ana" });
  const hostedByAnaToo = await insertSession({ host: ana.id, gameId: "r6", slots: 3, title: "Otra de Ana" });
  const betoFull = await insertSession({ host: beto.id, participants: [beto.id, ana.id], slots: 2, title: "Llena de Beto" });
  const carlaFull = await insertSession({
    host: carla.id,
    participants: [carla.id, ana.id, dani.id],
    slots: 3,
    title: "Llena de Carla",
  });
  const betoUntouched = await insertSession({ host: beto.id, participants: [beto.id, carla.id], slots: 4, title: "Sin Ana" });
  return {
    ana,
    beto,
    carla,
    dani,
    hostedByAna: hostedByAna.id,
    hostedByAnaToo: hostedByAnaToo.id,
    betoFull: betoFull.id,
    carlaFull: carlaFull.id,
    betoUntouched: betoUntouched.id,
  };
}

// Estado final correcto tras eliminar a Ana: sus sesiones organizadas no existen, ya no figura como
// participante, el estado de las llenas se recalculó (`full` -> `open`) y la de otros no cambió.
async function assertAnaGone(s: Scenario, untouchedBefore: unknown): Promise<void> {
  assert.strictEqual(await User.exists({ _id: s.ana.id }), null);
  assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 0);
  assert.strictEqual(await PlaySession.countDocuments({ host: s.ana.id }), 0);
  assert.strictEqual(await PlaySession.countDocuments({ participants: s.ana.id }), 0);
  assert.strictEqual(await participantsOf(s.hostedByAna), null);
  assert.strictEqual(await participantsOf(s.hostedByAnaToo), null);

  assert.deepStrictEqual(await participantsOf(s.betoFull), [s.beto.id]);
  assert.strictEqual((await PlaySession.findOne({ _id: s.betoFull }).lean())?.status, "open");
  assert.deepStrictEqual(await participantsOf(s.carlaFull), [s.carla.id, s.dani.id]);
  assert.strictEqual((await PlaySession.findOne({ _id: s.carlaFull }).lean())?.status, "open");

  // Las de otros usuarios sin Ana, intactas (documento crudo idéntico, `__v` incluido).
  assert.deepStrictEqual(await PlaySession.findOne({ _id: s.betoUntouched }).lean(), untouchedBefore);
  assert.strictEqual(await GameAccount.countDocuments({ user: s.beto.id }), 1); // cuentas de otros intactas
  assert.ok(await User.exists({ _id: s.beto.id }));
  assert.strictEqual(await PlaySession.countDocuments({}), 3);
}

// Sustituye `GameAccount.deleteMany`, `User.deleteOne` y `PlaySession.deleteMany`: registra el orden y
// delega en el real o en `hooks` (que recibe el número de llamada de ese método, desde 1).
type Original = (...args: unknown[]) => Promise<unknown>;
type Hook = (call: number, original: Original, args: unknown[]) => Promise<unknown>;

interface Hooks {
  accountsMany?: Hook;
  userOne?: Hook;
  sessionsMany?: Hook;
}

interface Probe {
  order: string[];
  calls: { accountsMany: number; userOne: number; sessionsMany: number };
}

function hookCascade(t: TestContext, hooks: Hooks): Probe {
  const probe: Probe = { order: [], calls: { accountsMany: 0, userOne: 0, sessionsMany: 0 } };
  const realAccountsMany = GameAccount.deleteMany.bind(GameAccount);
  const realUserOne = User.deleteOne.bind(User);
  const realSessionsMany = PlaySession.deleteMany.bind(PlaySession);
  const callAccountsMany: Original = async (...args) => {
    const result: unknown = await Reflect.apply(realAccountsMany, GameAccount, args);
    return result;
  };
  const callUserOne: Original = async (...args) => {
    const result: unknown = await Reflect.apply(realUserOne, User, args);
    return result;
  };
  const callSessionsMany: Original = async (...args) => {
    const result: unknown = await Reflect.apply(realSessionsMany, PlaySession, args);
    return result;
  };
  t.mock.method(GameAccount, "deleteMany", async (...args: unknown[]) => {
    probe.calls.accountsMany += 1;
    probe.order.push("GameAccount.deleteMany");
    return hooks.accountsMany === undefined
      ? callAccountsMany(...args)
      : hooks.accountsMany(probe.calls.accountsMany, callAccountsMany, args);
  });
  t.mock.method(User, "deleteOne", async (...args: unknown[]) => {
    probe.calls.userOne += 1;
    probe.order.push("User.deleteOne");
    return hooks.userOne === undefined ? callUserOne(...args) : hooks.userOne(probe.calls.userOne, callUserOne, args);
  });
  t.mock.method(PlaySession, "deleteMany", async (...args: unknown[]) => {
    probe.calls.sessionsMany += 1;
    probe.order.push("PlaySession.deleteMany");
    return hooks.sessionsMany === undefined
      ? callSessionsMany(...args)
      : hooks.sessionsMany(probe.calls.sessionsMany, callSessionsMany, args);
  });
  return probe;
}

describe("eliminar el usuario borra sus sesiones y lo quita de las demás (RF-16)", () => {
  test("DELETE /api/users/me -> 204; sesiones organizadas borradas, participaciones quitadas (full -> open), cuentas borradas y las de otros intactas", async () => {
    const s = await scenario();
    const untouchedBefore = await PlaySession.findOne({ _id: s.betoUntouched }).lean();
    assertCookieCleared(await deleteMe(s.ana));
    await assertAnaGone(s, untouchedBefore);
  });

  test("las vistas lo reflejan: la sesión organizada da 404 y la llena de Beto muestra solo a Beto y vuelve a open", async () => {
    const s = await scenario();
    assert.strictEqual((await deleteMe(s.ana)).status, 204);
    const hosted = await getRequest(s.beto, `${SESSIONS}/${s.hostedByAna}`);
    assert.strictEqual(hosted.status, 404);
    assert.deepStrictEqual(hosted.body, { error: "Sesión no encontrada." });
    const full = await getRequest(s.beto, `${SESSIONS}/${s.betoFull}`);
    assert.strictEqual(full.status, 200);
    assert.strictEqual(Reflect.get(full.body as object, "status"), "open");
    const participants = Reflect.get(full.body as object, "participants") as { id: string }[];
    assert.deepStrictEqual(
      participants.map((participant) => participant.id),
      [s.beto.id],
    );
    const list = await getRequest(s.beto, SESSIONS);
    assert.strictEqual(list.status, 200);
    assert.deepStrictEqual(
      (list.body as { id: string }[]).map((session) => session.id).sort(),
      [s.betoFull, s.carlaFull, s.betoUntouched].sort(),
    );
  });

  test("una sesión que queda con un hueco se puede volver a llenar: Dani se suma a la de Carla (200)", async () => {
    const s = await scenario();
    assert.strictEqual((await deleteMe(s.ana)).status, 204);
    const joined = await joinRequest(s.beto, s.carlaFull);
    assert.strictEqual(joined.status, 200);
    assert.strictEqual(Reflect.get(joined.body as object, "status"), "full");
    assert.deepStrictEqual(await participantsOf(s.carlaFull), [s.carla.id, s.dani.id, s.beto.id]);
  });

  test("la credencial del usuario eliminado responde 401 \"token inválido\" en las siete operaciones de sesiones", async () => {
    const s = await scenario();
    assert.strictEqual((await deleteMe(s.ana)).status, 204);
    for (const [method, path] of [
      ["get", SESSIONS],
      ["get", `${SESSIONS}/${s.betoFull}`],
      ["post", SESSIONS],
      ["put", `${SESSIONS}/${s.betoFull}`],
      ["delete", `${SESSIONS}/${s.betoFull}`],
      ["post", `${SESSIONS}/${s.betoFull}/join`],
      ["post", `${SESSIONS}/${s.betoFull}/leave`],
    ] as const) {
      const response = await rawCookieRequest(app, method, path, s.ana.cookie, s.ana.csrf).send({});
      assert.strictEqual(response.status, 401, `${method} ${path}`);
      assert.deepStrictEqual(response.body, { error: INVALID_TOKEN }, `${method} ${path}`);
    }
  });

  test("orden observable C1 -> C2 -> C3 -> C4: deleteMany, deleteOne, deleteMany de cuentas y deleteMany de sesiones", async (t) => {
    const s = await scenario();
    const probe = hookCascade(t, {});
    assertCookieCleared(await deleteMe(s.ana));
    assert.deepStrictEqual(probe.order, [
      "GameAccount.deleteMany",
      "User.deleteOne",
      "GameAccount.deleteMany",
      "PlaySession.deleteMany",
    ]);
    await assertAnaGone(s, await PlaySession.findOne({ _id: s.betoUntouched }).lean());
  });

  test("eliminar a un usuario sin sesiones ni participaciones -> 204 y las sesiones de los demás no cambian", async () => {
    await scenario();
    const before = await rawSessionsInDb();
    const lonely = await signUp(app, { email: "solo@example.com", username: "Solo" });
    assertCookieCleared(await deleteMe(lonely));
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });
});

describe("fallos forzados de la cascada con sesiones (RF-16, Q3)", () => {
  test("User.deleteOne lanza -> 500, el usuario y todas las sesiones intactos (C4 no corre); repetir la eliminación deja el estado final correcto", async (t) => {
    const s = await scenario();
    const untouchedBefore = await PlaySession.findOne({ _id: s.betoUntouched }).lean();
    const sessionsBefore = await rawSessionsInDb();
    const probe = hookCascade(t, {
      userOne: async (call, original, args) => {
        if (call === 1) throw new Error(FORCED_FAILURE);
        return original(...args);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(probe.calls.sessionsMany, 0, "C4 no debe correr si C2 lanza");
    assert.ok(await User.exists({ _id: s.ana.id }), "el usuario sigue");
    assert.deepStrictEqual(await rawSessionsInDb(), sessionsBefore); // ninguna sesión tocada
    // La credencial sigue valiendo: repetir con la misma sesión usa la cascada completa.
    assertCookieCleared(await deleteMe(s.ana));
    assert.strictEqual(probe.calls.sessionsMany, 1);
    await assertAnaGone(s, untouchedBefore);
  });

  test("User.deleteOne borra al usuario y lanza -> 500 y estado sin usuario; C4 no corre y sus sesiones quedan ocultas por RF-24", async (t) => {
    const s = await scenario();
    const probe = hookCascade(t, {
      userOne: async () => {
        await User.collection.deleteOne({ _id: objectId(s.ana.id) });
        throw new Error(FORCED_FAILURE);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(probe.calls.sessionsMany, 0);
    assert.strictEqual(await User.exists({ _id: s.ana.id }), null);
    const stale = await rawCookieRequest(app, "get", SESSIONS, s.ana.cookie, s.ana.csrf);
    assert.strictEqual(stale.status, 401);
    assert.deepStrictEqual(stale.body, { error: INVALID_TOKEN });
    // Residuales ocultas: la organizada por Ana no se ve (404 por id y fuera del listado).
    assert.strictEqual((await getRequest(s.beto, `${SESSIONS}/${s.hostedByAna}`)).status, 404);
    const list = await getRequest(s.beto, SESSIONS);
    assert.ok(!(list.body as { id: string }[]).some((session) => session.id === s.hostedByAna));
  });

  test("riesgo aceptado: C4 lanza tras borrar al usuario -> 500, la credencial da 401 y las sesiones residuales siguen ocultas por RF-24", async (t) => {
    const s = await scenario();
    hookCascade(t, {
      sessionsMany: async () => {
        throw new Error(FORCED_FAILURE);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(await User.exists({ _id: s.ana.id }), null); // el usuario ya no existe
    assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 0);
    const stale = await rawCookieRequest(app, "delete", "/api/users/me", s.ana.cookie, s.ana.csrf);
    assert.strictEqual(stale.status, 401); // repetir la eliminación ya no limpia nada
    assert.deepStrictEqual(stale.body, { error: INVALID_TOKEN });
    // Quedan en la base, pero las lecturas las ocultan o filtran (RF-24).
    assert.strictEqual(await PlaySession.countDocuments({ host: s.ana.id }), 2);
    assert.strictEqual((await getRequest(s.beto, `${SESSIONS}/${s.hostedByAna}`)).status, 404);
    const list = await getRequest(s.beto, SESSIONS);
    assert.deepStrictEqual(
      (list.body as { id: string }[]).map((session) => session.id).sort(),
      [s.betoFull, s.carlaFull, s.betoUntouched].sort(),
    );
    const full = await getRequest(s.beto, `${SESSIONS}/${s.betoFull}`);
    const participants = Reflect.get(full.body as object, "participants") as { id: string }[];
    assert.deepStrictEqual(
      participants.map((participant) => participant.id),
      [s.beto.id],
    );
  });
});

describe("escritura entre C2 y C4 (RF-16, RF-18, DP6-39)", () => {
  test("una creación en curso cuya inserción cae después de C2 -> 401 \"token inválido\" y no queda ninguna sesión suya", async (t) => {
    const ana = await signUp(app, ANA);
    await linkAccountFor(ana, "lol");
    let insertReached: () => void = () => undefined;
    let releaseInsert: () => void = () => undefined;
    const reached = new Promise<void>((resolve) => {
      insertReached = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseInsert = resolve;
    });
    const realCreate = PlaySession.create.bind(PlaySession);
    // La creación ya pasó la guardia y la validación: queda detenida justo antes de insertar.
    t.mock.method(PlaySession, "create", async (...args: unknown[]) => {
      insertReached();
      await gate;
      const result: unknown = await Reflect.apply(realCreate, PlaySession, args);
      return result;
    });
    const creating = createSessionRequest(ana, VALID).then((response) => response);
    await reached;
    // C4 empieza con el usuario ya borrado (C2): se deja terminar la creación antes de barrer.
    const probe = hookCascade(t, {
      sessionsMany: async (_call, original, args) => {
        releaseInsert();
        await creating; // la creación termina (y se compensa) antes de que C4 barra
        return original(...args);
      },
    });
    const deleted = await deleteMe(ana);
    releaseInsert(); // si C4 nunca llegó a correr, la creación no queda detenida (la prueba falla, no se cuelga)
    const created = await creating;
    assertCookieCleared(deleted);
    assert.deepStrictEqual(probe.order, [
      "GameAccount.deleteMany",
      "User.deleteOne",
      "GameAccount.deleteMany",
      "PlaySession.deleteMany",
    ]);
    assert.strictEqual(created.status, 401);
    assert.deepStrictEqual(created.body, { error: INVALID_TOKEN });
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });

  test("lo escrito entre C2 y C4 sin compensar (sesión organizada y participación) lo barre C4", async (t) => {
    const s = await scenario();
    const untouchedBefore = await PlaySession.findOne({ _id: s.betoUntouched }).lean();
    let lateHosted = "";
    let lateJoined = "";
    hookCascade(t, {
      sessionsMany: async (_call, original, args) => {
        // Escrituras que el usuario hizo mientras aún existía y que C2 ya no pudo ver.
        lateHosted = (await insertSession({ host: s.ana.id, title: "Tardía de Ana" })).id;
        lateJoined = (
          await insertSession({ host: s.dani.id, participants: [s.dani.id, s.ana.id], slots: 2, title: "Tardía de Dani" })
        ).id;
        return original(...args);
      },
    });
    assertCookieCleared(await deleteMe(s.ana));
    assert.strictEqual(await participantsOf(lateHosted), null);
    assert.deepStrictEqual(await participantsOf(lateJoined), [s.dani.id]);
    assert.strictEqual((await PlaySession.findOne({ _id: lateJoined }).lean())?.status, "open");
    await PlaySession.deleteOne({ _id: lateJoined }); // fuera del recuento de `assertAnaGone`
    await assertAnaGone(s, untouchedBefore);
  });
});

describe(`eliminación simultánea (RF-16, RF-18, DP6-39), ${REPETITIONS} repeticiones por caso`, () => {
  test("eliminar y crear una sesión a la vez: al final ninguna sesión organizada por el usuario; crear responde 201 o 401 \"token inválido\"", async () => {
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await User.deleteMany({});
      await GameAccount.deleteMany({});
      await PlaySession.deleteMany({});
      const ana = await signUp(app, ANA);
      await linkAccountFor(ana, "lol");
      const [created, deleted] = await Promise.all([createSessionRequest(ana, VALID), deleteMe(ana)]);
      assert.strictEqual(deleted.status, 204, label);
      // 400 "No tienes una cuenta vinculada en este juego." si C1 borró la cuenta antes de validar:
      // la validación (RF-5) responde antes de escribir nada.
      if (created.status === 401) assert.deepStrictEqual(created.body, { error: INVALID_TOKEN }, label);
      else if (created.status === 400) {
        assert.deepStrictEqual(created.body, { error: "No tienes una cuenta vinculada en este juego." }, label);
      } else assert.strictEqual(created.status, 201, label);
      assert.strictEqual(await User.exists({ _id: ana.id }), null, label);
      assert.strictEqual(await PlaySession.countDocuments({ host: ana.id }), 0, label);
      assert.strictEqual(await PlaySession.countDocuments({ participants: ana.id }), 0, label);
      assert.strictEqual(await PlaySession.countDocuments({}), 0, label);
    }
  });

  test("eliminar y sumarse a la vez: al final el usuario no figura como participante y la sesión vuelve a open; sumarse responde 200 o 401 \"token inválido\"", async () => {
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await User.deleteMany({});
      await GameAccount.deleteMany({});
      await PlaySession.deleteMany({});
      const ana = await signUp(app, ANA);
      const beto = await signUp(app, BETO);
      const session = await insertSession({ host: beto.id, slots: 2 }); // el último cupo: al sumarse queda full
      const [joined, deleted] = await Promise.all([joinRequest(ana, session.id), deleteMe(ana)]);
      assert.strictEqual(deleted.status, 204, label);
      if (joined.status === 401) assert.deepStrictEqual(joined.body, { error: INVALID_TOKEN }, label);
      else assert.strictEqual(joined.status, 200, label);
      assert.strictEqual(await User.exists({ _id: ana.id }), null, label);
      assert.strictEqual(await PlaySession.countDocuments({ participants: ana.id }), 0, label);
      assert.deepStrictEqual(await participantsOf(session.id), [beto.id], label);
      assert.strictEqual((await PlaySession.findOne({ _id: session.id }).lean())?.status, "open", label);
    }
  });

  test("eliminar y sumarse a una sesión con otro inscrito: el inscrito y el anfitrión se conservan y el estado queda open", async () => {
    for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
      const label = `repetición ${repetition}`;
      await User.deleteMany({});
      await GameAccount.deleteMany({});
      await PlaySession.deleteMany({});
      const ana = await signUp(app, ANA);
      const beto = await signUp(app, BETO);
      const carla = await signUp(app, CARLA);
      const session = await insertSession({ host: carla.id, slots: 3, participants: [carla.id, beto.id] });
      const [joined, deletedAna] = await Promise.all([joinRequest(ana, session.id), deleteMe(ana)]);
      assert.strictEqual(deletedAna.status, 204, label);
      assert.ok(joined.status === 200 || joined.status === 401, `${label}: sumarse respondió ${joined.status}`);
      assert.deepStrictEqual(await participantsOf(session.id), [carla.id, beto.id], label);
      assert.strictEqual((await PlaySession.findOne({ _id: session.id }).lean())?.status, "open", label);
    }
  });
});
