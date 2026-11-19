/**
 * La dirección que devuelve el servidor para iniciar sesión en Steam (spec 013, RF-1). Antes de
 * llevar al usuario hasta ahí se comprueba que sea la página oficial de Steam y de ninguna otra:
 * la interfaz nunca navega a una dirección que no sea esa (defensa en profundidad, plan P13-19).
 */
export const STEAM_LOGIN_ORIGIN = 'https://steamcommunity.com';
const STEAM_LOGIN_PATH = '/openid/login';

export function isSteamLoginUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === STEAM_LOGIN_ORIGIN && url.pathname === STEAM_LOGIN_PATH;
  } catch {
    return false;
  }
}
