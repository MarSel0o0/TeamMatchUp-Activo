// Autenticación contra la base de prueba (plan §3.3, §3.6–§3.8 y §6.2): `POST /api/auth/login`,
// `GET /api/auth/me` (con `withUser`) y `POST /api/auth/logout`.
// RF-7..RF-16, RF-18..RF-20, RF-22..RF-26, RNF-1, RNF-2, RNF-4, RNF-5.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { MESSAGES } from "../../src/services/credentials.ts";
import { CSRF_HEADER, SESSION_COOKIE } from "../../src/services/sessionToken.ts";
import { testConfig } from "../server/helpers.ts";
import {
  VALID_REGISTRATION,
  authApp,
  closeTestServers,
  forgeToken,
  loginAs,
  noneToken,
  parseSetCookie,
  registerUser,
  sessionSetCookie,
} from "./helpers.ts";
import type { ParsedSetCookie } from "./helpers.ts";

const app = await authApp();
const api = supertest(app);

const OWN_KEYS = ["avatarColor", "bio", "createdAt", "displayName", "email", "id", "timezone", "username"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EPOCH = new Date(0).toUTCString(); // "Thu, 01 Jan 1970 00:00:00 GMT"

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function login(body: unknown, target = api): supertest.Test {
  return target.post("/api/auth/login").send(body as object);
}

function credentials(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password, ...extra };
}

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

// Ni cookie ni comprobante en una respuesta de error.
function assertNoSession(response: Response): void {
  assert.strictEqual(response.headers["set-cookie"], undefined);
  assert.strictEqual(response.get(CSRF_HEADER), undefined);
}

function cookieOf(response: Response): ParsedSetCookie {
  const header = sessionSetCookie(response);
  assert.ok(header, "la respuesta no trae Set-Cookie de la sesión");
  return parseSetCookie(header);
}

async function snapshot(): Promise<unknown[]> {
  return User.find({}).sort({ _id: 1 }).lean();
}

