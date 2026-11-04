// Agenda de sesiones: crear (spec 006, T6). RF-5, RF-6, RF-15, RF-20 (crear), RF-21, RF-27, RF-28,
// RNF-2; plan, secciones 5 (crear), 6 (`createSession`), 7 y 9.
// - Usuarios por la API de registro (`signUp`); cuentas con `linkAccountFor`.
// - El instante de creación se fija con `clock.now()` sustituido (`FIXED_NOW`).
// - Cada error 400 comprueba que la base queda sin cambios (`rawSessionsInDb` antes y después).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { SESSION_ERRORS } from "../../src/domain/sessionRules.ts";
import { newSession } from "../../src/domain/sessionState.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { createSession } from "../../src/services/sessionWrites.ts";
import { SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  HEX24_LOWER,
  ISO_MS_Z,
  authApp,
  closeTestServers,
  deleteMe,
  linkAccountFor,
  nonExistingId,
  rawCookieRequest,
  rawSessionsInDb,
  sessionsInDb,
  signUp,
  unlink,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const SESSIONS = "/api/sessions";

const VALID = {
  gameId: "lol",
  title: "Ranked de noche",
  notes: "Buscamos jungla",
  day: 2,
  startHour: 21,
  durationHours: 2,
  slots: 4,
} as const;

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
const USER_REF_KEYS = ["id", "username", "displayName", "avatarColor"];

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

function fixClock(t: TestContext): void {
  t.mock.method(clock, "now", () => new Date(FIXED_NOW));
}

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

// `POST /api/sessions` del usuario de la sesión, con su comprobante.
function create(user: SignedUp, body: unknown): supertest.Test {
  return withSession(user.agent.post(SESSIONS), user.csrf).send(body as object);
}

// Un valor que debe ser un objeto.
function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value), "debería ser un objeto");
  return { ...value };
}

// El cuerpo de una respuesta que debe ser un objeto.
function recordOf(response: Response): Record<string, unknown> {
  return asRecord(response.body);
}

async function signedUpWithAccounts(games: ReadonlyArray<"lol" | "r6" | "cs2"> = ["lol"]): Promise<SignedUp> {
  const ana = await signUp(app, ANA);
  for (const game of games) await linkAccountFor(ana, game);
  return ana;
}

// Exige un 400 con `message` y la base sin cambios.
async function assertRejected(user: SignedUp, body: unknown, message: string): Promise<void> {
  const before = await rawSessionsInDb();
  assertStatusError(await create(user, body), 400, message);
  assert.deepStrictEqual(await rawSessionsInDb(), before);
}

