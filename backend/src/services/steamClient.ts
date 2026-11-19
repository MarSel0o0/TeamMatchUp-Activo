// Cliente de Steam: única pieza con red y con la clave de la API (spec 013, RF-4, RF-9, RF-10,
// RF-11, RF-12, RF-23, RNF-1, RNF-2, RNF-3; plan, 4.3, P13-10 y P13-11).
// - `verifyAssertion` pide a Steam que confirme una respuesta de inicio de sesión
//   (`check_authentication`). Va al sitio de inicio de sesión, no a la API: **no lleva la clave**.
// - `readProfile` lee el resumen y los juegos del SteamID64 con la clave de la API. Todo o nada:
//   si cualquiera de las dos consultas falla, no hay perfil (P13-11).
// - Cualquier fallo (red, plazo, estado distinto de 200, JSON ilegible) es `unavailable`. Nunca se
//   registra ni se devuelve la dirección ni el error, porque la dirección lleva la clave (RNF-2).
// - `fetch` se inyecta: las pruebas no tocan la red (RNF-3, P13-10).
import { STEAM_OPENID_URL, buildCheckAuthBody, isValidCheckResponse } from "../domain/steamOpenId.ts";
import { CS2_APP_ID, steamProfileFrom } from "../domain/steamProfile.ts";
import type { SteamOwned, SteamSummary } from "../domain/steamProfile.ts";
import type { RealResult } from "./realSources.ts";

const API_ORIGIN = "https://api.steampowered.com";

export type AssertionResult = "valid" | "invalid" | "unavailable";

export interface SteamClient {
  /** Pregunta a Steam si la respuesta de inicio de sesión es auténtica (RF-4). */
  verifyAssertion(params: Readonly<Record<string, string>>, signal: AbortSignal): Promise<AssertionResult>;
  /** Perfil y horas de CS2 del SteamID64; `gone` si Steam no conoce la cuenta (RF-23). */
  readProfile(steamId: string, signal: AbortSignal): Promise<RealResult>;
}

export interface SteamClientOptions {
  /** Clave de la API web de Steam: secreto de la instancia (RNF-2). */
  apiKey: string;
  fetchFn?: typeof fetch;
}

const UNAVAILABLE: RealResult = { ok: false, reason: "unavailable" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `response` de una respuesta de la API, o `null` si no tiene esa forma. */
function responseObject(body: unknown): Record<string, unknown> | null {
  if (!isRecord(body)) return null;
  const inner = body["response"];
  return isRecord(inner) ? inner : null;
}

export function createSteamClient({ apiKey, fetchFn = fetch }: SteamClientOptions): SteamClient {
  async function getJson(path: string, query: Record<string, string>, signal: AbortSignal): Promise<unknown> {
    const url = new URL(path, API_ORIGIN);
    for (const [name, value] of Object.entries({ key: apiKey, format: "json", ...query })) {
      url.searchParams.set(name, value);
    }
    const response = await fetchFn(url, { method: "GET", headers: { Accept: "application/json" }, signal });
    if (response.status !== 200) throw new Error("respuesta de Steam no exitosa");
    return (await response.json()) as unknown;
  }

  return {
    async verifyAssertion(params, signal) {
      try {
        const response = await fetchFn(STEAM_OPENID_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(buildCheckAuthBody(params)).toString(),
          signal,
        });
        if (response.status !== 200) return "unavailable";
        return isValidCheckResponse(await response.text()) ? "valid" : "invalid";
      } catch {
        return "unavailable";
      }
    },

    async readProfile(steamId, signal): Promise<RealResult> {
      try {
        const [summaries, owned] = await Promise.all([
          getJson("/ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId }, signal),
          getJson(
            "/IPlayerService/GetOwnedGames/v1/",
            { steamid: steamId, include_played_free_games: "1", "appids_filter[0]": String(CS2_APP_ID) },
            signal,
          ),
        ]);
        const summariesResponse = responseObject(summaries);
        const ownedResponse = responseObject(owned);
        if (summariesResponse === null || ownedResponse === null) return UNAVAILABLE;
        const players = summariesResponse["players"];
        if (!Array.isArray(players)) return UNAVAILABLE;
        const player: unknown = players[0];
        if (player === undefined) return { ok: false, reason: "gone" };
        if (!isRecord(player)) return UNAVAILABLE;
        return {
          ok: true,
          data: { handle: steamId, profile: steamProfileFrom(player as SteamSummary, ownedResponse as SteamOwned) },
        };
      } catch {
        return UNAVAILABLE;
      }
    },
  };
}
