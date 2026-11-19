// Inicio de sesión de Steam por OpenID 2.0 (spec 013, RF-1, RF-4, RF-5, RF-6, RNF-1, RNF-4;
// plan, secciones 1 y 5.3, P13-8). Funciones puras: ni red ni reloj. La comunicación con Steam
// (`check_authentication`) la hace `services/steamClient.ts`.
// - TeamMatchUp nunca ve la contraseña de Steam: el usuario la escribe en la página oficial y
//   Steam solo devuelve una respuesta firmada (RNF-1).
// - `check_authentication` solo garantiza la firma de los campos que Steam lista en
//   `openid.signed`. Si un atacante manda un `claimed_id` ajeno fuera de esa lista, Steam
//   respondería `is_valid:true`: por eso aquí se exige que cada campo del que depende la
//   decisión esté firmado y tenga el valor esperado (P13-8).
import { GAMES } from "./games.ts";

/** Página oficial de inicio de sesión de Steam y `op_endpoint` de sus respuestas. */
export const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

/** Página de la app a la que Steam devuelve al usuario (spec 013, D3). */
export const STEAM_RETURN_PATH = "/verificar/steam";

const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID_PREFIX = "https://steamcommunity.com/openid/id/";

/** Campos que Steam debe haber firmado para que la respuesta sirva (P13-8). */
const REQUIRED_SIGNED = [
  "op_endpoint",
  "claimed_id",
  "identity",
  "return_to",
  "response_nonce",
  "assoc_handle",
] as const;

export type ParsedResponse =
  | { kind: "cancelled" }
  | { kind: "invalid" }
  | { kind: "assertion"; steamId: string; params: Record<string, string> };

/**
 * Dirección a la que Steam devuelve al usuario: la página de vuelta de esta instancia con el
 * token del intento (RF-1, RNF-4). Steam firma `return_to`, así que el token viaja protegido.
 */
export function buildReturnTo(publicUrl: string, token: string): string {
  return `${publicUrl}${STEAM_RETURN_PATH}?attempt=${encodeURIComponent(token)}`;
}

/** Parámetros de la petición que lleva al usuario al inicio de sesión de Steam (RF-1). */
export function buildLoginParams(returnTo: string, realm: string): Record<string, string> {
  return {
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  };
}

function openIdParams(query: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(query).filter(([key]) => key.startsWith("openid.")));
}

/**
 * Interpreta lo que trae la página de vuelta (`attempt` y `openid.*`).
 * - Sin respuesta de inicio de sesión (cancelación o ausencia de `openid.mode=id_res`) →
 *   `cancelled` (RF-5).
 * - Una respuesta que no cumple todo lo siguiente → `invalid` (RF-6, RNF-4): `ns` de OpenID 2.0,
 *   `op_endpoint` de Steam, `return_to` exactamente igual al esperado (lleva el token del
 *   intento), los seis campos de `REQUIRED_SIGNED` firmados, firma presente, `claimed_id` con un
 *   SteamID64 e `identity` igual a `claimed_id`.
 * - Si no, `assertion` con el SteamID64 y los parámetros `openid.*` para confirmarlos con Steam.
 */
export function parseSteamResponse(query: Readonly<Record<string, string>>, expectedReturnTo: string): ParsedResponse {
  if (query["openid.mode"] !== "id_res") return { kind: "cancelled" };

  const invalid: ParsedResponse = { kind: "invalid" };
  if (query["openid.ns"] !== OPENID_NS) return invalid;
  if (query["openid.op_endpoint"] !== STEAM_OPENID_URL) return invalid;
  if (query["openid.return_to"] !== expectedReturnTo) return invalid;

  const signed = (query["openid.signed"] ?? "").split(",");
  if (!REQUIRED_SIGNED.every((field) => signed.includes(field))) return invalid;
  if ((query["openid.sig"] ?? "") === "") return invalid;
  if ((query["openid.response_nonce"] ?? "") === "") return invalid;
  if ((query["openid.assoc_handle"] ?? "") === "") return invalid;

  const claimed = query["openid.claimed_id"] ?? "";
  if (!claimed.startsWith(CLAIMED_ID_PREFIX)) return invalid;
  if (query["openid.identity"] !== claimed) return invalid;
  const steamId = claimed.slice(CLAIMED_ID_PREFIX.length);
  if (!GAMES.cs2.handlePattern.test(steamId)) return invalid;

  return { kind: "assertion", steamId, params: openIdParams(query) };
}

/**
 * Cuerpo del `POST` de confirmación a Steam: los mismos `openid.*` recibidos con el modo
 * `check_authentication`. No lleva nada más (RNF-1).
 */
export function buildCheckAuthBody(params: Readonly<Record<string, string>>): Record<string, string> {
  return { ...openIdParams(params), "openid.mode": "check_authentication" };
}

/** `true` si Steam confirmó la respuesta: una línea exactamente `is_valid:true`. */
export function isValidCheckResponse(text: string): boolean {
  return text.split(/\r?\n/).some((line) => line === "is_valid:true");
}
