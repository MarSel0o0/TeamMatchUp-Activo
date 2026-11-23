// Pruebas unitarias del cliente HTTP de Riot Games con `fetch` inyectable (spec 014, T5).
// Ninguna prueba toca la red ni usa una clave real (RNF-2, RNF-4).
// RF-3, RF-11, RF-16, RF-35, RF-50, RF-52, RNF-2, RNF-4, RNF-6, RNF-7.
import { afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import {
  RIOT_PLATFORMS,
  RIOT_ROUTING,
  type LolRegion,
} from "../../src/domain/riotRules.ts";
import { logger } from "../../src/utils/logger.ts";
import {
  RIOT_REQUEST_TIMEOUT_MS,
  createRiotClient,
} from "../../src/services/riotClient.ts";

const FAKE_KEY = "RGAPI-clave-falsa-de-prueba-0123456789";
const PUUID = "puuid-falso-0001";
const MATCH_ID = "LA2_1234567890";
const FIXED_NOW = new Date("2026-11-19T12:00:00.000Z");

interface RecordedCall {
  url: URL;
  init: RequestInit | undefined;
}

type FetchHandler = (call: RecordedCall) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createFakeFetch(handler: FetchHandler) {
  const calls: RecordedCall[] = [];
  const fetchFn = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const call: RecordedCall = { url, init };
    calls.push(call);
    return handler(call);
  };
  return { fetchFn: fetchFn as typeof fetch, calls };
}

function headerValue(headers: HeadersInit | undefined, name: string): string | null {
  return new Headers(headers).get(name);
}

const VALID_ACCOUNT = { puuid: PUUID, gameName: "JugadorPro", tagLine: "LAS" };
const VALID_SUMMONER = { profileIconId: 12, summonerLevel: 184 };
const VALID_SOLO_RANK = [
  { queueType: "RANKED_FLEX_SR", tier: "SILVER", rank: "I", leaguePoints: 20 },
  { queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45 },
];
const VALID_MATCH = {
  metadata: { matchId: MATCH_ID },
  info: {
    queueId: 420,
    gameDuration: 1_770,
    gameEndTimestamp: Date.parse("2026-11-19T11:30:00.000Z"),
    endOfGameResult: "GameComplete",
    participants: [
      {
        puuid: PUUID,
        win: true,
        championName: "MonkeyKing",
        kills: 8,
        deaths: 2,
        assists: 9,
        gameEndedInEarlySurrender: false,
      },
    ],
  },
};

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

