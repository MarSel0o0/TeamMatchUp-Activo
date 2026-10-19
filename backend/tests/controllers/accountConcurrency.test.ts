// Concurrencia determinista sobre cuentas de juego (spec 004, plan, secciones 8 y 11).
// T17: infraestructura de RF-39 y RF-47 (`overlapFirstFindById`) y desvinculación frente a
// resincronización en las dos direcciones. T19: dos desvinculaciones solapadas. T22: edición
// con resincronización, dos ediciones y desvinculación con edición (RF-39, DP-41). T23:
// editar, resincronizar y desvincular en curso mientras se elimina el usuario (RF-47).
// - Cada prueba detiene la primera operación DESPUÉS de que `GameAccount.findById` leyó la
//   cuenta, ejecuta la segunda completa y deja seguir a la primera: el solapamiento ocurre
//   siempre y el resultado es único (DP-29, DP-41). Ninguna prueba acepta dos resultados.
// - Los textos de error se escriben como literales de la spec (plan, P-23).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { applySync, initialState } from "../../src/domain/accountState.ts";
import type { AccountState } from "../../src/domain/accountState.ts";
import type { GameId } from "../../src/domain/games.ts";
import { canonicalHandle, simulateReading } from "../../src/domain/rankSimulator.ts";
import type { Snapshot } from "../../src/domain/rankSimulator.ts";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { connectDatabase } from "../../src/server.ts";
import { clock } from "../../src/utils/clock.ts";
import { testConfig } from "../server/helpers.ts";
import type { SignedUp } from "./helpers.ts";
import {
  FIXED_NOW,
  authApp,
  closeTestServers,
  deleteMe,
  edit,
  linkOk,
  overlapFirstFindById,
  rawAccountsInDb,
  rawCookieRequest,
  signUp,
  sync,
  unlink,
} from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const CS2 = { gameId: "cs2", handle: "76561190000000001", region: "South America" } as const;

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
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

describe("overlapFirstFindById (el propio ayudante)", () => {
  test("la segunda operación se completa entre la lectura y la continuación de la primera", async (t) => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    const events: string[] = [];
    const result = await overlapFirstFindById(
      t,
      async () => {
        events.push("primera: empieza");
        const account = await GameAccount.findById(id);
        events.push(`primera: continúa (${account === null ? "sin cuenta" : "con cuenta"})`);
        return "A";
      },
      async () => {
        events.push("segunda: empieza");
        const account = await GameAccount.findById(id); // pasa directo, sin esperar
        events.push(`segunda: termina (${account === null ? "sin cuenta" : "con cuenta"})`);
        return "B";
      },
    );
    assert.deepStrictEqual(result, { first: "A", second: "B" });
    assert.deepStrictEqual(events, [
      "primera: empieza",
      "segunda: empieza",
      "segunda: termina (con cuenta)",
      "primera: continúa (con cuenta)",
    ]);
  });

  test("la primera lee el documento tal como estaba antes de la segunda (lectura vieja)", async (t) => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    let firstRead: string | undefined;
    await overlapFirstFindById(
      t,
      async () => {
        firstRead = (await GameAccount.findById(id))?.region;
      },
      async () => {
        await GameAccount.updateOne({ _id: id }, { $set: { region: "Europe" } });
      },
    );
    assert.strictEqual(firstRead, "South America"); // leyó antes de que la segunda escribiera
    assert.strictEqual((await GameAccount.findById(id))?.region, "Europe");
  });

  test("las llamadas posteriores a findById de la primera operación (reintentos) pasan directo", async (t) => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    let reads = 0;
    const result = await overlapFirstFindById(
      t,
      async () => {
        await GameAccount.findById(id);
        await GameAccount.findById(id); // reintento: no se detiene otra vez
        reads += 1;
        return "A";
      },
      async () => "B", // la segunda no lee nada
    );
    assert.deepStrictEqual(result, { first: "A", second: "B" });
    assert.strictEqual(reads, 1);
  });

  test("si la primera operación termina sin leer la cuenta, falla en vez de colgarse", async (t) => {
    await assert.rejects(
      overlapFirstFindById(
        t,
        async () => "sin leer",
        async () => "B",
      ),
      /no leyó la cuenta/,
    );
  });

  test("si la segunda operación lanza, la primera no queda detenida y el error llega", async (t) => {
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    await assert.rejects(
      overlapFirstFindById(
        t,
        async () => {
          await GameAccount.findById(id);
        },
        async () => {
          throw new Error("falla la segunda");
        },
      ),
      /falla la segunda/,
    );
  });
});

