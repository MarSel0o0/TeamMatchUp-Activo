import { randomUUID, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type { NodeEnv } from "../utils/config.ts";

// Credencial de sesión (JWT) y comprobante anti-CSRF. Funciones puras: "ahora" llega como
// parámetro (nowSeconds, segundos Unix) y nada lee process.env ni hace E/S.

export const SESSION_COOKIE = "token";
export const CSRF_HEADER = "X-CSRF-Token";
export const SESSION_TTL_SECONDS = 3600;
export const JWT_ALGORITHM = "HS256";

export const SESSION_MESSAGES = {
  notLoggedIn: "sesión no iniciada",
  invalidToken: "token inválido",
  expired: "sesión expirada",
} as const;

export type SessionMessage = (typeof SESSION_MESSAGES)[keyof typeof SESSION_MESSAGES];

export interface SessionClaims {
  id: string;
  username: string;
  csrf: string;
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "strict";
  secure: boolean;
  path: "/";
}

export type SessionCheck = { ok: true; userId: string } | { ok: false; error: SessionMessage };

export interface CheckSessionInput {
  cookie: unknown;
  csrfHeader: string | undefined;
  secret: string;
  nowSeconds: number;
}

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function createCsrfToken(): string {
  return randomUUID();
}

// Solo id, username y csrf (RNF-3); jsonwebtoken calcula exp = iat + 3600 desde el iat dado.
export function signSessionToken(claims: SessionClaims, secret: string, nowSeconds: number): string {
  const { id, username, csrf } = claims;
  return jwt.sign({ id, username, csrf, iat: nowSeconds }, secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: SESSION_TTL_SECONDS,
  });
}

// Comparación en tiempo constante tras igualar longitudes (D10).
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function fail(error: SessionMessage): SessionCheck {
  return { ok: false, error };
}

// RF-24, pasos 1 a 4, en orden; el paso 5 (usuario existente) queda fuera por ser de base.
export function checkSession({ cookie, csrfHeader, secret, nowSeconds }: CheckSessionInput): SessionCheck {
  // (1) sin cookie o vacía
  if (cookie === undefined || cookie === "") return fail(SESSION_MESSAGES.notLoggedIn);
  // (2) cookie que no es texto (p. ej. "j:{…}" convertida en objeto por cookie-parser)
  if (typeof cookie !== "string") return fail(SESSION_MESSAGES.invalidToken);

  let payload: string | jwt.JwtPayload;
  try {
    // jsonwebtoken revisa firma y algoritmo antes que la expiración (paso 2 antes que 3).
    payload = jwt.verify(cookie, secret, { algorithms: [JWT_ALGORITHM], clockTimestamp: nowSeconds });
  } catch (error) {
    // (3) expirada; cualquier otro fallo es (2)
    if (error instanceof jwt.TokenExpiredError) return fail(SESSION_MESSAGES.expired);
    return fail(SESSION_MESSAGES.invalidToken);
  }

  // (4) identificador y comprobante dentro, y cabecera coincidente
  if (typeof payload !== "object") return fail(SESSION_MESSAGES.invalidToken);
  const id: unknown = payload["id"];
  const csrf: unknown = payload["csrf"];
  if (typeof id !== "string" || !OBJECT_ID_PATTERN.test(id)) return fail(SESSION_MESSAGES.invalidToken);
  if (typeof csrf !== "string" || csrf === "") return fail(SESSION_MESSAGES.invalidToken);
  if (csrfHeader === undefined || csrfHeader === "") return fail(SESSION_MESSAGES.invalidToken);
  if (!safeEqual(csrfHeader, csrf)) return fail(SESSION_MESSAGES.invalidToken);

  return { ok: true, userId: id };
}

// Única fuente de atributos para emitir y para borrar la cookie (D8). Sin maxAge, expires
// ni domain: cookie de sesión del navegador (RNF-1).
export function sessionCookieOptions(nodeEnv: NodeEnv): SessionCookieOptions {
  return { httpOnly: true, sameSite: "strict", secure: nodeEnv === "production", path: "/" };
}
