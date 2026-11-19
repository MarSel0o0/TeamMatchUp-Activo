// Cliente HTTP de Riot Games: única pieza con red y con `RIOT_API_KEY` (spec 014, RF-3, RF-11,
// RF-16, RF-35, RF-50, RF-52, RNF-2, RNF-4, RNF-6, RNF-7; plan, §§1.2, 2.2 y P14-10).
// - Envía la clave exclusivamente en la cabecera `X-Riot-Token` (nunca en la URL).
// - Nunca registra errores, cabeceras ni respuestas con la clave (RNF-4).
// - Combina el plazo individual de 8 s por consulta con `opSignal` mediante `AbortSignal.any`.
// - `fetchFn` es inyectable para que las pruebas nunca toquen la red (RNF-2).
import {
  RIOT_SOLO_QUEUE_ID,
  parseRiotAccount,
  parseRiotMatch,
  parseRiotSoloRank,
  parseRiotSummoner,
} from "../domain/riotData.ts";
import type {
  RiotAccountData,
  RiotMatchRecord,
  RiotRankSnapshot,
} from "../domain/riotData.ts";
import { RIOT_PLATFORMS, RIOT_ROUTING } from "../domain/riotRules.ts";
import type { LolRegion } from "../domain/riotRules.ts";
import { SOURCE_TIMEOUT_MS } from "./realSources.ts";

/** Plazo máximo por consulta individual a Riot Games: 8 segundos (RNF-6). */
export const RIOT_REQUEST_TIMEOUT_MS = SOURCE_TIMEOUT_MS;

const SOLO_MATCH_IDS_COUNT = 20;

export interface RiotIdParts {
  gameName: string;
  tagLine: string;
}

export interface RiotSummonerData {
  profileIconId: number;
  level: number | null;
}

export type RiotAccountResult =
  | { kind: "ok"; account: RiotAccountData }
  | { kind: "not_found" }
  | { kind: "unavailable" }
  | { kind: "invalid_data" };

export type RiotSummonerResult =
  | { kind: "ok"; summoner: RiotSummonerData }
  | { kind: "not_found" }
  | { kind: "unavailable" }
  | { kind: "invalid_data" };

export type RiotSoloRankResult =
  | { kind: "ok"; rank: RiotRankSnapshot | null }
  | { kind: "not_found" }
  | { kind: "unavailable" }
  | { kind: "invalid_data" };

export type RiotMatchIdsResult =
  | { kind: "ok"; matchIds: string[] }
  | { kind: "not_found" }
  | { kind: "unavailable" }
  | { kind: "invalid_data" };

export type RiotMatchResult =
  | { kind: "ok"; match: RiotMatchRecord }
  | { kind: "remake" }
  | { kind: "not_found" }
  | { kind: "unavailable" }
  | { kind: "invalid_data" };

export interface RiotClient {
  getAccountByRiotId(
    riotId: RiotIdParts,
    region: LolRegion,
    signal?: AbortSignal,
  ): Promise<RiotAccountResult>;
  getAccountByPuuid(
    puuid: string,
    region: LolRegion,
    signal?: AbortSignal,
  ): Promise<RiotAccountResult>;
  getSummonerByPuuid(
    puuid: string,
    region: LolRegion,
    signal?: AbortSignal,
  ): Promise<RiotSummonerResult>;
  getSoloRankByPuuid(
    puuid: string,
    region: LolRegion,
    signal?: AbortSignal,
    recordedAt?: Date,
  ): Promise<RiotSoloRankResult>;
  getSoloMatchIds(
    puuid: string,
    region: LolRegion,
    signal?: AbortSignal,
  ): Promise<RiotMatchIdsResult>;
  getMatchById(
    matchId: string,
    puuid: string,
    region: LolRegion,
    signal?: AbortSignal,
  ): Promise<RiotMatchResult>;
}

export interface RiotClientOptions {
  /** Clave de la API de Riot: secreto de la instancia (RNF-4). */
  apiKey: string;
  /** Implementación de `fetch` inyectable para pruebas sin red (RNF-2). */
  fetchFn?: typeof fetch;
  /** Plazo por consulta individual en ms (por defecto 8000 ms, RNF-6). */
  requestTimeoutMs?: number;
  /** Reloj para fechar las fotografías de rango (por defecto `() => new Date()`). */
  now?: () => Date;
}

type HttpJsonResult =
  | { kind: "ok"; body: unknown }
  | { kind: "not_found" }
  | { kind: "unavailable" };

function platformUrl(region: LolRegion, pathname: string): URL {
  return new URL(pathname, `https://${RIOT_PLATFORMS[region]}.api.riotgames.com`);
}

function routingUrl(region: LolRegion, pathname: string): URL {
  return new URL(pathname, `https://${RIOT_ROUTING[region]}.api.riotgames.com`);
}

