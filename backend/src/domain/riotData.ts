// Parseo y validación estricta de respuestas de la API de Riot Games
// (spec 014, RF-11, RF-12, RF-13, RF-31, RF-34, RF-36, RF-52; D35, D36, D48, D73, D83, D86,
// D92, D94, D96; plan, §§2.1, 4, P14-8 y O-5).
// Dominio puro: sin Express, Mongoose, red ni reloj (`now` llega por parámetro).
import { GAMES } from "./games.ts";
import { normalizeRank } from "./rankScale.ts";
import type { Snapshot } from "./rankSimulator.ts";
import { isPlainObject } from "./sessionRules.ts";

/** Cola clasificatoria Solo/Dúo de League of Legends (RF-11, RF-13). */
export const RIOT_SOLO_QUEUE_TYPE = "RANKED_SOLO_5x5";
/** Identificador numérico de Solo/Dúo en Match-v5 (RF-11). */
export const RIOT_SOLO_QUEUE_ID = 420;
/** Duración máxima en segundos para clasificar una rendición temprana como remake (O-5, P14-8). */
export const REMAKE_MAX_DURATION_SECONDS = 300;
/** Resultado de partida abortada inesperadamente en Match-v5 (O-5, P14-8). */
const ABORT_UNEXPECTED_RESULT = "Abort_Unexpected";
const MATCH_SUMMARY_SEPARATOR = " · ";

// Mapa UPPER → nombre canónico de `GAMES.lol.tiers` para normalización (RF-36, D48).
const CANONICAL_LOL_TIERS: Readonly<Record<string, string>> = Object.fromEntries(
  GAMES.lol.tiers.map((tier) => [tier.toUpperCase(), tier]),
);

// Tiers sin división en LoL (RF-36, D73, D96).
const APEX_LOL_TIERS: ReadonlySet<string> = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

/** Indica si un tier de LoL pertenece al grupo sin división (MASTER, GRANDMASTER, CHALLENGER). */
export function isApexLolTier(tier: string): boolean {
  return APEX_LOL_TIERS.has(tier.toUpperCase());
}

/** Datos de cuenta devueltos por Riot Account-v1 (RF-34, D86). */
export interface RiotAccountData {
  puuid: string;
  gameName: string;
  tagLine: string;
  /** Forma exacta devuelta por Riot (`<gameName>#<tagLine>`), conservando mayúsculas. */
  riotId: string;
}

export type ParsedRiotAccount =
  | { ok: true; account: RiotAccountData }
  | { ok: false };

/** Perfil de Summoner-v4 con ícono separado del nivel para RF-27/RF-52 (D92, D94). */
export type ParsedRiotSummoner =
  | { ok: true; profileIconId: number; level: number | null }
  | { ok: false };

/** Fotografía de rango real de Riot: guarda tier/división crudos y `canonicalTier` interno (D48). */
export interface RiotRankSnapshot extends Snapshot {
  /** Nombre del tier en la escala de la spec 004 (`"Gold"`, `"Master"`…); ausente si no está en la escala. */
  canonicalTier?: string;
}

export type ParsedRiotSoloRank =
  | { ok: true; kind: "unranked" }
  | { ok: true; kind: "ranked"; snapshot: RiotRankSnapshot }
  | { ok: false };

/** Partida real de Solo/Dúo parseada de Match-v5 (RF-11, RF-12, RF-30). */
export interface RiotMatchRecord {
  id: string;
  gameId: "lol";
  playedAt: Date;
  result: "win" | "loss";
  summary: string;
  durationMinutes: number;
  rankDelta?: number;
}

export type ParsedRiotMatch =
  | { kind: "remake" }
  | { kind: "invalid" }
  | { kind: "match"; match: RiotMatchRecord };

function ownProp(obj: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value;
}

function readNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value + 0;
}

function readPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return null;
  return value + 0;
}

function readTimestampMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Valida la respuesta de Account-v1 (`by-riot-id` o `by-puuid`) y compone `riotId` con las
 * mayúsculas exactas que devolvió Riot (RF-34, RF-52, D86).
 */