describe("riotClient: cabecera X-Riot-Token, hosts y enrutamiento (D4, RNF-4, P14-10)", () => {
  test("envía la clave solo en la cabecera X-Riot-Token y nunca en la URL en los 6 métodos", async () => {
    const { fetchFn, calls } = createFakeFetch(({ url }) => {
      if (url.pathname.includes("/riot/account/v1/")) return jsonResponse(VALID_ACCOUNT);
      if (url.pathname.includes("/lol/summoner/v4/")) return jsonResponse(VALID_SUMMONER);
      if (url.pathname.includes("/lol/league/v4/")) return jsonResponse(VALID_SOLO_RANK);
      if (url.pathname.endsWith("/ids")) return jsonResponse([MATCH_ID]);
      return jsonResponse(VALID_MATCH);
    });
    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn, now: () => FIXED_NOW });

    await client.getAccountByRiotId({ gameName: "JugadorPro", tagLine: "LAS" }, "LAS");
    await client.getAccountByPuuid(PUUID, "LAS");
    await client.getSummonerByPuuid(PUUID, "LAS");
    await client.getSoloRankByPuuid(PUUID, "LAS");
    await client.getRecentMatchIds(PUUID, "LAS");
    await client.getMatchById(MATCH_ID, PUUID, "LAS");

    assert.equal(calls.length, 6);
    for (const call of calls) {
      assert.equal(call.init?.method, "GET");
      assert.equal(headerValue(call.init?.headers, "X-Riot-Token"), FAKE_KEY);
      assert.equal(headerValue(call.init?.headers, "Accept"), "application/json");
      assert.equal(call.url.toString().includes(FAKE_KEY), false);
      assert.equal(call.url.searchParams.has("api_key"), false);
    }
  });

  test("dirige cada región de LoL a su plataforma y enrutamiento regional exactos (tabla D4)", async () => {
    const regions: LolRegion[] = ["LAS", "LAN", "NA", "BR", "EUW", "EUNE", "KR"];
    for (const region of regions) {
      const { fetchFn, calls } = createFakeFetch(({ url }) => {
        if (url.pathname.includes("/riot/account/v1/")) return jsonResponse(VALID_ACCOUNT);
        if (url.pathname.includes("/lol/summoner/v4/")) return jsonResponse(VALID_SUMMONER);
        if (url.pathname.includes("/lol/league/v4/")) return jsonResponse(VALID_SOLO_RANK);
        if (url.pathname.endsWith("/ids")) return jsonResponse([MATCH_ID]);
        return jsonResponse(VALID_MATCH);
      });
      const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn, now: () => FIXED_NOW });

      await client.getAccountByRiotId({ gameName: "Mi Nombre", tagLine: "TAG" }, region);
      await client.getAccountByPuuid(PUUID, region);
      await client.getSummonerByPuuid(PUUID, region);
      await client.getSoloRankByPuuid(PUUID, region);
      await client.getRecentMatchIds(PUUID, region);
      await client.getMatchById(MATCH_ID, PUUID, region);

      const routingOrigin = `https://${RIOT_ROUTING[region]}.api.riotgames.com`;
      const platformOrigin = `https://${RIOT_PLATFORMS[region]}.api.riotgames.com`;

      assert.equal(calls[0]?.url.origin, routingOrigin, `${region} by-riot-id`);
      assert.equal(
        calls[0]?.url.pathname,
        "/riot/account/v1/accounts/by-riot-id/Mi%20Nombre/TAG",
      );
      assert.equal(calls[1]?.url.origin, routingOrigin, `${region} by-puuid`);
      assert.equal(calls[1]?.url.pathname, `/riot/account/v1/accounts/by-puuid/${PUUID}`);

      assert.equal(calls[2]?.url.origin, platformOrigin, `${region} summoner`);
      assert.equal(calls[2]?.url.pathname, `/lol/summoner/v4/summoners/by-puuid/${PUUID}`);

      assert.equal(calls[3]?.url.origin, platformOrigin, `${region} league`);
      assert.equal(calls[3]?.url.pathname, `/lol/league/v4/entries/by-puuid/${PUUID}`);

      assert.equal(calls[4]?.url.origin, routingOrigin, `${region} match ids`);
      assert.equal(
        calls[4]?.url.pathname,
        `/lol/match/v5/matches/by-puuid/${PUUID}/ids`,
      );
      // Spec 020, RF-1, RNF-1: la lista ya no se filtra por cola, y sigue pidiendo 20 (mismo presupuesto de consultas).
      assert.equal(calls[4]?.url.searchParams.has("queue"), false);
      assert.equal(calls[4]?.url.searchParams.get("queue"), null);
      assert.equal(calls[4]?.url.searchParams.get("start"), "0");
      assert.equal(calls[4]?.url.searchParams.get("count"), "20");

      assert.equal(calls[5]?.url.origin, routingOrigin, `${region} match by id`);
      assert.equal(calls[5]?.url.pathname, `/lol/match/v5/matches/${MATCH_ID}`);
    }
  });
});