function parseMatchIdList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || item.trim().length === 0) return null;
    if (ids.length < SOLO_MATCH_IDS_COUNT) ids.push(item);
  }
  return ids;
}

/** Crea el cliente HTTP de Riot Games con clave aislada en cabecera `X-Riot-Token`. */
export function createRiotClient({
  apiKey,
  fetchFn = fetch,
  requestTimeoutMs = RIOT_REQUEST_TIMEOUT_MS,
  now = () => new Date(),
}: RiotClientOptions): RiotClient {
  async function requestJson(url: URL, opSignal?: AbortSignal): Promise<HttpJsonResult> {
    if (opSignal?.aborted) return { kind: "unavailable" };

    const timeoutController = new AbortController();
    const combinedSignal =
      opSignal === undefined
        ? timeoutController.signal
        : AbortSignal.any([timeoutController.signal, opSignal]);

    let onAbort: (() => void) | undefined;
    const aborted = new Promise<HttpJsonResult>((resolve) => {
      onAbort = () => resolve({ kind: "unavailable" });
      combinedSignal.addEventListener("abort", onAbort, { once: true });
    });

    const timer = setTimeout(() => {
      timeoutController.abort();
    }, requestTimeoutMs);

    const perform = (async (): Promise<HttpJsonResult> => {
      try {
        const response = await fetchFn(url, {
          method: "GET",
          headers: {
            "X-Riot-Token": apiKey,
            Accept: "application/json",
          },
          signal: combinedSignal,
        });
        if (response.status === 404) return { kind: "not_found" };
        if (response.status !== 200) return { kind: "unavailable" };
        const body: unknown = await response.json();
        return { kind: "ok", body };
      } catch {
        // Nunca se registra ni se reenvía el error para evitar fugas de cabeceras o clave (RNF-4).
        return { kind: "unavailable" };
      }
    })();

    try {
      return await Promise.race([perform, aborted]);
    } finally {
      clearTimeout(timer);
      if (onAbort !== undefined) combinedSignal.removeEventListener("abort", onAbort);
    }
  }

  return {
    async getAccountByRiotId({ gameName, tagLine }, region, signal) {
      const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      const res = await requestJson(routingUrl(region, path), signal);
      if (res.kind !== "ok") return res;
      const parsed = parseRiotAccount(res.body);
      return parsed.ok ? { kind: "ok", account: parsed.account } : { kind: "invalid_data" };
    },

    async getAccountByPuuid(puuid, region, signal) {
      const path = `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`;
      const res = await requestJson(routingUrl(region, path), signal);
      if (res.kind !== "ok") return res;
      const parsed = parseRiotAccount(res.body);
      return parsed.ok ? { kind: "ok", account: parsed.account } : { kind: "invalid_data" };
    },

    async getSummonerByPuuid(puuid, region, signal) {
      const path = `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
      const res = await requestJson(platformUrl(region, path), signal);
      if (res.kind !== "ok") return res;
      const parsed = parseRiotSummoner(res.body);
      return parsed.ok
        ? { kind: "ok", summoner: { profileIconId: parsed.profileIconId, level: parsed.level } }
        : { kind: "invalid_data" };
    },

    async getSoloRankByPuuid(puuid, region, signal, recordedAt) {
      const path = `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
      const res = await requestJson(platformUrl(region, path), signal);
      if (res.kind !== "ok") return res;
      const parsed = parseRiotSoloRank(res.body, recordedAt ?? now());
      if (!parsed.ok) return { kind: "invalid_data" };
      return parsed.kind === "unranked"
        ? { kind: "ok", rank: null }
        : { kind: "ok", rank: parsed.snapshot };
    },

    async getSoloMatchIds(puuid, region, signal) {
      const url = routingUrl(
        region,
        `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
      );
      url.searchParams.set("queue", String(RIOT_SOLO_QUEUE_ID));
      url.searchParams.set("start", "0");
      url.searchParams.set("count", String(SOLO_MATCH_IDS_COUNT));
      const res = await requestJson(url, signal);
      if (res.kind !== "ok") return res;
      const matchIds = parseMatchIdList(res.body);
      return matchIds === null ? { kind: "invalid_data" } : { kind: "ok", matchIds };
    },

    async getMatchById(matchId, puuid, region, signal) {
      const path = `/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
      const res = await requestJson(routingUrl(region, path), signal);
      if (res.kind !== "ok") return res;
      const parsed = parseRiotMatch(res.body, puuid);
      if (parsed.kind === "remake") return { kind: "remake" };
      if (parsed.kind === "invalid") return { kind: "invalid_data" };
      return { kind: "ok", match: parsed.match };
    },
  };
}
