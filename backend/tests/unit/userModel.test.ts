// Modelo `User` sin base de datos (plan §2.5, §3.4, §6.2). RF-1, RNF-4.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { User, USER_DEFAULTS, toOwnUserJson } from "../../src/models/user.ts";

const PUBLIC_KEYS = ["avatarColor", "bio", "createdAt", "displayName", "id", "timezone", "username"];

function newUser() {
  return new User({
    email: "Ana@Example.COM",
    username: "  AnaGamer  ",
    usernameKey: "anagamer",
    passwordHash: "$2b$10$hashdeprueba",
    displayName: "Ana",
  });
}

describe("User: valores por defecto (RF-1)", () => {
  test("constantes de los valores por defecto", () => {
    assert.deepStrictEqual(USER_DEFAULTS, {
      avatarColor: "#6d5efc",
      bio: "",
      timezone: "America/Santiago",
    });
  });

  test("con solo los campos obligatorios aplica avatar, biografía y zona horaria", () => {
    const user = newUser();
    assert.strictEqual(user.avatarColor, "#6d5efc");
    assert.strictEqual(user.bio, "");
    assert.strictEqual(user.timezone, "America/Santiago");
  });

  test("el correo se guarda en minúsculas y el nombre de usuario recortado, sin cambiar mayúsculas", () => {
    const user = newUser();
    assert.strictEqual(user.email, "ana@example.com");
    assert.strictEqual(user.username, "AnaGamer");
    assert.strictEqual(user.usernameKey, "anagamer");
  });

  test("es válido con los campos obligatorios", async () => {
    await newUser().validate();
  });

  test("sin usernameKey no es válido", async () => {
    const user = newUser();
    user.set("usernameKey", undefined);
    await assert.rejects(user.validate());
  });
});

describe("User: índices únicos (RF-3, RF-7, RF-21)", () => {
  test("email y usernameKey son únicos; username no", () => {
    const unique = User.schema
      .indexes()
      .filter(([, options]) => options.unique === true)
      .map(([fields]) => Object.keys(fields).join(","))
      .sort();
    assert.deepStrictEqual(unique, ["email", "usernameKey"]);
  });

  test("solo createdAt, sin updatedAt", () => {
    assert.strictEqual(User.schema.path("updatedAt"), undefined);
    assert.ok(User.schema.path("createdAt"));
  });
});

describe("User: serialización (RNF-4)", () => {
  test("toJSON devuelve solo los datos públicos", () => {
    const user = newUser();
    user.set("createdAt", new Date("2026-01-02T03:04:05.000Z"));
    // El tipo de `toJSON()` de Mongoose no refleja el `transform`; se lee como datos sin tipo.
    const json: Record<string, unknown> = user.toJSON();
    assert.deepStrictEqual(Object.keys(json).sort(), PUBLIC_KEYS);
    assert.strictEqual(json.id, user._id.toString());
    assert.strictEqual(json.username, "AnaGamer");
    assert.strictEqual(json.displayName, "Ana");
    assert.ok(json.createdAt instanceof Date);
    const text = JSON.stringify(user);
    for (const hidden of ["passwordHash", "usernameKey", "email", "_id", "__v", "$2b$10$"]) {
      assert.ok(!text.includes(hidden), `toJSON no debe incluir ${hidden}`);
    }
  });

  test("toOwnUserJson añade el correo a los datos públicos", () => {
    const user = newUser();
    user.set("createdAt", new Date("2026-01-02T03:04:05.000Z"));
    const json = toOwnUserJson(user);
    assert.deepStrictEqual(Object.keys(json).sort(), [...PUBLIC_KEYS, "email"].sort());
    assert.strictEqual(json.email, "ana@example.com");
    assert.ok(!("passwordHash" in json));
    assert.ok(!("usernameKey" in json));
  });
});