describe("riotClient: parseo de respuestas válidas e inválidas (RF-3, RF-11, RF-35, RF-50, RF-52)", () => {
  test("getAccountByRiotId y getAccountByPuuid devuelven la cuenta con las mayúsculas de Riot", async () => {
    const { fetchFn } = createFakeFetch(() => jsonResponse(VALID_ACCOUNT));
    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });

    const byId = await client.getAccountByRiotId({ gameName: "jugadorpro", tagLine: "las" }, "LAS");
    assert.deepEqual(byId, {
      kind: "ok",
      account: {
        puuid: PUUID,
        gameName: "JugadorPro",
        tagLine: "LAS",
        riotId: "JugadorPro#LAS",
      },
    });

    const byPuuid = await client.getAccountByPuuid(PUUID, "LAS");
    assert.deepEqual(byPuuid, byId);
  });

  test("getSummonerByPuuid separa ícono válido de nivel ilegible (D92, D94) y rechaza ícono inválido", async () => {
    const okFetch = createFakeFetch(() => jsonResponse(VALID_SUMMONER)).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: okFetch }).getSummonerByPuuid(PUUID, "LAS"),
      { kind: "ok", summoner: { profileIconId: 12, level: 184 } },
    );

    const badLevelFetch = createFakeFetch(() =>
      jsonResponse({ profileIconId: 7, summonerLevel: -3 }),
    ).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: badLevelFetch }).getSummonerByPuuid(
        PUUID,
        "LAS",
      ),
      { kind: "ok", summoner: { profileIconId: 7, level: null } },
    );

    const badIconFetch = createFakeFetch(() =>
      jsonResponse({ profileIconId: -1, summonerLevel: 50 }),
    ).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: badIconFetch }).getSummonerByPuuid(
        PUUID,
        "LAS",
      ),
      { kind: "invalid_data" },
    );
  });

  test("getSoloRankByPuuid devuelve rango Solo/Dúo, null si sin clasificar o invalid_data ante LP negativos", async () => {
    const rankedFetch = createFakeFetch(() => jsonResponse(VALID_SOLO_RANK)).fetchFn;
    const ranked = await createRiotClient({
      apiKey: FAKE_KEY,
      fetchFn: rankedFetch,
      now: () => FIXED_NOW,
    }).getSoloRankByPuuid(PUUID, "LAS");
    assert.equal(ranked.kind, "ok");
    assert.ok(ranked.rank !== null);
    assert.equal(ranked.rank.tier, "GOLD");
    assert.equal(ranked.rank.division, "II");
    assert.equal(ranked.rank.canonicalTier, "Gold");
    assert.equal(ranked.rank.points, 45);
    assert.deepEqual(ranked.rank.recordedAt, FIXED_NOW);

    const unrankedFetch = createFakeFetch(() =>
      jsonResponse([{ queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "IV", leaguePoints: 10 }]),
    ).fetchFn;
    assert.deepEqual(
      await createRiotClient({
        apiKey: FAKE_KEY,
        fetchFn: unrankedFetch,
        now: () => FIXED_NOW,
      }).getSoloRankByPuuid(PUUID, "LAS"),
      { kind: "ok", rank: null },
    );

    const negativeLpFetch = createFakeFetch(() =>
      jsonResponse([{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: -5 }]),
    ).fetchFn;
    assert.deepEqual(
      await createRiotClient({
        apiKey: FAKE_KEY,
        fetchFn: negativeLpFetch,
        now: () => FIXED_NOW,
      }).getSoloRankByPuuid(PUUID, "LAS"),
      { kind: "invalid_data" },
    );
  });

  test("getRecentMatchIds acepta lista vacía o de strings, limita a 20 y rechaza tipos inválidos", async () => {
    const emptyFetch = createFakeFetch(() => jsonResponse([])).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: emptyFetch }).getRecentMatchIds(PUUID, "LAS"),
      { kind: "ok", matchIds: [] },
    );

    const manyIds = Array.from({ length: 25 }, (_, i) => `LA2_${i + 1}`);
    const manyFetch = createFakeFetch(() => jsonResponse(manyIds)).fetchFn;
    const capped = await createRiotClient({ apiKey: FAKE_KEY, fetchFn: manyFetch }).getRecentMatchIds(
      PUUID,
      "LAS",
    );
    assert.deepEqual(capped, { kind: "ok", matchIds: manyIds.slice(0, 20) });

    for (const badBody of [{ ids: [] }, [123], [""], ["   "], null]) {
      const badFetch = createFakeFetch(() => jsonResponse(badBody)).fetchFn;
      assert.deepEqual(
        await createRiotClient({ apiKey: FAKE_KEY, fetchFn: badFetch }).getRecentMatchIds(PUUID, "LAS"),
        { kind: "invalid_data" },
      );
    }
  });

  test("getMatchById distingue partida válida, remake y datos inválidos", async () => {
    const okFetch = createFakeFetch(() => jsonResponse(VALID_MATCH)).fetchFn;
    const okResult = await createRiotClient({ apiKey: FAKE_KEY, fetchFn: okFetch }).getMatchById(
      MATCH_ID,
      PUUID,
      "LAS",
    );
    assert.deepEqual(okResult, {
      kind: "ok",
      match: {
        id: MATCH_ID,
        gameId: "lol",
        playedAt: new Date("2026-11-19T11:30:00.000Z"),
        result: "win",
        summary: "MonkeyKing · 8/2/9",
        durationMinutes: 30,
        mode: "solo", // la partida de la prueba es de la cola 420 (spec 020, RF-2)
      },
    });

    const remakeFetch = createFakeFetch(() =>
      jsonResponse({
        ...VALID_MATCH,
        info: {
          ...VALID_MATCH.info,
          gameDuration: 210,
          participants: [{ ...VALID_MATCH.info.participants[0], gameEndedInEarlySurrender: true }],
        },
      }),
    ).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: remakeFetch }).getMatchById(
        MATCH_ID,
        PUUID,
        "LAS",
      ),
      { kind: "remake" },
    );

    const invalidFetch = createFakeFetch(() => jsonResponse({ metadata: { matchId: MATCH_ID } })).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: invalidFetch }).getMatchById(
        MATCH_ID,
        PUUID,
        "LAS",
      ),
      { kind: "invalid_data" },
    );
  });
});

