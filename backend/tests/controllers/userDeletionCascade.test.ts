// Cascada ordenada al eliminar el usuario (spec 004, plan, secciones 6.8 y 11.2; T10).
// RF-14, RF-47 (vinculación simultánea), RF-44 (credencial tras el borrado), DP-42.
// - Orden C1 → C2 → C3: `GameAccount.deleteMany` (cuentas), `User.deleteOne` (usuario) y
//   `GameAccount.deleteMany` otra vez (barrido). Las pruebas sustituyen esos métodos con
//   `t.mock.method` (delegan en el real o lanzan) y borran con el driver cuando el fallo
//   debe ocurrir "después de borrar". Nada depende del reloj ni del azar.
// - Tras un 500 solo valen el estado (1) (el usuario sigue, con su perfil, su disponibilidad
//   y las cuentas que queden, completas) o el estado (2) (ni usuario ni cuentas suyas).
// - Los textos de error se escriben como literales de la spec (plan, P-23).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { connectDatabase } from "../../src/server.ts";
import { clock } from "../../src/utils/clock.ts";
import type { GameId } from "../../src/domain/games.ts";
import { testConfig } from "../server/helpers.ts";
import {
  FIXED_NOW,
  authApp,
  closeTestServers,
  deleteMe,
  edit,
  link,
  linkOk,
  parseSetCookie,
  rawAccountsInDb,
  rawCookieRequest,
  sessionSetCookie,
  signUp,
  sync,
  unlink,
  withSession,
} from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

