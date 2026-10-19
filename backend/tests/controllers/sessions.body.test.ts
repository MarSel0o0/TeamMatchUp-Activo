// Agenda de sesiones: el cuerpo en las siete operaciones (spec 006, T10). RF-1, RF-15, RF-18,
// RF-20, RF-23, RF-28, DP6-29, DP6-32, DP6-36; plan, secciones 6 ("Paso del cuerpo") y 9 ("Cuerpo").
// - Sin pruebas de cuerpo demasiado grande, comprimido o con juego de caracteres no admitido, ni
//   de 413/415 (D6-1).
// - Usuarios por la API de registro (`signUp`); sesiones preparadas con `insertSession`.
// - Las credenciales de cada caso se arman con `rawCookieRequest` y `forgeToken`.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { SESSION_ERRORS } from "../../src/domain/sessionRules.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { testConfig } from "../server/helpers.ts";
import {
  authApp,
  closeTestServers,
  deleteMe,
  forgeToken,
  insertSession,
  linkAccountFor,
  nonExistingId,
  rawCookieRequest,
  rawSessionsInDb,
  signUp,
  withSession,
} from "./helpers.ts";
import type { HttpMethod, SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const GHOST = { email: "fantasma@example.com", username: "Fantasma" } as const;

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

// Cuerpos JSON que el parser de `/api/sessions` (`strict: false`) deja pasar pero no son objeto.
const NON_OBJECTS = ["[]", "3", '"x"', "true", "null"] as const;

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

function assertStatusError(response: Response, status: number, message: string, label = ""): void {
  assert.strictEqual(response.status, status, `${label} → ${response.status} ${JSON.stringify(response.body)}`);
  assert.match(response.headers["content-type"] ?? "", /application\/json/, label);
  assert.deepStrictEqual(response.body, { error: message }, label);
}

// Anfitrión (con cuenta de LoL), otro jugador y un usuario eliminado cuya credencial sigue siendo válida.
interface Scene {
  ana: SignedUp;
  beto: SignedUp;
  ghost: SignedUp;
}

async function scene(): Promise<Scene> {
  const ana = await signUp(app, ANA);
  const beto = await signUp(app, BETO);
  const ghost = await signUp(app, GHOST);
  await linkAccountFor(ana, "lol");
  await linkAccountFor(beto, "lol");
  assert.strictEqual((await deleteMe(ghost)).status, 204);
  return { ana, beto, ghost };
}

// Las siete operaciones: método y ruta sobre la sesión `id`.
interface Operation {
  name: string;
  method: HttpMethod;
  path(id: string): string;
}

const OPERATIONS: readonly Operation[] = [
  { name: "listar", method: "get", path: () => SESSIONS },
  { name: "obtener", method: "get", path: (id) => `${SESSIONS}/${id}` },
  { name: "crear", method: "post", path: () => SESSIONS },
  { name: "editar", method: "put", path: (id) => `${SESSIONS}/${id}` },
  { name: "cancelar", method: "delete", path: (id) => `${SESSIONS}/${id}` },
  { name: "sumarse", method: "post", path: (id) => `${SESSIONS}/${id}/join` },
  { name: "salir", method: "post", path: (id) => `${SESSIONS}/${id}/leave` },
];

const BODY_OPERATIONS = OPERATIONS.filter((operation) => operation.name === "crear" || operation.name === "editar");
const EDIT: Operation = { name: "editar", method: "put", path: (id) => `${SESSIONS}/${id}` };

// Estados de la credencial con que se envía una petición.
type Credential = "ninguna" | "valida" | "alterada" | "expirada" | "usuario eliminado";

const CREDENTIALS: readonly Credential[] = ["ninguna", "valida", "alterada", "expirada", "usuario eliminado"];

// Petición de `operation` con la credencial indicada; `valida` es la de `actor`.
function build(operation: Operation, id: string, credential: Credential, scenery: Scene, actor: SignedUp): supertest.Test {
  const path = operation.path(id);
  switch (credential) {
    case "ninguna":
      return supertest(app)[operation.method](path);
    case "valida":
      return rawCookieRequest(app, operation.method, path, actor.cookie, actor.csrf);
    case "alterada": {
      const token = forgeToken({ id: scenery.ana.id, username: "Ana", csrf: "c" }, { secret: "otro-secreto" });
      return rawCookieRequest(app, operation.method, path, token, "c");
    }
    case "expirada": {
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
      const token = forgeToken({ id: scenery.ana.id, username: "Ana", csrf: "c" }, { iat: twoHoursAgo });
      return rawCookieRequest(app, operation.method, path, token, "c");
    }
    case "usuario eliminado":
      return rawCookieRequest(app, operation.method, path, scenery.ghost.cookie, scenery.ghost.csrf);
  }
}

// Envía `raw` como cuerpo declarado JSON.
function asJson(request: supertest.Test, raw: string): supertest.Test {
  return request.set("Content-Type", "application/json").send(raw);
}

describe("JSON mal formado en las siete operaciones (RF-23, DP6-29)", () => {
  const malformed = ["{mal", "{", "{'a':1}", '{"a":}', "[1,", '{"title":"x"'];

  for (const operation of OPERATIONS) {
    test(`${operation.name}: 400 "JSON mal formado" con cualquier credencial y la base sin cambios`, async () => {
      const scenery = await scene();
      const session = await insertSession({ host: scenery.ana.id, participants: [scenery.ana.id, scenery.beto.id] });
      const before = await rawSessionsInDb();
      for (const credential of CREDENTIALS) {
        for (const raw of malformed) {
          const response = await asJson(build(operation, session.id, credential, scenery, scenery.ana), raw);
          assertStatusError(response, 400, SESSION_ERRORS.badJson, `${operation.name} con ${credential} y ${raw}`);
        }
      }
      assert.deepStrictEqual(await rawSessionsInDb(), before);
    });

    test(`${operation.name}: JSON mal formado gana también sobre un id mal formado o inexistente`, async () => {
      const scenery = await scene();
      for (const id of ["abc", nonExistingId()]) {
        const response = await asJson(build(operation, id, "valida", scenery, scenery.ana), "{mal");
        assertStatusError(response, 400, SESSION_ERRORS.badJson, `${operation.name} con id ${id}`);
      }
    });
  }
});

describe("crear y editar con un cuerpo que no es objeto (RF-28, DP6-32)", () => {
  for (const operation of BODY_OPERATIONS) {
    test(`${operation.name}: [], 3, "x", true y null → 400 "JSON mal formado" con cualquier credencial, también sin ella`, async () => {
      const scenery = await scene();
      const session = await insertSession({ host: scenery.ana.id });
      const before = await rawSessionsInDb();
      for (const credential of CREDENTIALS) {
        for (const raw of NON_OBJECTS) {
          const response = await asJson(build(operation, session.id, credential, scenery, scenery.ana), raw);
          assertStatusError(response, 400, SESSION_ERRORS.badJson, `${operation.name} con ${credential} y ${raw}`);
        }
      }
      assert.deepStrictEqual(await rawSessionsInDb(), before);
    });
  }

  test("editar: el cuerpo que no es objeto gana sobre un id mal formado, inexistente o ajeno", async () => {
    const scenery = await scene();
    const foreign = await insertSession({ host: scenery.beto.id });
    for (const id of ["abc", nonExistingId(), foreign.id]) {
      for (const raw of NON_OBJECTS) {
        const response = await asJson(build(EDIT, id, "valida", scenery, scenery.ana), raw);
        assertStatusError(response, 400, SESSION_ERRORS.badJson, `editar ${id} con ${raw}`);
      }
    }
  });

  test("editar: un segmento no decodificable (%zz) con cuerpo que no es objeto también responde \"JSON mal formado\"", async () => {
    const response = await asJson(supertest(app).put(`${SESSIONS}/%zz`), "null");
    assertStatusError(response, 400, SESSION_ERRORS.badJson);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });
});

describe("crear y editar sin cuerpo, con {} o con un tipo no declarado como JSON (DP6-29, DP6-36)", () => {
  test("crear sin cuerpo y con {} → 400 'Juego no válido.' y la base sin cambios", async () => {
    const { ana } = await scene();
    const sinCuerpo = await withSession(ana.agent.post(SESSIONS), ana.csrf);
    assertStatusError(sinCuerpo, 400, SESSION_ERRORS.game, "sin cuerpo");
    const vacio = await withSession(ana.agent.post(SESSIONS), ana.csrf).send({});
    assertStatusError(vacio, 400, SESSION_ERRORS.game, "{}");
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("crear con text/plain y un JSON válido dentro → 'Juego no válido.' y la base sin cambios", async () => {
    const { ana } = await scene();
    const response = await withSession(ana.agent.post(SESSIONS), ana.csrf)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify(VALID));
    assertStatusError(response, 400, SESSION_ERRORS.game);
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("crear con un tipo no declarado como JSON y un cuerpo que no es objeto → 'Juego no válido.', no se lee", async () => {
    const { ana } = await scene();
    for (const raw of NON_OBJECTS) {
      const response = await withSession(ana.agent.post(SESSIONS), ana.csrf)
        .set("Content-Type", "text/plain")
        .send(raw);
      assertStatusError(response, 400, SESSION_ERRORS.game, `text/plain con ${raw}`);
    }
    assert.deepStrictEqual(await rawSessionsInDb(), []);
  });

  test("editar sin cuerpo y con {} → 200 y la sesión sin cambios", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    const sinCuerpo = await withSession(ana.agent.put(`${SESSIONS}/${session.id}`), ana.csrf);
    assert.strictEqual(sinCuerpo.status, 200, "sin cuerpo");
    const vacio = await withSession(ana.agent.put(`${SESSIONS}/${session.id}`), ana.csrf).send({});
    assert.strictEqual(vacio.status, 200, "{}");
    assert.deepStrictEqual(vacio.body, sinCuerpo.body);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });

  test("editar con text/plain y un JSON válido dentro → 200 y la sesión sin cambios (no se lee)", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    const before = await rawSessionsInDb();
    const response = await withSession(ana.agent.put(`${SESSIONS}/${session.id}`), ana.csrf)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ title: "Otro titulo", slots: 6 }));
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.title, "Ranked de noche");
    assert.strictEqual(response.body.slots, 4);
    assert.deepStrictEqual(await rawSessionsInDb(), before);
  });
});

