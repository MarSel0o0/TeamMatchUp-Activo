// Fuente real de Steam para el registro de la spec 012 (spec 013, RF-14, RF-23; plan, sección 2).
// Es el enganche entre `realSources.ts` (que no conoce ninguna fuente concreta) y el cliente de
// Steam: la resincronización de una cuenta de CS2 verificada llama a `read` con el SteamID64
// guardado al verificar.
import type { RealSource } from "./realSources.ts";
import type { SteamClient } from "./steamClient.ts";

export function createSteamSource(client: SteamClient): RealSource {
  return {
    id: "steam",
    read: (account, signal) => client.readProfile(account.externalId, signal),
  };
}
