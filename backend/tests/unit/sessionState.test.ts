import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyEdit,
  applyJoin,
  applyLeave,
  assembleSessionViews,
  compareByCodePoint,
  compareSessions,
  newSession,
  removeParticipant,
  statusFor,
  toSessionView,
} from "../../src/domain/sessionState.ts";
import type { SessionRecord, UserRef } from "../../src/domain/sessionState.ts";
import { SESSION_ERRORS, validateSessionEdit } from "../../src/domain/sessionRules.ts";
import type { CreateInput, RuleResult, SessionPatch } from "../../src/domain/sessionRules.ts";

// Spec 006, RF-2, RF-4, RF-7, RF-8, RF-11 a RF-14, RF-16 (regla), RF-17, RF-24, RNF-1; DP6-10,
// DP6-15, DP6-26, DP6-34, DP6-38; plan, secciones 2, 3.5, 3.6, P6-4 y P6-8. Sin base ni reloj.

const NOW = new Date("2026-10-18T12:00:00.000Z");

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s1",
    gameId: "lol",
    hostId: "host",
    title: "Ranked de noche",
    notes: "",
    day: 2,
    startHour: 20,
    durationHours: 2,
    slots: 4,
    participantIds: ["host"],
    status: "open",
    createdAt: NOW,
    ...overrides,
  };
}

function ref(id: string): UserRef {
  return { id, username: `user_${id}`, displayName: `Nombre ${id}`, avatarColor: "#112233" };
}

function usersMap(ids: readonly string[]): Map<string, UserRef> {
  return new Map(ids.map((id) => [id, ref(id)]));
}

function expectOk(result: { ok: boolean }): asserts result is { ok: true } {
  assert.strictEqual(result.ok, true);
}

function valid(patch: SessionPatch): RuleResult<SessionPatch> {
  return { ok: true, value: patch };
}

function invalid(error: string): RuleResult<SessionPatch> {
  return { ok: false, status: 400, error };
}

describe("statusFor", () => {
  test("menos participantes que cupos -> open", () => {
    assert.strictEqual(statusFor(1, 2), "open");
    assert.strictEqual(statusFor(5, 6), "open");
  });

  test("participantes igual a cupos -> full", () => {
    assert.strictEqual(statusFor(2, 2), "full");
    assert.strictEqual(statusFor(6, 6), "full");
  });

  test("participantes mayores que cupos -> full (n >= cupos)", () => {
    assert.strictEqual(statusFor(3, 2), "full");
  });
});

describe("newSession", () => {
  const input: CreateInput = {
    gameId: "cs2",
    title: "Scrim",
    notes: "traer micro",
    day: 5,
    startHour: 22,
    durationHours: 3,
    slots: 5,
  };

  test("anfitrion unico participante, open y createdAt = now", () => {
    const result = newSession(input, "u9", NOW);
    assert.deepStrictEqual(result, {
      gameId: "cs2",
      title: "Scrim",
      notes: "traer micro",
      day: 5,
      startHour: 22,
      durationHours: 3,
      slots: 5,
      hostId: "u9",
      participantIds: ["u9"],
      status: "open",
      createdAt: NOW,
    });
  });

  test("no trae id y no comparte la lista de participantes entre llamadas", () => {
    const a = newSession(input, "u1", NOW);
    const b = newSession(input, "u2", NOW);
    assert.strictEqual("id" in a, false);
    assert.notStrictEqual(a.participantIds, b.participantIds);
  });

  test("ignora campos extra del input", () => {
    const dirty = { ...input, hostId: "otro", status: "full", participantIds: ["x", "y"] };
    const result = newSession(dirty, "u1", NOW);
    assert.strictEqual(result.hostId, "u1");
    assert.deepStrictEqual(result.participantIds, ["u1"]);
    assert.strictEqual(result.status, "open");
  });
});

