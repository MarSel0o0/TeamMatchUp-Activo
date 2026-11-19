// Cliente y fuente de Steam con un `fetch` falso (spec 013, T4). Ninguna prueba toca la red
// (RNF-3). RF-4, RF-9, RF-10, RF-11, RF-14, RF-17, RF-23, RNF-1, RNF-2; plan, 4.3, P13-10, P13-11.
import { afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import { createSteamClient } from "../../src/services/steamClient.ts";
import { createSteamSource } from "../../src/services/steamSource.ts";
import type { SteamClient } from "../../src/services/steamClient.ts";

const KEY = "CLAVE-FALSA-0123456789ABCDEF012345";
const STEAM_ID = "76561198000000001";
const AVATAR = "https://avatars.fastly.steamstatic.com/abcdef_full.jpg";
const PARAMS = {
  "openid.ns": "http://specs.openid.net/auth/2.0",
  "openid.mode": "id_res",
  "openid.claimed_id": `https://steamcommunity.com/openid/id/${STEAM_ID}`,
  "openid.sig": "firma=",
};

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

const summariesOk = {
  response: { players: [{ steamid: STEAM_ID, personaname: "Vicho", avatarfull: AVATAR, loccountrycode: "CL" }] },
};
const ownedOk = {
  response: { game_count: 1, games: [{ appid: 730, playtime_forever: 18_720, playtime_2weeks: 1_135 }] },
};

/** Responde a cada una de las dos consultas del perfil según su dirección. */
function profileHandler(summaries: Response | (() => Response), owned: Response | (() => Response)): Handler {
  return ({ url }) => {
    const pick = url.pathname.includes("GetPlayerSummaries") ? summaries : owned;
    return typeof pick === "function" ? pick() : pick;
  };
}

const signal = () => new AbortController().signal;

afterEach(() => mock.restoreAll());

describe("verifyAssertion (RF-4, RF-9, RNF-1)", () => {
  test("is_valid:true → valid; envía a Steam solo los openid.* con check_authentication", async () => {
    const { fetchFn, calls } = fakeFetch(() => new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"));
    const client = createSteamClient({ apiKey: KEY, fetchFn });
    assert.equal(await client.verifyAssertion({ ...PARAMS, intruso: "no-debe-salir" }, signal()), "valid");
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(`${call?.url.origin ?? ""}${call?.url.pathname ?? ""}`, "https://steamcommunity.com/openid/login");
    assert.equal(call?.init?.method, "POST");
    const body = new URLSearchParams(String(call?.init?.body));
    assert.equal(body.get("openid.mode"), "check_authentication");
    assert.equal(body.get("openid.sig"), "firma=");
    assert.equal(body.has("intruso"), false);
  });

  test("RNF-2: la clave de la API nunca viaja en la confirmación de la identidad", async () => {
    const { fetchFn, calls } = fakeFetch(() => new Response("is_valid:true\n"));
    await createSteamClient({ apiKey: KEY, fetchFn }).verifyAssertion(PARAMS, signal());
    const [call] = calls;
    assert.equal(String(call?.url).includes(KEY), false);
    assert.equal(String(call?.init?.body).includes(KEY), false);
    assert.equal(JSON.stringify(call?.init?.headers ?? {}).includes(KEY), false);
  });

  test("is_valid:false → invalid", async () => {
    const { fetchFn } = fakeFetch(() => new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:false\n"));
    assert.equal(await createSteamClient({ apiKey: KEY, fetchFn }).verifyAssertion(PARAMS, signal()), "invalid");
  });

  test("respuesta vacía con 200 → invalid", async () => {
    const { fetchFn } = fakeFetch(() => new Response(""));
    assert.equal(await createSteamClient({ apiKey: KEY, fetchFn }).verifyAssertion(PARAMS, signal()), "invalid");
  });

  test("HTTP 500, 503 o 429 → unavailable", async () => {
    for (const status of [500, 503, 429, 403]) {
      const { fetchFn } = fakeFetch(() => new Response("is_valid:true", { status }));
      assert.equal(
        await createSteamClient({ apiKey: KEY, fetchFn }).verifyAssertion(PARAMS, signal()),
        "unavailable",
        String(status),
      );
    }
  });

  test("error de red → unavailable", async () => {
    const { fetchFn } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    assert.equal(await createSteamClient({ apiKey: KEY, fetchFn }).verifyAssertion(PARAMS, signal()), "unavailable");
  });

  test("plazo vencido (señal cancelada) → unavailable", async () => {
    const controller = new AbortController();
    const { fetchFn } = fakeFetch(
      ({ init }) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }) as never,
    );
    const pending = createSteamClient({ apiKey: KEY, fetchFn }).verifyAssertion(PARAMS, controller.signal);
    controller.abort();
    assert.equal(await pending, "unavailable");
  });
});

describe("readProfile (RF-10, RF-11, RF-17, RF-23)", () => {
  test("perfil público: nombre, avatar, país y horas de CS2", async () => {
    const { fetchFn } = fakeFetch(profileHandler(json(summariesOk), json(ownedOk)));
    const result = await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.deepEqual(result, {
      ok: true,
      data: {
        handle: STEAM_ID,
        profile: { displayName: "Vicho", avatarUrl: AVATAR, country: "CL", hoursTotal: 312, hoursRecent: 18 },
      },
    });
  });

  test("pide el resumen y los juegos del SteamID64 con la clave, la lista de CS2 y los juegos gratuitos", async () => {
    const { fetchFn, calls } = fakeFetch(profileHandler(json(summariesOk), json(ownedOk)));
    await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.equal(calls.length, 2);
    const summaries = calls.find((call) => call.url.pathname.includes("GetPlayerSummaries"));
    const owned = calls.find((call) => call.url.pathname.includes("GetOwnedGames"));
    assert.ok(summaries && owned);
    assert.equal(summaries.url.origin, "https://api.steampowered.com");
    assert.equal(summaries.url.searchParams.get("key"), KEY);
    assert.equal(summaries.url.searchParams.get("steamids"), STEAM_ID);
    assert.equal(owned.url.origin, "https://api.steampowered.com");
    assert.equal(owned.url.searchParams.get("key"), KEY);
    assert.equal(owned.url.searchParams.get("steamid"), STEAM_ID);
    assert.equal(owned.url.searchParams.get("include_played_free_games"), "1");
    assert.equal(owned.url.searchParams.get("appids_filter[0]"), "730");
    assert.equal(summaries.init?.method ?? "GET", "GET");
  });

  test("detalles de juego privados (respuesta vacía): país visible y sin horas", async () => {
    const { fetchFn } = fakeFetch(profileHandler(json(summariesOk), json({ response: {} })));
    const result = await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.deepEqual(result, {
      ok: true,
      data: { handle: STEAM_ID, profile: { displayName: "Vicho", avatarUrl: AVATAR, country: "CL" } },
    });
  });

  test("perfil privado: solo nombre y avatar, sin país ni horas", async () => {
    const privatePlayer = { response: { players: [{ steamid: STEAM_ID, personaname: "Anon", avatarfull: AVATAR }] } };
    const { fetchFn } = fakeFetch(profileHandler(json(privatePlayer), json({ response: {} })));
    const result = await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.deepEqual(result, {
      ok: true,
      data: { handle: STEAM_ID, profile: { displayName: "Anon", avatarUrl: AVATAR } },
    });
  });

  test("lista de juegos entregada pero sin CS2: 0 h y 0 h (RF-17)", async () => {
    const { fetchFn } = fakeFetch(profileHandler(json(summariesOk), json({ response: { game_count: 0 } })));
    const result = await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.ok(result.ok);
    assert.equal(result.data.profile?.hoursTotal, 0);
    assert.equal(result.data.profile?.hoursRecent, 0);
  });

  test("jugador inexistente (players vacío) → gone (RF-23)", async () => {
    const { fetchFn } = fakeFetch(profileHandler(json({ response: { players: [] } }), json({ response: {} })));
    assert.deepEqual(await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal()), {
      ok: false,
      reason: "gone",
    });
  });

  test("HTTP 500, 429 o 403 (clave rechazada) en cualquiera de las dos consultas → unavailable", async () => {
    for (const status of [500, 503, 429, 403, 401]) {
      for (const failing of ["summaries", "owned"] as const) {
        const bad = () => json({ error: "x" }, status);
        const handler = failing === "summaries"
          ? profileHandler(bad, json(ownedOk))
          : profileHandler(json(summariesOk), bad);
        const { fetchFn } = fakeFetch(handler);
        assert.deepEqual(
          await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal()),
          { ok: false, reason: "unavailable" },
          `${failing} ${status}`,
        );
      }
    }
  });

  test("P13-11: si falla una de las dos consultas no se guarda un perfil a medias", async () => {
    const { fetchFn } = fakeFetch(profileHandler(json(summariesOk), () => json({}, 500)));
    const result = await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.equal(result.ok, false);
  });

  test("JSON ilegible o con otra forma → unavailable, nunca una excepción", async () => {
    for (const bad of [new Response("<html>no es json</html>"), json(null), json("texto"), json({ response: 5 })]) {
      const { fetchFn } = fakeFetch(profileHandler(bad.clone(), json(ownedOk)));
      assert.deepEqual(await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal()), {
        ok: false,
        reason: "unavailable",
      });
    }
  });

  test("error de red → unavailable", async () => {
    const { fetchFn } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    assert.deepEqual(await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal()), {
      ok: false,
      reason: "unavailable",
    });
  });

  test("plazo vencido (señal cancelada) → unavailable", async () => {
    const controller = new AbortController();
    const { fetchFn } = fakeFetch(
      ({ init }) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }) as never,
    );
    const pending = createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, controller.signal);
    controller.abort();
    assert.deepEqual(await pending, { ok: false, reason: "unavailable" });
  });
});

