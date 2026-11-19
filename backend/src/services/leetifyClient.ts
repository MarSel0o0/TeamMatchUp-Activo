// Cliente de Leetify: única pieza con red hacia Leetify y con su clave (spec 015, RF-2, RF-14,
// RNF-1, RNF-2, RNF-3; plan, sección 2, P15-3 y P15-4).
// - Una sola consulta: `GET /v3/profile?steam64_id=` de la API pública. De la respuesta solo se
//   lee `ranks.premier` (D3); nada de scraping, bots ni otras fuentes (RNF-3).
// - La clave es opcional (D24): con ella viaja en la cabecera `_leetify_key`, nunca en la
//   dirección; sin ella se consulta igual. No se siguen redirecciones, así la cabecera no puede
//   llegar a otro sitio.
// - Cualquier fallo (red, plazo, señal cancelada, estado distinto de 200 y 404, JSON ilegible o
//   rating inválido) es `failed`. Nunca se registra ni se devuelve la dirección, la cabecera ni
//   el error (RNF-2).
// - `fetch` se inyecta: las pruebas no tocan la red (RNF-1).
import { parseLeetifyProfile } from "../domain/leetify.ts";
import type { LeetifyReading } from "../domain/leetify.ts";

const API_ORIGIN = "https://api-public.cs-prod.leetify.com";
const KEY_HEADER = "_leetify_key";

const FAILED: LeetifyReading = { kind: "failed" };

export interface LeetifyClient {
  /** Rango Premier del SteamID64: con rango, sin rango Premier o fallo (RF-2, RF-14). */
  readPremier(steamId: string, signal: AbortSignal): Promise<LeetifyReading>;
}

export interface LeetifyClientOptions {
  /** Clave de la API de Leetify: opcional (D24) y secreta (RNF-2). `null` = sin clave. */
  apiKey: string | null;
  fetchFn?: typeof fetch;
}

export function createLeetifyClient({ apiKey, fetchFn = fetch }: LeetifyClientOptions): LeetifyClient {
  return {
    async readPremier(steamId, signal): Promise<LeetifyReading> {
      try {
        const url = new URL("/v3/profile", API_ORIGIN);
        url.searchParams.set("steam64_id", steamId);
        const response = await fetchFn(url, {
          method: "GET",
          headers: { Accept: "application/json", ...(apiKey === null ? {} : { [KEY_HEADER]: apiKey }) },
          redirect: "error",
          signal,
        });
        // Solo el 200 trae un perfil que leer; un 404 es «sin perfil» y el resto, fallo (P15-3).
        const body: unknown = response.status === 200 ? await response.json().catch(() => undefined) : undefined;
        return parseLeetifyProfile(response.status, body);
      } catch {
        return FAILED;
      }
    },
  };
}