describe("crear con datos válidos (RF-5)", () => {
  test("201: anfitrión único participante, open, createdAt = FIXED_NOW, en la respuesta y en la base", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const response = await create(ana, VALID);
    assert.strictEqual(response.status, 201);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    const body = recordOf(response);
    assert.deepStrictEqual(Object.keys(body), VIEW_KEYS);
    assert.match(String(body["id"]), HEX24_LOWER);
    assert.strictEqual(body["gameId"], "lol");
    assert.strictEqual(body["hostId"], ana.id);
    assert.strictEqual(body["title"], VALID.title);
    assert.strictEqual(body["notes"], VALID.notes);
    assert.strictEqual(body["day"], 2);
    assert.strictEqual(body["startHour"], 21);
    assert.strictEqual(body["durationHours"], 2);
    assert.strictEqual(body["slots"], 4);
    assert.strictEqual(body["status"], "open");
    assert.strictEqual(body["createdAt"], new Date(FIXED_NOW).toISOString());
    assert.match(String(body["createdAt"]), ISO_MS_Z);

    const host = asRecord(body["host"]);
    assert.deepStrictEqual(Object.keys(host), USER_REF_KEYS);
    assert.strictEqual(host["id"], ana.id);
    assert.strictEqual(host["username"], "Ana");
    assert.deepStrictEqual(body["participants"], [body["host"]]);

    const raw = await rawSessionsInDb();
    assert.strictEqual(raw.length, 1);
    const [stored] = raw;
    assert.ok(stored !== undefined);
    assert.strictEqual(stored._id.toString(), body["id"]);
    assert.strictEqual(stored.host.toString(), ana.id);
    assert.deepStrictEqual(
      stored.participants.map((id) => id.toString()),
      [ana.id],
    );
    assert.strictEqual(stored.status, "open");
    assert.strictEqual(stored.createdAt.getTime(), FIXED_NOW);
    assert.strictEqual(stored.notes, VALID.notes);
  });

  test("la sesión creada se obtiene igual por GET /:id", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const created = await create(ana, VALID);
    const fetched = await withSession(ana.agent.get(`${SESSIONS}/${recordOf(created)["id"]}`), ana.csrf);
    assert.strictEqual(fetched.status, 200);
    assert.deepStrictEqual(fetched.body, created.body);
  });

  test("título y notas se guardan recortados; notas ausentes → '' (RF-5, RNF-2)", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const trimmed = await create(ana, { ...VALID, title: "  Ranked de noche \t", notes: "\n  hola  " });
    assert.strictEqual(trimmed.status, 201);
    assert.strictEqual(recordOf(trimmed)["title"], "Ranked de noche");
    assert.strictEqual(recordOf(trimmed)["notes"], "hola");

    const withoutNotes: Record<string, unknown> = { ...VALID };
    delete withoutNotes["notes"];
    const absent = await create(ana, withoutNotes);
    assert.strictEqual(absent.status, 201);
    assert.strictEqual(recordOf(absent)["notes"], "");

    const blank = await create(ana, { ...VALID, notes: "   ﻿　 " });
    assert.strictEqual(blank.status, 201);
    assert.strictEqual(recordOf(blank)["notes"], "");

    const stored = await rawSessionsInDb();
    assert.deepStrictEqual(
      stored.map((session) => [session.title, session.notes]),
      [
        ["Ranked de noche", "hola"],
        ["Ranked de noche", ""],
        ["Ranked de noche", ""],
      ],
    );
  });

  test("domingo 23 h con 4 horas se guarda con día 6 y hora 23, sin partirse", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const response = await create(ana, { ...VALID, day: 6, startHour: 23, durationHours: 4 });
    assert.strictEqual(response.status, 201);
    const body = recordOf(response);
    assert.strictEqual(body["day"], 6);
    assert.strictEqual(body["startHour"], 23);
    assert.strictEqual(body["durationHours"], 4);
    assert.strictEqual((await rawSessionsInDb()).length, 1);
  });

  test("límites válidos: cupos 2 y 6, duración 1 y 4, día 0, hora 0 y 23", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const bodies = [
      { ...VALID, slots: 2, durationHours: 1, day: 0, startHour: 0 },
      { ...VALID, slots: 6, durationHours: 4, day: 6, startHour: 23 },
    ];
    for (const body of bodies) assert.strictEqual((await create(ana, body)).status, 201);
    assert.strictEqual((await rawSessionsInDb()).length, 2);
  });

  test("título de 60 emojis es válido y de 61 no (largo en puntos de código)", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const ok = await create(ana, { ...VALID, title: "\u{1F600}".repeat(60) });
    assert.strictEqual(ok.status, 201);
    assert.strictEqual(recordOf(ok)["title"], "\u{1F600}".repeat(60));
    await assertRejected(ana, { ...VALID, title: "\u{1F600}".repeat(61) }, SESSION_ERRORS.title);
  });

  test("cada juego con cuenta vinculada se puede crear", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts(["lol", "r6", "cs2"]);
    for (const gameId of ["lol", "r6", "cs2"]) {
      const response = await create(ana, { ...VALID, gameId });
      assert.strictEqual(response.status, 201, gameId);
      assert.strictEqual(recordOf(response)["gameId"], gameId);
    }
  });

  test("sesiones duplicadas y solapadas se permiten", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const beto = await signUp(app, BETO);
    await linkAccountFor(beto, "lol");
    const responses = [
      await create(ana, VALID),
      await create(ana, VALID),
      await create(ana, { ...VALID, startHour: 22, title: "Solapada" }),
      await create(beto, VALID),
    ];
    for (const response of responses) assert.strictEqual(response.status, 201);
    const ids = responses.map((response) => recordOf(response)["id"]);
    assert.strictEqual(new Set(ids).size, 4);
    assert.strictEqual((await rawSessionsInDb()).length, 4);
  });
});

