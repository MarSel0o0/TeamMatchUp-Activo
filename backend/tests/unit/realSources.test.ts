// Plazos de las consultas a fuentes reales (spec 012, RF-19, RNF-5; spec 015, T2, RF-14, RNF-4;
// plan 015, sección 2 y P15-9). Plazos cortos y sin red: solo temporizadores.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_TIMEOUT_MS,
  readMatchesWithTimeout,
  readPremierWithTimeout,
  readWithTimeout,
  withTimeout,
} from "../../src/services/realSources.ts";
import type { RealResult, RealSource } from "../../src/services/realSources.ts";
import type { LeetifyClient } from "../../src/services/leetifyClient.ts";
import type { LeetifyMatchesReading, LeetifyReading } from "../../src/domain/leetify.ts";

const ACCOUNT = { gameId: "cs2", handle: "76561198000000001", externalId: "76561198000000001" } as const;
const STEAM_ID = "76561198000000001";
const FAILED: LeetifyReading = { kind: "failed" };

describe("SOURCE_TIMEOUT_MS (spec 012, RNF-5; spec 015, RNF-4)", () => {
  test("cada consulta tiene un plazo de 8 segundos", () => {
    assert.equal(SOURCE_TIMEOUT_MS, 8000);
  });
});

describe("withTimeout", () => {
  test("devuelve lo que responde `run` si llega a tiempo", async () => {
    assert.equal(await withTimeout(async () => "ok", "plazo", 1000), "ok");
  });

  test("si `run` lanza, devuelve el valor de reemplazo", async () => {
    const result = await withTimeout(
      async () => {
        throw new Error("boom");
      },
      "plazo",
      1000,
    );
    assert.equal(result, "plazo");
  });

  test("si vence el plazo devuelve el valor de reemplazo aunque `run` ignore la señal, y la cancela", async () => {
    let received: AbortSignal | undefined;
    const started = Date.now();
    const result = await withTimeout(
      (signal) => {
        received = signal;
        return new Promise<string>(() => undefined); // nunca responde y no mira la señal
      },
      "plazo",
      20,
    );
    assert.equal(result, "plazo");
    assert.equal(received?.aborted, true);
    assert.ok(Date.now() - started < 1000);
  });

  test("una respuesta que llega a tiempo no cancela la señal", async () => {
    let received: AbortSignal | undefined;
    await withTimeout(
      async (signal) => {
        received = signal;
        return 1;
      },
      0,
      1000,
    );
    assert.equal(received?.aborted, false);
  });
});

describe("readWithTimeout: no cambia por fuera (spec 012, RF-19)", () => {
  const source = (read: RealSource["read"]): RealSource => ({ id: "steam", read });
  const ok: RealResult = { ok: true, data: { handle: STEAM_ID } };

  test("pasa el resultado de la fuente, también `gone`", async () => {
    assert.deepEqual(await readWithTimeout(source(async () => ok), ACCOUNT, 1000), ok);
    const gone: RealResult = { ok: false, reason: "gone" };
    assert.deepEqual(await readWithTimeout(source(async () => gone), ACCOUNT, 1000), gone);
  });

  test("excepción o plazo vencido → no disponible", async () => {
    const unavailable: RealResult = { ok: false, reason: "unavailable" };
    const throws = source(async () => {
      throw new Error("boom");
    });
    assert.deepEqual(await readWithTimeout(throws, ACCOUNT, 1000), unavailable);
    const hangs = source(() => new Promise<RealResult>(() => undefined));
    assert.deepEqual(await readWithTimeout(hangs, ACCOUNT, 20), unavailable);
  });
});

describe("readPremierWithTimeout (RF-14, RNF-4, P15-9)", () => {
  const client = (readPremier: LeetifyClient["readPremier"]): LeetifyClient => ({ readPremier });

  test("pasa la lectura del cliente y el SteamID64", async () => {
    let seen: string | undefined;
    const reading = await readPremierWithTimeout(
      client(async (steamId) => {
        seen = steamId;
        return { kind: "rated", rating: 19309 };
      }),
      STEAM_ID,
      1000,
    );
    assert.deepEqual(reading, { kind: "rated", rating: 19309 });
    assert.equal(seen, STEAM_ID);
  });

  test("sin perfil en Leetify sigue siendo sin rango Premier, no un fallo", async () => {
    const reading = await readPremierWithTimeout(client(async () => ({ kind: "unrated" })), STEAM_ID, 1000);
    assert.deepEqual(reading, { kind: "unrated" });
  });

  test("sin cliente toda lectura es fallo (P15-9): nunca hay red", async () => {
    assert.deepEqual(await readPremierWithTimeout(undefined, STEAM_ID, 1000), FAILED);
  });

  test("si el cliente lanza → fallo", async () => {
    const reading = await readPremierWithTimeout(
      client(async () => {
        throw new Error("boom");
      }),
      STEAM_ID,
      1000,
    );
    assert.deepEqual(reading, FAILED);
  });

  test("si vence el plazo → fallo, aunque el cliente ignore la señal, y se cancela", async () => {
    let received: AbortSignal | undefined;
    const reading = await readPremierWithTimeout(
      client((_steamId, signal) => {
        received = signal;
        return new Promise<LeetifyReading>(() => undefined);
      }),
      STEAM_ID,
      20,
    );
    assert.deepEqual(reading, FAILED);
    assert.equal(received?.aborted, true);
  });
});

// Spec 019 (T2): partidas de Leetify con plazo (RF-7; spec 015, RNF-4).
describe("readMatchesWithTimeout (spec 019, RF-7)", () => {
  const MATCHES_FAILED: LeetifyMatchesReading = { kind: "failed" };
  const client = (readRecentMatches: NonNullable<LeetifyClient["readRecentMatches"]>): LeetifyClient => ({
    readPremier: async () => ({ kind: "failed" }),
    readRecentMatches,
  });

  test("pasa la lectura del cliente y el SteamID64", async () => {
    let seen: string | undefined;
    const reading = await readMatchesWithTimeout(
      client(async (steamId) => {
        seen = steamId;
        return { kind: "matches", matches: [] };
      }),
      STEAM_ID,
      1000,
    );
    assert.deepEqual(reading, { kind: "matches", matches: [] });
    assert.equal(seen, STEAM_ID);
  });

  test("sin cliente, o con un cliente sin el método, es fallo y nunca hay red (P19-3)", async () => {
    assert.deepEqual(await readMatchesWithTimeout(undefined, STEAM_ID, 1000), MATCHES_FAILED);
    assert.deepEqual(
      await readMatchesWithTimeout({ readPremier: async () => ({ kind: "failed" }) }, STEAM_ID, 1000),
      MATCHES_FAILED,
    );
  });

  test("si el cliente lanza → fallo", async () => {
    const reading = await readMatchesWithTimeout(
      client(async () => {
        throw new Error("boom");
      }),
      STEAM_ID,
      1000,
    );
    assert.deepEqual(reading, MATCHES_FAILED);
  });

  test("si vence el plazo → fallo y se cancela la consulta", async () => {
    let received: AbortSignal | undefined;
    const reading = await readMatchesWithTimeout(
      client((_steamId, signal) => {
        received = signal;
        return new Promise<LeetifyMatchesReading>(() => undefined);
      }),
      STEAM_ID,
      20,
    );
    assert.deepEqual(reading, MATCHES_FAILED);
    assert.equal(received?.aborted, true);
  });
});
