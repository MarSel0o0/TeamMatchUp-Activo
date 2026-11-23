import type { AccountProfile } from './types';

/**
 * Cómo se muestran los datos de Steam de una cuenta de CS2 verificada (spec 013, RF-11, RF-17,
 * RF-18). Funciones puras: el servidor guarda el país como código y las horas ya enteras
 * (hacia abajo); aquí solo se les da forma de texto.
 */

/** Texto de un dato que Steam no entregó, cada uno por separado (RF-11, D7). */
export const STEAM_PRIVATE_TEXT = 'perfil de Steam privado';

/** Horas enteras: «312 h», «0 h» (RF-18). Un valor inválido cuenta como 0. */
export function formatHours(hours: number): string {
  const whole = Number.isFinite(hours) && hours > 0 ? Math.floor(hours) : 0;
  return `${whole} h`;
}

/**
 * Nombre del país en español a partir de su código de dos letras (RF-18). Si el navegador no lo
 * conoce, se muestra el código en vez de romper la fila.
 */
export function formatCountry(code: string): string {
  const upper = code.toUpperCase();
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

/** Lo que muestra el bloque de Steam; los datos ausentes llevan `STEAM_PRIVATE_TEXT`. */
export interface SteamProfileView {
  displayName?: string;
  avatarUrl?: string;
  country: string;
  hoursTotal: string;
  hoursRecent: string;
}

/** Vista del perfil de Steam: el nombre y el avatar solo si existen; lo demás, siempre con texto. */
export function steamProfileView(profile: AccountProfile): SteamProfileView {
  return {
    ...(profile.displayName === undefined ? {} : { displayName: profile.displayName }),
    ...(profile.avatarUrl === undefined ? {} : { avatarUrl: profile.avatarUrl }),
    country: profile.country === undefined ? STEAM_PRIVATE_TEXT : formatCountry(profile.country),
    hoursTotal: profile.hoursTotal === undefined ? STEAM_PRIVATE_TEXT : formatHours(profile.hoursTotal),
    hoursRecent: profile.hoursRecent === undefined ? STEAM_PRIVATE_TEXT : formatHours(profile.hoursRecent),
  };
}
