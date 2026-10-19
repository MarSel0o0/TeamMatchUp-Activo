import { GAME_LIST } from '@/domain/games';
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
import { createRandom } from './random';
import {
  canonicalHandle,
  readAccountState,
  type SimulatedMatch,
  type Snapshot,
} from './simulatedProvider';

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

/** Tintas de identidad, tomadas de la paleta del mundo: bolígrafo, sello y juego. */
const AVATAR_COLORS = [
  '#4f86e8',
  '#d4453a',
  '#d3a04a',
  '#5fc2d8',
  '#e08a4f',
  '#4aa36b',
  '#99a3ab',
  '#6e9df0',
];

/** Lecturas del proveedor simulado -> las formas que entrega el servidor (fechas en ISO). */
export function snapshotJson(snapshot: Snapshot): RankSnapshot {
  const { tier, division, points, normalized, recordedAt } = snapshot;
  return {
    tier,
    ...(division === undefined ? {} : { division }),
    points,
    normalized,
    recordedAt: recordedAt.toISOString(),
  };
}

export function matchJson(match: SimulatedMatch): MatchRecord {
  const { id, gameId, playedAt, result, summary, durationMinutes, rankDelta } = match;
  return { id, gameId, playedAt: playedAt.toISOString(), result, summary, durationMinutes, rankDelta };
}

interface SeedAccount {
  gameId: GameId;
  handle: string;
  region: string;
}

interface SeedPerson {
  username: string;
  displayName: string;
  bio: string;
  accounts: SeedAccount[];
}

/**
 * Jugadores ficticios (RF-27): ninguna palabra de los integrantes del equipo ni de sus
 * nombres de usuario. El primero es la cuenta demo. El rango, la verificación y las partidas
 * de cada cuenta no están escritos aquí: salen del proveedor simulado (lectura 0) a partir
 * del identificador, así que la primera resincronización mueve el rango como mucho un
 * escalón. Los identificadores se eligieron para repartir rangos cercanos a los de la cuenta
 * demo y para que cada juego tenga cuentas verificadas y sin verificar; `jugador1` a
 * `jugador4` son los ejemplos de la spec 004.
 */
const PEOPLE: readonly SeedPerson[] = [
  {
    username: 'demo',
    displayName: 'Jugador Demo',
    bio: 'Cuenta de demostración con los tres juegos vinculados.',
    accounts: [
      { gameId: 'lol', handle: 'Jugador1#LAS', region: 'LAS' },
      { gameId: 'r6', handle: 'jugador1', region: 'LATAM' },
      { gameId: 'cs2', handle: '76561190000000001', region: 'South America' },
    ],
  },
  {
    username: 'nocturna',
    displayName: 'Isidora Campos',
    bio: 'Juego después de las 22:00, sin excepción.',
    accounts: [
      { gameId: 'lol', handle: 'Nocturna#038', region: 'LAS' },
      { gameId: 'cs2', handle: '76561198000000851', region: 'South America' },
    ],
  },
  {
    username: 'zorro_azul',
    displayName: 'Renata Bustos',
    bio: 'Top lane. Odio jugar sola.',
    accounts: [{ gameId: 'lol', handle: 'ZorroAzul#107', region: 'LAS' }],
  },
  {
    username: 'lunaticx',
    displayName: 'Emilia Vargas',
    bio: 'Support. Prefiero grupos con comunicación.',
    accounts: [{ gameId: 'lol', handle: 'Jugador2#LAS', region: 'LAN' }],
  },
  {
    username: 'ghost.pix',
    displayName: 'Cristóbal Lagos',
    bio: 'Jungla en LoL, IGL en CS2.',
    accounts: [
      { gameId: 'lol', handle: 'GhostPix#005', region: 'LAS' },
      { gameId: 'cs2', handle: '76561198000000259', region: 'South America' },
    ],
  },
  {
    username: 'tomi_ok',
    displayName: 'Joaquín Pacheco',
    bio: 'Flex player, me acomodo al equipo.',
    accounts: [
      { gameId: 'lol', handle: 'Jugador3#LAS', region: 'LAS' },
      { gameId: 'cs2', handle: '76561198000000370', region: 'South America' },
    ],
  },
  {
    username: 'pau.exe',
    displayName: 'Antonia Herrera',
    bio: 'Roam en R6, buena comunicación.',
    accounts: [{ gameId: 'r6', handle: 'pau.exe_104', region: 'LATAM' }],
  },
  {
    username: 'ratamala',
    displayName: 'Gaspar Ibarra',
    bio: 'Subiendo de Silver a Gold, busco dúo.',
    accounts: [{ gameId: 'lol', handle: 'Ratamala#045', region: 'LAS' }],
  },
  {
    username: 'ignxcia',
    displayName: 'Fernanda Soto',
    bio: 'ADC. Juego tardes de fin de semana.',
    accounts: [{ gameId: 'lol', handle: 'Ignxcia#099', region: 'LAN' }],
  },
  {
    username: 'rifle_cl',
    displayName: 'Felipe Navarro',
    bio: 'Rifler. Practico casi todos los días.',
    accounts: [
      { gameId: 'r6', handle: 'rifle_cl_14', region: 'LATAM' },
      { gameId: 'cs2', handle: '76561198000000111', region: 'South America' },
    ],
  },
  {
    username: 'fran.med',
    displayName: 'Catalina Leiva',
    bio: 'Support/medic. Paciencia infinita.',
    accounts: [{ gameId: 'r6', handle: 'jugador3', region: 'LATAM' }],
  },
  {
    username: 'bruno_r6',
    displayName: 'Bruno Cifuentes',
    bio: 'Vuelvo después de un año fuera.',
    accounts: [{ gameId: 'r6', handle: 'jugador2', region: 'NCSA' }],
  },
  {
    username: 'mili.gg',
    displayName: 'Milagros Quiroz',
    bio: 'Competitiva, apunto a Diamante esta temporada.',
    accounts: [
      { gameId: 'r6', handle: 'mili.gg_33', region: 'LATAM' },
      { gameId: 'cs2', handle: '76561198000000481', region: 'South America' },
    ],
  },
  {
    username: 'dagger77',
    displayName: 'Maximiliano Salinas',
    bio: 'AWPer. Horario nocturno.',
    accounts: [
      { gameId: 'r6', handle: 'dagger77_43', region: 'LATAM' },
      { gameId: 'cs2', handle: '76561198000000148', region: 'South America' },
    ],
  },
  {
    username: 'pelusa',
    displayName: 'Josefa Araya',
    bio: 'Anchor en R6. Fines de semana full.',
    accounts: [{ gameId: 'r6', handle: 'pelusa_8', region: 'LATAM' }],
  },
  {
    username: 'capitan_k',
    displayName: 'Nicolás Pinto',
    bio: 'Busco equipo estable para ranked.',
    accounts: [
      { gameId: 'lol', handle: 'Jugador4#LAS', region: 'LAS' },
      { gameId: 'cs2', handle: '76561198000000777', region: 'South America' },
    ],
  },
];

