import { ZONE_TAB_NAMES } from "./zoneTab.ts";

// Zona horaria válida (RF-16): `UTC`, o un nombre exacto de `zone.tab` fuera de `Etc`.
// Sin E/S ni `Intl`: no depende de la canonización del entorno (D5).

export const UTC_ZONE = "UTC";

const ZONE_TAB_SET: ReadonlySet<string> = new Set(ZONE_TAB_NAMES);

export function isValidTimezone(trimmed: string): boolean {
  if (trimmed === UTC_ZONE) return true;
  const slash = trimmed.indexOf("/");
  if (slash === -1) return false;
  if (trimmed.slice(0, slash) === "Etc") return false;
  return ZONE_TAB_SET.has(trimmed);
}
