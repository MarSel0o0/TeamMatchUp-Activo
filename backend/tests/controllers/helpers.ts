// Utilidades de las pruebas de controladores (plan §6.1). No es un archivo de prueba.
import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import supertest from "supertest";
import type { Agent, Response } from "supertest";
import http from "node:http";
import type { RequestListener, Server } from "node:http";
import jwt from "jsonwebtoken";
import type { Algorithm } from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp } from "../../src/app.ts";
import type { AppOptions } from "../../src/app.ts";
import { User } from "../../src/models/user.ts";
import { GameAccount } from "../../src/models/gameAccount.ts";
import { CSRF_HEADER, SESSION_COOKIE } from "../../src/services/sessionToken.ts";
import { testConfig } from "../server/helpers.ts";

// Servidores de prueba abiertos; `closeTestServers` los cierra en el `after` de cada archivo.
const openServers = new Set<Server>();

// Servidor ya escuchando en 127.0.0.1 con puerto elegido por el sistema (plan P-18). Con una
// app sin escuchar, supertest hace `listen(0)` sin host (en "::") y conecta a 127.0.0.1; en
// macOS ese puerto puede tenerlo otro proceso en IPv4 (404 vacío o ECONNRESET). Se espera a
// `listening`: si supertest viera `address()` nulo, volvería a llamar a `listen(0)` en "::".
export async function listenOnLoopback(listener: RequestListener): Promise<Server> {
  const server = http.createServer(listener);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  openServers.add(server);
  return server;
}

// Cierra los servidores registrados (conexiones abiertas incluidas) y vacía la lista.
export async function closeTestServers(): Promise<void> {
  const servers = [...openServers];
  openServers.clear();
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections();
        }),
    ),
  );
}

// Servidor con la configuración de prueba; `overrides` cambia entorno, secreto o reloj.
export function authApp(overrides: Partial<AppOptions> = {}): Promise<Server> {
  const { jwtSecret, nodeEnv } = testConfig();
  return listenOnLoopback(createApp({ jwtSecret, nodeEnv, ...overrides }));
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
export function registerUser(app: Server, data: RegistrationData = {}): Promise<Response> {
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
export async function loginAs(app: Server, email: string, password: string): Promise<LoggedIn> {
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

// --- Spec 003 (plan §6.1) ---

// Formatos de RNF-2: fecha ISO 8601 en UTC con milisegundos e identificador en minúsculas.
export const ISO_MS_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const HEX24_LOWER = /^[0-9a-f]{24}$/;

export interface SignedUp extends LoggedIn {
  id: string; // identificador devuelto por el registro (minúsculas)
  email: string; // correo normalizado
}

// Registra (datos válidos por defecto, `data` los reemplaza) e inicia sesión con un agente.
export async function signUp(app: Server, data: RegistrationData = {}): Promise<SignedUp> {
  const registration = await registerUser(app, data);
  if (registration.status !== 201) {
    throw new Error(`el registro respondió ${registration.status}`);
  }
  const body: unknown = registration.body;
  const id: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "id") : undefined;
  const email: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "email") : undefined;
  if (typeof id !== "string" || typeof email !== "string") {
    throw new Error("el registro no devolvió id y correo");
  }
  const password = typeof data.password === "string" ? data.password : VALID_REGISTRATION.password;
  const session = await loginAs(app, email, password);
  return { ...session, id, email };
}

// Identificador con formato válido que no corresponde a ningún usuario.
export function nonExistingId(): string {
  return new mongoose.Types.ObjectId().toHexString();
}

// Añade el comprobante de la sesión a una petición del agente.
export function withSession(request: supertest.Test, csrf: string): supertest.Test {
  return request.set(CSRF_HEADER, csrf);
}

export type HttpMethod = "get" | "head" | "post" | "put" | "patch" | "delete";

// Petición sin agente con la credencial copiada en la cookie y el comprobante en la cabecera.
export function rawCookieRequest(
  app: Server,
  method: HttpMethod,
  path: string,
  cookie: string,
  csrf: string,
): supertest.Test {
  return supertest(app)[method](path).set("Cookie", `${SESSION_COOKIE}=${cookie}`).set(CSRF_HEADER, csrf);
}

// Fija `createdAt` con el driver nativo (Mongoose lo trata como inmutable y descartaría el `$set`).
export async function setCreatedAt(ids: readonly string[], date: Date): Promise<void> {
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  await User.collection.updateMany({ _id: { $in: objectIds } }, { $set: { createdAt: date } });
}

// --- Spec 004 ---
// (plan, secciones 9 y 11; P-16)

// Instante fijo de las cuentas en milisegundos: `t.mock.method(clock, "now", () => new Date(FIXED_NOW))`.
// Es pasado a propósito; no afecta a las credenciales (reloj de `createApp`, sin `overrides`).
export const FIXED_NOW = Date.parse("2026-03-15T18:30:00.000Z");

// Cuentas de la base tal como las vería el cliente (`toJSON` serializado, fechas en ISO),
// ordenadas por `_id`; se comparan directamente con los cuerpos de las respuestas.
export async function accountsInDb(): Promise<unknown[]> {
  const accounts = await GameAccount.find({}).sort({ _id: 1 });
  return accounts.map((account): unknown => JSON.parse(JSON.stringify(account)));
}

// Documentos crudos (`lean()`), con `matches`, `readingNumber` y `__v`, ordenados por `_id`.
export function rawAccountsInDb() {
  return GameAccount.find({}).sort({ _id: 1 }).lean();
}

// Identificador de la cuenta que trae el cuerpo de una respuesta (falla si no lo trae).
export function bodyId(response: Response): string {
  const body: unknown = response.body;
  const id: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "id") : undefined;
  assert.ok(typeof id === "string", "la respuesta debería traer el id de la cuenta");
  return id;
}