describe("el texto no se transforma (RNF-2)", () => {
  test("<script>alert(1)</script> en título y notas se devuelve y se guarda idéntico", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const script = "<script>alert(1)</script>";
    const response = await create(ana, { ...VALID, title: script, notes: script });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(recordOf(response)["title"], script);
    assert.strictEqual(recordOf(response)["notes"], script);
    const [stored] = await rawSessionsInDb();
    assert.strictEqual(stored?.title, script);
    assert.strictEqual(stored?.notes, script);
  });
});

describe("campos del cuerpo que se ignoran (RF-15, RF-21)", () => {
  test("hostId, host, participants, status, id y createdAt del cuerpo no se leen; actúa el usuario de la sesión", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    const beto = await signUp(app, BETO);
    const response = await create(ana, {
      ...VALID,
      hostId: beto.id,
      host: beto.id,
      participants: [beto.id],
      participantIds: [beto.id],
      status: "full",
      id: nonExistingId(),
      createdAt: "2000-01-01T00:00:00.000Z",
      extra: "x",
    });
    assert.strictEqual(response.status, 201);
    const body = recordOf(response);
    assert.deepStrictEqual(Object.keys(body), VIEW_KEYS);
    assert.strictEqual(body["hostId"], ana.id);
    assert.strictEqual(asRecord(body["host"])["id"], ana.id);
    assert.strictEqual(body["status"], "open");
    assert.strictEqual(body["createdAt"], new Date(FIXED_NOW).toISOString());
    const [stored] = await rawSessionsInDb();
    assert.ok(stored !== undefined);
    assert.strictEqual(stored._id.toString(), body["id"]);
    assert.deepStrictEqual(
      stored.participants.map((id) => id.toString()),
      [ana.id],
    );
    assert.strictEqual(Object.hasOwn(stored, "extra"), false);
  });

  test("propiedades heredadas (constructor, __proto__) no cuentan como enviadas", async () => {
    const ana = await signedUpWithAccounts();
    const response = await ana.agent
      .post(SESSIONS)
      .set("X-CSRF-Token", ana.csrf)
      .set("Content-Type", "application/json")
      .send('{"__proto__":{"gameId":"lol"},"constructor":{"gameId":"lol"}}');
    assertStatusError(response, 400, SESSION_ERRORS.game);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });
});