describe("applyEdit", () => {
  test("no anfitrion -> 403 aunque el parche sea invalido", () => {
    const result = applyEdit(record(), "otro", invalid(SESSION_ERRORS.title));
    assert.deepStrictEqual(result, {
      ok: false,
      status: 403,
      error: SESSION_ERRORS.notHostEdit,
    });
  });

  test("no anfitrion con parche valido -> 403", () => {
    const result = applyEdit(record(), "otro", valid({ title: "Nuevo titulo" }));
    assert.deepStrictEqual(result, {
      ok: false,
      status: 403,
      error: SESSION_ERRORS.notHostEdit,
    });
  });

  test("no anfitrion con cupos bajo inscritos -> 403 antes que RF-8", () => {
    const s = record({ slots: 4, participantIds: ["host", "a", "b"], status: "open" });
    const result = applyEdit(s, "a", valid({ slots: 2 }));
    assert.deepStrictEqual(result, {
      ok: false,
      status: 403,
      error: SESSION_ERRORS.notHostEdit,
    });
  });

  test("parche invalido del anfitrion -> 400 con su texto", () => {
    const result = applyEdit(record(), "host", invalid(SESSION_ERRORS.day));
    assert.deepStrictEqual(result, { ok: false, status: 400, error: SESSION_ERRORS.day });
  });

  test("parche invalido antes que RF-8", () => {
    const s = record({ slots: 4, participantIds: ["host", "a", "b"] });
    const result = applyEdit(s, "host", invalid(SESSION_ERRORS.slots));
    assert.deepStrictEqual(result, { ok: false, status: 400, error: SESSION_ERRORS.slots });
  });

  test("cupos validos bajo los participantes -> 400 RF-8", () => {
    const s = record({ slots: 4, participantIds: ["host", "a", "b"] });
    const result = applyEdit(s, "host", valid({ slots: 2 }));
    assert.deepStrictEqual(result, {
      ok: false,
      status: 400,
      error: SESSION_ERRORS.slotsBelowParticipants,
    });
  });

  test("cupos = participantes -> full", () => {
    const s = record({ slots: 4, participantIds: ["host", "a", "b"], status: "open" });
    const result = applyEdit(s, "host", valid({ slots: 3 }));
    expectOk(result);
    assert.strictEqual(result.value.slots, 3);
    assert.strictEqual(result.value.status, "full");
    assert.deepStrictEqual(result.value.participantIds, ["host", "a", "b"]);
  });

  test("subir cupos de una llena -> open", () => {
    const s = record({ slots: 2, participantIds: ["host", "a"], status: "full" });
    const result = applyEdit(s, "host", valid({ slots: 3 }));
    expectOk(result);
    assert.strictEqual(result.value.status, "open");
  });

  test("editar solo un campo conserva los demas", () => {
    const s = record({ notes: "n", participantIds: ["host", "a"] });
    const result = applyEdit(s, "host", valid({ startHour: 9 }));
    expectOk(result);
    assert.deepStrictEqual(result.value, { ...s, startHour: 9 });
  });

  test("aplica todos los campos del parche", () => {
    const result = applyEdit(
      record(),
      "host",
      valid({ title: "Otro", notes: "x", day: 6, startHour: 1, durationHours: 4, slots: 6 }),
    );
    expectOk(result);
    assert.strictEqual(result.value.title, "Otro");
    assert.strictEqual(result.value.notes, "x");
    assert.strictEqual(result.value.day, 6);
    assert.strictEqual(result.value.startHour, 1);
    assert.strictEqual(result.value.durationHours, 4);
    assert.strictEqual(result.value.slots, 6);
    assert.strictEqual(result.value.gameId, "lol");
    assert.strictEqual(result.value.hostId, "host");
  });

  test("parche vacio -> sin cambios", () => {
    const s = record({ participantIds: ["host", "a"] });
    const result = applyEdit(s, "host", valid({}));
    expectOk(result);
    assert.deepStrictEqual(result.value, s);
  });

  test("integracion con validateSessionEdit: solo slots y id/gameId ignorados", () => {
    const patch = validateSessionEdit({ slots: 5, gameId: "cs2", hostId: "otro", status: "full" });
    const result = applyEdit(record(), "host", patch);
    expectOk(result);
    assert.strictEqual(result.value.slots, 5);
    assert.strictEqual(result.value.gameId, "lol");
    assert.strictEqual(result.value.hostId, "host");
    assert.strictEqual(result.value.status, "open");
  });

  test("no muta el registro original", () => {
    const s = record({ participantIds: ["host", "a"] });
    const copy = structuredClone(s);
    applyEdit(s, "host", valid({ slots: 2 }));
    assert.deepStrictEqual(s, copy);
  });
});

