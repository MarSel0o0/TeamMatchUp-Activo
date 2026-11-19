/**
 * Lectura de la versión más reciente de Data Dragon desde el navegador (spec 014, RF-2, RF-40;
 * D93; plan §2.3, O-3 y R14-3).
 *
 * Vive en `services/` para que ningún componente llame a `fetch` (constitución, principio 3).
 * No pasa por el servidor de TeamMatchUp ni cuenta para los límites de la clave de Riot (RF-37,
 * RNF-1). Cachea el resultado en memoria por sesión y cae en silencio a una versión de respaldo
 * conocida si Data Dragon no responde.
 */

const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

/** Plazo corto para no demorar la pantalla del desafío ni el perfil si Data Dragon falla. */
const DDRAGON_TIMEOUT_MS = 5_000;

/** Versión de respaldo silenciosa si `versions.json` no responde o devuelve datos inválidos. */
export const DDRAGON_FALLBACK_VERSION = '15.1.1';

let cachedVersion: string | null = null;
let inFlight: Promise<string> | null = null;

async function fetchLatestVersion(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DDRAGON_TIMEOUT_MS);

  try {
    const response = await fetch(DDRAGON_VERSIONS_URL, { signal: controller.signal });
    if (!response.ok) return DDRAGON_FALLBACK_VERSION;

    const versions: unknown = await response.json();
    if (!Array.isArray(versions) || versions.length === 0) return DDRAGON_FALLBACK_VERSION;

    const latest: unknown = versions[0];
    if (typeof latest !== 'string' || latest.trim() === '') return DDRAGON_FALLBACK_VERSION;

    cachedVersion = latest.trim();
    return cachedVersion;
  } catch {
    return DDRAGON_FALLBACK_VERSION;
  } finally {
    clearTimeout(timer);
  }
}

/** Devuelve la versión más reciente de Data Dragon (cacheada en memoria) o la de respaldo. */
export function getDdragonVersion(): Promise<string> {
  if (cachedVersion !== null) return Promise.resolve(cachedVersion);
  if (inFlight !== null) return inFlight;

  inFlight = fetchLatestVersion().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