describe("cuenta vinculada (RF-27)", () => {
  test("sin cuenta en el juego → 400 'No tienes una cuenta vinculada en este juego.' y nada guardado", async () => {
    const ana = await signUp(app, ANA);
    await assertRejected(ana, VALID, SESSION_ERRORS.noAccount);
  });

  test("con cuenta de otro juego pero no del pedido → 400 de RF-27", async () => {
    const ana = await signedUpWithAccounts(["r6"]);
    await assertRejected(ana, VALID, SESSION_ERRORS.noAccount);
  });

  test("la cuenta de otro usuario no cuenta", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await linkAccountFor(beto, "lol");
    await assertRejected(ana, VALID, SESSION_ERRORS.noAccount);
  });

  test("juego inválido sin cuenta → 'Juego no válido.' (va antes que RF-27)", async () => {
    const ana = await signUp(app, ANA);
    await assertRejected(ana, { ...VALID, gameId: "xyz" }, SESSION_ERRORS.game);
  });

  test("sin cuenta y con título inválido → RF-27 (la cuenta va antes que el título)", async () => {
    const ana = await signUp(app, ANA);
    await assertRejected(ana, { ...VALID, title: "ab", slots: 99 }, SESSION_ERRORS.noAccount);
  });

  test("con cuenta y título inválido → el del título", async () => {
    const ana = await signedUpWithAccounts();
    await assertRejected(ana, { ...VALID, title: "ab" }, SESSION_ERRORS.title);
  });

  test("desvincular la cuenta después no cambia la sesión creada", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const accountId = await linkAccountFor(ana, "lol");
    const created = await create(ana, VALID);
    assert.strictEqual(created.status, 201);
    const rawBefore = await rawSessionsInDb();
    const inDbBefore = await sessionsInDb();

    assert.strictEqual((await unlink(ana, accountId)).status, 204);

    assert.deepStrictEqual(await rawSessionsInDb(), rawBefore);
    assert.deepStrictEqual(await sessionsInDb(), inDbBefore);
    const fetched = await withSession(ana.agent.get(`${SESSIONS}/${recordOf(created)["id"]}`), ana.csrf);
    assert.strictEqual(fetched.status, 200);
    assert.deepStrictEqual(fetched.body, created.body);
    // Ya sin cuenta, crear otra falla.
    assertStatusError(await create(ana, VALID), 400, SESSION_ERRORS.noAccount);
  });
});