const LINKS = {
  lol: { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" },
  r6: { gameId: "r6", handle: "jugador2", region: "LATAM" },
  cs2: { gameId: "cs2", handle: "76561190000000001", region: "South America" },
} as const satisfies Record<GameId, { gameId: GameId; handle: string; region: string }>;

const FORCED_FAILURE = "fallo forzado de la prueba";

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

function objectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

interface Scenario {
  ana: SignedUp;
  beto: SignedUp;
  anaAccounts: Record<GameId, string>; // id de cada cuenta de Ana
  betoAccount: string;
}

// Ana con una cuenta por juego, disponibilidad guardada, y Beto con una cuenta de LoL.
async function scenario(t: TestContext): Promise<Scenario> {
  fixClock(t);
  const ana = await signUp(app, ANA);
  const beto = await signUp(app, BETO);
  const put = await withSession(ana.agent.put("/api/users/me/availability"), ana.csrf).send({
    blocks: ["2-20", "4-21"],
  });
  assert.strictEqual(put.status, 200);
  const anaAccounts = {
    lol: await linkOk(ana, LINKS.lol),
    r6: await linkOk(ana, LINKS.r6),
    cs2: await linkOk(ana, LINKS.cs2),
  };
  const betoAccount = await linkOk(beto, LINKS.lol);
  return { ana, beto, anaAccounts, betoAccount };
}

// Documento crudo del usuario (perfil y disponibilidad incluidos).
function rawUser(id: string) {
  return User.collection.findOne({ _id: objectId(id) });
}

function accountsOf(userId: string) {
  return GameAccount.find({ user: userId }).sort({ _id: 1 }).lean();
}

// Sustituye un método estático por uno que registra la llamada y delega en el original.
type Recorded = { name: string }[];

// `GameAccount.deleteMany` y `User.deleteOne` con comportamiento por llamada. `behavior`
// recibe el número de llamada (desde 1) y decide qué hacer; `original` ejecuta el real.
interface Hooks {
  deleteMany?: (call: number, original: (...args: unknown[]) => Promise<unknown>, args: unknown[]) => Promise<unknown>;
  deleteOne?: (call: number, original: (...args: unknown[]) => Promise<unknown>, args: unknown[]) => Promise<unknown>;
}

interface CascadeProbe {
  order: Recorded;
  many: () => number;
  one: () => number;
  restore: () => void; // vuelve a la cascada real (`t.mock` no se restaura con `mock.restoreAll`)
}

function hookCascade(t: TestContext, hooks: Hooks): CascadeProbe {
  const order: Recorded = [];
  let manyCalls = 0;
  let oneCalls = 0;
  const realMany = GameAccount.deleteMany.bind(GameAccount);
  const realOne = User.deleteOne.bind(User);
  const callMany = async (...args: unknown[]): Promise<unknown> => {
    const result: unknown = await Reflect.apply(realMany, GameAccount, args);
    return result;
  };
  const callOne = async (...args: unknown[]): Promise<unknown> => {
    const result: unknown = await Reflect.apply(realOne, User, args);
    return result;
  };
  const manyMock = t.mock.method(GameAccount, "deleteMany", async (...args: unknown[]) => {
    manyCalls += 1;
    order.push({ name: "GameAccount.deleteMany" });
    return hooks.deleteMany === undefined ? callMany(...args) : hooks.deleteMany(manyCalls, callMany, args);
  });
  const oneMock = t.mock.method(User, "deleteOne", async (...args: unknown[]) => {
    oneCalls += 1;
    order.push({ name: "User.deleteOne" });
    return hooks.deleteOne === undefined ? callOne(...args) : hooks.deleteOne(oneCalls, callOne, args);
  });
  return {
    order,
    many: () => manyCalls,
    one: () => oneCalls,
    restore: () => {
      manyMock.mock.restore();
      oneMock.mock.restore();
    },
  };
}

// Un 500 sin cookie de sesión borrada (la sesión sigue sirviendo para repetir la eliminación).
function assertServerError(response: Response): void {
  assert.strictEqual(response.status, 500);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.strictEqual(typeof Reflect.get(response.body as object, "error"), "string");
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

// Estado (2): ni usuario ni cuentas suyas; la credencial responde 401 "token inválido" (RF-44).
async function assertState2(s: Scenario): Promise<void> {
  assert.strictEqual(await rawUser(s.ana.id), null);
  assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 0);
  const stale = await rawCookieRequest(app, "get", "/api/accounts", s.ana.cookie, s.ana.csrf);
  assert.strictEqual(stale.status, 401);
  assert.deepStrictEqual(stale.body, { error: "token inválido" });
  await assertOthersIntact(s);
}

// Las cuentas y el usuario de Beto no se tocan nunca.
async function assertOthersIntact(s: Scenario): Promise<void> {
  assert.ok(await rawUser(s.beto.id), "Beto debe seguir existiendo");
  const betoAccounts = await accountsOf(s.beto.id);
  assert.deepStrictEqual(
    betoAccounts.map((account) => account._id.toString()),
    [s.betoAccount],
  );
}

interface Snapshot {
  user: unknown;
  accounts: Awaited<ReturnType<typeof rawAccountsInDb>>;
}

async function snapshot(s: Scenario): Promise<Snapshot> {
  return { user: await rawUser(s.ana.id), accounts: await rawAccountsInDb() };
}

// Estado (1): el usuario sigue con perfil y disponibilidad intactos, con exactamente las
// cuentas de `games` (completas, idénticas a antes) y su sesión sigue valiendo.
async function assertState1(s: Scenario, before: Snapshot, games: readonly GameId[]): Promise<void> {
  assert.deepStrictEqual(await rawUser(s.ana.id), before.user);
  const remaining = await accountsOf(s.ana.id);
  assert.deepStrictEqual(
    remaining.map((account) => account.gameId).sort(),
    [...games].sort(),
  );
  const expected = before.accounts.filter((account) => account.user.toString() === s.ana.id && games.includes(account.gameId));
  assert.deepStrictEqual(
    remaining.map((account) => String(account._id)).sort(),
    expected.map((account) => String(account._id)).sort(),
  );
  for (const account of remaining) {
    const original = expected.find((candidate) => String(candidate._id) === String(account._id));
    assert.deepStrictEqual(account, original, "las cuentas que quedan están completas, sin cambios");
  }
  await assertOthersIntact(s);
}

// Estado (1) operable: la sesión vale; las cuentas que quedan se obtienen, editan,
// resincronizan y desvinculan; repetir la eliminación → 204 sin usuario ni cuentas suyas.
async function assertState1Operable(s: Scenario, games: readonly GameId[], restore: () => void): Promise<void> {
  const ids = games.map((game) => s.anaAccounts[game]);
  for (const game of games) {
    const id = s.anaAccounts[game];
    const got = await withSession(s.ana.agent.get(`/api/accounts/${id}`), s.ana.csrf);
    assert.strictEqual(got.status, 200);
    const edited = await edit(s.ana, id, { region: LINKS[game].region });
    assert.strictEqual(edited.status, 200);
    const synced = await sync(s.ana, id);
    assert.strictEqual(synced.status, 200);
  }
  const first = ids[0];
  if (first !== undefined) {
    assert.strictEqual((await unlink(s.ana, first)).status, 204);
    const gone = await withSession(s.ana.agent.get(`/api/accounts/${first}`), s.ana.csrf);
    assert.strictEqual(gone.status, 404);
  }
  restore(); // la repetición usa la cascada real
  assertCookieCleared(await deleteMe(s.ana));
  assert.strictEqual(await rawUser(s.ana.id), null);
  assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 0);
  await assertOthersIntact(s);
}

