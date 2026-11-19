// Eliminar el usuario borra sus intentos de verificación con Steam (spec 013, T3).
// RF-26; plan, 4.5 (C5 tras C4 de la cascada de `DELETE /api/users/:id`).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { SteamAttempt } from "../../src/models/steamAttempt.ts";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { findAttempt, openAttempt } from "../../src/services/steamAttempts.ts";
import { testConfig } from "../server/helpers.ts";
import { authApp, closeTestServers, deleteMe, signUp } from "./helpers.ts";

const app = await authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const NOW = new Date("2026-11-18T12:00:00.000Z");

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
  await GameAccount.init();
  await SteamAttempt.init();
});

beforeEach(async () => {
  await User.deleteMany({});
  await GameAccount.deleteMany({});
  await SteamAttempt.deleteMany({});
});

after(async () => {
  await closeTestServers();
  await SteamAttempt.deleteMany({});
  await mongoose.disconnect();
});

describe("DELETE /api/users/me con un intento de Steam abierto (RF-26)", () => {
  test("el intento del usuario eliminado desaparece", async () => {
    const ana = await signUp(app, ANA);
    const { token } = await openAttempt(ana.id, NOW);
    assert.ok(await findAttempt(token));

    const response = await deleteMe(ana);
    assert.equal(response.status, 204);

    assert.equal(await findAttempt(token), null);
    assert.equal(await SteamAttempt.countDocuments({ user: ana.id }), 0);
  });

  test("el intento de otro usuario no se toca", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    await openAttempt(ana.id, NOW);
    const betos = await openAttempt(beto.id, NOW);

    assert.equal((await deleteMe(ana)).status, 204);

    assert.equal((await findAttempt(betos.token))?.userId, beto.id);
    assert.equal(await SteamAttempt.countDocuments({}), 1);
  });

  test("un usuario sin intento se elimina igual", async () => {
    const ana = await signUp(app, ANA);
    assert.equal((await deleteMe(ana)).status, 204);
    assert.equal(await SteamAttempt.countDocuments({}), 0);
  });
});
