// Cliente de Leetify con un `fetch` falso (spec 015, T2). Ninguna prueba toca la red (RNF-1).
// RF-2, RF-14, RNF-1, RNF-2, RNF-3; plan, secciones 2 y 4.1, P15-3 y P15-9.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLeetifyClient } from "../../src/services/leetifyClient.ts";

const KEY = "CLAVE-LEETIFY-FALSA-0123456789";
const STEAM_ID = "76561198000000001";

interface Call {
  url: URL;
  init: RequestInit | undefined;
}

type Handler = (call: Call) => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function fakeFetch(handler: Handler) {
  const calls: Call[] = [];
  const fetchFn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call: Call = { url: new URL(input instanceof Request ? input.url : String(input)), init };
    calls.push(call);
    return handler(call);
  };
  return { fetchFn: fetchFn as typeof fetch, calls };
}

const signal = () => new AbortController().signal;
const profile = (premier: unknown) => ({ name: "Vicho", ranks: { premier, faceit: 9 } });

describe("readPremier: la consulta (RF-2, RNF-3)", () => {
  test("hace una sola consulta GET a /v3/profile con el SteamID64 y nada más", async () => {
    const { fetchFn, calls } = fakeFetch(() => json(profile(19309)));
    const client = createLeetifyClient({ apiKey: KEY, fetchFn });
    await client.readPremier(STEAM_ID, signal());
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call?.url.origin, "https://api-public.cs-prod.leetify.com");
    assert.equal(call?.url.pathname, "/v3/profile");
    assert.deepEqual([...(call?.url.searchParams.entries() ?? [])], [["steam64_id", STEAM_ID]]);
    assert.equal(call?.init?.method, "GET");
  });

  test("pasa la señal de cancelación al fetch", async () => {
    const { fetchFn, calls } = fakeFetch(() => json(profile(19309)));
    const controller = new AbortController();
    await createLeetifyClient({ apiKey: null, fetchFn }).readPremier(STEAM_ID, controller.signal);
    assert.equal(calls[0]?.init?.signal, controller.signal);
  });

  test("no sigue redirecciones: la clave no puede viajar a otro sitio (RNF-2)", async () => {
    const { fetchFn, calls } = fakeFetch(() => json(profile(19309)));
    await createLeetifyClient({ apiKey: KEY, fetchFn }).readPremier(STEAM_ID, signal());
    assert.equal(calls[0]?.init?.redirect, "error");
  });
});

describe("readPremier: la clave es opcional (D24, RNF-2)", () => {
  test("con clave la envía en la cabecera `_leetify_key` y nunca en la dirección", async () => {
    const { fetchFn, calls } = fakeFetch(() => json(profile(19309)));
    await createLeetifyClient({ apiKey: KEY, fetchFn }).readPremier(STEAM_ID, signal());
    const headers = new Headers(calls[0]?.init?.headers);
    assert.equal(headers.get("_leetify_key"), KEY);
    assert.equal(headers.has("authorization"), false);
    assert.equal(calls[0]?.url.href.includes(KEY), false);
  });

  test("sin clave consulta igual y no envía la cabecera", async () => {
    const { fetchFn, calls } = fakeFetch(() => json(profile(19309)));
    const reading = await createLeetifyClient({ apiKey: null, fetchFn }).readPremier(STEAM_ID, signal());
    assert.deepEqual(reading, { kind: "rated", rating: 19309 });
    const headers = new Headers(calls[0]?.init?.headers);
    assert.equal(headers.has("_leetify_key"), false);
    assert.equal(headers.has("authorization"), false);
  });
});

describe("readPremier: el resultado (RF-2, RF-14, D10, D13)", () => {
  const read = (handler: Handler) =>
    createLeetifyClient({ apiKey: KEY, fetchFn: fakeFetch(handler).fetchFn }).readPremier(STEAM_ID, signal());

  test("200 con rating → con rango", async () => {
    assert.deepEqual(await read(() => json(profile(36210))), { kind: "rated", rating: 36210 });
  });

  test("200 con 0, nulo o sin `ranks` → sin rango Premier", async () => {
    assert.deepEqual(await read(() => json(profile(0))), { kind: "unrated" });
    assert.deepEqual(await read(() => json(profile(null))), { kind: "unrated" });
    assert.deepEqual(await read(() => json({ name: "x" })), { kind: "unrated" });
  });

  test("404 → sin rango Premier, aunque el cuerpo no sea JSON (P15-3)", async () => {
    assert.deepEqual(await read(() => new Response("no existe", { status: 404 })), { kind: "unrated" });
    assert.deepEqual(await read(() => json({ message: "not found" }, 404)), { kind: "unrated" });
  });

  test("clave rechazada, límite superado y caída → fallo", async () => {
    for (const status of [401, 403, 429, 500, 502, 503]) {
      assert.deepEqual(await read(() => json({}, status)), { kind: "failed" }, String(status));
    }
  });

  test("rating inválido → fallo", async () => {
    for (const premier of [-1, 12.5, 100000, "19309"]) {
      assert.deepEqual(await read(() => json(profile(premier))), { kind: "failed" }, String(premier));
    }
  });

  test("un 200 con JSON roto o vacío → fallo", async () => {
    assert.deepEqual(await read(() => new Response("{no es json", { status: 200 })), { kind: "failed" });
    assert.deepEqual(await read(() => new Response("", { status: 200 })), { kind: "failed" });
  });

  test("el fetch lanza, con o sin red → fallo, sin dejar escapar el error", async () => {
    const reading = await read(() => {
      throw new Error(`fallo de red con ${KEY}`);
    });
    assert.deepEqual(reading, { kind: "failed" });
    assert.equal(JSON.stringify(reading).includes(KEY), false);
  });

  test("la señal cancelada corta la consulta → fallo", async () => {
    const controller = new AbortController();
    const { fetchFn } = fakeFetch(
      ({ init }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("cancelada", "AbortError")));
        }),
    );
    const pending = createLeetifyClient({ apiKey: KEY, fetchFn }).readPremier(STEAM_ID, controller.signal);
    controller.abort();
    assert.deepEqual(await pending, { kind: "failed" });
  });
});
