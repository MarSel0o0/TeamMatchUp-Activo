import { afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import {
  BCRYPT_COST,
  MAX_PASSWORD_BYTES,
  hashPassword,
  passwordByteLength,
  verifyPassword,
} from "../../src/services/passwords.ts";

// 36 "ñ" ocupan 72 bytes en UTF-8 (2 bytes cada una).
const PASSWORD_72_BYTES = "ñ".repeat(36);

afterEach(() => {
  mock.restoreAll();
});

describe("constantes", () => {
  test("costo 10 y máximo de 72 bytes", () => {
    assert.equal(BCRYPT_COST, 10);
    assert.equal(MAX_PASSWORD_BYTES, 72);
  });
});

describe("passwordByteLength", () => {
  test("cuenta bytes UTF-8, no caracteres", () => {
    assert.equal(passwordByteLength(""), 0);
    assert.equal(passwordByteLength("abc"), 3);
    assert.equal(passwordByteLength(PASSWORD_72_BYTES), 72);
    assert.equal(passwordByteLength(PASSWORD_72_BYTES + "a"), 73);
    assert.equal(passwordByteLength("😀".repeat(18)), 72);
  });

  test("no recorta los espacios", () => {
    assert.equal(passwordByteLength("        "), 8);
  });
});

describe("hashPassword (RF-2, RNF-5)", () => {
  test("el hash no es la contraseña y usa bcrypt $2b$ con costo 10", async () => {
    const hash = await hashPassword("contraseña-segura");
    assert.notEqual(hash, "contraseña-segura");
    assert.ok(hash.startsWith("$2b$10$"), hash);
  });

  test("dos hashes de la misma contraseña son distintos (sal)", async () => {
    const first = await hashPassword("misma-clave");
    const second = await hashPassword("misma-clave");
    assert.notEqual(first, second);
  });
});

describe("verifyPassword (RF-9)", () => {
  test("contraseña correcta → true; incorrecta → false", async () => {
    const hash = await hashPassword("clave-correcta");
    assert.equal(await verifyPassword("clave-correcta", hash), true);
    assert.equal(await verifyPassword("clave-incorrecta", hash), false);
  });

  test("contraseña de espacios: se compara sin recortar", async () => {
    const hash = await hashPassword("        ");
    assert.equal(await verifyPassword("        ", hash), true);
    assert.equal(await verifyPassword("       ", hash), false);
  });

  test("72 bytes exactos → se acepta", async () => {
    const hash = await hashPassword(PASSWORD_72_BYTES);
    assert.equal(await verifyPassword(PASSWORD_72_BYTES, hash), true);
  });

  test("72 bytes + 'a' → false, aunque bcrypt.compare a secas la aceptaría", async () => {
    const hash = await hashPassword(PASSWORD_72_BYTES);
    const longer = PASSWORD_72_BYTES + "a";
    // bcrypt ignora lo que pasa de 72 bytes: por eso hay que rechazarla antes.
    assert.equal(await bcrypt.compare(longer, hash), true);
    assert.equal(await verifyPassword(longer, hash), false);
  });

  test("más de 72 bytes → bcrypt.compare no se llama", async () => {
    const hash = await hashPassword("clave-cualquiera");
    const compare = mock.method(bcrypt, "compare");
    assert.equal(await verifyPassword(PASSWORD_72_BYTES + "a", hash), false);
    assert.equal(compare.mock.callCount(), 0);
  });

  test("hasta 72 bytes → bcrypt.compare sí se llama", async () => {
    const hash = await hashPassword("clave-cualquiera");
    const compare = mock.method(bcrypt, "compare");
    assert.equal(await verifyPassword("clave-cualquiera", hash), true);
    assert.equal(compare.mock.callCount(), 1);
  });
});
