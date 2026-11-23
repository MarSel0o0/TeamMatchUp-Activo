// Fuentes reales y origen de los datos de una cuenta (spec 012, RF-5, RF-7, RF-8; plan,
// sección 1). Sin Express, Mongoose ni reloj.
// - Spec 015 (plan, P15-7): Leetify entrega el rango de CS2 pero no verifica cuentas, así que es
//   un origen de datos (`DataSourceId`) y no una fuente de verificación (`SourceId`).
// - El origen de cada bloque no se guarda: se calcula de la fuente que verificó la cuenta y de
//   los bloques que esa fuente entrega (plan, P12-2). Así no existe el estado imposible de un
//   bloque atribuido a una fuente que no lo entrega (RF-7).

/** Fuentes reales conocidas: Steam (spec 013) y Riot Games (spec 014). */
export const SOURCE_IDS = ["steam", "riot"] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

/** Orígenes reales de un dato: las fuentes de verificación y Leetify (spec 015, solo rango de CS2). */
export const DATA_SOURCE_IDS = [...SOURCE_IDS, "leetify"] as const;

export type DataSourceId = (typeof DATA_SOURCE_IDS)[number];

/** `simulated` o la fuente real de la que vino el dato. */
export type Origin = "simulated" | DataSourceId;

/** Grupos de datos de una cuenta que pueden tener un origen distinto (spec 012, Definiciones). */
export type Block = "identity" | "rank" | "matches" | "profile";

export type BlockOrigins = Record<Block, Origin>;

/** Nombre que ve el usuario en los mensajes. */
export const SOURCE_NAMES: Readonly<Record<DataSourceId, string>> = {
  steam: "Steam",
  riot: "Riot Games",
  leetify: "Leetify",
};

/**
 * Bloques que entrega cada fuente. Steam no expone el rango Premier ni partidas competitivas
 * de CS2 (spec 013): el rango lo entrega Leetify desde la spec 015 y las partidas desde la spec
 * 019 (`THIRD_PARTY_BLOCKS`).
 */
export const SOURCE_BLOCKS: Readonly<Record<SourceId, readonly Block[]>> = {
  steam: ["identity", "profile"],
  riot: ["identity", "rank", "matches", "profile"],
};

/**
 * Bloques que una fuente de verificación recibe de un tercero en lugar de entregarlos ella
 * (spec 015, RF-6): el rango de CS2 verificado con Steam lo entrega Leetify, también cuando
 * todavía no hay lectura («rango no disponible», D11).
 */
const THIRD_PARTY_BLOCKS: Readonly<Partial<Record<SourceId, Partial<Record<Block, DataSourceId>>>>> = {
  steam: { rank: "leetify", matches: "leetify" }, // partidas: spec 019, RF-5
};

/**
 * Origen de cada bloque (RF-5). Sin verificación todo es simulado (RF-2); con una fuente, solo
 * los bloques que ella entrega, o que entrega un tercero nombrado por una spec, llevan su nombre
 * (RF-7, RF-8; spec 015, RF-6, RF-13).
 */
export function blockOrigins(verification?: { source: SourceId } | null): BlockOrigins {
  const source = verification?.source;
  const origin = (block: Block): Origin => {
    if (source === undefined) return "simulated";
    const thirdParty = THIRD_PARTY_BLOCKS[source]?.[block];
    if (thirdParty !== undefined) return thirdParty;
    return SOURCE_BLOCKS[source].includes(block) ? source : "simulated";
  };
  return {
    identity: origin("identity"),
    rank: origin("rank"),
    matches: origin("matches"),
    profile: origin("profile"),
  };
}