describe("inicio de sesión correcto (RF-8, RNF-4)", () => {
  test("200 con los datos propios, sin hash, credencial ni comprobante en el cuerpo", async () => {
    const registered = await registerUser(app);
    const response = await login(credentials());
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.deepStrictEqual(Object.keys(response.body).sort(), OWN_KEYS);
    assert.deepStrictEqual(response.body, registered.body);
    assert.strictEqual(response.body.email, "ana@example.com");

    const csrf = response.get(CSRF_HEADER);
    const { value } = cookieOf(response);
    const text = JSON.stringify(response.body);
    assert.ok(!text.includes("passwordHash"));
    assert.ok(!text.includes("$2b$"));
    assert.ok(csrf && !text.includes(csrf), "el comprobante no va en el cuerpo");
    assert.ok(!text.includes(value), "la credencial no va en el cuerpo");
  });

  test("X-CSRF-Token presente y coincide con el comprobante de la credencial", async () => {
    const registered = await registerUser(app);
    const response = await login(credentials());
    const csrf = response.get(CSRF_HEADER);
    assert.ok(csrf);
    assert.match(csrf, UUID_PATTERN);

    const { name, value } = cookieOf(response);
    assert.strictEqual(name, SESSION_COOKIE);
    const payload = jwt.verify(value, testConfig().jwtSecret, { algorithms: ["HS256"] });
    assert.ok(typeof payload === "object");
    assert.strictEqual(payload["csrf"], csrf);
    assert.strictEqual(payload["id"], registered.body.id);
    assert.strictEqual(payload["username"], "Ana");
    assert.strictEqual(payload["exp"], (payload["iat"] ?? 0) + 3600);
    assert.deepStrictEqual(Object.keys(payload).sort(), ["csrf", "exp", "iat", "id", "username"]);
  });

  test("la credencial usa el reloj inyectado (iat = now())", async () => {
    await registerUser(app);
    const fixed = 1_800_000_000;
    const response = await login(credentials(), supertest(await authApp({ now: () => fixed })));
    const payload = jwt.decode(cookieOf(response).value);
    assert.ok(payload !== null && typeof payload === "object");
    assert.strictEqual(payload["iat"], fixed);
    assert.strictEqual(payload["exp"], fixed + 3600);
  });

  test("cookie HttpOnly, SameSite=Strict, Path=/, sin Max-Age, Expires ni Secure (RNF-1, RNF-2)", async () => {
    await registerUser(app);
    const { attributes } = cookieOf(await login(credentials()));
    assert.strictEqual(attributes.get("httponly"), "");
    assert.strictEqual(attributes.get("samesite"), "Strict");
    assert.strictEqual(attributes.get("path"), "/");
    assert.ok(!attributes.has("max-age"));
    assert.ok(!attributes.has("expires"));
    assert.ok(!attributes.has("domain"));
    assert.ok(!attributes.has("secure"), "en prueba la cookie no es Secure");
  });

  test("en producción la cookie lleva Secure (RNF-2)", async () => {
    await registerUser(app);
    const production = supertest(await authApp({ nodeEnv: "production" }));
    const { attributes } = cookieOf(await login(credentials(), production));
    assert.strictEqual(attributes.get("secure"), "");
    assert.strictEqual(attributes.get("httponly"), "");
    assert.strictEqual(attributes.get("samesite"), "Strict");
    assert.strictEqual(attributes.get("path"), "/");
    assert.ok(!attributes.has("max-age"));
    assert.ok(!attributes.has("expires"));
  });

  test("RF-7: correo con mayúsculas y espacios inicia sesión", async () => {
    await registerUser(app);
    const response = await login(credentials({ email: "  ANA@Example.COM " }));
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.email, "ana@example.com");
  });

  test("RF-7: correo con mayúsculas en la parte local y letras internacionales", async () => {
    await registerUser(app, { email: "  JOSÉ@Dominio.CL " });
    const response = await login(credentials({ email: "José@dominio.cl" }));
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.email, "josé@dominio.cl");
  });

  test("RF-16: los campos extra no cambian nada", async () => {
    const registered = await registerUser(app);
    const response = await login(
      credentials({ id: "000000000000000000000000", username: "otro", displayName: "X", passwordHash: "x" }),
    );
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, registered.body);
  });

  test("RF-25: un segundo inicio de sesión entrega credencial y comprobante nuevos", async () => {
    await registerUser(app);
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const first = await loginAs(app, VALID_REGISTRATION.email, VALID_REGISTRATION.password);

    const same = await login(credentials(), first.agent);
    assert.strictEqual(same.status, 200);
    const sameCsrf = same.get(CSRF_HEADER);
    const sameCookie = cookieOf(same).value;
    assert.ok(sameCsrf && sameCsrf !== first.csrf);
    assert.notStrictEqual(sameCookie, first.cookie);

    const other = await login(credentials({ email: "beto@example.com" }), first.agent);
    assert.strictEqual(other.status, 200);
    assert.strictEqual(other.body.username, "Beto");
    const otherCsrf = other.get(CSRF_HEADER);
    assert.ok(otherCsrf && otherCsrf !== sameCsrf);
    const payload = jwt.decode(cookieOf(other).value);
    assert.ok(payload !== null && typeof payload === "object");
    assert.strictEqual(payload["csrf"], otherCsrf);
    assert.strictEqual(payload["username"], "Beto");
  });
});

describe("credenciales incorrectas (RF-9)", () => {
  test("correo inexistente y contraseña incorrecta dan el mismo 401", async () => {
    await registerUser(app);
    const unknown = await login(credentials({ email: "nadie@example.com" }));
    const wrong = await login(credentials({ password: "otra-contraseña" }));
    assertStatusError(unknown, 401, MESSAGES.badCredentials);
    assertStatusError(wrong, 401, MESSAGES.badCredentials);
    assert.deepStrictEqual(unknown.body, wrong.body);
    assertNoSession(unknown);
    assertNoSession(wrong);
  });

  test("el mensaje es exactamente «correo o contraseña incorrectos»", async () => {
    const response = await login(credentials());
    assertStatusError(response, 401, "correo o contraseña incorrectos");
  });

  test("contraseña de 72 bytes más un carácter: 401", async () => {
    const password = "ñ".repeat(36); // 72 bytes
    await registerUser(app, { password });
    assert.strictEqual((await login(credentials({ password }))).status, 200);
    const response = await login(credentials({ password: `${password}a` }));
    assertStatusError(response, 401, MESSAGES.badCredentials);
    assertNoSession(response);
  });

  test("contraseña solo de espacios incorrecta: 401 (no es ausente)", async () => {
    await registerUser(app);
    assertStatusError(await login(credentials({ password: "        " })), 401, MESSAGES.badCredentials);
    assertStatusError(await login(credentials({ password: " " })), 401, MESSAGES.badCredentials);
  });

  test("contraseña de espacios correcta: 200", async () => {
    const password = "        ";
    await registerUser(app, { password });
    assert.strictEqual((await login(credentials({ password }))).status, 200);
  });

  test("correo de formato inválido o de más de 254 caracteres: 401", async () => {
    await registerUser(app);
    for (const email of ["sin-arroba", "ana@", "a b@example.com", `${"a".repeat(300)}@example.com`]) {
      const response = await login(credentials({ email }));
      assertStatusError(response, 401, MESSAGES.badCredentials);
    }
  });
});

