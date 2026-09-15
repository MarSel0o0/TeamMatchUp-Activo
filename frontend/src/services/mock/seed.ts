import { GAME_LIST, GAMES, normalizeRank } from '@/domain/games';
import { toBlock } from '@/domain/availability';
import type {
  GameAccount,
  GameId,
  MatchRecord,
  PlaySession,
  RankSnapshot,
  TimeBlock,
  User,
  WeekDay,
} from '@/domain/types';
import { createRandom, type Random } from './random';

export interface MockDatabase {
  users: User[];
  /** Contraseñas de demostración, indexadas por id de usuario. */
  passwords: Record<string, string>;
  accounts: GameAccount[];
  availability: Record<string, TimeBlock[]>;
  matchHistory: Record<string, MatchRecord[]>;
  sessions: PlaySession[];
}

export const DEMO_CREDENTIALS = {
  email: 'demo@teammatchup.gg',
  password: 'demo1234',
} as const;

const AVATAR_COLORS = [
  '#6d5efc',
  '#28e0a4',
  '#f2b544',
  '#ef6f7b',
  '#4ec3f0',
  '#b07ef5',
  '#7fd45c',
  '#f08a4b',
];

const PEOPLE: { username: string; displayName: string; bio: string }[] = [
  { username: 'vicho', displayName: 'Vicente Oliva', bio: 'Mid main, juego de noche entre semana.' },
  { username: 'cotito', displayName: 'Constanza Torres', bio: 'Support/entry. Prefiero grupos con comunicación.' },
  { username: 'dayala', displayName: 'Daniel Ayala', bio: 'Jungla en LoL, IGL en CS2.' },
  { username: 'sebav', displayName: 'Sebastián Valenzuela', bio: 'Busco equipo estable para ranked.' },
  { username: 'benjae', displayName: 'Benjamín Estupiñán', bio: 'Anchor en R6. Fines de semana full.' },
  { username: 'marzam', displayName: 'Marcelo Zamorano', bio: 'AWPer. Horario nocturno.' },
  { username: 'nocturna', displayName: 'Javiera Rojas', bio: 'Juego después de las 22:00, sin excepción.' },
  { username: 'kzero', displayName: 'Karla Méndez', bio: 'Top lane. Odio jugar sola.' },
  { username: 'tomi_ok', displayName: 'Tomás Cárcamo', bio: 'Flex player, me acomodo al equipo.' },
  { username: 'pau.exe', displayName: 'Paula Herrera', bio: 'Roam en R6, buena comunicación.' },
  { username: 'elmatta', displayName: 'Matías Fuentes', bio: 'Subiendo de Gold a Platino, busco dúo.' },
  { username: 'ignxcia', displayName: 'Ignacia Soto', bio: 'ADC. Juego tardes de fin de semana.' },
  { username: 'rodri_cl', displayName: 'Rodrigo Pizarro', bio: 'Rifler. Practico casi todos los días.' },
  { username: 'fran.dev', displayName: 'Francisca Leiva', bio: 'Support/medic. Paciencia infinita.' },
  { username: 'nacho7', displayName: 'Ignacio Bravo', bio: 'Vuelvo después de un año fuera.' },
  { username: 'valen.gg', displayName: 'Valentina Muñoz', bio: 'Competitiva, apunto a Diamante esta temporada.' },
];

const LOL_CHAMPIONS = ['Ahri', 'Lee Sin', 'Jinx', 'Thresh', 'Darius', 'Yasuo', 'Lux', 'Ekko'];
const R6_OPERATORS = ['Ash', 'Thermite', 'Jäger', 'Mute', 'Doc', 'Sledge', 'Valkyrie'];
const CS2_MAPS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust II'];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/** Construye un rango aleatorio coherente con la escala del juego. */
function createRank(random: Random, gameId: GameId, tierIndex: number, at: string): RankSnapshot {
  const game = GAMES[gameId];
  const tier = game.tiers[Math.min(Math.max(tierIndex, 0), game.tiers.length - 1)];
  const division = game.divisions.length
    ? game.divisions[random.int(0, game.divisions.length - 1)]
    : undefined;

  const points =
    gameId === 'cs2' ? random.int(5_000, 24_000) : gameId === 'r6' ? random.int(2_000, 4_800) : random.int(0, 99);

  return {
    tier,
    division,
    points,
    normalized: normalizeRank(gameId, tier, division),
    recordedAt: at,
  };
}