describe("desvinculación y resincronización solapadas (RF-39, DP-29, DP-41)", () => {
  test("la resincronización lee, la desvinculación termina (204) y la resincronización sigue → 404 cuenta no encontrada", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    const { first: synced, second: unlinked } = await overlapFirstFindById(
      t,
      () => sync(ana, id),
      () => unlink(ana, id),
    );
    assert.strictEqual(unlinked.status, 204);
    assert.strictEqual(synced.status, 404);
    assert.deepStrictEqual(synced.body, { error: "cuenta no encontrada" });
    assert.deepStrictEqual(await rawAccountsInDb(), []); // la escritura tardía no recrea la cuenta
  });

  test("la desvinculación lee, la resincronización termina (200) y la desvinculación sigue → 204", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    const { first: unlinked, second: synced } = await overlapFirstFindById(
      t,
      () => unlink(ana, id),
      () => sync(ana, id),
    );
    assert.strictEqual(synced.status, 200);
    assert.strictEqual(Reflect.get(synced.body as object, "id"), id);
    assert.strictEqual(unlinked.status, 204);
    assert.deepStrictEqual(unlinked.body, {});
    assert.deepStrictEqual(await rawAccountsInDb(), []);
  });
});

describe("dos desvinculaciones solapadas (RF-39, RF-9, DP-29)", () => {
  test("la detenida lee, la otra se completa (204) y la detenida continúa → 404 cuenta no encontrada", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, CS2);
    const userBefore = await User.findById(ana.id).lean();
    const { first: stalled, second: completed } = await overlapFirstFindById(
      t,
      () => unlink(ana, id),
      () => unlink(ana, id),
    );
    assert.strictEqual(completed.status, 204);
    assert.strictEqual(stalled.status, 404);
    assert.deepStrictEqual(stalled.body, { error: "cuenta no encontrada" });
    assert.deepStrictEqual(await rawAccountsInDb(), []);
    assert.deepStrictEqual(await User.findById(ana.id).lean(), userBefore);
  });
});

// --- T22: edición con resincronización, dos ediciones y desvinculación con edición (RF-39,
// DP-29, DP-41). El esperado se calcula con las funciones puras y `FIXED_NOW`, igual que la
// aplicación en serie; cada respuesta es la cuenta tal como quedó tras aplicarse ella.

const LOL = { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" } as const;

function stateAfterLink(gameId: GameId, handle: string): AccountState {
  const now = new Date(FIXED_NOW);
  return initialState(simulateReading({ gameId, canonicalHandle: canonicalHandle(handle), readingNumber: 0, now }), now);
}

// Estado tras vincular y resincronizar una vez (lectura 1), todo en `FIXED_NOW`.
function stateAfterSync(gameId: GameId, handle: string): AccountState {
  const now = new Date(FIXED_NOW);
  const reading = simulateReading({ gameId, canonicalHandle: canonicalHandle(handle), readingNumber: 1, now });
  return applySync(stateAfterLink(gameId, handle), reading, 1, now);
}

// Fotografía como la guarda Mongoose (sin `division` si no la tiene).
function storedSnapshot(snapshot: Snapshot): Record<string, unknown> {
  const { tier, division, points, normalized, recordedAt } = snapshot;
  return division === undefined
    ? { tier, points, normalized, recordedAt }
    : { tier, division, points, normalized, recordedAt };
}

function asJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// Cuerpo de la respuesta que el cliente debe ver (RNF-3).
function expectedJson(id: string, userId: string, region: string, state: AccountState): unknown {
  return asJson({
    id,
    userId,
    gameId: LOL.gameId,
    handle: LOL.handle,
    region,
    currentRank: storedSnapshot(state.currentRank),
    rankHistory: state.rankHistory.map(storedSnapshot),
    lastSyncedAt: state.lastSyncedAt,
    verified: state.verified,
    simulated: true,
  });
}

// Documento guardado (`lean()`), sin `__v`.
function expectedStored(id: string, userId: string, region: string, state: AccountState): unknown {
  return {
    _id: new mongoose.Types.ObjectId(id),
    user: new mongoose.Types.ObjectId(userId),
    gameId: LOL.gameId,
    handle: LOL.handle,
    region,
    currentRank: storedSnapshot(state.currentRank),
    rankHistory: state.rankHistory.map(storedSnapshot),
    matches: state.matches.map((match) => ({
      matchId: match.id,
      gameId: match.gameId,
      playedAt: match.playedAt,
      result: match.result,
      summary: match.summary,
      durationMinutes: match.durationMinutes,
      rankDelta: match.rankDelta,
    })),
    readingNumber: state.readingNumber,
    lastSyncedAt: state.lastSyncedAt,
    verified: state.verified,
  };
}

async function storedAccounts(): Promise<unknown[]> {
  const accounts = await rawAccountsInDb();
  return accounts.map((account) => {
    const rest: Record<string, unknown> = { ...account };
    delete rest.__v;
    return rest;
  });
}

describe("edición y resincronización solapadas (RF-39, DP-41)", () => {
  test("la edición lee, la resincronización termina y la edición sigue → las dos 200; región nueva y lectura 1; la edición responde con la lectura", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LOL);
    const synced = stateAfterSync("lol", LOL.handle);
    const { first: edited, second: resynced } = await overlapFirstFindById(
      t,
      () => edit(ana, id, { region: "EUW" }),
      () => sync(ana, id),
    );
    assert.strictEqual(resynced.status, 200);
    assert.strictEqual(edited.status, 200);
    assert.deepStrictEqual(resynced.body, expectedJson(id, ana.id, "LAS", synced)); // tal como quedó tras la sync
    assert.deepStrictEqual(edited.body, expectedJson(id, ana.id, "EUW", synced)); // tras la edición, ya con la lectura
    assert.deepStrictEqual(await storedAccounts(), [expectedStored(id, ana.id, "EUW", synced)]);
  });

  test("la resincronización lee, la edición termina y la resincronización sigue → las dos 200; región nueva y lectura 1; cada una con su cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LOL);
    const linked = stateAfterLink("lol", LOL.handle);
    const synced = stateAfterSync("lol", LOL.handle);
    const { first: resynced, second: edited } = await overlapFirstFindById(
      t,
      () => sync(ana, id),
      () => edit(ana, id, { region: "EUW" }),
    );
    assert.strictEqual(edited.status, 200);
    assert.strictEqual(resynced.status, 200);
    assert.deepStrictEqual(edited.body, expectedJson(id, ana.id, "EUW", linked)); // antes de la lectura
    assert.deepStrictEqual(resynced.body, expectedJson(id, ana.id, "EUW", synced)); // con la región ya cambiada
    assert.deepStrictEqual(await storedAccounts(), [expectedStored(id, ana.id, "EUW", synced)]);
  });
});