describe("campos ausentes o de otro tipo (RF-18, RF-19)", () => {
  const cases: ReadonlyArray<readonly [string, unknown, string]> = [
    ["sin correo", { password: "contraseña-segura" }, MESSAGES.emailMissing],
    ["sin contraseña", { email: "ana@example.com" }, MESSAGES.passwordMissing],
    ["sin ambos", {}, MESSAGES.emailMissing],
    ["correo vacío", { email: "", password: "x" }, MESSAGES.emailMissing],
    ["correo null", { email: null, password: "x" }, MESSAGES.emailMissing],
    ["correo de espacios", { email: "   ", password: "x" }, MESSAGES.emailMissing],
    ["contraseña vacía", { email: "ana@example.com", password: "" }, MESSAGES.passwordMissing],
    ["contraseña null", { email: "ana@example.com", password: null }, MESSAGES.passwordMissing],
    ["ambos vacíos", { email: "", password: "" }, MESSAGES.emailMissing],
    ["correo objeto $ne", { email: { $ne: null }, password: "x" }, MESSAGES.emailType],
    ["correo número", { email: 5, password: "x" }, MESSAGES.emailType],
    ["correo booleano", { email: true, password: "x" }, MESSAGES.emailType],
    ["correo arreglo", { email: ["ana@example.com"], password: "x" }, MESSAGES.emailType],
    ["contraseña objeto", { email: "ana@example.com", password: { $ne: null } }, MESSAGES.passwordType],
    ["contraseña número", { email: "ana@example.com", password: 12345678 }, MESSAGES.passwordType],
    ["contraseña arreglo", { email: "ana@example.com", password: ["x"] }, MESSAGES.passwordType],
  ];

  for (const [name, body, message] of cases) {
    test(`${name}: 400 «${message}» sin consultar usuarios`, async () => {
      await registerUser(app);
      const findOne = mock.method(User, "findOne");
      const response = await login(body);
      assertStatusError(response, 400, message);
      assertNoSession(response);
      assert.strictEqual(findOne.mock.callCount(), 0);
    });
  }

  test("tipo de contenido distinto de JSON: 400 «falta el correo»", async () => {
    await registerUser(app);
    const findOne = mock.method(User, "findOne");
    const response = await api
      .post("/api/auth/login")
      .set("Content-Type", "text/plain")
      .send(`email=${VALID_REGISTRATION.email}&password=${VALID_REGISTRATION.password}`);
    assertStatusError(response, 400, MESSAGES.emailMissing);
    assert.strictEqual(findOne.mock.callCount(), 0);
  });

  test("sin cuerpo: 400 «falta el correo»", async () => {
    const response = await api.post("/api/auth/login");
    assertStatusError(response, 400, MESSAGES.emailMissing);
  });
});

describe("el inicio de sesión no tiene estado en la base (RNF-5)", () => {
  test("ni crea ni modifica documentos", async () => {
    await registerUser(app);
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const before = await snapshot();
    assert.strictEqual((await login(credentials())).status, 200);
    await login(credentials({ password: "otra-contraseña" }));
    await login(credentials({ email: "nadie@example.com" }));
    assert.deepStrictEqual(await snapshot(), before);
  });
});