describe("validación de los siete campos, uno por salto de RF-6 (base sin cambios)", () => {
  const without = (key: keyof typeof VALID): Record<string, unknown> => {
    const copy: Record<string, unknown> = { ...VALID };
    delete copy[key];
    return copy;
  };

  const cases: Array<[string, () => Record<string, unknown>, string]> = [
    ["juego ausente", () => without("gameId"), SESSION_ERRORS.game],
    ["juego nulo", () => ({ ...VALID, gameId: null }), SESSION_ERRORS.game],
    ["juego que no es texto", () => ({ ...VALID, gameId: 5 }), SESSION_ERRORS.game],
    ["juego en mayúsculas", () => ({ ...VALID, gameId: "LOL" }), SESSION_ERRORS.game],
    ["juego con espacios", () => ({ ...VALID, gameId: " lol " }), SESSION_ERRORS.game],
    ["juego vacío", () => ({ ...VALID, gameId: "" }), SESSION_ERRORS.game],
    ["juego desconocido", () => ({ ...VALID, gameId: "xyz" }), SESSION_ERRORS.game],
    ["título ausente", () => without("title"), SESSION_ERRORS.title],
    ["título nulo", () => ({ ...VALID, title: null }), SESSION_ERRORS.title],
    ["título que no es texto", () => ({ ...VALID, title: 7 }), SESSION_ERRORS.title],
    ["título de 2 caracteres tras recortar", () => ({ ...VALID, title: "  ab  " }), SESSION_ERRORS.title],
    ["título de 61 caracteres", () => ({ ...VALID, title: "a".repeat(61) }), SESSION_ERRORS.title],
    ["título con salto de línea interno", () => ({ ...VALID, title: "Ranked\nnoche" }), SESSION_ERRORS.title],
    ["título con tabulador interno", () => ({ ...VALID, title: "Ranked\tnoche" }), SESSION_ERRORS.title],
    ["título con U+0085 interno", () => ({ ...VALID, title: "Ranked\u0085noche" }), SESSION_ERRORS.title],
    ["notas nulas", () => ({ ...VALID, notes: null }), SESSION_ERRORS.notes],
    ["notas que no son texto", () => ({ ...VALID, notes: 5 }), SESSION_ERRORS.notes],
    ["notas de 161 caracteres", () => ({ ...VALID, notes: "n".repeat(161) }), SESSION_ERRORS.notes],
    ["día ausente", () => without("day"), SESSION_ERRORS.day],
    ["día en texto", () => ({ ...VALID, day: "3" }), SESSION_ERRORS.day],
    ["día 7", () => ({ ...VALID, day: 7 }), SESSION_ERRORS.day],
    ["día -1", () => ({ ...VALID, day: -1 }), SESSION_ERRORS.day],
    ["día decimal", () => ({ ...VALID, day: 3.5 }), SESSION_ERRORS.day],
    ["día booleano", () => ({ ...VALID, day: true }), SESSION_ERRORS.day],
    ["hora ausente", () => without("startHour"), SESSION_ERRORS.startHour],
    ["hora 24", () => ({ ...VALID, startHour: 24 }), SESSION_ERRORS.startHour],
    ["hora en texto", () => ({ ...VALID, startHour: "21" }), SESSION_ERRORS.startHour],
    ["hora decimal", () => ({ ...VALID, startHour: 20.5 }), SESSION_ERRORS.startHour],
    ["duración ausente", () => without("durationHours"), SESSION_ERRORS.durationHours],
    ["duración 0", () => ({ ...VALID, durationHours: 0 }), SESSION_ERRORS.durationHours],
    ["duración 5", () => ({ ...VALID, durationHours: 5 }), SESSION_ERRORS.durationHours],
    ["duración nula", () => ({ ...VALID, durationHours: null }), SESSION_ERRORS.durationHours],
    ["cupos ausentes", () => without("slots"), SESSION_ERRORS.slots],
    ["cupos 1", () => ({ ...VALID, slots: 1 }), SESSION_ERRORS.slots],
    ["cupos 7", () => ({ ...VALID, slots: 7 }), SESSION_ERRORS.slots],
    ["cupos en texto", () => ({ ...VALID, slots: "4" }), SESSION_ERRORS.slots],
  ];
  for (const [name, body, message] of cases) {
    test(`${name} → 400 con su texto y la base sin cambios`, async () => {
      const ana = await signedUpWithAccounts();
      await assertRejected(ana, body(), message);
    });
  }

  test("varios campos inválidos: gana el primero del orden (título antes que día, día antes que cupos)", async () => {
    const ana = await signedUpWithAccounts();
    await assertRejected(ana, { ...VALID, title: "", day: 9, slots: 1 }, SESSION_ERRORS.title);
    await assertRejected(ana, { ...VALID, notes: null, day: 9, slots: 1 }, SESSION_ERRORS.notes);
    await assertRejected(ana, { ...VALID, day: 9, startHour: 99, slots: 1 }, SESSION_ERRORS.day);
    await assertRejected(ana, { ...VALID, startHour: 99, durationHours: 9, slots: 1 }, SESSION_ERRORS.startHour);
    await assertRejected(ana, { ...VALID, durationHours: 9, slots: 1 }, SESSION_ERRORS.durationHours);
  });
});