describe("eliminación feliz (RF-14, RF-44)", () => {
  test("DELETE /api/users/me → 204, sin usuario ni cuentas suyas, las de otro intactas y cookie borrada", async (t) => {
    const s = await scenario(t);
    const response = await deleteMe(s.ana);
    assertCookieCleared(response);
    assert.strictEqual(await rawUser(s.ana.id), null);
    assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 0);
    assert.strictEqual(await GameAccount.countDocuments({}), 1);
    await assertOthersIntact(s);
  });

  test("GET /api/accounts sin filtro no muestra ninguna cuenta sin dueño tras la eliminación", async (t) => {
    const s = await scenario(t);
    assert.strictEqual((await deleteMe(s.ana)).status, 204);
    const list = await withSession(s.beto.agent.get("/api/accounts"), s.beto.csrf);
    assert.strictEqual(list.status, 200);
    const owners = (list.body as { userId: string }[]).map((account) => account.userId);
    assert.deepStrictEqual(owners, [s.beto.id]);
    assert.ok(!owners.includes(s.ana.id));
  });

  test("la credencial del usuario eliminado responde 401 \"token inválido\" (RF-44)", async (t) => {
    const s = await scenario(t);
    assert.strictEqual((await deleteMe(s.ana)).status, 204);
    for (const [method, path] of [
      ["get", "/api/accounts"],
      ["get", `/api/accounts/${s.anaAccounts.lol}`],
      ["get", "/api/users/me/games/lol"],
    ] as const) {
      const response = await rawCookieRequest(app, method, path, s.ana.cookie, s.ana.csrf);
      assert.strictEqual(response.status, 401, path);
      assert.deepStrictEqual(response.body, { error: "token inválido" }, path);
    }
    assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 0);
  });

  test("orden observable C1 → C2 → C3: deleteMany, deleteOne, deleteMany", async (t) => {
    const s = await scenario(t);
    const calls = hookCascade(t, {});
    assertCookieCleared(await deleteMe(s.ana));
    assert.deepStrictEqual(
      calls.order.map((call) => call.name),
      ["GameAccount.deleteMany", "User.deleteOne", "GameAccount.deleteMany"],
    );
  });
});