describe("cierre de sesión (RF-14, RF-26, RNF-2)", () => {
  function assertLogout(response: Response): ParsedSetCookie {
    assert.strictEqual(response.status, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.deepStrictEqual(response.body, { message: "sesión cerrada" });
    const cleared = cookieOf(response);
    assert.strictEqual(cleared.name, SESSION_COOKIE);
    assert.strictEqual(cleared.value, "");
    assert.strictEqual(cleared.attributes.get("expires"), EPOCH);
    assert.strictEqual(cleared.attributes.get("path"), "/");
    assert.strictEqual(cleared.attributes.get("httponly"), "");
    assert.strictEqual(cleared.attributes.get("samesite"), "Strict");
    assert.ok(!cleared.attributes.has("max-age"));
    return cleared;
  }

  test("sin sesión: 200 y borrado de la cookie (sin Secure en prueba)", async () => {
    const cleared = assertLogout(await api.post("/api/auth/logout"));
    assert.ok(!cleared.attributes.has("secure"));
  });

  test("con la sesión iniciada por el agente", async () => {
    await registerUser(app);
    const { agent } = await loginAs(app, VALID_REGISTRATION.email, VALID_REGISTRATION.password);
    assertLogout(await agent.post("/api/auth/logout"));
  });

  test("con credencial alterada y sin X-CSRF-Token", async () => {
    await registerUser(app);
    const { cookie } = await loginAs(app, VALID_REGISTRATION.email, VALID_REGISTRATION.password);
    const altered = `${cookie.slice(0, -1)}${cookie.endsWith("A") ? "B" : "A"}`;
    assertLogout(await api.post("/api/auth/logout").set("Cookie", `${SESSION_COOKIE}=${altered}`));
  });

  test("con credencial expirada, de otro secreto, «none», sin comprobante o ilegible", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const tokens = [
      forgeToken({ id, username: "Ana", csrf: "c" }, { iat: twoHoursAgo }),
      forgeToken({ id, username: "Ana", csrf: "c" }, { secret: "otro-secreto" }),
      forgeToken({ id, username: "Ana" }),
      noneToken({ id, username: "Ana", csrf: "c" }),
      "abc",
    ];
    for (const token of tokens) {
      assertLogout(
        await api.post("/api/auth/logout").set("Cookie", `${SESSION_COOKIE}=${token}`).set(CSRF_HEADER, "otro"),
      );
    }
  });

  test("los atributos de borrado son los mismos que los de emisión (salvo Expires)", async () => {
    await registerUser(app);
    const issued = cookieOf(await login(credentials())).attributes;
    const cleared = new Map(cookieOf(await api.post("/api/auth/logout")).attributes);
    cleared.delete("expires");
    assert.deepStrictEqual(cleared, issued);
  });

  test("en producción el borrado incluye Secure, igual que la emisión (RNF-2)", async () => {
    await registerUser(app);
    const production = supertest(await authApp({ nodeEnv: "production" }));
    const issued = cookieOf(await login(credentials(), production)).attributes;
    const response = await production.post("/api/auth/logout");
    const cleared = assertLogout(response);
    assert.strictEqual(cleared.attributes.get("secure"), "");
    const withoutExpires = new Map(cleared.attributes);
    withoutExpires.delete("expires");
    assert.deepStrictEqual(withoutExpires, issued);
  });

  test("el cierre de sesión no consulta ni cambia la base", async () => {
    await registerUser(app);
    const before = await snapshot();
    const findOne = mock.method(User, "findOne");
    const exists = mock.method(User, "exists");
    assertLogout(await api.post("/api/auth/logout"));
    assert.strictEqual(findOne.mock.callCount(), 0);
    assert.strictEqual(exists.mock.callCount(), 0);
    assert.deepStrictEqual(await snapshot(), before);
  });
});

describe("rutas de autenticación (RF-26)", () => {
  test("login y logout son públicos: responden sin cookie", async () => {
    await registerUser(app);
    assert.strictEqual((await login(credentials())).status, 200);
    assert.strictEqual((await api.post("/api/auth/logout")).status, 200);
  });

  test("GET /api/auth/login y GET /api/auth/logout no existen: 404", async () => {
    for (const path of ["/api/auth/login", "/api/auth/logout"]) {
      const response = await api.get(path);
      assertStatusError(response, 404, "endpoint desconocido");
    }
  });
});

describe("ninguna respuesta expone el hash ni el correo de otro usuario (RNF-4)", () => {
  test("login de Beto no muestra a Ana", async () => {
    await registerUser(app);
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const responses = [
      await login(credentials({ email: "beto@example.com" })),
      await login(credentials({ email: "beto@example.com", password: "mala-contraseña" })),
      await api.post("/api/auth/logout"),
    ];
    for (const response of responses) {
      const text = JSON.stringify(response.body);
      assert.ok(!text.includes("passwordHash"));
      assert.ok(!text.includes("$2b$"));
      assert.ok(!text.includes("ana@example.com"));
    }
  });
});