describe("cuerpo ausente o que no es objeto (RF-6, RF-28)", () => {
  test("sin cuerpo → 400 'Juego no válido.' (equivale a {})", async () => {
    const ana = await signedUpWithAccounts();
    const response = await withSession(ana.agent.post(SESSIONS), ana.csrf);
    assertStatusError(response, 400, SESSION_ERRORS.game);
    await assertRejected(ana, {}, SESSION_ERRORS.game);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("cuerpo de texto plano (no se lee como JSON) equivale a sin cuerpo", async () => {
    const ana = await signedUpWithAccounts();
    const response = await withSession(ana.agent.post(SESSIONS), ana.csrf)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify(VALID));
    assertStatusError(response, 400, SESSION_ERRORS.game);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("sin cuerpo y sin credencial → 401 'sesión no iniciada'", async () => {
    assertStatusError(await supertest(app).post(SESSIONS), 401, SESSION_MESSAGES.notLoggedIn);
    assertStatusError(await supertest(app).post(SESSIONS).send({}), 401, SESSION_MESSAGES.notLoggedIn);
    assertStatusError(await supertest(app).post(SESSIONS).send(VALID), 401, SESSION_MESSAGES.notLoggedIn);
  });

  const nonObjects = ["[]", "3", '"x"', "true", "null"];

  test("cuerpo JSON que no es objeto → 400 'JSON mal formado', sin credencial (antes del 401)", async () => {
    for (const raw of nonObjects) {
      const response = await supertest(app).post(SESSIONS).set("Content-Type", "application/json").send(raw);
      assertStatusError(response, 400, SESSION_ERRORS.badJson);
    }
  });

  test("cuerpo JSON que no es objeto → 400 'JSON mal formado', con sesión, y la base sin cambios", async () => {
    const ana = await signedUpWithAccounts();
    for (const raw of nonObjects) {
      const response = await withSession(ana.agent.post(SESSIONS), ana.csrf)
        .set("Content-Type", "application/json")
        .send(raw);
      assertStatusError(response, 400, SESSION_ERRORS.badJson);
    }
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("JSON mal formado → 400 'JSON mal formado', también sin credencial (RF-23)", async () => {
    const response = await supertest(app).post(SESSIONS).set("Content-Type", "application/json").send("{");
    assertStatusError(response, 400, SESSION_ERRORS.badJson);
  });
});

describe("sesión (RF-20: cuerpo → sesión → datos)", () => {
  test("credencial alterada, expirada o ausente con datos inválidos → el 401 de la sesión", async () => {
    const ana = await signedUpWithAccounts();
    assertStatusError(await supertest(app).post(SESSIONS).send({ gameId: "xyz" }), 401, SESSION_MESSAGES.notLoggedIn);
    assertStatusError(
      await withSession(ana.agent.post(SESSIONS), "otro").send({ gameId: "xyz" }),
      401,
      SESSION_MESSAGES.invalidToken,
    );
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("credencial válida de un usuario eliminado → 401 'token inválido' y nada guardado", async () => {
    const ana = await signedUpWithAccounts();
    assert.strictEqual((await deleteMe(ana)).status, 204);
    const response = await rawCookieRequest(app, "post", SESSIONS, ana.cookie, ana.csrf).send(VALID);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });
});

describe("compensación: el usuario ya no existe al guardar (RF-16, RF-18, DP6-39)", () => {
  test("servicio: anfitrión inexistente → 401 'token inválido' y ninguna sesión en la base", async () => {
    const result = await createSession(
      newSession({ ...VALID, gameId: "lol" }, nonExistingId(), new Date(FIXED_NOW)),
    );
    assert.deepStrictEqual(result, { ok: false, status: 401, error: SESSION_MESSAGES.invalidToken });
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("servicio: anfitrión existente → ok con el id de la sesión guardada", async () => {
    const ana = await signUp(app, ANA);
    const result = await createSession(newSession({ ...VALID, gameId: "lol" }, ana.id, new Date(FIXED_NOW)));
    assert.ok(result.ok);
    const raw = await rawSessionsInDb();
    assert.strictEqual(raw.length, 1);
    assert.strictEqual(raw[0]?._id.toString(), result.id);
  });

  test("HTTP: usuario eliminado entre la validación y el guardado → 401 'token inválido' y sin sesión", async (t) => {
    fixClock(t);
    const ana = await signedUpWithAccounts();
    // La lectura de las cuentas vinculadas ocurre tras `createWithUser` y antes de guardar: ahí se
    // elimina al usuario (sin cascada) para que `createSession` lo encuentre ausente.
    const original = GameAccount.distinct.bind(GameAccount);
    let deleted = false;
    t.mock.method(GameAccount, "distinct", (...args: Parameters<typeof original>) => {
      const result = original(...args);
      return result.then(async (games) => {
        if (!deleted) {
          deleted = true;
          await User.deleteOne({ _id: ana.id });
        }
        return games;
      });
    });
    const response = await create(ana, VALID);
    assert.ok(deleted, "la sustitución debería haberse ejecutado");
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
    assert.strictEqual(await PlaySession.countDocuments({}), 0);
  });
});
