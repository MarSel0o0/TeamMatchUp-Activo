// Pruebas de los datos únicos (spec 018, RF-11, Definiciones «Título único»; plan §3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_CODES, TITLE_ROLES, uniqueData } from "./uniqueData.ts";

const token = "0a1b2c3d4e5f";

// Reglas de las specs 002/004/006, copiadas aquí (la suite no importa código del servidor, RF-1).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,24}$/;
const R6_HANDLE_PATTERN = /^[A-Za-z0-9._-]{3,20}$/;

test("formatos de correo, usuario, contraseña e identificador R6", () => {
  const data = uniqueData(token);
  assert.equal(data.email, "e2e-0a1b2c3d4e5f@example.com");
  assert.equal(data.username, "e2e_0a1b2c3d4e5f");
  assert.equal(data.username.length, 16);
  assert.equal(data.password, "contrasena-e2e-ficticia");
  assert.equal(data.r6Handle, "e2e0a1b2c3d4e5f");
});

test("los datos cumplen las reglas del registro y de R6", () => {
  const data = uniqueData(token);
  assert.match(data.email, EMAIL_PATTERN);
  assert.ok(data.email.length <= 254);
  assert.match(data.username, USERNAME_PATTERN);
  assert.ok(data.password.length >= 8);
  assert.ok(Buffer.byteLength(data.password, "utf8") <= 72);
  assert.match(data.r6Handle, R6_HANDLE_PATTERN);
});

test("título único = «E2E <código> <rol> <token>», entre 3 y 60 caracteres", () => {
  const data = uniqueData(token);
  assert.equal(data.title("C2", "original"), "E2E C2 original 0a1b2c3d4e5f");
  for (const code of SCENARIO_CODES) {
    for (const role of TITLE_ROLES) {
      const title = data.title(code, role);
      assert.ok(title.length >= 3 && title.length <= 60, title);
    }
  }
});

test("ningún título único contiene a otro (mismo token, otros tokens)", () => {
  const titles = ["0a1b2c3d4e5f", "0a1b2c3d4e50", "ffffffffffff", "000000000000"].flatMap((t) => {
    const data = uniqueData(t);
    return SCENARIO_CODES.flatMap((code) => TITLE_ROLES.map((role) => data.title(code, role)));
  });
  assert.equal(new Set(titles).size, titles.length);
  for (const a of titles) {
    for (const b of titles) {
      if (a !== b) assert.equal(a.includes(b), false, `«${a}» contiene «${b}»`);
    }
  }
});

test("ningún rol es prefijo de otro", () => {
  for (const a of TITLE_ROLES) {
    for (const b of TITLE_ROLES) {
      if (a !== b) assert.equal(a.startsWith(b), false);
    }
  }
});

test("tokens distintos dan correo, usuario e identificador distintos", () => {
  const a = uniqueData("0a1b2c3d4e5f");
  const b = uniqueData("0a1b2c3d4e50");
  assert.notEqual(a.email, b.email);
  assert.notEqual(a.username, b.username);
  assert.notEqual(a.r6Handle, b.r6Handle);
});

for (const bad of ["", "0a1b2c3d4e5", "0a1b2c3d4e5f0", "0A1B2C3D4E5F", "0a1b2c3d4e5g", "0a1b-c3d4e5f"]) {
  test(`token ${JSON.stringify(bad)} se rechaza`, () => {
    assert.throws(() => uniqueData(bad), /token/);
  });
}