/** Los instantes relativos salen del reloj de la aplicación (`Date.now()`), no de una fecha fija. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/**
 * Disponibilidad con forma realista: cada persona tiene un "perfil horario"
 * (nocturno, vespertino o de fin de semana) en vez de bloques al azar, de modo
 * que los traslapes que muestra la vista de coincidencias sean creíbles.
 */
function createAvailability(random: ReturnType<typeof createRandom>): TimeBlock[] {
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

/** Estado inicial completo del backend simulado (semilla fija; sin sesión abierta). */
export function createSeedDatabase(): MockDatabase {
  const random = createRandom(20260915);

  const users: User[] = PEOPLE.map((person, index) => ({
    id: `user-${index + 1}`,
    username: person.username,
    email:
      index === 0
        ? DEMO_CREDENTIALS.email
        : `${person.username.replace(/[^a-z0-9]/g, '')}@teammatchup.gg`,
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

    for (const seedAccount of PEOPLE[index].accounts) {
      // Lectura número 0 del proveedor simulado, hecha entre 1 y 20 horas antes de ahora:
      // el rango, el historial, las partidas y la verificación salen de ella.
      const at = new Date(Date.now() - random.int(1, 20) * 3_600_000 - random.int(0, 59) * 60_000);
      const reading = readAccountState({
        gameId: seedAccount.gameId,
        canonicalHandle: canonicalHandle(seedAccount.handle),
        readingNumber: 0,
        now: at,
      });
      const snapshot = snapshotJson(reading.snapshot);

      const account: GameAccount = {
        id: `account-${user.id}-${seedAccount.gameId}`,
        userId: user.id,
        gameId: seedAccount.gameId,
        handle: seedAccount.handle,
        region: seedAccount.region,
        currentRank: snapshot,
        rankHistory: [snapshot],
        lastSyncedAt: at.toISOString(),
        verified: reading.verified,
        simulated: true,
      };

      accounts.push(account);
      // El proveedor ya las entrega de la más reciente a la más antigua.
      matchHistory[account.id] = reading.matches.map(matchJson);
    }
  }

  const sessionTitles = [
    'Ranked flex, 5 stack',
    'Calentamiento y luego competitivo',
    'Noche de clasificatorias',
    'Scrim casual, todos bienvenidos',
    'Subida de rango sin presión',
    'Partidas hasta que aguante el sueño',
  ];

  const sessions: PlaySession[] = Array.from({ length: 9 }, (_, index) => {
    const host = users[random.int(1, users.length - 1)];
    const hostAccounts = accounts.filter((account) => account.userId === host.id);
    const gameId: GameId = hostAccounts.length ? random.pick(hostAccounts).gameId : GAME_LIST[0].id;
    const slots = 5;
    const participantUsers = random.sample(
      users.filter((user) => user.id !== host.id),
      random.int(0, slots - 1),
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