/** Historial de rango: seis lecturas semanales que terminan en el rango actual. */
function createRankHistory(random: Random, gameId: GameId, currentTierIndex: number): RankSnapshot[] {
  const history: RankSnapshot[] = [];
  let tierIndex = Math.max(0, currentTierIndex - random.int(0, 2));

  for (let week = 6; week >= 1; week -= 1) {
    history.push(createRank(random, gameId, tierIndex, daysAgo(week * 7)));
    if (random.chance(0.45)) tierIndex = Math.min(tierIndex + 1, currentTierIndex);
  }
  return history;
}

function createMatches(random: Random, gameId: GameId, count: number): MatchRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const result = random.chance(0.52) ? 'win' : 'loss';
    const summary =
      gameId === 'lol'
        ? `${random.pick(LOL_CHAMPIONS)} · ${random.int(0, 14)}/${random.int(0, 9)}/${random.int(2, 18)}`
        : gameId === 'r6'
          ? `${random.pick(R6_OPERATORS)} · ${random.int(0, 12)} bajas`
          : `${random.pick(CS2_MAPS)} · ${random.int(5, 16)}-${random.int(5, 16)}`;

    return {
      id: `match-${gameId}-${index}-${random.int(1000, 9999)}`,
      gameId,
      playedAt: hoursAgo(index * random.int(3, 30) + random.int(1, 6)),
      result,
      summary,
      durationMinutes: gameId === 'lol' ? random.int(22, 45) : random.int(12, 40),
      rankDelta: result === 'win' ? random.int(12, 28) : -random.int(10, 24),
    } satisfies MatchRecord;
  }).sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

/**
 * Disponibilidad con forma realista: cada persona tiene un "perfil horario"
 * (nocturno, vespertino o de fin de semana) en vez de bloques al azar, de modo
 * que los traslapes que muestra la vista de coincidencias sean creíbles.
 */
function createAvailability(random: Random): TimeBlock[] {
  const profile = random.pick(['nocturno', 'vespertino', 'finde'] as const);
  const blocks: TimeBlock[] = [];

  const windows: Record<typeof profile, { days: WeekDay[]; hours: number[] }> = {
    nocturno: { days: [0, 1, 2, 3, 4], hours: [21, 22, 23, 0, 1] },
    vespertino: { days: [0, 1, 2, 3, 4], hours: [17, 18, 19, 20, 21] },
    finde: { days: [4, 5, 6], hours: [14, 15, 16, 17, 18, 19, 20, 21, 22] },
  };

  const { days, hours } = windows[profile];
  for (const day of days) {
    if (random.chance(0.2)) continue;
    for (const hour of hours) {
      if (random.chance(0.78)) blocks.push(toBlock(day, hour));
    }
  }

  // Un par de bloques sueltos fuera de la ventana principal.
  for (let i = 0; i < random.int(0, 4); i += 1) {
    blocks.push(toBlock(random.int(0, 6) as WeekDay, random.int(15, 23)));
  }

  return [...new Set(blocks)];
}

/**
 * Disponibilidad del usuario de demostración: fija y amplia, para que la vista
 * de coincidencias tenga traslapes reales apenas se abre la aplicación.
 */
function createDemoAvailability(): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  for (const day of [0, 1, 2, 3, 4] as WeekDay[]) {
    for (const hour of [19, 20, 21, 22, 23]) blocks.push(toBlock(day, hour));
  }
  for (const day of [5, 6] as WeekDay[]) {
    for (const hour of [15, 16, 17, 18, 19, 20, 21, 22]) blocks.push(toBlock(day, hour));
  }
  return blocks;
}