// `POST /api/accounts` con la sesión de `session`.
export function link(session: SignedUp, body: unknown): supertest.Test {
  return withSession(session.agent.post("/api/accounts"), session.csrf).send(body as object);
}

// Vincula y exige 201; devuelve el id de la cuenta creada.
export async function linkOk(session: SignedUp, body: unknown): Promise<string> {
  const response = await link(session, body);
  assert.strictEqual(response.status, 201);
  return bodyId(response);
}

// `PUT /api/accounts/:id`.
export function edit(session: SignedUp, id: string, body: unknown): supertest.Test {
  return withSession(session.agent.put(`/api/accounts/${id}`), session.csrf).send(body as object);
}

// `DELETE /api/accounts/:id`.
export function unlink(session: SignedUp, id: string): supertest.Test {
  return withSession(session.agent.delete(`/api/accounts/${id}`), session.csrf);
}

// `POST /api/accounts/:id/sync`.
export function sync(session: SignedUp, id: string): supertest.Test {
  return withSession(session.agent.post(`/api/accounts/${id}/sync`), session.csrf);
}

// `DELETE /api/users/me`.
export function deleteMe(session: SignedUp): supertest.Test {
  return withSession(session.agent.delete("/api/users/me"), session.csrf);
}

// Solapamiento determinista (RF-39, RF-47). Sustituye `GameAccount.findById` para que la
// PRIMERA llamada, después de leer la cuenta, espere a que `second()` termine; las demás
// llamadas (las de `second` y los reintentos de `first`) pasan directo. Orden garantizado:
// `first` empieza y lee, `second` se ejecuta completa, `first` continúa con la lectura vieja.
// Devuelve el resultado de las dos. Falla (en vez de colgarse) si `first` termina sin leer la
// cuenta. La sustitución se restaura al terminar la prueba (`t.mock`).
export async function overlapFirstFindById<A, B>(
  t: TestContext,
  first: () => PromiseLike<A>,
  second: () => PromiseLike<B>,
): Promise<{ first: A; second: B }> {
  const original = GameAccount.findById.bind(GameAccount);
  let calls = 0;
  let firstHasRead: () => void = () => undefined;
  let secondIsDone: () => void = () => undefined;
  const firstRead = new Promise<void>((resolve) => {
    firstHasRead = resolve;
  });
  const secondFinished = new Promise<void>((resolve) => {
    secondIsDone = resolve;
  });
  t.mock.method(GameAccount, "findById", async (id: string) => {
    calls += 1;
    const position = calls;
    const account = await original(id);
    if (position === 1) {
      firstHasRead();
      await secondFinished; // la primera lectura queda detenida con el documento ya leído
    }
    return account;
  });
  const firstResult = Promise.resolve(first());
  firstResult.catch(() => undefined); // si falla antes de leer, el error se informa más abajo
  try {
    const settledEarly = await Promise.race([firstRead.then(() => false), firstResult.then(() => true, () => true)]);
    if (settledEarly && calls === 0) {
      await firstResult; // si lanzó, propaga su error
      throw new Error("overlapFirstFindById: la primera operación terminó y no leyó la cuenta");
    }
    let secondResult: B;
    try {
      secondResult = await second();
    } catch (error) {
      secondIsDone(); // si la segunda falla, la primera no queda detenida
      await firstResult.catch(() => undefined);
      throw error;
    }
    secondIsDone();
    return { first: await firstResult, second: secondResult };
  } finally {
    secondIsDone(); // nunca dejar la primera lectura detenida
  }
}