// ---------------------------------------------------------------------------------------
// Operaciones protegidas (T8): `withUser` y `GET /api/auth/me` (plan §3.3, §3.7, §6.2).
// RF-10..RF-13, RF-15, RF-20, RF-22..RF-26, RNF-1, RNF-4.

function me(target = api): supertest.Test {
  return target.get("/api/auth/me");
}

// `me` con la cookie `token` y, si se da, la cabecera `X-CSRF-Token`, sin agente.
function meWith(token: string, csrf?: string, target = api): supertest.Test {
  const request = me(target).set("Cookie", `${SESSION_COOKIE}=${token}`);
  return csrf === undefined ? request : request.set(CSRF_HEADER, csrf);
}

async function loginAna(): Promise<Awaited<ReturnType<typeof loginAs>> & { id: string }> {
  const registered = await registerUser(app);
  const session = await loginAs(app, VALID_REGISTRATION.email, VALID_REGISTRATION.password);
  return { ...session, id: String(registered.body.id) };
}

function assertOwn(response: Response, expected: Record<string, unknown>): void {
  assert.strictEqual(response.status, 200);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(Object.keys(response.body).sort(), OWN_KEYS);
  for (const [key, value] of Object.entries(expected)) {
    assert.strictEqual(response.body[key], value, `campo ${key}`);
  }
}

describe("sesión actual (RF-13, RNF-4)", () => {
  test("con agente y X-CSRF-Token: 200 con los datos propios", async () => {
    const { agent, csrf, response: loginResponse } = await loginAna();
    const response = await me(agent).set(CSRF_HEADER, csrf);
    assertOwn(response, { email: "ana@example.com", username: "Ana" });
    assert.deepStrictEqual(response.body, loginResponse.body);
    const text = JSON.stringify(response.body);
    assert.ok(!text.includes("passwordHash"));
    assert.ok(!text.includes("$2b$"));
    assert.ok(!text.includes("usernameKey"));
    assert.strictEqual(response.headers["set-cookie"], undefined, "me no emite cookie");
  });

  test("devuelve los datos tal como están guardados en ese momento", async () => {
    const { agent, csrf, id } = await loginAna();
    await User.updateOne({ _id: id }, { $set: { displayName: "Ana Nueva", bio: "hola" } });
    const response = await me(agent).set(CSRF_HEADER, csrf);
    assertOwn(response, { displayName: "Ana Nueva", bio: "hola", id });
  });

  test("dos usuarios: cada uno recibe los suyos y nunca los del otro", async () => {
    const ana = await loginAna();
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const beto = await loginAs(app, "beto@example.com", VALID_REGISTRATION.password);

    const anaMe = await me(ana.agent).set(CSRF_HEADER, ana.csrf);
    const betoMe = await me(beto.agent).set(CSRF_HEADER, beto.csrf);
    assertOwn(anaMe, { username: "Ana", email: "ana@example.com" });
    assertOwn(betoMe, { username: "Beto", email: "beto@example.com" });
    assert.ok(!JSON.stringify(anaMe.body).includes("beto@example.com"));
    assert.ok(!JSON.stringify(betoMe.body).includes("ana@example.com"));
  });

  test("me no cambia la base", async () => {
    const { agent, csrf } = await loginAna();
    const before = await snapshot();
    assert.strictEqual((await me(agent).set(CSRF_HEADER, csrf)).status, 200);
    assert.deepStrictEqual(await snapshot(), before);
  });
});