describe("riotClient: estados HTTP, errores de red y JSON roto (RF-3, RF-16, RF-35, RF-50, RF-52)", () => {
  test("HTTP 404 devuelve not_found en los 6 métodos", async () => {
    const { fetchFn } = createFakeFetch(() => jsonResponse({ status: { status_code: 404 } }, 404));
    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });

    assert.deepEqual(
      await client.getAccountByRiotId({ gameName: "Nadie", tagLine: "LAS" }, "LAS"),
      { kind: "not_found" },
    );
    assert.deepEqual(await client.getAccountByPuuid(PUUID, "LAS"), { kind: "not_found" });
    assert.deepEqual(await client.getSummonerByPuuid(PUUID, "LAS"), { kind: "not_found" });
    assert.deepEqual(await client.getSoloRankByPuuid(PUUID, "LAS"), { kind: "not_found" });
    assert.deepEqual(await client.getRecentMatchIds(PUUID, "LAS"), { kind: "not_found" });
    assert.deepEqual(await client.getMatchById(MATCH_ID, PUUID, "LAS"), { kind: "not_found" });
  });

  test("HTTP 401, 403, 429, 500, 502, 503 y 504 devuelven unavailable", async () => {
    for (const status of [401, 403, 429, 500, 502, 503, 504]) {
      const { fetchFn } = createFakeFetch(() => jsonResponse({ error: "fallo" }, status));
      const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });
      assert.deepEqual(
        await client.getAccountByRiotId({ gameName: "Jugador", tagLine: "LAS" }, "LAS"),
        { kind: "unavailable" },
        `account ${status}`,
      );
      assert.deepEqual(
        await client.getSummonerByPuuid(PUUID, "LAS"),
        { kind: "unavailable" },
        `summoner ${status}`,
      );
      assert.deepEqual(
        await client.getSoloRankByPuuid(PUUID, "LAS"),
        { kind: "unavailable" },
        `rank ${status}`,
      );
      assert.deepEqual(
        await client.getRecentMatchIds(PUUID, "LAS"),
        { kind: "unavailable" },
        `ids ${status}`,
      );
      assert.deepEqual(
        await client.getMatchById(MATCH_ID, PUUID, "LAS"),
        { kind: "unavailable" },
        `match ${status}`,
      );
    }
  });

  test("error de red y JSON roto con HTTP 200 devuelven unavailable sin lanzar excepción", async () => {
    const netFetch = createFakeFetch(() => {
      throw new TypeError("fetch failed");
    }).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: netFetch }).getAccountByPuuid(PUUID, "LAS"),
      { kind: "unavailable" },
    );

    const brokenJsonFetch = createFakeFetch(
      () => new Response("<html>no es json</html>", { status: 200 }),
    ).fetchFn;
    assert.deepEqual(
      await createRiotClient({ apiKey: FAKE_KEY, fetchFn: brokenJsonFetch }).getSummonerByPuuid(
        PUUID,
        "LAS",
      ),
      { kind: "unavailable" },
    );
  });
});

