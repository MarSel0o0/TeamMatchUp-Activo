// Utilidades de las pruebas de las rutas de Riot Games (spec 014). No es un archivo de prueba.
// Riot Games se simula con un `RiotClient` falso: ninguna prueba toca la red ni usa clave real
// (RNF-2, RNF-4).
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type supertest from "supertest";
import type { AppOptions } from "../../src/app.ts";
import type { RiotIntegration } from "../../src/controllers/riot.ts";
import type { LolRegion } from "../../src/domain/riotRules.ts";
import type {
  RiotAccountResult,
  RiotClient,
  RiotIdParts,
  RiotMatchIdsResult,
  RiotMatchResult,
  RiotSoloRankResult,
  RiotSummonerResult,
} from "../../src/services/riotClient.ts";
import { authApp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

export const RIOT_PUUID = "puuid-falso-000000000000000000000000000000000001";
export const OTHER_RIOT_PUUID = "puuid-falso-000000000000000000000000000000000002";
export const RIOT_GAME_NAME = "JugadorUno";
export const RIOT_TAG_LINE = "LAS";
export const RIOT_ID = `${RIOT_GAME_NAME}#${RIOT_TAG_LINE}`;

type MaybeHandler<TResult, TArgs extends unknown[]> =
  | TResult
  | ((...args: TArgs) => TResult | Promise<TResult>);

export interface AccountByRiotIdCall {
  riotId: RiotIdParts;
  region: LolRegion;
}

export interface SummonerByPuuidCall {
  puuid: string;
  region: LolRegion;
}

export interface FakeRiotState {
  accountByRiotId: MaybeHandler<
    RiotAccountResult,
    [riotId: RiotIdParts, region: LolRegion, signal?: AbortSignal]
  >;
  accountByPuuid: MaybeHandler<
    RiotAccountResult,
    [puuid: string, region: LolRegion, signal?: AbortSignal]
  >;
  summonerByPuuid: MaybeHandler<
    RiotSummonerResult,
    [puuid: string, region: LolRegion, signal?: AbortSignal]
  >;
  soloRankByPuuid: MaybeHandler<
    RiotSoloRankResult,
    [puuid: string, region: LolRegion, signal?: AbortSignal, recordedAt?: Date]
  >;
  recentMatchIds: MaybeHandler<
    RiotMatchIdsResult,
    [puuid: string, region: LolRegion, signal?: AbortSignal]
  >;
  matchById: MaybeHandler<
    RiotMatchResult,
    [matchId: string, puuid: string, region: LolRegion, signal?: AbortSignal]
  >;
  accountByRiotIdCalls: AccountByRiotIdCall[];
  accountByPuuidCalls: SummonerByPuuidCall[];
  summonerByPuuidCalls: SummonerByPuuidCall[];
  soloRankCalls: SummonerByPuuidCall[];
  recentMatchIdsCalls: SummonerByPuuidCall[];
  matchByIdCalls: { matchId: string; puuid: string; region: LolRegion }[];
}

function defaultState(): FakeRiotState {
  return {
    accountByRiotId: {
      kind: "ok",
      account: {
        puuid: RIOT_PUUID,
        gameName: RIOT_GAME_NAME,
        tagLine: RIOT_TAG_LINE,
        riotId: RIOT_ID,
      },
    },
    accountByPuuid: {
      kind: "ok",
      account: {
        puuid: RIOT_PUUID,
        gameName: RIOT_GAME_NAME,
        tagLine: RIOT_TAG_LINE,
        riotId: RIOT_ID,
      },
    },
    summonerByPuuid: {
      kind: "ok",
      summoner: { profileIconId: 0, level: 120 },
    },
    soloRankByPuuid: { kind: "ok", rank: null },
    recentMatchIds: { kind: "ok", matchIds: [] },
    matchById: { kind: "not_found" },
    accountByRiotIdCalls: [],
    accountByPuuidCalls: [],
    summonerByPuuidCalls: [],
    soloRankCalls: [],
    recentMatchIdsCalls: [],
    matchByIdCalls: [],
  };
}

async function resolveHandler<TResult, TArgs extends unknown[]>(
  handler: MaybeHandler<TResult, TArgs>,
  ...args: TArgs
): Promise<TResult> {
  return typeof handler === "function"
    ? await (handler as (...a: TArgs) => TResult | Promise<TResult>)(...args)
    : handler;
}

/** Cliente de Riot falso; cambiar `state` entre peticiones cambia lo que "responde Riot". */
export function fakeRiotClient(
  overrides: Partial<
    Pick<
      FakeRiotState,
      | "accountByRiotId"
      | "accountByPuuid"
      | "summonerByPuuid"
      | "soloRankByPuuid"
      | "recentMatchIds"
      | "matchById"
    >
  > = {},
) {
  const state: FakeRiotState = { ...defaultState(), ...overrides };

  const client: RiotClient = {
    async getAccountByRiotId(riotId, region, signal) {
      state.accountByRiotIdCalls.push({ riotId: { ...riotId }, region });
      return resolveHandler(state.accountByRiotId, riotId, region, signal);
    },
    async getAccountByPuuid(puuid, region, signal) {
      state.accountByPuuidCalls.push({ puuid, region });
      return resolveHandler(state.accountByPuuid, puuid, region, signal);
    },
    async getSummonerByPuuid(puuid, region, signal) {
      state.summonerByPuuidCalls.push({ puuid, region });
      return resolveHandler(state.summonerByPuuid, puuid, region, signal);
    },
    async getSoloRankByPuuid(puuid, region, signal, recordedAt) {
      state.soloRankCalls.push({ puuid, region });
      return resolveHandler(state.soloRankByPuuid, puuid, region, signal, recordedAt);
    },
    async getRecentMatchIds(puuid, region, signal) {
      state.recentMatchIdsCalls.push({ puuid, region });
      return resolveHandler(state.recentMatchIds, puuid, region, signal);
    },
    async getMatchById(matchId, puuid, region, signal) {
      state.matchByIdCalls.push({ matchId, puuid, region });
      return resolveHandler(state.matchById, matchId, puuid, region, signal);
    },
  };

  function reset(): void {
    const fresh = defaultState();
    state.accountByRiotId = overrides.accountByRiotId ?? fresh.accountByRiotId;
    state.accountByPuuid = overrides.accountByPuuid ?? fresh.accountByPuuid;
    state.summonerByPuuid = overrides.summonerByPuuid ?? fresh.summonerByPuuid;
    state.soloRankByPuuid = overrides.soloRankByPuuid ?? fresh.soloRankByPuuid;
    state.recentMatchIds = overrides.recentMatchIds ?? fresh.recentMatchIds;
    state.matchById = overrides.matchById ?? fresh.matchById;
    state.accountByRiotIdCalls.length = 0;
    state.accountByPuuidCalls.length = 0;
    state.summonerByPuuidCalls.length = 0;
    state.soloRankCalls.length = 0;
    state.recentMatchIdsCalls.length = 0;
    state.matchByIdCalls.length = 0;
  }

  function totalCalls(): number {
    return (
      state.accountByRiotIdCalls.length +
      state.accountByPuuidCalls.length +
      state.summonerByPuuidCalls.length +
      state.soloRankCalls.length +
      state.recentMatchIdsCalls.length +
      state.matchByIdCalls.length
    );
  }

  return { client, state, reset, totalCalls };
}

/**
 * Plazo global corto para las pruebas de RNF-7 (D98), en lugar de los 60 s reales. Era de 40 ms y
 * fallaba con la máquina cargada: el trabajo con la base antes de la llamada colgada, o una
 * petición que debía terminar a tiempo, superaba el plazo. 1 s deja margen de sobra.
 */
export const SHORT_OPERATION_TIMEOUT_MS = 1000;

/** Aplicación con Riot configurado y el cliente falso dado. */
export function riotApp(
  riotIntegration: RiotIntegration,
  overrides: Partial<AppOptions> = {},
): Promise<Server> {
  return authApp({ riotIntegration, ...overrides });
}

/** `GET /api/riot`. */
export function riotStatus(session: SignedUp): supertest.Test {
  return withSession(session.agent.get("/api/riot"), session.csrf);
}

/** `GET /api/riot/challenges/current`. */
export function currentChallenge(session: SignedUp): supertest.Test {
  return withSession(session.agent.get("/api/riot/challenges/current"), session.csrf);
}

/** `POST /api/riot/challenges`. */
export function createChallenge(session: SignedUp, body: unknown): supertest.Test {
  return withSession(session.agent.post("/api/riot/challenges"), session.csrf).send(body as object);
}

/** `POST /api/riot/challenges/:id/confirm`. */
export function confirmChallenge(session: SignedUp, challengeId: string): supertest.Test {
  return withSession(
    session.agent.post(`/api/riot/challenges/${challengeId}/confirm`),
    session.csrf,
  );
}

/** Comprueba RNF-3: ninguna respuesta expone el identificador interno de Riot (`puuid`). */
export function assertNoPuuid(body: unknown, puuid: string = RIOT_PUUID): void {
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes(puuid), false, "la respuesta no debe exponer el puuid");
  assert.equal(serialized.includes('"puuid"'), false, "la respuesta no debe incluir la clave puuid");
}