describe("revisión de la credencial en orden (RF-10, RF-11, RF-12, RF-24)", () => {
  test("(1) sin cookie: 401 «sesión no iniciada»", async () => {
    assertStatusError(await me(), 401, "sesión no iniciada");
    assertStatusError(await me().set(CSRF_HEADER, "algo"), 401, "sesión no iniciada");
  });

  test("(1) cookie vacía: 401 «sesión no iniciada»", async () => {
    assertStatusError(await meWith("", "algo"), 401, "sesión no iniciada");
  });

  test("(1) otras cookies pero no la de la credencial: 401 «sesión no iniciada»", async () => {
    const { cookie, csrf } = await loginAna();
    const response = await me().set("Cookie", `otra=${cookie}`).set(CSRF_HEADER, csrf);
    assertStatusError(response, 401, "sesión no iniciada");
  });

  test("(2) cookie que no es una credencial: 401 «token inválido»", async () => {
    await registerUser(app);
    assertStatusError(await meWith("abc", "algo"), 401, "token inválido");
  });

  test("(2) cookie con formato j:{…} (objeto para cookie-parser): 401 «token inválido»", async () => {
    const { csrf } = await loginAna();
    const value = encodeURIComponent(`j:${JSON.stringify({ id: "x", csrf })}`);
    assertStatusError(await meWith(value, csrf), 401, "token inválido");
  });

  test("(2) credencial alterada: 401 «token inválido»", async () => {
    const { cookie, csrf } = await loginAna();
    const altered = `${cookie.slice(0, -1)}${cookie.endsWith("A") ? "B" : "A"}`;
    assertStatusError(await meWith(altered, csrf), 401, "token inválido");
  });

  test("(2) firmada con otro secreto: 401 «token inválido»", async () => {
    const { id } = await loginAna();
    const token = forgeToken({ id, username: "Ana", csrf: "c" }, { secret: "otro-secreto" });
    assertStatusError(await meWith(token, "c"), 401, "token inválido");
  });

  test("(2) algoritmo «none» o distinto de HS256: 401 «token inválido»", async () => {
    const { id } = await loginAna();
    assertStatusError(await meWith(noneToken({ id, username: "Ana", csrf: "c" }), "c"), 401, "token inválido");
    const hs512 = forgeToken({ id, username: "Ana", csrf: "c" }, { algorithm: "HS512" });
    assertStatusError(await meWith(hs512, "c"), 401, "token inválido");
  });

  test("(3) expirada: 401 «sesión expirada»", async () => {
    const { id } = await loginAna();
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const token = forgeToken({ id, username: "Ana", csrf: "c" }, { iat: twoHoursAgo });
    assertStatusError(await meWith(token, "c"), 401, "sesión expirada");
  });

  test("(3) expirada y sin comprobante en ningún lado: 401 «sesión expirada»", async () => {
    const { id } = await loginAna();
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const token = forgeToken({ id, username: "Ana" }, { iat: twoHoursAgo });
    assertStatusError(await meWith(token), 401, "sesión expirada");
  });

  test("(2 antes que 3) expirada y con otro secreto: 401 «token inválido»", async () => {
    const { id } = await loginAna();
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const token = forgeToken({ id, username: "Ana", csrf: "c" }, { iat: twoHoursAgo, secret: "otro-secreto" });
    assertStatusError(await meWith(token, "c"), 401, "token inválido");
  });

  test("(4) sin comprobante dentro y sin cabecera: 401 «token inválido»", async () => {
    const { id } = await loginAna();
    const token = forgeToken({ id, username: "Ana" });
    assertStatusError(await meWith(token), 401, "token inválido");
    assertStatusError(await meWith(token, ""), 401, "token inválido");
    assertStatusError(await meWith(token, "c"), 401, "token inválido");
  });

  test("(4) sin identificador dentro: 401 «token inválido»", async () => {
    await loginAna();
    const token = forgeToken({ username: "Ana", csrf: "c" });
    assertStatusError(await meWith(token, "c"), 401, "token inválido");
  });

  test("(4) identificador con formato distinto al de la base: 401 «token inválido», no 500", async () => {
    await loginAna();
    for (const id of ["abc", "zzzzzzzzzzzzzzzzzzzzzzzz", "1234567890123456789012345", ""]) {
      const token = forgeToken({ id, username: "Ana", csrf: "c" });
      assertStatusError(await meWith(token, "c"), 401, "token inválido");
    }
    const numeric = forgeToken({ id: 5, username: "Ana", csrf: "c" });
    assertStatusError(await meWith(numeric, "c"), 401, "token inválido");
  });

  test("(4) cabecera ausente, vacía o de otra sesión: 401 «token inválido»", async () => {
    const ana = await loginAna();
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const beto = await loginAs(app, "beto@example.com", VALID_REGISTRATION.password);
    assertStatusError(await me(ana.agent), 401, "token inválido");
    assertStatusError(await me(ana.agent).set(CSRF_HEADER, ""), 401, "token inválido");
    assertStatusError(await me(ana.agent).set(CSRF_HEADER, beto.csrf), 401, "token inválido");
    assertStatusError(await me(ana.agent).set(CSRF_HEADER, `${ana.csrf}x`), 401, "token inválido");
  });

  test("la cabecera X-CSRF-Token no distingue mayúsculas en el nombre", async () => {
    const { agent, csrf } = await loginAna();
    assert.strictEqual((await me(agent).set("x-csrf-token", csrf)).status, 200);
  });

  test("comprobante correcto fuera de X-CSRF-Token: 401 «token inválido»", async () => {
    const { agent, csrf, cookie } = await loginAna();
    assertStatusError(await me(agent).send({ csrf, "X-CSRF-Token": csrf }), 401, "token inválido");
    assertStatusError(await me(agent).query({ csrf }), 401, "token inválido");
    assertStatusError(await me(agent).set("X-CSRF", csrf), 401, "token inválido");
    assertStatusError(await me(agent).set("CSRF-Token", csrf), 401, "token inválido");
    const inCookie = await me().set("Cookie", `${SESSION_COOKIE}=${cookie}; ${CSRF_HEADER}=${csrf}; csrf=${csrf}`);
    assertStatusError(inCookie, 401, "token inválido");
  });

  test("con comprobante correcto en la cabecera: 200", async () => {
    const { cookie, csrf } = await loginAna();
    assertOwn(await meWith(cookie, csrf), { username: "Ana" });
  });
});