describe("applyJoin", () => {
  test("se agrega al final de los participantes", () => {
    const s = record({ participantIds: ["host", "a"] });
    const result = applyJoin(s, "b");
    expectOk(result);
    assert.deepStrictEqual(result.value.participantIds, ["host", "a", "b"]);
    assert.strictEqual(result.value.status, "open");
  });

  test("ultimo cupo -> full", () => {
    const s = record({ slots: 3, participantIds: ["host", "a"] });
    const result = applyJoin(s, "b");
    expectOk(result);
    assert.strictEqual(result.value.status, "full");
  });

  test("anfitrion se suma a la suya -> ya inscrito", () => {
    const result = applyJoin(record(), "host");
    assert.deepStrictEqual(result, {
      ok: false,
      status: 409,
      error: SESSION_ERRORS.alreadyJoined,
    });
  });

  test("inscrito en una sesion llena -> ya inscrito (antes que llena)", () => {
    const s = record({ slots: 2, participantIds: ["host", "a"], status: "full" });
    const result = applyJoin(s, "a");
    assert.deepStrictEqual(result, {
      ok: false,
      status: 409,
      error: SESSION_ERRORS.alreadyJoined,
    });
  });

  test("no inscrito en una sesion llena -> ya no admite", () => {
    const s = record({ slots: 2, participantIds: ["host", "a"], status: "full" });
    const result = applyJoin(s, "b");
    assert.deepStrictEqual(result, { ok: false, status: 409, error: SESSION_ERRORS.full });
  });

  test("no muta el registro original", () => {
    const s = record({ participantIds: ["host"] });
    const copy = structuredClone(s);
    applyJoin(s, "b");
    assert.deepStrictEqual(s, copy);
  });
});

describe("applyLeave", () => {
  test("el anfitrion no puede salir -> RF-14", () => {
    const result = applyLeave(record(), "host");
    assert.deepStrictEqual(result, { ok: false, status: 409, error: SESSION_ERRORS.hostLeave });
  });

  test("RF-14 antes que RF-17 aunque el anfitrion falte de la lista", () => {
    const s = record({ participantIds: ["a"] });
    const result = applyLeave(s, "host");
    assert.deepStrictEqual(result, { ok: false, status: 409, error: SESSION_ERRORS.hostLeave });
  });

  test("no inscrito -> RF-17", () => {
    const result = applyLeave(record(), "ajeno");
    assert.deepStrictEqual(result, { ok: false, status: 409, error: SESSION_ERRORS.notJoined });
  });

  test("sale de una sesion llena -> open", () => {
    const s = record({ slots: 2, participantIds: ["host", "a"], status: "full" });
    const result = applyLeave(s, "a");
    expectOk(result);
    assert.deepStrictEqual(result.value.participantIds, ["host"]);
    assert.strictEqual(result.value.status, "open");
  });

  test("conserva el orden de los demas participantes", () => {
    const s = record({ slots: 5, participantIds: ["host", "a", "b", "c"] });
    const result = applyLeave(s, "b");
    expectOk(result);
    assert.deepStrictEqual(result.value.participantIds, ["host", "a", "c"]);
    assert.strictEqual(result.value.status, "open");
  });

  test("no muta el registro original", () => {
    const s = record({ participantIds: ["host", "a"] });
    const copy = structuredClone(s);
    applyLeave(s, "a");
    assert.deepStrictEqual(s, copy);
  });
});

