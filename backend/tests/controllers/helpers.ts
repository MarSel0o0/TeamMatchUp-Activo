// Utilidades de las pruebas de controladores (plan §6.1). No es un archivo de prueba.
import supertest from "supertest";
import type { Agent, Response } from "supertest";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import type { Algorithm } from "jsonwebtoken";
import { createApp } from "../../src/app.ts";
import type { AppOptions } from "../../src/app.ts";
import { CSRF_HEADER, SESSION_COOKIE } from "../../src/services/sessionToken.ts";
import { testConfig } from "../server/helpers.ts";

// Aplicación con la configuración de prueba; `overrides` cambia entorno, secreto o reloj.
export function authApp(overrides: Partial<AppOptions> = {}): Express {
  const { jwtSecret, nodeEnv } = testConfig();
  return createApp({ jwtSecret, nodeEnv, ...overrides });
}

export interface RegistrationData {
  email?: unknown;
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
  [extra: string]: unknown;
}

export const VALID_REGISTRATION = {
  email: "ana@example.com",
  username: "Ana",
  password: "contraseña-segura",
} as const;

// `POST /api/users` con datos válidos por defecto; `data` los reemplaza o agrega.
export function registerUser(app: Express, data: RegistrationData = {}): Promise<Response> {
  return supertest(app).post("/api/users").send({ ...VALID_REGISTRATION, ...data });
}

export interface ParsedSetCookie {
  name: string;
  value: string;
  // Nombre del atributo en minúsculas → valor ("" para los atributos sin valor).
  attributes: Map<string, string>;
}

// Separa una cabecera `Set-Cookie` en nombre, valor y atributos.
export function parseSetCookie(header: string): ParsedSetCookie {
  const [pair = "", ...rest] = header.split(";").map((part) => part.trim());
  const equals = pair.indexOf("=");
  const name = equals === -1 ? pair : pair.slice(0, equals);
  const value = equals === -1 ? "" : pair.slice(equals + 1);
  const attributes = new Map<string, string>();
  for (const part of rest) {
    if (part === "") continue;
    const at = part.indexOf("=");
    const key = (at === -1 ? part : part.slice(0, at)).toLowerCase();
    attributes.set(key, at === -1 ? "" : part.slice(at + 1));
  }
  return { name, value, attributes };
}

// Primera cabecera `Set-Cookie` de la cookie de sesión, o `undefined` si no hay.
export function sessionSetCookie(response: Response): string | undefined {
  const raw: unknown = response.headers["set-cookie"];
  const headers = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
  return headers.find((header) => parseSetCookie(header).name === SESSION_COOKIE);
}

export interface LoggedIn {
  agent: Agent; // guarda la cookie para las peticiones siguientes
  csrf: string; // cabecera X-CSRF-Token de la respuesta
  cookie: string; // valor de la cookie `token`
  response: Response;
}

// `POST /api/auth/login` con un agente; falla si no responde 200 con cookie y comprobante.
export async function loginAs(app: Express, email: string, password: string): Promise<LoggedIn> {
  const agent = supertest.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });
  if (response.status !== 200) {
    throw new Error(`el inicio de sesión respondió ${response.status}`);
  }
  const csrf = response.get(CSRF_HEADER);
  const header = sessionSetCookie(response);
  if (csrf === undefined || header === undefined) {
    throw new Error("el inicio de sesión no entregó cookie y comprobante");
  }
  return { agent, csrf, cookie: parseSetCookie(header).value, response };
}

export interface ForgeOptions {
  secret?: string; // por defecto, el de la configuración de prueba
  iat?: number; // segundos Unix; por defecto, ahora
  algorithm?: Algorithm; // por defecto, HS256
  expiresIn?: number; // segundos; por defecto, 3600
}

// Credencial hecha a mano (otro secreto, expirada, sin `csrf`, sin `id`, otro algoritmo).
export function forgeToken(payload: Record<string, unknown>, options: ForgeOptions = {}): string {
  const {
    secret = testConfig().jwtSecret,
    iat = Math.floor(Date.now() / 1000),
    algorithm = "HS256",
    expiresIn = 3600,
  } = options;
  return jwt.sign({ ...payload, iat }, secret, { algorithm, expiresIn });
}

// Credencial con cabecera `{"alg":"none"}` y sin firma, codificada a mano.
export function noneToken(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}