describe("expiración exacta con el reloj inyectado (RNF-1)", () => {
  const issuedAt = 1_800_000_000;

  test("emitida en T: a T + 3599 se acepta y a T + 3600 se rechaza", async () => {
    await registerUser(app);
    const issuing = supertest(await authApp({ now: () => issuedAt }));
    const response = await login(credentials(), issuing);
    assert.strictEqual(response.status, 200);
    const csrf = response.get(CSRF_HEADER);
    assert.ok(csrf);
    const token = cookieOf(response).value;

    const almost = supertest(await authApp({ now: () => issuedAt + 3599 }));
    assertOwn(await meWith(token, csrf, almost), { username: "Ana" });

    const expired = supertest(await authApp({ now: () => issuedAt + 3600 }));
    assertStatusError(await meWith(token, csrf, expired), 401, "sesión expirada");

    const later = supertest(await authApp({ now: () => issuedAt + 7200 }));
    assertStatusError(await meWith(token, csrf, later), 401, "sesión expirada");
  });
});

describe("la credencial solo se toma de la cookie (RF-23)", () => {
  test("válida solo en Authorization: Bearer: 401 «sesión no iniciada»", async () => {
    const { cookie, csrf } = await loginAna();
    const response = await me().set("Authorization", `Bearer ${cookie}`).set(CSRF_HEADER, csrf);
    assertStatusError(response, 401, "sesión no iniciada");
  });

  test("válida solo en el cuerpo, en otra cabecera o en la consulta: 401 «sesión no iniciada»", async () => {
    const { cookie, csrf } = await loginAna();
    assertStatusError(await me().set(CSRF_HEADER, csrf).send({ token: cookie }), 401, "sesión no iniciada");
    assertStatusError(await me().set(CSRF_HEADER, csrf).set("X-Token", cookie), 401, "sesión no iniciada");
    assertStatusError(await me().set(CSRF_HEADER, csrf).query({ token: cookie }), 401, "sesión no iniciada");
  });

  test("con la cookie válida, un Bearer ajeno no cambia el usuario", async () => {
    const ana = await loginAna();
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const beto = await loginAs(app, "beto@example.com", VALID_REGISTRATION.password);
    const response = await me(ana.agent).set(CSRF_HEADER, ana.csrf).set("Authorization", `Bearer ${beto.cookie}`);
    assertOwn(response, { username: "Ana" });
  });
});

describe("usuario inexistente (RF-22)", () => {
  test("credencial válida de un usuario borrado: 401 «token inválido»", async () => {
    const { agent, csrf, id } = await loginAna();
    await User.deleteOne({ _id: id });
    assertStatusError(await me(agent).set(CSRF_HEADER, csrf), 401, "token inválido");
  });

  test("credencial válida con un identificador que nunca existió: 401 «token inválido»", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const token = forgeToken({ id, username: "Fantasma", csrf: "c" });
    assertStatusError(await meWith(token, "c"), 401, "token inválido");
  });
});