describe("riotClient: plazo de 8 s combinado con opSignal vía AbortSignal.any (RNF-6, RNF-7)", () => {
  test("el plazo por defecto es exactamente 8000 ms", () => {
    assert.equal(RIOT_REQUEST_TIMEOUT_MS, 8_000);
  });

  test("corta exactamente a los 8000 ms con temporizador controlado y aborta la señal entregada a fetch", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    let capturedSignal: AbortSignal | undefined;
    const { fetchFn } = createFakeFetch(({ init }) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {
        // Simula una consulta que nunca responde ni escucha la señal.
      });
    });

    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });
    let settled = false;
    const pending = client.getSummonerByPuuid(PUUID, "LAS").then((result) => {
      settled = true;
      return result;
    });

    mock.timers.tick(7_999);
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(capturedSignal?.aborted, false);

    mock.timers.tick(1);
    const result = await pending;
    assert.equal(settled, true);
    assert.equal(capturedSignal?.aborted, true);
    assert.deepEqual(result, { kind: "unavailable" });
  });

  test("combina el plazo de 8 s con opSignal: si opSignal se cancela antes, corta al instante", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const opController = new AbortController();
    let capturedSignal: AbortSignal | undefined;
    const { fetchFn } = createFakeFetch(({ init }) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    });

    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });
    const pending = client.getAccountByPuuid(PUUID, "LAS", opController.signal);

    mock.timers.tick(1_500);
    assert.equal(capturedSignal?.aborted, false);

    opController.abort();
    const result = await pending;
    assert.equal(capturedSignal?.aborted, true);
    assert.deepEqual(result, { kind: "unavailable" });
  });

  test("si opSignal ya llega cancelada, devuelve unavailable sin llamar a fetch", async () => {
    const opController = new AbortController();
    opController.abort();
    const { fetchFn, calls } = createFakeFetch(() => jsonResponse(VALID_ACCOUNT));
    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });

    const result = await client.getAccountByPuuid(PUUID, "LAS", opController.signal);
    assert.deepEqual(result, { kind: "unavailable" });
    assert.equal(calls.length, 0);
  });
});

describe("riotClient: sin fugas de la clave de Riot (RNF-4)", () => {
  test("errores con la clave y cabeceras nunca se filtran en el resultado, en console ni en logger", async () => {
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      mock.method(console, method, () => undefined),
    );
    const loggerInfoSpy = mock.method(logger, "info", () => undefined);
    const loggerErrorSpy = mock.method(logger, "error", () => undefined);

    const { fetchFn } = createFakeFetch(({ init }) => {
      const token = headerValue(init?.headers, "X-Riot-Token") ?? "";
      throw new Error(`fallo de red con X-Riot-Token=${token}`);
    });
    const client = createRiotClient({ apiKey: FAKE_KEY, fetchFn });

    const results = [
      await client.getAccountByRiotId({ gameName: "Jugador", tagLine: "LAS" }, "LAS"),
      await client.getAccountByPuuid(PUUID, "LAS"),
      await client.getSummonerByPuuid(PUUID, "LAS"),
      await client.getSoloRankByPuuid(PUUID, "LAS"),
      await client.getRecentMatchIds(PUUID, "LAS"),
      await client.getMatchById(MATCH_ID, PUUID, "LAS"),
    ];

    const serialized = JSON.stringify(results);
    assert.equal(serialized.includes(FAKE_KEY), false);
    assert.equal(serialized.includes("X-Riot-Token"), false);
    for (const spy of consoleSpies) assert.equal(spy.mock.callCount(), 0);
    assert.equal(loggerInfoSpy.mock.callCount(), 0);
    assert.equal(loggerErrorSpy.mock.callCount(), 0);
  });
});
