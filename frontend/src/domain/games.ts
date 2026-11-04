import type { GameId, RankSnapshot } from './types';

/**
 * Catálogo de juegos soportados.
 *
 * Agregar un cuarto título consiste en añadir una entrada aquí (con su escala
 * de tiers y el formato de su identificador de cuenta): el resto de la
 * aplicación —selectores, pestañas de perfil, filtros, agenda— se genera a
 * partir de este catálogo.
 */
export interface GameDefinition {
  id: GameId;
  name: string;
  shortName: string;
  accent: string;
  /** Cómo se llama el identificador de cuenta dentro del juego. */
  handleLabel: string;
  handlePlaceholder: string;
  /** Validación mínima del identificador en el formulario de vinculación. */
  handlePattern: RegExp;
  regions: string[];
  /** Tiers de menor a mayor. */
  tiers: string[];
  /** Divisiones dentro de cada tier, de menor a mayor. Vacío si no aplica. */
  divisions: string[];
  /** Nombre de los puntos internos del juego. */
  pointsLabel: string;
}

export const GAMES: Record<GameId, GameDefinition> = {
  lol: {
    id: 'lol',
    name: 'League of Legends',
    shortName: 'LoL',
    accent: '#c8963e',
    handleLabel: 'Riot ID',
    handlePlaceholder: 'Nombre#TAG',
    handlePattern: /^.{3,16}#[A-Za-z0-9]{2,5}$/,
    regions: ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'BR', 'KR'],
    tiers: [
      'Iron',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Emerald',
      'Diamond',
      'Master',
      'Grandmaster',
      'Challenger',
    ],
    divisions: ['IV', 'III', 'II', 'I'],
    pointsLabel: 'LP',
  },
  r6: {
    id: 'r6',
    name: 'Rainbow Six Siege',
    shortName: 'R6',
    accent: '#3ea0c8',
    handleLabel: 'Ubisoft ID',
    handlePlaceholder: 'tu-nombre-ubisoft',
    handlePattern: /^[A-Za-z0-9._-]{3,20}$/,
    regions: ['LATAM', 'NCSA', 'EMEA', 'APAC'],
    tiers: [
      'Copper',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Emerald',
      'Diamond',
      'Champion',
    ],
    divisions: ['V', 'IV', 'III', 'II', 'I'],
    pointsLabel: 'MMR',
  },
  cs2: {
    id: 'cs2',
    name: 'Counter-Strike 2',
    shortName: 'CS2',
    accent: '#d97a45',
    handleLabel: 'SteamID64',
    handlePlaceholder: '7656119xxxxxxxxxx',
    handlePattern: /^7656119\d{10}$/,
    regions: ['South America', 'North America', 'Europe', 'Asia'],
    tiers: [
      'Grey',
      'Light Blue',
      'Blue',
      'Purple',
      'Pink',
      'Red',
      'Gold',
    ],
    divisions: [],
    pointsLabel: 'CS Rating',
  },
};

/** Catálogo como lista, en el orden en que se muestra en la interfaz. */
export const GAME_LIST: GameDefinition[] = [GAMES.lol, GAMES.r6, GAMES.cs2];

export const GAME_IDS: GameId[] = GAME_LIST.map((game) => game.id);

export function getGame(gameId: GameId): GameDefinition {
  return GAMES[gameId];
}

export function isGameId(value: string): value is GameId {
  return value in GAMES;
}

/** Texto corto de un rango, ej. `Platinum II · 47 LP`. */
export function formatRank(gameId: GameId, rank: RankSnapshot): string {
  const game = getGame(gameId);
  const base = rank.division ? `${rank.tier} ${rank.division}` : rank.tier;
  return rank.points === undefined ? base : `${base} · ${rank.points} ${game.pointsLabel}`;
}