describe("las operaciones que ignoran el cuerpo responden con normalidad (RF-15, DP6-32)", () => {
  // Cada variante usa una sesión nueva, porque sumarse, salir y cancelar cambian el estado.
  const variants: ReadonlyArray<string | undefined> = [undefined, ...NON_OBJECTS, "{}"];

  function label(raw: string | undefined): string {
    return raw === undefined ? "sin cuerpo" : `cuerpo ${raw}`;
  }

  function send(request: supertest.Test, raw: string | undefined): supertest.Test {
    return raw === undefined ? request : asJson(request, raw);
  }

  test("listar → 200 con la lista", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    for (const raw of variants) {
      const response = await send(withSession(ana.agent.get(SESSIONS), ana.csrf), raw);
      assert.strictEqual(response.status, 200, label(raw));
      assert.ok(Array.isArray(response.body), label(raw));
      assert.deepStrictEqual(
        (response.body as Array<{ id: unknown }>).map((item) => item.id),
        [session.id],
        label(raw),
      );
    }
  });

  test("obtener → 200 con la sesión", async () => {
    const { ana } = await scene();
    const session = await insertSession({ host: ana.id });
    for (const raw of variants) {
      const response = await send(withSession(ana.agent.get(`${SESSIONS}/${session.id}`), ana.csrf), raw);
      assert.strictEqual(response.status, 200, label(raw));
      assert.strictEqual(response.body.id, session.id, label(raw));
    }
  });

  test("cancelar → 204 y la sesión borrada", async () => {
    const { ana } = await scene();
    for (const raw of variants) {
      const session = await insertSession({ host: ana.id });
      const response = await send(withSession(ana.agent.delete(`${SESSIONS}/${session.id}`), ana.csrf), raw);
      assert.strictEqual(response.status, 204, label(raw));
      assert.strictEqual(await PlaySession.exists({ _id: session.id }), null, label(raw));
    }
  });

  test("sumarse → 200 y quien se suma es el usuario de la sesión", async () => {
    const { ana, beto } = await scene();
    for (const raw of variants) {
      const session = await insertSession({ host: ana.id });
      const response = await send(withSession(beto.agent.post(`${SESSIONS}/${session.id}/join`), beto.csrf), raw);
      assert.strictEqual(response.status, 200, label(raw));
      const participants = (response.body.participants as Array<{ id: unknown }>).map((item) => item.id);
      assert.deepStrictEqual(participants, [ana.id, beto.id], label(raw));
    }
  });

  test("salir → 200 y se queda solo el anfitrión", async () => {
    const { ana, beto } = await scene();
    for (const raw of variants) {
      const session = await insertSession({ host: ana.id, participants: [ana.id, beto.id] });
      const response = await send(withSession(beto.agent.post(`${SESSIONS}/${session.id}/leave`), beto.csrf), raw);
      assert.strictEqual(response.status, 200, label(raw));
      const participants = (response.body.participants as Array<{ id: unknown }>).map((item) => item.id);
      assert.deepStrictEqual(participants, [ana.id], label(raw));
    }
  });

  test("sin credencial y con ese cuerpo, estas cinco llegan al 401 de la sesión, no al 400 del cuerpo", async () => {
    const ignoring = OPERATIONS.filter((operation) => !BODY_OPERATIONS.includes(operation));
    for (const operation of ignoring) {
      for (const raw of variants) {
        const response = await send(supertest(app)[operation.method](operation.path(nonExistingId())), raw);
        assertStatusError(response, 401, "sesión no iniciada", `${operation.name} con ${label(raw)}`);
      }
    }
  });
});
