// Spec 010 (RF-6): todas las colecciones del proyecto llevan el prefijo `tmu_`, para convivir
// con otros grupos en la base compartida `fullstack` del servidor del curso.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { COLLECTION_PREFIX } from "../../src/models/collections.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { PlaySession } from "../../src/models/playSession.ts";
import { User } from "../../src/models/user.ts";

describe("nombres de colección (spec 010, RF-6)", () => {
  test("cada modelo usa su colección con prefijo", () => {
    assert.strictEqual(User.collection.collectionName, "tmu_users");
    assert.strictEqual(GameAccount.collection.collectionName, "tmu_gameaccounts");
    assert.strictEqual(PlaySession.collection.collectionName, "tmu_playsessions");
  });

  test("ningún modelo registrado queda sin prefijo", () => {
    for (const name of mongoose.modelNames()) {
      const collection = mongoose.model(name).collection.collectionName;
      assert.ok(collection.startsWith(COLLECTION_PREFIX), `${name} usa ${collection}`);
    }
  });
});