describe("removeParticipant", () => {
  test("quita al participante y recalcula el estado", () => {
    const s = record({ slots: 2, participantIds: ["host", "a"], status: "full" });
    const result = removeParticipant(s, "a");
    assert.deepStrictEqual(result.participantIds, ["host"]);
    assert.strictEqual(result.status, "open");
  });

  test("idempotente: quitar a quien no esta no cambia nada", () => {
    const s = record({ slots: 2, participantIds: ["host", "a"], status: "full" });
    const once = removeParticipant(s, "z");
    assert.deepStrictEqual(once, s);
    const twice = removeParticipant(removeParticipant(s, "a"), "a");
    assert.deepStrictEqual(twice, removeParticipant(s, "a"));
  });

  test("recalcula tambien un estado guardado desfasado", () => {
    const s = record({ slots: 3, participantIds: ["host", "a"], status: "full" });
    const result = removeParticipant(s, "zzz");
    assert.strictEqual(result.status, "open");
  });

  test("no muta el registro original", () => {
    const s = record({ participantIds: ["host", "a"] });
    const copy = structuredClone(s);
    removeParticipant(s, "a");
    assert.deepStrictEqual(s, copy);
  });
});

describe("DP6-38: la regla cuenta los participantes guardados", () => {
  // 3 cupos y 3 participantIds guardados; "ghost" ya no esta en el mapa de usuarios (visibles: 2).
  const stored = record({
    slots: 3,
    participantIds: ["host", "a", "ghost"],
    status: "full",
  });

  test("applyJoin -> 409 llena", () => {
    const result = applyJoin(stored, "newcomer");
    assert.deepStrictEqual(result, { ok: false, status: 409, error: SESSION_ERRORS.full });
  });

  test("applyEdit a 2 cupos -> 400 RF-8", () => {
    const result = applyEdit(stored, "host", valid({ slots: 2 }));
    assert.deepStrictEqual(result, {
      ok: false,
      status: 400,
      error: SESSION_ERRORS.slotsBelowParticipants,
    });
  });

  test("la vista muestra 2 visibles y conserva el status guardado", () => {
    const view = toSessionView(stored, usersMap(["host", "a"]));
    assert.notStrictEqual(view, null);
    assert.strictEqual(view?.participants.length, 2);
    assert.strictEqual(view?.status, "full");
  });

  test("tras removeParticipant -> open y ambas operaciones se resuelven con 2", () => {
    const cleaned = removeParticipant(stored, "ghost");
    assert.strictEqual(cleaned.status, "open");
    const joined = applyJoin(cleaned, "newcomer");
    expectOk(joined);
    assert.strictEqual(joined.value.status, "full");
    const edited = applyEdit(cleaned, "host", valid({ slots: 2 }));
    expectOk(edited);
    assert.strictEqual(edited.value.status, "full");
  });
});