describe("fallos forzados de la cascada (RF-14, DP-42): solo los estados (1) y (2)", () => {
  test("(1) la 1.ª deleteMany lanza sin borrar → 500, estado (1) con las tres cuentas", async (t) => {
    const s = await scenario(t);
    const before = await snapshot(s);
    const calls = hookCascade(t, {
      deleteMany: async (call, original, args) => {
        if (call === 1) throw new Error(FORCED_FAILURE);
        return original(...args);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(calls.many(), 1); // ni usuario ni barrido tras el fallo de C1
    assert.strictEqual(calls.one(), 0);
    await assertState1(s, before, ["lol", "r6", "cs2"]);
    await assertState1Operable(s, ["lol", "r6", "cs2"], calls.restore);
  });

  test("(2) la 1.ª deleteMany borra una cuenta con el driver y lanza → 500, estado (1) con dos completas; volver a vincular ese juego → 201", async (t) => {
    const s = await scenario(t);
    const before = await snapshot(s);
    const calls = hookCascade(t, {
      deleteMany: async (call, original, args) => {
        if (call === 1) {
          await GameAccount.collection.deleteOne({ user: objectId(s.ana.id), gameId: "lol" });
          throw new Error(FORCED_FAILURE);
        }
        return original(...args);
      },
    });
    assertServerError(await deleteMe(s.ana));
    await assertState1(s, before, ["r6", "cs2"]);
    const relinked = await link(s.ana, LINKS.lol);
    assert.strictEqual(relinked.status, 201);
    assert.strictEqual(await GameAccount.countDocuments({ user: s.ana.id }), 3);
    assert.strictEqual((await unlink(s.ana, (relinked.body as { id: string }).id)).status, 204);
    await assertState1Operable(s, ["r6", "cs2"], calls.restore);
  });

  test("(3) User.deleteOne lanza sin borrar → 500, el barrido corre y queda el estado (1) sin cuentas", async (t) => {
    const s = await scenario(t);
    const before = await snapshot(s);
    const calls = hookCascade(t, {
      deleteOne: async () => {
        throw new Error(FORCED_FAILURE);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(calls.many(), 2); // C1 y el barrido C3 del `finally`
    assert.strictEqual(calls.one(), 1);
    await assertState1(s, before, []);
    await assertState1Operable(s, [], calls.restore);
  });

  test("(4) User.deleteOne borra el usuario con el driver y lanza → 500, estado (2) y credencial 401 \"token inválido\"", async (t) => {
    const s = await scenario(t);
    const calls = hookCascade(t, {
      deleteOne: async () => {
        await User.collection.deleteOne({ _id: objectId(s.ana.id) });
        throw new Error(FORCED_FAILURE);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(calls.many(), 2); // el barrido corre también si C2 lanza
    await assertState2(s);
  });

  test("(5) la 2.ª deleteMany (el barrido) lanza tras borrar el usuario → 500, estado (2)", async (t) => {
    const s = await scenario(t);
    const calls = hookCascade(t, {
      deleteMany: async (call, original, args) => {
        if (call === 2) throw new Error(FORCED_FAILURE);
        return original(...args);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assert.strictEqual(calls.many(), 2);
    assert.strictEqual(calls.one(), 1);
    await assertState2(s);
  });

  test("tras un 500 en el estado (1), repetir DELETE /api/users/me con la misma sesión → 204 y estado (2)", async (t) => {
    const s = await scenario(t);
    hookCascade(t, {
      deleteOne: async (call, original, args) => {
        if (call === 1) throw new Error(FORCED_FAILURE);
        return original(...args);
      },
    });
    assertServerError(await deleteMe(s.ana));
    assertCookieCleared(await deleteMe(s.ana)); // segunda eliminación: la cascada real
    await assertState2(s);
  });
});

describe("vinculación simultánea a la eliminación (RF-47, RF-14)", () => {
  test("(a) una vinculación completa entre C1 y C2 (201) y eliminación en 204 → ni usuario ni cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    let linked = 0;
    let accountsAtDeleteOne = -1;
    hookCascade(t, {
      deleteOne: async (_call, original, args) => {
        linked = (await link(ana, LINKS.r6)).status;
        accountsAtDeleteOne = await GameAccount.countDocuments({ user: ana.id });
        return original(...args);
      },
    });
    assertCookieCleared(await deleteMe(ana));
    assert.strictEqual(linked, 201);
    assert.strictEqual(accountsAtDeleteOne, 1); // la de LoL ya la borró C1; queda solo la nueva
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 0);
    assert.strictEqual(await User.exists({ _id: ana.id }), null);
  });

  test("(b) la sustitución de User.deleteOne lanza tras delegar → 500, ni usuario ni cuenta (estado 2)", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    await linkOk(ana, LINKS.lol);
    let linked = 0;
    let accountsAtDeleteOne = -1;
    hookCascade(t, {
      deleteOne: async (_call, original, args) => {
        linked = (await link(ana, LINKS.r6)).status;
        accountsAtDeleteOne = await GameAccount.countDocuments({ user: ana.id });
        await original(...args);
        throw new Error(FORCED_FAILURE);
      },
    });
    assertServerError(await deleteMe(ana));
    assert.strictEqual(linked, 201);
    assert.strictEqual(accountsAtDeleteOne, 1);
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 0);
    assert.strictEqual(await User.exists({ _id: ana.id }), null);
  });

  test("una vinculación posterior al borrado del usuario → 404 \"usuario no encontrado\" y ninguna cuenta", async (t) => {
    fixClock(t);
    const ana = await signUp(app, ANA);
    const original = GameAccount.create.bind(GameAccount);
    // La vinculación llega a crear la cuenta justo después de que la cascada terminó.
    t.mock.method(GameAccount, "create", async (...args: unknown[]) => {
      const deleted = await withSession(ana.agent.delete("/api/users/me"), ana.csrf);
      assert.strictEqual(deleted.status, 204);
      const result: unknown = await Reflect.apply(original, GameAccount, args);
      return result;
    });
    const response = await link(ana, LINKS.lol);
    assert.strictEqual(response.status, 404);
    assert.deepStrictEqual(response.body, { error: "usuario no encontrado" });
    assert.strictEqual(await GameAccount.countDocuments({ user: ana.id }), 0);
    assert.strictEqual(await User.exists({ _id: ana.id }), null);
  });
});