export function parseRiotAccount(raw: unknown): ParsedRiotAccount {
  if (!isPlainObject(raw)) return { ok: false };
  const puuid = readNonEmptyString(ownProp(raw, "puuid"));
  const gameName = readNonEmptyString(ownProp(raw, "gameName"));
  const tagLine = readNonEmptyString(ownProp(raw, "tagLine"));
  if (puuid === null || gameName === null || tagLine === null) return { ok: false };

  return {
    ok: true,
    account: {
      puuid,
      gameName,
      tagLine,
      riotId: `${gameName}#${tagLine}`,
    },
  };
}

/**
 * Valida la respuesta de Summoner-v4 separando `profileIconId` de `summonerLevel` (D92, D94):
 * - si `profileIconId` falta o no es un entero ≥ 0 → `{ ok: false }` (503 al confirmar);
 * - si `profileIconId` es válido pero `summonerLevel` falta o no es entero ≥ 1 →
 *   `{ ok: true, profileIconId, level: null }` (al confirmar deja solo el perfil pendiente y
 *   muestra igual el ícono; al pedir/resincronizar el llamador exige `level !== null`).
 */
export function parseRiotSummoner(raw: unknown): ParsedRiotSummoner {
  if (!isPlainObject(raw)) return { ok: false };
  const profileIconId = readNonNegativeInt(ownProp(raw, "profileIconId"));
  if (profileIconId === null) return { ok: false };
  const level = readPositiveInt(ownProp(raw, "summonerLevel"));
  return { ok: true, profileIconId, level };
}

/**
 * Parsea la lista de entradas de League-v4 buscando `RANKED_SOLO_5x5` (RF-13, RF-31, RF-36,
 * RF-52, D36, D48, D73, D96):
 * - sin entrada Solo/Dúo → `{ ok: true, kind: "unranked" }`;
 * - LP enteros ≥ 0 sin tope superior; LP negativos o no enteros → `{ ok: false }`;
 * - `MASTER`/`GRANDMASTER`/`CHALLENGER` omiten `division` sea cual sea `rank`;
 * - división desconocida en tier con divisiones NO es fallo: se guarda cruda y normaliza a la
 *   división más baja (`normalizeRank` aplica DP-26);
 * - tier fuera de escala NO es fallo: `canonicalTier` ausente y `normalized = 0`.
 */
export function parseRiotSoloRank(entries: unknown, now: Date): ParsedRiotSoloRank {
  if (!Array.isArray(entries)) return { ok: false };

  let soloEntry: Record<string, unknown> | null = null;
  for (const item of entries) {
    if (!isPlainObject(item)) return { ok: false };
    if (ownProp(item, "queueType") === RIOT_SOLO_QUEUE_TYPE) {
      soloEntry = item;
      break;
    }
  }
  if (soloEntry === null) return { ok: true, kind: "unranked" };

  const tier = readNonEmptyString(ownProp(soloEntry, "tier"));
  const points = readNonNegativeInt(ownProp(soloEntry, "leaguePoints"));
  if (tier === null || points === null) return { ok: false };

  const tierUpper = tier.toUpperCase();
  const canonicalTier = Object.hasOwn(CANONICAL_LOL_TIERS, tierUpper)
    ? CANONICAL_LOL_TIERS[tierUpper]
    : undefined;

  let division: string | undefined;
  if (!isApexLolTier(tierUpper)) {
    const rawRank = ownProp(soloEntry, "rank");
    if (rawRank !== undefined) {
      const parsedDivision = readNonEmptyString(rawRank);
      if (parsedDivision === null) return { ok: false };
      division = parsedDivision;
    } else if (canonicalTier !== undefined) {
      // Tier conocido con divisiones (IRON..DIAMOND) sin campo `rank` → campo faltante (RF-52).
      return { ok: false };
    }
  }

  const normalized =
    canonicalTier === undefined ? 0 : normalizeRank("lol", canonicalTier, division);

  const snapshot: RiotRankSnapshot = {
    tier,
    ...(division === undefined ? {} : { division }),
    points,
    normalized,
    recordedAt: new Date(now.getTime()),
    ...(canonicalTier === undefined ? {} : { canonicalTier }),
  };

  return { ok: true, kind: "ranked", snapshot };
}

/**
 * Duración de una partida en minutos enteros redondeada al minuto más cercano con mitades hacia
 * arriba: `29 min 29 s (1769 s) → 29`, `29 min 30 s (1770 s) → 30` (RF-12, D35).
 */