/** Estado inicial completo del backend simulado. */
export function createSeedDatabase(): MockDatabase {
  const random = createRandom(20260915);

  const users: User[] = PEOPLE.map((person, index) => ({
    id: `user-${index + 1}`,
    username: person.username,
    email: index === 0 ? DEMO_CREDENTIALS.email : `${person.username.replace(/[^a-z0-9]/g, '')}@teammatchup.gg`,
    displayName: person.displayName,
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    bio: person.bio,
    timezone: 'America/Santiago',
    createdAt: daysAgo(random.int(20, 400)),
  }));

  const passwords: Record<string, string> = {};
  for (const user of users) {
    passwords[user.id] = user.email === DEMO_CREDENTIALS.email ? DEMO_CREDENTIALS.password : 'demo1234';
  }

  const accounts: GameAccount[] = [];
  const availability: Record<string, TimeBlock[]> = {};
  const matchHistory: Record<string, MatchRecord[]> = {};

  for (const [index, user] of users.entries()) {
    availability[user.id] = index === 0 ? createDemoAvailability() : createAvailability(random);

    // El usuario de demostración tiene los tres juegos. El resto recibe uno por
    // rotación —así ningún título queda sin jugadores— y a veces un segundo.
    const rotated = GAME_LIST[(index - 1) % GAME_LIST.length];
    const userGames =
      index === 0
        ? GAME_LIST
        : random.chance(0.45)
          ? [rotated, random.pick(GAME_LIST.filter((game) => game.id !== rotated.id))]
          : [rotated];

    for (const game of userGames) {
      // Rangos concentrados en la zona media de la escala, como en la realidad.
      const tierIndex = Math.min(
        game.tiers.length - 1,
        Math.max(0, Math.round((random.next() + random.next()) * 0.5 * (game.tiers.length - 1) + random.int(-1, 1))),
      );
      const history = createRankHistory(random, game.id, tierIndex);
      const currentRank = createRank(random, game.id, tierIndex, hoursAgo(random.int(1, 20)));

      const account: GameAccount = {
        id: `account-${user.id}-${game.id}`,
        userId: user.id,
        gameId: game.id,
        handle:
          game.id === 'lol'
            ? `${user.displayName.split(' ')[0]}#${String(random.int(100, 999))}`
            : game.id === 'cs2'
              ? `7656119${String(random.int(1_000_000_000, 9_999_999_999))}`
              : user.username,
        region: random.pick(game.regions.slice(0, 3)),
        currentRank,
        rankHistory: [...history, currentRank],
        lastSyncedAt: hoursAgo(random.int(1, 20)),
        verified: random.chance(0.8),
      };

      accounts.push(account);
      matchHistory[account.id] = createMatches(random, game.id, random.int(5, 9));
    }
  }

  const sessionTitles = [
    'Ranked flex, 5 stack',
    'Calentamiento y luego competitivo',
    'Noche de clasificatorias',
    'Scrim casual, todos bienvenidos',
    'Subida a Platino',
    'Partidas hasta que aguante el sueño',
  ];

  const sessions: PlaySession[] = Array.from({ length: 9 }, (_, index) => {
    const host = users[random.int(1, users.length - 1)];
    const hostAccounts = accounts.filter((account) => account.userId === host.id);
    const gameId = hostAccounts.length ? random.pick(hostAccounts).gameId : 'lol';
    const slots = gameId === 'lol' ? 5 : gameId === 'cs2' ? 5 : 5;
    const participantUsers = random.sample(
      users.filter((user) => user.id !== host.id),
      random.int(0, slots - 2),
    );

    const toRef = (user: User) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
    });

    const participants = [toRef(host), ...participantUsers.map(toRef)];

    return {
      id: `session-${index + 1}`,
      gameId,
      hostId: host.id,
      host: toRef(host),
      title: sessionTitles[index % sessionTitles.length],
      notes: random.pick([
        'Micrófono obligatorio.',
        'Ambiente relajado, sin flamear.',
        'Traer ganas de comunicar calls.',
        '',
      ]),
      day: random.int(0, 6) as WeekDay,
      startHour: random.int(16, 23),
      durationHours: random.int(1, 3),
      slots,
      participants,
      status: participants.length >= slots ? 'full' : 'open',
      createdAt: hoursAgo(random.int(2, 90)),
    } satisfies PlaySession;
  });

  return { users, passwords, accounts, availability, matchHistory, sessions };
}
