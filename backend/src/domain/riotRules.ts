// Reglas puras, plataformas, enrutamiento y textos exactos de la verificación con Riot Games
// (spec 014, RF-3, RF-5 a RF-10, RF-16, RF-18, RF-20 a RF-25, RF-27, RF-33, RF-35, RF-37, RF-38,
// RF-43, RF-48 a RF-50, RF-53; D3, D4, D30, D31, D44; plan, §§1.2, 2.1 y 4).
// Sin Express, Mongoose, red ni reloj.
import { ACCOUNT_ERRORS, normalizeRegion } from "./accountRules.ts";
import type { RuleResult } from "./accountRules.ts";
import { isPlainObject } from "./sessionRules.ts";

const MINUTE_MS = 60_000;
const RIOT_SOURCE_NAME = "Riot Games";

/** Regiones válidas de League of Legends (spec 004, `GAMES.lol.regions`). */
export type LolRegion = "LAS" | "LAN" | "NA" | "EUW" | "EUNE" | "BR" | "KR";

/** Plataforma de Riot para Summoner-v4 y League-v4 (tabla fija D4). */
export type RiotPlatform = "la2" | "la1" | "na1" | "euw1" | "eun1" | "br1" | "kr";

/** Enrutamiento regional de Riot para Account-v1 y Match-v5 (plan §1.2). */
export type RiotRouting = "americas" | "europe" | "asia";

/** Tabla fija de plataformas de Riot por región de LoL (D4). */
export const RIOT_PLATFORMS: Readonly<Record<LolRegion, RiotPlatform>> = {
  LAS: "la2",
  LAN: "la1",
  NA: "na1",
  EUW: "euw1",
  EUNE: "eun1",
  BR: "br1",
  KR: "kr",
};

/** Enrutamiento regional de Riot por región de LoL (plan §1.2). */
export const RIOT_ROUTING: Readonly<Record<LolRegion, RiotRouting>> = {
  LAS: "americas",
  LAN: "americas",
  NA: "americas",
  BR: "americas",
  EUW: "europe",
  EUNE: "europe",
  KR: "asia",
};

/** Comprueba si una cadena es una de las 7 regiones de LoL. */
export function isLolRegion(value: string): value is LolRegion {
  return Object.hasOwn(RIOT_PLATFORMS, value);
}

/**
 * Minutos que faltan redondeados hacia arriba, con mínimo `"1 minuto"` en singular
 * (spec 014, Definiciones: «Espera en minutos»; D30).
 */
export function formatWaitMinutes(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}

/**
 * Textos exactos de error de la API de la spec 014 (D30, D31): en español, minúscula inicial
 * (salvo nombres propios `Riot ID` y `Riot Games`) y sin punto final. Reutiliza los de
 * `ACCOUNT_ERRORS` (spec 012) donde coinciden.
 */
export const RIOT_ERRORS = {
  /** RF-18: Riot ID ausente, no texto o formato inválido. */
  invalidRiotId:
    "Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres sin # antes de # y 3 a 5 letras o dígitos después",
  /** RF-18: región de LoL ausente o inválida. */
  invalidRegion: ACCOUNT_ERRORS.invalidRegion("lol"),
  /** RF-3 y RF-50: no existe la cuenta o no tiene perfil de LoL en la región. */
  accountNotFound: "no existe una cuenta de League of Legends con ese Riot ID en esa región",
  /** RF-5 y RF-24: otra persona ya verificó la cuenta. */
  verifiedElsewhere: ACCOUNT_ERRORS.verifiedElsewhere,
  /** RF-6: el usuario ya tiene una cuenta de LoL verificada. */
  alreadyVerified: "ya tienes una cuenta de Riot verificada; usa «Resincronizar»",
  /** RF-20: cuenta manual de LoL en otra región. */
  manualRegionMismatch: (region: string): string =>
    `desvincula primero tu cuenta de LoL de ${region}`,
  /** RF-21: 5 desafíos creados en la última hora. */
  hourlyLimit: (waitMs: number): string =>
    `ya pediste 5 íconos en la última hora, espera ${formatWaitMinutes(waitMs)} antes de pedir otro`,
  /** RF-43: los 29 íconos de inicio están excluidos para esa cuenta de Riot. */
  noFreeIcons: (waitMs: number): string =>
    `no quedan íconos libres para esta cuenta, espera ${formatWaitMinutes(waitMs)} antes de pedir otro`,
  /** RF-25 y RF-49: otra operación con Riot del mismo usuario está en curso. */
  inProgress: "ya se está comprobando",
  /** RF-8: el perfil en Riot todavía no tiene puesto el ícono asignado. */
  iconMismatch: "si ya lo cambiaste, Riot puede tardar unos minutos; vuelve a intentarlo",
  /** RF-9: el desafío venció o se anuló (también paso 3 de RF-26, D104). */
  challengeExpired: "la verificación venció, pide un ícono nuevo",
  /** RF-10: el desafío ya alcanzó 10 confirmaciones contadas. */
  tooManyAttempts: "demasiados intentos, pide un ícono nuevo",
  /** RF-23: desafío inexistente, borrado o perteneciente a otro usuario. */
  challengeNotFound: "desafío de verificación no encontrado",
  /** RF-48: desafío ya completado con éxito. */
  challengeCompleted: "este desafío ya se completó",
  /** RF-16 y RF-38: Riot no disponible, clave ausente/caducada, datos ilegibles o timeout. */
  unavailable: ACCOUNT_ERRORS.sourceUnavailable(RIOT_SOURCE_NAME),
  /** RF-37: el limitador propio no tiene hueco en la ventana deslizante de 2 minutos. */
  busy: "Riot Games está ocupado, inténtalo en unos minutos",
  /** RF-33 y RF-44: buscar coincidencias de LoL sin rango o con rango pendiente. */
  unrankedForMatches: "necesitas rango en Solo/Dúo para buscar en LoL",
  /** RF-35: al resincronizar, Riot ya no encuentra la cuenta global. */
  accountGone: ACCOUNT_ERRORS.sourceAccountGone(RIOT_SOURCE_NAME),
  /** RF-35: al resincronizar, la cuenta ya no tiene perfil en la plataforma de su región. */
  regionTransferred: (region: string): string =>
    `la cuenta ya no tiene perfil de League of Legends en ${region}: desvincúlala y vuelve a verificarla en su región nueva`,
} as const;