describe("compareByCodePoint", () => {
  test("iguales -> 0", () => {
    assert.strictEqual(compareByCodePoint("abc", "abc"), 0);
    assert.strictEqual(compareByCodePoint("", ""), 0);
  });

  test("el primer codigo distinto decide", () => {
    assert.strictEqual(compareByCodePoint("abc", "abd"), -1);
    assert.strictEqual(compareByCodePoint("abd", "abc"), 1);
    assert.strictEqual(compareByCodePoint("B", "a"), -1);
  });

  test("prefijo mas corto primero", () => {
    assert.strictEqual(compareByCodePoint("ab", "abc"), -1);
    assert.strictEqual(compareByCodePoint("abc", "ab"), 1);
    assert.strictEqual(compareByCodePoint("", "a"), -1);
    assert.strictEqual(compareByCodePoint("a", ""), 1);
  });

  test("compara por codigo Unicode, no por unidad UTF-16", () => {
    // U+FF5E (BMP alto) frente a U+1F600 (par sustituto): por unidades UTF-16 el emoji iria
    // antes (0xD83D < 0xFF5E); por codigo, U+FF5E es menor.
    const bmp = "～";
    const astral = "\u{1F600}";
    assert.strictEqual(compareByCodePoint(bmp, astral), -1);
    assert.strictEqual(compareByCodePoint(astral, bmp), 1);
  });

  test("un punto de codigo fuera del BMP ocupa una sola posicion", () => {
    assert.strictEqual(compareByCodePoint("\u{1F600}a", "\u{1F600}b"), -1);
    assert.strictEqual(compareByCodePoint("\u{1F600}", "\u{1F600}a"), -1);
    assert.strictEqual(compareByCodePoint("\u{1F600}a", "\u{1F600}"), 1);
  });
});

describe("compareSessions", () => {
  test("ordena por dia", () => {
    const a = record({ id: "a", day: 1, startHour: 23 });
    const b = record({ id: "b", day: 2, startHour: 0 });
    assert.ok(compareSessions(a, b) < 0);
    assert.ok(compareSessions(b, a) > 0);
  });

  test("a igual dia, por hora de inicio", () => {
    const a = record({ id: "z", day: 3, startHour: 9 });
    const b = record({ id: "a", day: 3, startHour: 10 });
    assert.ok(compareSessions(a, b) < 0);
    assert.ok(compareSessions(b, a) > 0);
  });

  test("a igual hora, por fecha de creacion mas antigua primero", () => {
    const older = record({ id: "z", createdAt: new Date("2026-10-01T00:00:00.000Z") });
    const newer = record({ id: "a", createdAt: new Date("2026-10-02T00:00:00.000Z") });
    assert.ok(compareSessions(older, newer) < 0);
    assert.ok(compareSessions(newer, older) > 0);
  });

  test("si todo empata, por id con compareByCodePoint", () => {
    const a = record({ id: "5f1" });
    const b = record({ id: "5f2" });
    assert.ok(compareSessions(a, b) < 0);
    assert.ok(compareSessions(b, a) > 0);
    const prefix = record({ id: "5f" });
    assert.ok(compareSessions(prefix, a) < 0);
  });

  test("misma sesion -> 0", () => {
    assert.strictEqual(compareSessions(record(), record()), 0);
  });

  test("es un orden total usable con sort", () => {
    const list = [
      record({ id: "d", day: 2, startHour: 5 }),
      record({ id: "c", day: 1, startHour: 20 }),
      record({ id: "b", day: 1, startHour: 20 }),
      record({
        id: "a",
        day: 1,
        startHour: 20,
        createdAt: new Date("2026-10-19T00:00:00.000Z"),
      }),
      record({ id: "e", day: 1, startHour: 3 }),
    ];
    const ids = [...list].sort(compareSessions).map((s) => s.id);
    assert.deepStrictEqual(ids, ["e", "b", "c", "a", "d"]);
  });
});

