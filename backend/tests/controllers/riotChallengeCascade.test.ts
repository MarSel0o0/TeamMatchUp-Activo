// Eliminar el usuario borra sus desafíos de verificación con Riot (spec 014, T4).
// RF-29; plan, §§2.2 y 3.1 (paso C6 tras C5 en la cascada de `DELETE /api/users/:id`).
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { RiotChallenge } from "../../src/models/riotChallenge.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import {
  cancelChallenge,
  completeChallenge,
  createChallengeAndCancelPrevious,
} from "../../src/services/riotChallenges.ts";
import { testConfig } from "../server/helpers.ts";
import { authApp, closeTestServers, deleteMe, signUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date("2026-11-19T12:00:00.000Z");

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
  await SteamAttempt.init();
  await RiotChallenge.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await SteamAttempt.deleteMany({});
  await RiotChallenge.deleteMany({});
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await closeTestServers();
  await RiotChallenge.deleteMany({});
  await mongoose.disconnect();
});

describe("DELETE /api/users/me con desafíos de verificación con Riot (RF-29, paso C6)", () => {
  test("borra todos los desafíos del usuario eliminado (abiertos, anulados y completados)", async () => {
    const ana = await signUp(app, ANA);

    const ch1 = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: "puuid-ana-1",
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 1,
      now: NOW,
    });
    await cancelChallenge(ch1._id.toString(), new Date(NOW.getTime() + 60_000));

    const ch2 = await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: "puuid-ana-1",
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 2,
      now: new Date(NOW.getTime() + 2 * 60_000),
    });
    await completeChallenge(ch2._id.toString(), ana.id, new Date(NOW.getTime() + 3 * 60_000));

    await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: "puuid-ana-1",
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 3,
      now: new Date(NOW.getTime() + 4 * 60_000),
    });

    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 3);

    const response = await deleteMe(ana);
    assert.equal(response.status, 204);
    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 0);
  });

  test("los desafíos de otro usuario no se tocan", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);

    await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: "puuid-ana-1",
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 4,
      now: NOW,
    });
    const betoChallenge = await createChallengeAndCancelPrevious({
      userId: beto.id,
      puuid: "puuid-beto-1",
      riotId: "Beto#LAS",
      region: "LAS",
      iconId: 5,
      now: NOW,
    });

    assert.equal((await deleteMe(ana)).status, 204);

    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 0);
    assert.equal(await RiotChallenge.countDocuments({ user: beto.id }), 1);
    const remaining = await RiotChallenge.findById(betoChallenge._id);
    assert.equal(remaining?.status, "open");
  });

  test("un usuario sin desafíos de Riot se elimina normalmente", async () => {
    const ana = await signUp(app, ANA);
    assert.equal((await deleteMe(ana)).status, 204);
    assert.equal(await RiotChallenge.countDocuments({}), 0);
  });

  test("C6 corre después de C5 (SteamAttempt) y no borra desafíos si falla C2 (User.deleteOne)", async (t) => {
    const ana = await signUp(app, ANA);
    await createChallengeAndCancelPrevious({
      userId: ana.id,
      puuid: "puuid-ana-1",
      riotId: "Ana#LAS",
      region: "LAS",
      iconId: 6,
      now: NOW,
    });

    // 1. Si C2 falla, C6 no corre y el desafío del usuario sigue intacto.
    const deleteOneMock = t.mock.method(User, "deleteOne", async () => {
      throw new Error("fallo forzado en C2");
    });
    const failed = await deleteMe(ana);
    assert.equal(failed.status, 500);
    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 1);
    deleteOneMock.mock.restore();

    // 2. En eliminación exitosa, C6 corre después de C5.
    const order: string[] = [];
    const realSteam = SteamAttempt.deleteMany.bind(SteamAttempt);
    const realRiot = RiotChallenge.deleteMany.bind(RiotChallenge);
    t.mock.method(SteamAttempt, "deleteMany", async (...args: unknown[]) => {
      order.push("C5:SteamAttempt");
      const result: unknown = await Reflect.apply(realSteam, SteamAttempt, args);
      return result;
    });
    t.mock.method(RiotChallenge, "deleteMany", async (...args: unknown[]) => {
      order.push("C6:RiotChallenge");
      const result: unknown = await Reflect.apply(realRiot, RiotChallenge, args);
      return result;
    });

    const ok = await deleteMe(ana);
    assert.equal(ok.status, 204);
    assert.deepEqual(order, ["C5:SteamAttempt", "C6:RiotChallenge"]);
    assert.equal(await RiotChallenge.countDocuments({ user: ana.id }), 0);
  });
});
