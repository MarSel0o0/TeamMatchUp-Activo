import { describe, test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  CSRF_HEADER,
  JWT_ALGORITHM,
  SESSION_COOKIE,
  SESSION_MESSAGES,
  SESSION_TTL_SECONDS,
  checkSession,
  createCsrfToken,
  sessionCookieOptions,
  signSessionToken,
  type SessionClaims,
} from "../../src/services/sessionToken.ts";

const SECRET = "secreto-de-prueba";
const OTHER_SECRET = "otro-secreto";
const T = 1_800_000_000;
const USER_ID = "507f1f77bcf86cd799439011";
const CSRF = "0b0f3c9e-6a3d-4c1e-9d0e-2f6b1a7c8d90";
const CLAIMS: SessionClaims = { id: USER_ID, username: "Ana", csrf: CSRF };

const { notLoggedIn, invalidToken, expired } = SESSION_MESSAGES;

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

// Credencial hecha a mano: permite payloads incompletos, otro secreto u otro algoritmo.
function forge(
  payload: Record<string, unknown>,
  { secret = SECRET, iat = T, algorithm = "HS256" }: { secret?: string; iat?: number; algorithm?: jwt.Algorithm } = {},
): string {
  return jwt.sign({ ...payload, iat }, secret, { algorithm, expiresIn: SESSION_TTL_SECONDS });
}

