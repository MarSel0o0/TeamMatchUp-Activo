// Utilidades de las pruebas de las rutas de Steam (spec 013). No es un archivo de prueba.
// Steam se simula con un `SteamClient` falso: ninguna prueba toca la red (RNF-3).
import type { Server } from "node:http";
import { STEAM_OPENID_URL } from "../../src/domain/steamOpenId.ts";
import type { RealResult } from "../../src/services/realSources.ts";
import type { AssertionResult, SteamClient } from "../../src/services/steamClient.ts";
import { authApp } from "./helpers.ts";

export const PUBLIC_URL = "http://localhost:5173";
export const STEAM_ID = "76561198000000001";
export const OTHER_STEAM_ID = "76561198000000002";

export const PUBLIC_PROFILE = {
  displayName: "Vicho",
  avatarUrl: "https://avatars.fastly.steamstatic.com/abcdef_full.jpg",
  country: "CL",
  hoursTotal: 312,
  hoursRecent: 18,
} as const;

export interface FakeSteamState {
  /** Resultado de `check_authentication`. */
  assertion: AssertionResult;
  /** Resultado de la lectura del perfil. */
  profile: RealResult;
  assertionCalls: Record<string, string>[];
  profileCalls: string[];
}

/** Cliente de Steam falso; cambiar `state` entre peticiones cambia lo que "responde Steam". */
export function fakeSteamClient(overrides: Partial<Pick<FakeSteamState, "assertion" | "profile">> = {}) {
  const state: FakeSteamState = {
    assertion: "valid",
    profile: { ok: true, data: { handle: STEAM_ID, profile: { ...PUBLIC_PROFILE } } },
    assertionCalls: [],
    profileCalls: [],
    ...overrides,
  };
  const client: SteamClient = {
    verifyAssertion: async (params) => {
      state.assertionCalls.push({ ...params });
      return state.assertion;
    },
    readProfile: async (steamId) => {
      state.profileCalls.push(steamId);
      return state.profile;
    },
  };
  return { client, state };
}

/** Aplicación con Steam configurado (`PUBLIC_URL` de desarrollo) y el cliente falso dado. */
export function steamApp(client: SteamClient): Promise<Server> {
  return authApp({ steamIntegration: { publicUrl: PUBLIC_URL, client } });
}

/** Token del intento dentro de la URL de Steam que devuelve `POST /api/steam/start`. */
export function tokenOf(url: string): string {
  const returnTo = new URL(url).searchParams.get("openid.return_to");
  if (returnTo === null) throw new Error("la URL de Steam no lleva openid.return_to");
  const token = new URL(returnTo).searchParams.get("attempt");
  if (token === null) throw new Error("el return_to no lleva el token del intento");
  return token;
}

/** `return_to` que arma el servidor para un intento. */
export function returnToFor(token: string): string {
  return `${PUBLIC_URL}/verificar/steam?attempt=${token}`;
}

/** Lo que trae la página de vuelta tras iniciar sesión bien en Steam. */
export function steamLoginQuery(token: string, steamId: string = STEAM_ID): Record<string, string> {
  const claimed = `https://steamcommunity.com/openid/id/${steamId}`;
  return {
    attempt: token,
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_OPENID_URL,
    "openid.claimed_id": claimed,
    "openid.identity": claimed,
    "openid.return_to": returnToFor(token),
    "openid.response_nonce": "2026-11-18T12:00:00ZAbCdEf",
    "openid.assoc_handle": "1234567890",
    "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "firmaEnBase64=",
  };
}