describe("identidad desde la credencial (RF-15)", () => {
  test("un id ajeno en la consulta o en el cuerpo no cambia el usuario", async () => {
    const ana = await loginAna();
    const beto = await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const betoId = String(beto.body.id);
    assertOwn(await me(ana.agent).set(CSRF_HEADER, ana.csrf).query({ id: betoId }), { id: ana.id });
    assertOwn(await me(ana.agent).set(CSRF_HEADER, ana.csrf).send({ id: betoId, userId: betoId }), {
      id: ana.id,
    });
  });
});

describe("nuevo inicio de sesión reemplaza al anterior (RF-25)", () => {
  test("con la cookie nueva, el comprobante anterior no sirve y el nuevo sí", async () => {
    const first = await loginAna();
    await registerUser(app, { email: "beto@example.com", username: "Beto" });

    const same = await login(credentials(), first.agent);
    const sameCsrf = same.get(CSRF_HEADER);
    assert.ok(sameCsrf);
    assertStatusError(await me(first.agent).set(CSRF_HEADER, first.csrf), 401, "token inválido");
    assertOwn(await me(first.agent).set(CSRF_HEADER, sameCsrf), { username: "Ana" });

    const other = await login(credentials({ email: "beto@example.com" }), first.agent);
    const otherCsrf = other.get(CSRF_HEADER);
    assert.ok(otherCsrf);
    assertStatusError(await me(first.agent).set(CSRF_HEADER, sameCsrf), 401, "token inválido");
    assertOwn(await me(first.agent).set(CSRF_HEADER, otherCsrf), { username: "Beto", email: "beto@example.com" });
  });
});

describe("registrar con una sesión iniciada no la cambia (RF-20)", () => {
  test("la respuesta no trae cookie ni comprobante y la sesión previa sigue válida", async () => {
    const { agent, csrf, id } = await loginAna();
    const registered = await agent
      .post("/api/users")
      .set(CSRF_HEADER, csrf)
      .send({ email: "beto@example.com", username: "Beto", password: VALID_REGISTRATION.password });
    assert.strictEqual(registered.status, 201);
    assertNoSession(registered);
    assertOwn(await me(agent).set(CSRF_HEADER, csrf), { id, username: "Ana", email: "ana@example.com" });
  });
});

describe("cierre de sesión y operaciones protegidas (RF-14, RF-26)", () => {
  test("tras logout con el agente, me responde «sesión no iniciada»", async () => {
    const { agent, csrf } = await loginAna();
    assert.strictEqual((await me(agent).set(CSRF_HEADER, csrf)).status, 200);
    assert.strictEqual((await agent.post("/api/auth/logout")).status, 200);
    assertStatusError(await me(agent).set(CSRF_HEADER, csrf), 401, "sesión no iniciada");
  });

  test("me es protegida: sin cookie 401; registro, login y logout son públicos", async () => {
    assertStatusError(await me(), 401, "sesión no iniciada");
    assert.strictEqual((await registerUser(app)).status, 201);
    assert.strictEqual((await login(credentials())).status, 200);
    assert.strictEqual((await api.post("/api/auth/logout")).status, 200);
  });

  test("el cierre de sesión con credencial válida no revisa el comprobante ni la base", async () => {
    const { agent } = await loginAna();
    const exists = mock.method(User, "exists");
    const response = await agent.post("/api/auth/logout");
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { message: "sesión cerrada" });
    assert.strictEqual(exists.mock.callCount(), 0);
  });

  test("POST /api/auth/me no existe: 404", async () => {
    assertStatusError(await api.post("/api/auth/me"), 404, "endpoint desconocido");
  });
});

describe("las respuestas de me no exponen el hash ni el correo de otro (RNF-4)", () => {
  test("errores y éxitos", async () => {
    const ana = await loginAna();
    await registerUser(app, { email: "beto@example.com", username: "Beto" });
    const responses = [
      await me(ana.agent).set(CSRF_HEADER, ana.csrf),
      await me(ana.agent),
      await me(),
      await meWith("abc", "c"),
    ];
    for (const response of responses) {
      const text = JSON.stringify(response.body);
      assert.ok(!text.includes("passwordHash"));
      assert.ok(!text.includes("$2b$"));
      assert.ok(!text.includes("beto@example.com"));
    }
  });
});
