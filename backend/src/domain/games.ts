// Catálogo de juegos del backend (spec 004, RF-6, RNF-2).
// Copia de `frontend/src/domain/games.ts` sin `source` ni `accent` (ninguna mención de
// fuentes reales) y sin la `normalizeRank` antigua: la única normalización del backend es la
// de `rankScale.ts` (DP-26).

export type GameId = "lol" | "r6" | "cs2";

export interface GameDefinition {
  id: GameId;
  name: string;
  shortName: string;
  /** Cómo se llama el identificador de cuenta dentro del juego. */
  handleLabel: string;
  handlePlaceholder: string;
  /** Validación mínima del identificador de la cuenta. */
  handlePattern: RegExp;
  regions: readonly string[];
  /** Tiers de menor a mayor. */
  tiers: readonly string[];
  /** Divisiones de los tiers que las tienen, de menor a mayor. Vacío si no aplica. */
  divisions: readonly string[];
  /** Nombre de los puntos internos del juego. */
  pointsLabel: string;
}

export const GAMES: Readonly<Record<GameId, GameDefinition>> = {
  lol: {
    id: "lol",
    name: "League of Legends",
    shortName: "LoL",
    handleLabel: "Riot ID",
    handlePlaceholder: "Nombre#TAG",
    handlePattern: /^.{3,16}#[A-Za-z0-9]{2,5}$/,
    regions: ["LAS", "LAN", "NA", "EUW", "EUNE", "BR", "KR"],
    tiers: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Emerald",
      "Diamond",
      "Master",
      "Grandmaster",
      "Challenger",
    ],
    divisions: ["IV", "III", "II", "I"],
    pointsLabel: "LP",
  },
  r6: {
    id: "r6",
    name: "Rainbow Six Siege",
    shortName: "R6",
    handleLabel: "Ubisoft ID",
    handlePlaceholder: "tu-nombre-ubisoft",
    handlePattern: /^[A-Za-z0-9._-]{3,20}$/,
    regions: ["LATAM", "NCSA", "EMEA", "APAC"],
    tiers: ["Copper", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Champion"],
    divisions: ["V", "IV", "III", "II", "I"],
    pointsLabel: "MMR",
  },
  cs2: {
    id: "cs2",
    name: "Counter-Strike 2",
    shortName: "CS2",
    handleLabel: "SteamID64",
    handlePlaceholder: "7656119xxxxxxxxxx",
    handlePattern: /^7656119\d{10}$/,
    regions: ["South America", "North America", "Europe", "Asia"],
    tiers: ["Grey", "Light Blue", "Blue", "Purple", "Pink", "Red", "Gold"],
    divisions: [],
    pointsLabel: "CS Rating",
  },
};

/** Catálogo como lista, en el orden de la interfaz. */
export const GAME_LIST: readonly GameDefinition[] = [GAMES.lol, GAMES.r6, GAMES.cs2];

export const GAME_IDS: readonly GameId[] = GAME_LIST.map((game) => game.id);

export function getGame(gameId: GameId): GameDefinition {
  return GAMES[gameId];
}

/** Solo propiedades propias: `"toString" in GAMES` sería verdadero. */
export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && Object.hasOwn(GAMES, value);
}