describe("la clave nunca sale (RNF-2)", () => {
  test("un error de red con la dirección completa no se filtra al resultado ni a la consola", async () => {
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      mock.method(console, method, () => undefined),
    );
    const { fetchFn } = fakeFetch(({ url }) => {
      throw new Error(`fallo al pedir ${url.toString()}`);
    });
    const client = createSteamClient({ apiKey: KEY, fetchFn });
    const results = [
      await client.readProfile(STEAM_ID, signal()),
      await client.verifyAssertion(PARAMS, signal()),
    ];
    assert.equal(JSON.stringify(results).includes(KEY), false);
    assert.equal(JSON.stringify(results).includes("fallo al pedir"), false);
    for (const spy of consoleSpies) assert.equal(spy.mock.callCount(), 0);
  });

  test("ni el perfil entregado ni los resultados contienen la clave", async () => {
    const { fetchFn } = fakeFetch(profileHandler(json(summariesOk), json(ownedOk)));
    const result = await createSteamClient({ apiKey: KEY, fetchFn }).readProfile(STEAM_ID, signal());
    assert.equal(JSON.stringify(result).includes(KEY), false);
  });
});

describe("createSteamSource (RF-14, RF-23)", () => {
  function fakeClient(result: Awaited<ReturnType<SteamClient["readProfile"]>>) {
    const calls: { steamId: string; signal: AbortSignal }[] = [];
    const client: SteamClient = {
      verifyAssertion: async () => "valid",
      readProfile: async (steamId, readSignal) => {
        calls.push({ steamId, signal: readSignal });
        return result;
      },
    };
    return { client, calls };
  }

  test("representa a Steam", () => {
    assert.equal(createSteamSource(fakeClient({ ok: false, reason: "unavailable" }).client).id, "steam");
  });

  test("read pide el perfil del externalId con la misma señal y devuelve el resultado tal cual", async () => {
    const data = { ok: true as const, data: { handle: STEAM_ID, profile: { displayName: "Vicho" } } };
    const { client, calls } = fakeClient(data);
    const controller = new AbortController();
    const result = await createSteamSource(client).read(
      { gameId: "cs2", handle: STEAM_ID, externalId: STEAM_ID },
      controller.signal,
    );
    assert.deepEqual(result, data);
    assert.deepEqual(calls, [{ steamId: STEAM_ID, signal: controller.signal }]);
  });

  test("propaga gone y unavailable", async () => {
    for (const reason of ["gone", "unavailable"] as const) {
      const { client } = fakeClient({ ok: false, reason });
      const result = await createSteamSource(client).read(
        { gameId: "cs2", handle: STEAM_ID, externalId: STEAM_ID },
        signal(),
      );
      assert.deepEqual(result, { ok: false, reason });
    }
  });
});