/** Textos exactos de aviso de la spec 014 (RF-7, RF-27 y RF-53). */
export const RIOT_NOTICES = {
  /** RF-7: verificación completa sin bloques pendientes. */
  verified: "Cuenta de Riot verificada",
  /** RF-27 (D79, D80): faltan tanto rango e historial como partidas (falte o no perfil). */
  verifiedNoData:
    "Cuenta de Riot verificada, pero no pudimos leer sus datos. Resincroniza más tarde para verlos.",
  /** RF-27 (D79, D80): falta al menos un bloque, pero no ambos (rango y partidas). */
  verifiedPartialData:
    "Cuenta de Riot verificada, pero no pudimos leer algunos de sus datos. Resincroniza más tarde para verlos.",
  /** RF-53: resincronización parcial (cuenta y perfil leídos; falló rango o partidas). */
  partialSync:
    "No pudimos actualizar algunos de tus datos de Riot Games. Resincroniza más tarde para verlos.",
} as const;

// Caracteres prohibidos en el nombre del Riot ID (D3, D44): '#', LF, CR, U+2028, U+2029.
const FORBIDDEN_GAME_NAME_CHARS = /[#\n\r\u2028\u2029]/;
// Etiqueta de 3 a 5 caracteres ASCII alfanuméricos (D3, D44).
const TAG_LINE_PATTERN = /^[A-Za-z0-9]{3,5}$/;
const MIN_GAME_NAME_UTF16 = 3;
const MAX_GAME_NAME_UTF16 = 16;

export type RiotIdValidation =
  | { ok: true; gameName: string; tagLine: string; riotId: string }
  | { ok: false; error: string };

/**
 * Valida un Riot ID con las reglas reales de Riot (RF-18, D3, D44): recorta extremos con
 * `trim()`, exige `<nombre>#<etiqueta>` con nombre de 3 a 16 unidades UTF-16 sin `#`, LF, CR,
 * U+2028 ni U+2029, y etiqueta de 3 a 5 letras o dígitos ASCII.
 */
export function validateRiotId(raw: unknown): RiotIdValidation {
  if (typeof raw !== "string") return { ok: false, error: RIOT_ERRORS.invalidRiotId };
  const trimmed = raw.trim();
  const hashIndex = trimmed.indexOf("#");
  if (hashIndex === -1) return { ok: false, error: RIOT_ERRORS.invalidRiotId };

  const gameName = trimmed.slice(0, hashIndex);
  const tagLine = trimmed.slice(hashIndex + 1);
  if (
    gameName.length < MIN_GAME_NAME_UTF16 ||
    gameName.length > MAX_GAME_NAME_UTF16 ||
    FORBIDDEN_GAME_NAME_CHARS.test(gameName) ||
    !TAG_LINE_PATTERN.test(tagLine)
  ) {
    return { ok: false, error: RIOT_ERRORS.invalidRiotId };
  }

  return { ok: true, gameName, tagLine, riotId: trimmed };
}

export interface ChallengeRequestInput {
  gameName: string;
  tagLine: string;
  riotId: string;
  region: LolRegion;
}

/**
 * Valida el cuerpo de `POST /api/riot/challenges` en orden estricto Riot ID → región (RF-18).
 * Ignora el resto de campos y no lee propiedades heredadas del prototipo.
 */
export function validateChallengeRequest(body: unknown): RuleResult<ChallengeRequestInput> {
  const fields = isPlainObject(body) ? body : {};
  const rawRiotId = Object.hasOwn(fields, "riotId") ? fields["riotId"] : undefined;
  const idResult = validateRiotId(rawRiotId);
  if (!idResult.ok) return { ok: false, status: 400, error: idResult.error };

  const rawRegion = Object.hasOwn(fields, "region") ? fields["region"] : undefined;
  const region = normalizeRegion("lol", rawRegion);
  if (region === null || !isLolRegion(region)) {
    return { ok: false, status: 400, error: RIOT_ERRORS.invalidRegion };
  }

  return {
    ok: true,
    value: {
      gameName: idResult.gameName,
      tagLine: idResult.tagLine,
      riotId: idResult.riotId,
      region,
    },
  };
}
