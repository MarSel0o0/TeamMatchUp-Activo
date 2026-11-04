// Fuentes reales y origen de los datos de una cuenta (spec 012, RF-5, RF-7, RF-8; plan,
// sección 1). Sin Express, Mongoose ni reloj.
// - El origen de cada bloque no se guarda: se calcula de la fuente que verificó la cuenta y de
//   los bloques que esa fuente entrega (plan, P12-2). Así no existe el estado imposible de un
//   bloque atribuido a una fuente que no lo entrega (RF-7).

/** Fuentes reales conocidas: Steam (spec 013) y Riot Games (spec 014). */
export type SourceId = "steam" | "riot";

/** `simulated` o la fuente real de la que vino el dato. */
export type Origin = "simulated" | SourceId;

/** Grupos de datos de una cuenta que pueden tener un origen distinto (spec 012, Definiciones). */
export type Block = "identity" | "rank" | "matches" | "profile";

export type BlockOrigins = Record<Block, Origin>;

/** Nombre que ve el usuario en los mensajes. */
export const SOURCE_NAMES: Readonly<Record<SourceId, string>> = {
  steam: "Steam",
  riot: "Riot Games",
};

/**
 * Bloques que entrega cada fuente. Steam no expone el rango Premier ni partidas competitivas
 * de CS2 (spec 013): esos bloques siguen simulados y etiquetados (RF-8).
 */
export const SOURCE_BLOCKS: Readonly<Record<SourceId, readonly Block[]>> = {
  steam: ["identity", "profile"],
  riot: ["identity", "rank", "matches", "profile"],
};

/**
 * Origen de cada bloque (RF-5). Sin verificación todo es simulado (RF-2); con una fuente, solo
 * los bloques que ella entrega llevan su nombre (RF-7, RF-8).
 */
export function blockOrigins(verification?: { source: SourceId } | null): BlockOrigins {
  const source = verification?.source;
  const origin = (block: Block): Origin =>
    source !== undefined && SOURCE_BLOCKS[source].includes(block) ? source : "simulated";
  return {
    identity: origin("identity"),
    rank: origin("rank"),
    matches: origin("matches"),
    profile: origin("profile"),
  };
}