describe("toSessionView", () => {
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

  test("claves exactas de RNF-1 y en orden", () => {
    const view = toSessionView(
      record({ participantIds: ["host", "a"] }),
      usersMap(["host", "a"]),
    );
    assert.notStrictEqual(view, null);
    assert.deepStrictEqual(Object.keys(view ?? {}), VIEW_KEYS);
  });

  test("valores: hostId igual al de host, createdAt ISO, ids como texto", () => {
    const s = record({
      id: "abc",
      notes: "ojo",
      participantIds: ["host", "a"],
      status: "open",
      createdAt: new Date("2026-10-18T12:34:56.789Z"),
    });
    const view = toSessionView(s, usersMap(["host", "a"]));
    assert.deepStrictEqual(view, {
      id: "abc",
      gameId: "lol",
      hostId: "host",
      host: ref("host"),
      title: "Ranked de noche",
      notes: "ojo",
      day: 2,
      startHour: 20,
      durationHours: 2,
      slots: 4,
      participants: [ref("host"), ref("a")],
      status: "open",
      createdAt: "2026-10-18T12:34:56.789Z",
    });
    assert.strictEqual(view?.hostId, view?.host.id);
  });

  test("las referencias tienen solo cuatro campos, en orden", () => {
    const rich = new Map<string, UserRef>();
    // Un mapa con campos de mas (correo, hash) no debe filtrarse a la vista.
    const extra = { ...ref("host"), email: "x@y.z", passwordHash: "hash" };
    rich.set("host", extra);
    const view = toSessionView(record(), rich);
    const expected = ["id", "username", "displayName", "avatarColor"];
    assert.deepStrictEqual(Object.keys(view?.host ?? {}), expected);
    for (const participant of view?.participants ?? []) {
      assert.deepStrictEqual(Object.keys(participant), expected);
    }
  });

  test("anfitrion ausente del mapa -> null", () => {
    const s = record({ participantIds: ["host", "a"] });
    assert.strictEqual(toSessionView(s, usersMap(["a"])), null);
  });

  test("participante ausente filtrado, status intacto y orden conservado", () => {
    const s = record({
      slots: 3,
      participantIds: ["host", "ghost", "a"],
      status: "full",
    });
    const view = toSessionView(s, usersMap(["host", "a"]));
    assert.deepStrictEqual(view?.participants, [ref("host"), ref("a")]);
    assert.strictEqual(view?.status, "full");
    assert.strictEqual(view?.slots, 3);
  });

  test("entrega el status guardado aunque no coincida con los participantes (DP6-26)", () => {
    const s = record({ slots: 4, participantIds: ["host"], status: "full" });
    assert.strictEqual(toSessionView(s, usersMap(["host"]))?.status, "full");
  });

  test("no muta el registro", () => {
    const s = record({ participantIds: ["host", "a"] });
    const copy = structuredClone(s);
    toSessionView(s, usersMap(["host", "a"]));
    assert.deepStrictEqual(s, copy);
  });
});

describe("assembleSessionViews", () => {
  test("ordena segun compareSessions", () => {
    const list = [
      record({ id: "c", day: 4 }),
      record({ id: "a", day: 1, startHour: 22 }),
      record({ id: "b", day: 1, startHour: 8 }),
    ];
    const views = assembleSessionViews(list, usersMap(["host"]));
    assert.deepStrictEqual(
      views.map((v) => v.id),
      ["b", "a", "c"],
    );
  });

  test("omite las sesiones sin anfitrion", () => {
    const list = [
      record({ id: "ok", hostId: "host", participantIds: ["host"] }),
      record({ id: "gone", hostId: "deleted", participantIds: ["deleted"] }),
    ];
    const views = assembleSessionViews(list, usersMap(["host"]));
    assert.deepStrictEqual(
      views.map((v) => v.id),
      ["ok"],
    );
  });

  test("mantiene la sesion con un participante ausente", () => {
    const list = [record({ id: "s", slots: 2, participantIds: ["host", "ghost"], status: "full" })];
    const views = assembleSessionViews(list, usersMap(["host"]));
    assert.strictEqual(views.length, 1);
    assert.strictEqual(views[0]?.participants.length, 1);
    assert.strictEqual(views[0]?.status, "full");
  });

  test("lista vacia -> []", () => {
    assert.deepStrictEqual(assembleSessionViews([], usersMap([])), []);
  });

  test("no reordena ni muta la lista de entrada", () => {
    const list: readonly SessionRecord[] = [
      record({ id: "b", day: 5 }),
      record({ id: "a", day: 0 }),
    ];
    assembleSessionViews(list, usersMap(["host"]));
    assert.deepStrictEqual(
      list.map((s) => s.id),
      ["b", "a"],
    );
  });
});