export function roundDurationMinutes(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.floor((seconds + 30) / 60);
}

/**
 * Criterio de remake en Match-v5 (O-5, P14-8): descarta partidas abortadas inesperadamente o
 * rendiciones tempranas con duración estrictamente menor a 300 s (5 min), conservando derrotas
 * válidas por rendición temprana al minuto 15 (`FF15`).
 */
export function isRemakeMatch(
  durationSeconds: number,
  earlySurrender: boolean,
  endOfGameResult?: string,
): boolean {
  if (endOfGameResult === ABORT_UNEXPECTED_RESULT) return true;
  return earlySurrender && durationSeconds < REMAKE_MAX_DURATION_SECONDS;
}

/**
 * Parsea una partida de Match-v5 para el `puuid` dado (RF-11, RF-12, RF-36, RF-52, D35, D83,
 * O-5). Devuelve `{ kind: "remake" }` si debe descartarse, `{ kind: "invalid" }` si trae datos
 * que no se pueden interpretar (se omite esa partida) o `{ kind: "match", match }`.
 */
export function parseRiotMatch(raw: unknown, puuid: string): ParsedRiotMatch {
  if (!isPlainObject(raw)) return { kind: "invalid" };
  const metadata = ownProp(raw, "metadata");
  const info = ownProp(raw, "info");
  if (!isPlainObject(metadata) || !isPlainObject(info)) return { kind: "invalid" };

  const matchId = readNonEmptyString(ownProp(metadata, "matchId"));
  if (matchId === null) return { kind: "invalid" };

  const rawQueueId = ownProp(info, "queueId");
  if (rawQueueId !== undefined && rawQueueId !== RIOT_SOLO_QUEUE_ID) return { kind: "invalid" };

  const rawEndResult = ownProp(info, "endOfGameResult");
  if (rawEndResult !== undefined && typeof rawEndResult !== "string") return { kind: "invalid" };
  const endOfGameResult = rawEndResult;

  if (endOfGameResult === ABORT_UNEXPECTED_RESULT) return { kind: "remake" };

  const rawDuration = ownProp(info, "gameDuration");
  if (typeof rawDuration !== "number" || !Number.isFinite(rawDuration) || rawDuration < 0) {
    return { kind: "invalid" };
  }

  const rawParticipants = ownProp(info, "participants");
  if (!Array.isArray(rawParticipants)) return { kind: "invalid" };

  let participant: Record<string, unknown> | null = null;
  for (const item of rawParticipants) {
    if (isPlainObject(item) && ownProp(item, "puuid") === puuid) {
      participant = item;
      break;
    }
  }
  if (participant === null) return { kind: "invalid" };

  const earlySurrender =
    ownProp(participant, "gameEndedInEarlySurrender") === true ||
    ownProp(info, "gameEndedInEarlySurrender") === true;

  if (isRemakeMatch(rawDuration, earlySurrender, endOfGameResult)) {
    return { kind: "remake" };
  }

  const timestampMs =
    readTimestampMs(ownProp(info, "gameEndTimestamp")) ??
    readTimestampMs(ownProp(info, "gameStartTimestamp")) ??
    readTimestampMs(ownProp(info, "gameCreation"));
  if (timestampMs === null) return { kind: "invalid" };

  const rawWin = ownProp(participant, "win");
  if (typeof rawWin !== "boolean") return { kind: "invalid" };

  const championName = readNonEmptyString(ownProp(participant, "championName"));
  const kills = readNonNegativeInt(ownProp(participant, "kills"));
  const deaths = readNonNegativeInt(ownProp(participant, "deaths"));
  const assists = readNonNegativeInt(ownProp(participant, "assists"));
  if (championName === null || kills === null || deaths === null || assists === null) {
    return { kind: "invalid" };
  }

  return {
    kind: "match",
    match: {
      id: matchId,
      gameId: "lol",
      playedAt: new Date(timestampMs),
      result: rawWin ? "win" : "loss",
      summary: `${championName}${MATCH_SUMMARY_SEPARATOR}${kills}/${deaths}/${assists}`,
      durationMinutes: roundDurationMinutes(rawDuration),
    },
  };
}
