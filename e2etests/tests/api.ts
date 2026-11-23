// Cliente HTTP de la suite (spec 018, RF-11, RF-12, U8; plan §5.1, decisión D2).
// Usa el `fetch` global de Node: la cookie `token` y el comprobante `X-CSRF-Token` del inicio de
// sesión se reenvían a mano en cada petición con sesión. Nada de esto pasa al navegador (U8) y
// nada toca la base directamente. Las respuestas se leen con guardas de tipo, sin aserciones.

// Plazo de cada petición: pasado este tiempo cuenta como «sin respuesta».
const REQUEST_TIMEOUT_MS = 10_000;

const CSRF_HEADER = "x-csrf-token";
const SESSION_COOKIE = "token";
// spec 002, RF-9.
const BAD_CREDENTIALS_MESSAGE = "correo o contraseña incorrectos";

// Sesión iniciada de la suite (Definiciones de la spec 018).
export interface SuiteSession {
  readonly cookie: string; // «token=<valor>»
  readonly csrf: string;
}

// Lo que salió mal en una petición: un código inesperado (con un problema de la respuesta, si lo
// hubo) o ninguna respuesta.
export type Failure =
  | { kind: "status"; status: number; problem: string | null }
  | { kind: "no-response"; reason: string };

export type Result<T> = { ok: true; value: T } | { ok: false; failure: Failure };

export type LoginResult =
  | { ok: true; session: SuiteSession }
  | { ok: false; badCredentials: true }
  | { ok: false; badCredentials: false; failure: Failure };

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface NewUser extends Credentials {
  readonly username: string;
}

export interface NewSession {
  readonly title: string;
  readonly day: number; // 0 = lunes … 6 = domingo
  readonly startHour: number;
}

type Sent = { ok: true; response: Response } | { ok: false; failure: Failure };

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    return null;
  }
}

function readStringField(body: unknown, field: string): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value: unknown = Reflect.get(body, field);
  return typeof value === "string" ? value : null;
}

function statusFailure(status: number, problem: string | null = null): { ok: false; failure: Failure } {
  return { ok: false, failure: { kind: "status", status, problem } };
}

export interface SuiteApi {
  register(user: NewUser): Promise<Result<null>>;
  login(credentials: Credentials): Promise<LoginResult>;
  linkR6(session: SuiteSession, handle: string): Promise<Result<null>>;
  createSession(session: SuiteSession, input: NewSession): Promise<Result<string>>;
  deleteMe(session: SuiteSession): Promise<Result<null>>;
}

export function createSuiteApi(baseURL: string): SuiteApi {
  async function send(
    method: "POST" | "DELETE",
    path: string,
    body: unknown,
    session: SuiteSession | null,
  ): Promise<Sent> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (session !== null) {
      headers["Cookie"] = session.cookie;
      headers["X-CSRF-Token"] = session.csrf;
    }
    try {
      const response = await fetch(new URL(path, baseURL), {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return { ok: true, response };
    } catch (error) {
      return { ok: false, failure: { kind: "no-response", reason: reasonOf(error) } };
    }
  }

  async function expectStatus(sent: Sent, status: number): Promise<Result<null>> {
    if (!sent.ok) return sent;
    // Se lee el cuerpo para liberar la conexión.
    await sent.response.arrayBuffer().catch(() => null);
    return sent.response.status === status ? { ok: true, value: null } : statusFailure(sent.response.status);
  }

  return {
    // POST /api/users → 201, sin cookie (spec 003; spec 002, RF-20).
    async register(user) {
      const sent = await send(
        "POST",
        "/api/users",
        { email: user.email, username: user.username, password: user.password },
        null,
      );
      return expectStatus(sent, 201);
    },

    // POST /api/auth/login → 200 con la cookie `token` y `X-CSRF-Token`; 401 «correo o contraseña
    // incorrectos» (spec 002).
    async login(credentials) {
      const sent = await send(
        "POST",
        "/api/auth/login",
        { email: credentials.email, password: credentials.password },
        null,
      );
      if (!sent.ok) return { ok: false, badCredentials: false, failure: sent.failure };
      const { response } = sent;
      const body = await readJson(response);
      if (response.status === 401 && readStringField(body, "error") === BAD_CREDENTIALS_MESSAGE) {
        return { ok: false, badCredentials: true };
      }
      if (response.status !== 200) {
        return { ok: false, badCredentials: false, failure: { kind: "status", status: response.status, problem: null } };
      }
      const cookie = response.headers
        .getSetCookie()
        .map((header) => header.split(";")[0]?.trim() ?? "")
        .find((pair) => pair.startsWith(`${SESSION_COOKIE}=`) && pair.length > SESSION_COOKIE.length + 1);
      const csrf = response.headers.get(CSRF_HEADER);
      if (cookie === undefined || csrf === null || csrf === "") {
        return {
          ok: false,
          badCredentials: false,
          failure: { kind: "status", status: 200, problem: "sin la cookie token o sin X-CSRF-Token" },
        };
      }
      return { ok: true, session: { cookie, csrf } };
    },

    // POST /api/accounts → 201: cuenta de R6 sin verificar (spec 004; plan §5.1, decisión D3).
    async linkR6(session, handle) {
      const sent = await send("POST", "/api/accounts", { gameId: "r6", handle, region: "LATAM" }, session);
      return expectStatus(sent, 201);
    },

    // POST /api/sessions → 201 con la sesión de juego y su `id` (spec 006).
    async createSession(session, input) {
      const sent = await send(
        "POST",
        "/api/sessions",
        {
          gameId: "r6",
          title: input.title,
          notes: "",
          day: input.day,
          startHour: input.startHour,
          durationHours: 2,
          slots: 4,
        },
        session,
      );
      if (!sent.ok) return sent;
      const body = await readJson(sent.response);
      if (sent.response.status !== 201) return statusFailure(sent.response.status);
      const id = readStringField(body, "id");
      return id === null ? statusFailure(201, "sin el id de la sesión de juego") : { ok: true, value: id };
    },

    // DELETE /api/users/me → 204; borra en cascada cuentas y sesiones de juego (spec 003, RF-11).
    async deleteMe(session) {
      const sent = await send("DELETE", "/api/users/me", undefined, session);
      return expectStatus(sent, 204);
    },
  };
}
