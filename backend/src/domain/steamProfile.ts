// Perfil de Steam de una cuenta de CS2 (spec 013, RF-10, RF-11, RF-17, RF-18, RF-19, D7, D9;
// plan, 4.3 y P13-11 a P13-15). Funciones puras: reciben las respuestas ya leídas de Steam como
// datos sin tipar (`unknown`) y entregan un `RealProfile`; no hay red, reloj ni Mongoose.
// - Cada dato se trata por separado: lo que Steam no entrega queda **ausente**, nunca inventado;
//   la interfaz decide el texto «perfil de Steam privado» (RF-11). `isPrivate` no se usa (P13-15).
// - Las 0 horas solo existen si Steam entregó la lista de juegos y CS2 no está en ella (D1, D7).
import type { RealProfile } from "./verification.ts";

/** Identificador de Counter-Strike 2 en Steam. */
export const CS2_APP_ID = 730;

/** Campos de `GetPlayerSummaries` (`response.players[0]`) que se usan. */
export interface SteamSummary {
  personaname?: unknown;
  avatarfull?: unknown;
  loccountrycode?: unknown;
}

/** Campos de `GetOwnedGames` (`response`) que se usan. */
export interface SteamOwned {
  game_count?: unknown;
  games?: unknown;
}

const MAX_NAME_LENGTH = 128;
const MAX_AVATAR_URL_LENGTH = 512;
// Dominios desde los que Steam sirve los avatares (P13-14).
const AVATAR_DOMAINS = ["steamstatic.com", "akamaihd.net"] as const;
// Caracteres de control C0 y C1.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

/** Minutos a horas enteras, redondeadas hacia abajo (RF-18). Lo inválido cuenta como 0. */
export function minutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.floor(minutes / 60);
}

function toDisplayName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.replace(CONTROL_CHARACTERS, "").trim().slice(0, MAX_NAME_LENGTH).trim();
  return name === "" ? undefined : name;
}

function toAvatarUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > MAX_AVATAR_URL_LENGTH) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return undefined;
  const allowed = AVATAR_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  return allowed ? value : undefined;
}

function toCountry(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toMinutes(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Perfil de la cuenta a partir de las dos respuestas de Steam. `summary` ausente deja sin
 * nombre, avatar ni país. `owned` sin `game_count` numérico significa que Steam no entregó la
 * lista de juegos (detalles privados): sin horas. Con la lista, las horas de CS2 son las
 * guardadas y, si CS2 no está, 0 y 0 (RF-17).
 */
export function steamProfileFrom(summary: SteamSummary | undefined, owned: SteamOwned | undefined): RealProfile {
  const profile: RealProfile = {};

  const displayName = toDisplayName(summary?.personaname);
  if (displayName !== undefined) profile.displayName = displayName;
  const avatarUrl = toAvatarUrl(summary?.avatarfull);
  if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;
  const country = toCountry(summary?.loccountrycode);
  if (country !== undefined) profile.country = country;

  if (typeof owned?.game_count === "number") {
    const games = Array.isArray(owned.games) ? (owned.games as unknown[]) : [];
    const cs2 = games.find(
      (game): game is Record<string, unknown> =>
        isRecord(game) && game["appid"] === CS2_APP_ID && toMinutes(game["playtime_forever"]) !== undefined,
    );
    profile.hoursTotal = minutesToHours(toMinutes(cs2?.["playtime_forever"]) ?? 0);
    profile.hoursRecent = minutesToHours(toMinutes(cs2?.["playtime_2weeks"]) ?? 0);
  }

  return profile;
}