describe("dos ediciones solapadas (RF-39, DP-41)", () => {
  for (const [stalledRegion, completedRegion] of [
    ["EUW", "NA"],
    ["NA", "EUW"],
  ] as const) {
    test(`la detenida (${stalledRegion}) lee, la otra (${completedRegion}) termina y la detenida sigue → las dos 200; la región final es ${stalledRegion}`, async (t) => {
      fixClock(t);
      const ana = await signUp(app, ANA);
      const id = await linkOk(ana, LOL);
      const linked = stateAfterLink("lol", LOL.handle);
      const { first: stalled, second: completed } = await overlapFirstFindById(
        t,
        () => edit(ana, id, { region: stalledRegion }),
        () => edit(ana, id, { region: completedRegion }),
      );
      assert.strictEqual(completed.status, 200);
      assert.strictEqual(stalled.status, 200);
      assert.deepStrictEqual(completed.body, expectedJson(id, ana.id, completedRegion, linked));
      assert.deepStrictEqual(stalled.body, expectedJson(id, ana.id, stalledRegion, linked));
      assert.deepStrictEqual(await storedAccounts(), [expectedStored(id, ana.id, stalledRegion, linked)]);
    });
  }
});

describe("desvinculación y edición solapadas (RF-39, DP-29, DP-41)", () => {
  test("la edición lee, la desvinculación termina (204) y la edición sigue → 404 cuenta no encontrada; la cuenta no existe", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LOL);
    const { first: edited, second: unlinked } = await overlapFirstFindById(
      t,
      () => edit(ana, id, { region: "EUW" }),
      () => unlink(ana, id),
    );
    assert.strictEqual(unlinked.status, 204);
    assert.strictEqual(edited.status, 404);
    assert.deepStrictEqual(edited.body, { error: "cuenta no encontrada" });
    assert.deepStrictEqual(await rawAccountsInDb(), []); // la escritura tardía no recrea la cuenta
  });

  test("la desvinculación lee, la edición termina (200) y la desvinculación sigue → 204; la cuenta no existe", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const id = await linkOk(ana, LOL);
    const linked = stateAfterLink("lol", LOL.handle);
    const { first: unlinked, second: edited } = await overlapFirstFindById(
      t,
      () => unlink(ana, id),
      () => edit(ana, id, { region: "EUW" }),
    );
    assert.strictEqual(edited.status, 200);
    assert.deepStrictEqual(edited.body, expectedJson(id, ana.id, "EUW", linked));
    assert.strictEqual(unlinked.status, 204);
    assert.deepStrictEqual(unlinked.body, {});
    assert.deepStrictEqual(await rawAccountsInDb(), []);
  });
});