// Cabecera {"alg":"none"} codificada a mano, sin firma.
function noneToken(payload: Record<string, unknown>): string {
  const body = { ...payload, iat: T, exp: T + SESSION_TTL_SECONDS };
  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url(body)}.`;
}

// Con dos argumentos o más, la cabecera es la recibida (también undefined, que es "ausente").
function check(cookie: unknown, ...rest: [csrfHeader?: string | undefined, nowSeconds?: number]) {
  const csrfHeader = rest.length === 0 ? CSRF : rest[0];
  const nowSeconds = rest[1] ?? T + 10;
  return checkSession({ cookie, csrfHeader, secret: SECRET, nowSeconds });
}

function errorOf(result: ReturnType<typeof checkSession>): string {
  assert.equal(result.ok, false, "se esperaba un fallo de sesión");
  return result.ok ? "" : result.error;
}

describe("constantes de sesión", () => {
  test("nombre de cookie, cabecera, duración y algoritmo", () => {
    assert.equal(SESSION_COOKIE, "token");
    assert.equal(CSRF_HEADER, "X-CSRF-Token");
    assert.equal(SESSION_TTL_SECONDS, 3600);
    assert.equal(JWT_ALGORITHM, "HS256");
  });

  test("mensajes literales de la spec, en minúscula y sin punto final (RNF-7)", () => {
    assert.deepEqual(SESSION_MESSAGES, {
      notLoggedIn: "sesión no iniciada",
      invalidToken: "token inválido",
      expired: "sesión expirada",
    });
    for (const message of Object.values(SESSION_MESSAGES)) {
      assert.equal(message[0], message[0]?.toLowerCase());
      assert.ok(!message.endsWith("."));
    }
  });
});

describe("signSessionToken (RF-8, RNF-1, RNF-3)", () => {
  test("firma con HS256 y el payload trae id, username, csrf, iat = T y exp = T + 3600", () => {
    const token = signSessionToken(CLAIMS, SECRET, T);
    const decoded = jwt.decode(token, { complete: true });
    assert.ok(decoded && typeof decoded.payload === "object");
    assert.equal(decoded.header.alg, "HS256");

    const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"], clockTimestamp: T });
    assert.ok(typeof payload === "object");
    assert.equal(payload["id"], USER_ID);
    assert.equal(payload["username"], "Ana");
    assert.equal(payload["csrf"], CSRF);
    assert.equal(payload.iat, T);
    assert.equal(payload.exp, T + 3600);
  });

  test("claves exactas del payload: nunca el correo ni otros datos (RNF-3)", () => {
    const extra = { ...CLAIMS, email: "ana@dominio.cl", passwordHash: "x" } as SessionClaims;
    const token = signSessionToken(extra, SECRET, T);
    const payload = jwt.decode(token);
    assert.ok(payload && typeof payload === "object");
    assert.deepEqual(Object.keys(payload).sort(), ["csrf", "exp", "iat", "id", "username"]);
  });
});

describe("checkSession: RF-24 pasos 1 a 4", () => {
  test("credencial correcta y cabecera coincidente → ok con el identificador", () => {
    assert.deepEqual(check(signSessionToken(CLAIMS, SECRET, T)), { ok: true, userId: USER_ID });
  });

  test("el helper pasa la cabecera ausente tal cual", () => {
    const token = signSessionToken(CLAIMS, SECRET, T);
    assert.equal(check(token).ok, true);
    assert.equal(check(token, undefined).ok, false);
  });

  test("(1) cookie ausente o vacía → sesión no iniciada (RF-10)", () => {
    assert.equal(errorOf(check(undefined)), notLoggedIn);
    assert.equal(errorOf(check("")), notLoggedIn);
    assert.equal(errorOf(check(undefined, undefined)), notLoggedIn);
  });

  test("(2) cookie que no es texto → token inválido", () => {
    assert.equal(errorOf(check({ token: "x" })), invalidToken);
    assert.equal(errorOf(check(["a"])), invalidToken);
    assert.equal(errorOf(check(123)), invalidToken);
    assert.equal(errorOf(check(null)), invalidToken);
  });

  test("(2) texto que no es credencial → token inválido (RF-11)", () => {
    assert.equal(errorOf(check("basura")), invalidToken);
    assert.equal(errorOf(check("a.b.c")), invalidToken);
  });

  test("(2) firma alterada en un carácter → token inválido (RF-11)", () => {
    const token = signSessionToken(CLAIMS, SECRET, T);
    const last = token.at(-1);
    const altered = token.slice(0, -1) + (last === "A" ? "B" : "A");
    assert.notEqual(altered, token);
    assert.equal(errorOf(check(altered)), invalidToken);
  });

  test("(2) payload alterado con la firma original → token inválido (RF-11)", () => {
    const [header, , signature] = signSessionToken(CLAIMS, SECRET, T).split(".");
    const otherPayload = base64url({ ...CLAIMS, id: "507f1f77bcf86cd799439012", iat: T, exp: T + 3600 });
    assert.equal(errorOf(check(`${header}.${otherPayload}.${signature}`)), invalidToken);
  });

  test("(2) firmada con otro secreto → token inválido (RF-11)", () => {
    assert.equal(errorOf(check(signSessionToken(CLAIMS, OTHER_SECRET, T))), invalidToken);
  });

  test("(2) algoritmo none → token inválido", () => {
    assert.equal(errorOf(check(noneToken({ ...CLAIMS }))), invalidToken);
  });

  test("(2) HS512 con el mismo secreto → token inválido", () => {
    assert.equal(errorOf(check(forge({ ...CLAIMS }, { algorithm: "HS512" }))), invalidToken);
  });

  test("(3) RNF-1: a los 3599 s se acepta y a los 3600 s expira, sin tolerancia", () => {
    const token = signSessionToken(CLAIMS, SECRET, T);
    assert.deepEqual(check(token, CSRF, T + 3599), { ok: true, userId: USER_ID });
    assert.equal(errorOf(check(token, CSRF, T + 3600)), expired);
    assert.equal(errorOf(check(token, CSRF, T + 7200)), expired);
  });

  test("(3) expirada y sin comprobante en ningún lado → sesión expirada (RF-12)", () => {
    const token = forge({ id: USER_ID, username: "Ana" });
    assert.equal(errorOf(check(token, undefined, T + 3600)), expired);
  });

  test("(3) expirada con cabecera distinta → sesión expirada", () => {
    const token = signSessionToken(CLAIMS, SECRET, T);
    assert.equal(errorOf(check(token, "otro", T + 3600)), expired);
  });

  test("(2) antes que (3): expirada y firmada con otro secreto → token inválido", () => {
    const token = signSessionToken(CLAIMS, OTHER_SECRET, T);
    assert.equal(errorOf(check(token, CSRF, T + 3600)), invalidToken);
  });

  test("(2) antes que (3): expirada con algoritmo none → token inválido", () => {
    assert.equal(errorOf(check(noneToken({ ...CLAIMS }), CSRF, T + 3600)), invalidToken);
  });

  test("(4) credencial sin identificador → token inválido", () => {
    assert.equal(errorOf(check(forge({ username: "Ana", csrf: CSRF }))), invalidToken);
  });

  test("(4) identificador mal formado o que no es texto → token inválido (D16)", () => {
    for (const id of ["abc", "507f1f77bcf86cd79943901", "507f1f77bcf86cd799439011z", "zzzzzzzzzzzzzzzzzzzzzzzz", 42]) {
      assert.equal(errorOf(check(forge({ id, username: "Ana", csrf: CSRF }))), invalidToken, String(id));
    }
  });

  test("(4) identificador en mayúsculas hexadecimales → ok", () => {
    const id = USER_ID.toUpperCase();
    assert.deepEqual(check(forge({ id, username: "Ana", csrf: CSRF })), { ok: true, userId: id });
  });

  test("(4) credencial sin comprobante dentro y cabecera presente → token inválido", () => {
    assert.equal(errorOf(check(forge({ id: USER_ID, username: "Ana" }))), invalidToken);
  });

  test("(4) comprobante vacío o que no es texto dentro de la credencial → token inválido", () => {
    assert.equal(errorOf(check(forge({ id: USER_ID, username: "Ana", csrf: "" }), "")), invalidToken);
    assert.equal(errorOf(check(forge({ id: USER_ID, username: "Ana", csrf: 1 }), "1")), invalidToken);
  });

  test("(4) sin comprobante en ningún lado → token inválido (faltar en ambos no coincide)", () => {
    assert.equal(errorOf(check(forge({ id: USER_ID, username: "Ana" }), undefined)), invalidToken);
    assert.equal(errorOf(check(forge({ id: USER_ID, username: "Ana" }), "")), invalidToken);
  });

  test("(4) cabecera ausente, vacía o distinta → token inválido (RF-11)", () => {
    const token = signSessionToken(CLAIMS, SECRET, T);
    assert.equal(errorOf(check(token, undefined)), invalidToken);
    assert.equal(errorOf(check(token, "")), invalidToken);
    assert.equal(errorOf(check(token, CSRF.slice(0, -1))), invalidToken);
    assert.equal(errorOf(check(token, CSRF + "0")), invalidToken);
    assert.equal(errorOf(check(token, CSRF.toUpperCase())), invalidToken);
    assert.equal(errorOf(check(token, "ñ".repeat(CSRF.length))), invalidToken);
  });
});

describe("sessionCookieOptions (RF-8, RF-14, RNF-1, RNF-2)", () => {
  test("development y test → HttpOnly, SameSite=Strict, Path=/ y sin Secure", () => {
    for (const env of ["development", "test"] as const) {
      assert.deepEqual(sessionCookieOptions(env), {
        httpOnly: true,
        sameSite: "strict",
        secure: false,
        path: "/",
      });
    }
  });

  test("production → Secure", () => {
    assert.deepEqual(sessionCookieOptions("production"), {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
    });
  });

  test("nunca maxAge, expires ni domain (cookie de sesión del navegador)", () => {
    for (const env of ["development", "test", "production"] as const) {
      const options = sessionCookieOptions(env);
      for (const key of ["maxAge", "expires", "domain"]) {
        assert.ok(!(key in options), `${env}: ${key}`);
      }
    }
  });
});

describe("createCsrfToken", () => {
  test("formato UUID y valores distintos en cada llamada", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const first = createCsrfToken();
    const second = createCsrfToken();
    assert.match(first, uuid);
    assert.match(second, uuid);
    assert.notEqual(first, second);
  });
});