// --- T23: operación en curso al eliminar el usuario (RF-47, RF-14, RF-44, DP-37). La primera
// operación queda detenida tras leer la cuenta; `DELETE /api/users/me` (cascada real de T10)
// se completa y la operación continúa con la lectura vieja: 404 "cuenta no encontrada" sin
// recrear nada. Si la operación se aplica antes, responde 200/204 y la eliminación borra el
// resto. La eliminación no llama a `GameAccount.findById`, así que no altera el solapamiento.

const BOB = { email: "bob@example.com", username: "Bob" } as const;

// Tras eliminarse Ana: ni ella ni cuentas suyas; la de Bob intacta; su credencial, 401.
async function expectAnaGone(ana: SignedUp, bobAccountId: string): Promise<void> {
  assert.strictEqual(await User.findById(ana.id), null);
  assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 0);
  const rest = await rawAccountsInDb();
  assert.deepStrictEqual(
    rest.map((account) => String(account._id)),
    [bobAccountId],
  );
  const stale = await rawCookieRequest(app, "get", "/api/accounts", ana.cookie, ana.csrf);
  assert.strictEqual(stale.status, 401);
  assert.deepStrictEqual(stale.body, { error: "token inválido" });
}

describe("operación en curso mientras se elimina el usuario (RF-47, RF-14, RF-44)", () => {
  test("la edición lee, el usuario se elimina (204) y la edición sigue → 404 cuenta no encontrada; nada sobrevive", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const bob = await signUp(app, BOB);
    const id = await linkOk(ana, LOL);
    const bobAccount = await linkOk(bob, LOL);
    const { first: edited, second: deleted } = await overlapFirstFindById(
      t,
      () => edit(ana, id, { region: "EUW" }),
      () => deleteMe(ana),
    );
    assert.strictEqual(deleted.status, 204);
    assert.strictEqual(edited.status, 404);
    assert.deepStrictEqual(edited.body, { error: "cuenta no encontrada" });
    await expectAnaGone(ana, bobAccount);
  });

  test("la resincronización lee, el usuario se elimina (204) y la resincronización sigue → 404 cuenta no encontrada; nada sobrevive", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const bob = await signUp(app, BOB);
    const id = await linkOk(ana, LOL);
    const bobAccount = await linkOk(bob, LOL);
    const { first: synced, second: deleted } = await overlapFirstFindById(
      t,
      () => sync(ana, id),
      () => deleteMe(ana),
    );
    assert.strictEqual(deleted.status, 204);
    assert.strictEqual(synced.status, 404);
    assert.deepStrictEqual(synced.body, { error: "cuenta no encontrada" });
    await expectAnaGone(ana, bobAccount);
  });

  test("la desvinculación lee, el usuario se elimina (204) y la desvinculación sigue → 404 cuenta no encontrada; nada sobrevive", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const bob = await signUp(app, BOB);
    const id = await linkOk(ana, LOL);
    const bobAccount = await linkOk(bob, LOL);
    const { first: unlinked, second: deleted } = await overlapFirstFindById(
      t,
      () => unlink(ana, id),
      () => deleteMe(ana),
    );
    assert.strictEqual(deleted.status, 204);
    assert.strictEqual(unlinked.status, 404);
    assert.deepStrictEqual(unlinked.body, { error: "cuenta no encontrada" });
    await expectAnaGone(ana, bobAccount);
  });

  test("se aplicó antes: editar (200), resincronizar (200) y desvincular (204) completas y luego eliminar el usuario → 204 y ninguna cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const bob = await signUp(app, BOB);
    const lol = await linkOk(ana, LOL);
    const cs2 = await linkOk(ana, CS2);
    const bobAccount = await linkOk(bob, LOL);
    assert.strictEqual((await edit(ana, lol, { region: "EUW" })).status, 200);
    assert.strictEqual((await sync(ana, lol)).status, 200);
    assert.strictEqual((await unlink(ana, cs2)).status, 204);
    assert.deepStrictEqual(
      (await rawAccountsInDb()).map((account) => String(account._id)),
      [lol, bobAccount].sort(),
    );
    assert.strictEqual((await deleteMe(ana)).status, 204);
    await expectAnaGone(ana, bobAccount);
  });
});
