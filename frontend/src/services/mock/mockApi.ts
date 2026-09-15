import { env, STORAGE_KEYS } from '@/config/env';
import { GAMES, normalizeRank } from '@/domain/games';
import { buildMatches, type CandidateInput } from '@/domain/matching';
import type {
  AuthSession,
  Credentials,
  GameAccount,
  GameId,
  MatchCandidate,
  MatchFilters,
  PlaySession,
  RegisterPayload,
  TimeBlock,
  User,
} from '@/domain/types';
import type {
  ApiContract,
  CreateSessionPayload,
  GameProfileSummary,
  LinkAccountPayload,
  UpdateProfilePayload,
} from '../apiContract';
import { ApiError } from '../http/httpClient';
import { createRandom } from './random';
import { createSeedDatabase, type MockDatabase } from './seed';

/* -------------------------------------------------------------------------- */
/* Persistencia                                                                */
/* -------------------------------------------------------------------------- */

function save(next: MockDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(next));
  } catch {
    // Sin almacenamiento la sesión sigue funcionando, solo no sobrevive al recargar.
  }
}

function readDatabase(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.mockDb);
    if (raw) return JSON.parse(raw) as MockDatabase;
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se regenera la semilla.
  }
  return createSeedDatabase();
}

let database: MockDatabase = readDatabase();
save(database);

/** Escribe en el almacenamiento el estado actual tras una escritura. */
function persist(): void {
  save(database);
}

/** Borra los datos simulados y vuelve al estado inicial. */
export function resetMockDatabase(): void {
  localStorage.removeItem(STORAGE_KEYS.mockDb);
  localStorage.removeItem(STORAGE_KEYS.token);
  database = createSeedDatabase();
  save(database);
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

const delay = () => new Promise((resolve) => setTimeout(resolve, env.mockLatency));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** El token simulado es simplemente `mock.<userId>`. */
const tokenFor = (userId: string) => `mock.${userId}`;

function currentUser(): User {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const userId = token?.startsWith('mock.') ? token.slice(5) : null;
  const user = userId ? database.users.find((candidate) => candidate.id === userId) : undefined;
  if (!user) throw new ApiError('Sesión no válida o expirada.', 401);
  return user;
}

const userRef = (user: User) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarColor: user.avatarColor,
});

/* -------------------------------------------------------------------------- */
/* Implementación del contrato                                                 */
/* -------------------------------------------------------------------------- */

export const mockApi: ApiContract = {
  auth: {
    async login({ email, password }: Credentials): Promise<AuthSession> {
      await delay();
      const user = database.users.find(
        (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!user || database.passwords[user.id] !== password) {
        throw new ApiError('Correo o contraseña incorrectos.', 401);
      }
      const token = tokenFor(user.id);
      localStorage.setItem(STORAGE_KEYS.token, token);
      return { token, user: clone(user) };
    },

    async register(payload: RegisterPayload): Promise<AuthSession> {
      await delay();
      const email = payload.email.trim().toLowerCase();
      if (database.users.some((user) => user.email.toLowerCase() === email)) {
        throw new ApiError('Ya existe una cuenta con ese correo.', 409);
      }
      if (
        database.users.some(
          (user) => user.username.toLowerCase() === payload.username.trim().toLowerCase(),
        )
      ) {
        throw new ApiError('Ese nombre de usuario ya está tomado.', 409);
      }

      const user: User = {
        id: `user-${Date.now()}`,
        username: payload.username.trim(),
        email,
        displayName: payload.displayName.trim() || payload.username.trim(),
        avatarColor: '#6d5efc',
        bio: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago',
        createdAt: new Date().toISOString(),
      };

      database.users.push(user);
      database.passwords[user.id] = payload.password;
      database.availability[user.id] = [];
      persist();

      const token = tokenFor(user.id);
      localStorage.setItem(STORAGE_KEYS.token, token);
      return { token, user: clone(user) };
    },

    async me(): Promise<User | null> {
      await delay();
      try {
        return clone(currentUser());
      } catch {
        return null;
      }
    },

    async logout(): Promise<void> {
      localStorage.removeItem(STORAGE_KEYS.token);
    },
  },

  profile: {
    async updateProfile(payload: UpdateProfilePayload): Promise<User> {
      await delay();
      const user = currentUser();
      Object.assign(user, {
        displayName: payload.displayName ?? user.displayName,
        bio: payload.bio ?? user.bio,
        timezone: payload.timezone ?? user.timezone,
      });
      persist();
      return clone(user);
    },

    async getAccounts(): Promise<GameAccount[]> {
      await delay();
      const user = currentUser();
      return clone(database.accounts.filter((account) => account.userId === user.id));
    },

    async linkAccount(payload: LinkAccountPayload): Promise<GameAccount> {
      await delay();
      const user = currentUser();
      const game = GAMES[payload.gameId];

      if (!game.handlePattern.test(payload.handle.trim())) {
        throw new ApiError(`El ${game.handleLabel} no tiene un formato válido.`, 422);
      }
      if (
        database.accounts.some(
          (account) => account.userId === user.id && account.gameId === payload.gameId,
        )
      ) {
        throw new ApiError(`Ya tienes una cuenta de ${game.name} vinculada.`, 409);
      }

      // En producción esto lo resuelve el proceso que consulta la fuente externa.
      const random = createRandom(payload.handle.length * 977 + Date.now());
      const tierIndex = random.int(1, game.tiers.length - 3);
      const tier = game.tiers[tierIndex];
      const division = game.divisions.length ? game.divisions[random.int(0, game.divisions.length - 1)] : undefined;
      const now = new Date().toISOString();

      const account: GameAccount = {
        id: `account-${user.id}-${payload.gameId}`,
        userId: user.id,
        gameId: payload.gameId,
        handle: payload.handle.trim(),
        region: payload.region,
        currentRank: {
          tier,
          division,
          points: payload.gameId === 'lol' ? random.int(0, 99) : random.int(2_000, 20_000),
          normalized: normalizeRank(payload.gameId, tier, division),
          recordedAt: now,
        },
        rankHistory: [],
        lastSyncedAt: now,
        verified: true,
      };
      account.rankHistory = [account.currentRank];

      database.accounts.push(account);
      database.matchHistory[account.id] = [];
      persist();
      return clone(account);
    },

    async unlinkAccount(accountId: string): Promise<void> {
      await delay();
      const user = currentUser();
      const index = database.accounts.findIndex(
        (account) => account.id === accountId && account.userId === user.id,
      );
      if (index < 0) throw new ApiError('La cuenta no existe o no te pertenece.', 404);

      database.accounts.splice(index, 1);
      delete database.matchHistory[accountId];
      persist();
    },

    async syncAccount(accountId: string): Promise<GameAccount> {
      await delay();
      const user = currentUser();
      const account = database.accounts.find(
        (candidate) => candidate.id === accountId && candidate.userId === user.id,
      );
      if (!account) throw new ApiError('La cuenta no existe o no te pertenece.', 404);

      // Simula una nueva lectura de la fuente externa: pequeña variación de rango.
      const game = GAMES[account.gameId];
      const random = createRandom(Date.now());
      const currentTierIndex = game.tiers.indexOf(account.currentRank.tier);
      const nextTierIndex = Math.min(
        game.tiers.length - 1,
        Math.max(0, currentTierIndex + (random.chance(0.25) ? random.pick([-1, 1]) : 0)),
      );
      const tier = game.tiers[nextTierIndex];
      const division = game.divisions.length ? game.divisions[random.int(0, game.divisions.length - 1)] : undefined;
      const now = new Date().toISOString();

      account.currentRank = {
        tier,
        division,
        points: account.gameId === 'lol' ? random.int(0, 99) : random.int(2_000, 20_000),
        normalized: normalizeRank(account.gameId, tier, division),
        recordedAt: now,
      };
      account.rankHistory.push(account.currentRank);
      account.lastSyncedAt = now;
      account.verified = true;
      persist();
      return clone(account);
    },

    async getAvailability(): Promise<TimeBlock[]> {
      await delay();
      const user = currentUser();
      return clone(database.availability[user.id] ?? []);
    },

    async saveAvailability(blocks: TimeBlock[]): Promise<TimeBlock[]> {
      await delay();
      const user = currentUser();
      database.availability[user.id] = [...new Set(blocks)];
      persist();
      return clone(database.availability[user.id]);
    },

    async getGameSummary(gameId: GameId): Promise<GameProfileSummary> {
      await delay();
      const user = currentUser();
      const account = database.accounts.find(
        (candidate) => candidate.userId === user.id && candidate.gameId === gameId,
      );
      if (!account) throw new ApiError('No tienes una cuenta vinculada en ese juego.', 404);

      const recentMatches = (database.matchHistory[account.id] ?? []).slice(0, 8);
      const wins = recentMatches.filter((match) => match.result === 'win').length;
      const history = account.rankHistory;
      const oldest = history[0]?.normalized ?? account.currentRank.normalized;

      return clone({
        account,
        recentMatches,
        winRate: recentMatches.length ? Math.round((wins / recentMatches.length) * 100) : 0,
        trend: account.currentRank.normalized - oldest,
      });
    },
  },

  matches: {
    async list(filters: MatchFilters): Promise<MatchCandidate[]> {
      await delay();
      const user = currentUser();
      const viewerAccount = database.accounts.find(
        (account) => account.userId === user.id && account.gameId === filters.gameId,
      );
      if (!viewerAccount) throw new ApiError('No tienes una cuenta vinculada en ese juego.', 404);

      const viewerBlocks = database.availability[user.id] ?? [];
      const candidates: CandidateInput[] = database.accounts
        .filter((account) => account.gameId === filters.gameId && account.userId !== user.id)
        .flatMap((account) => {
          const owner = database.users.find((candidate) => candidate.id === account.userId);
          if (!owner) return [];
          return [{ user: owner, account, blocks: database.availability[owner.id] ?? [] }];
        });

      return clone(buildMatches(filters, viewerAccount, viewerBlocks, candidates));
    },
  },

  sessions: {
    async list(gameId: GameId | 'all'): Promise<PlaySession[]> {
      await delay();
      currentUser();
      const sessions =
        gameId === 'all'
          ? database.sessions
          : database.sessions.filter((session) => session.gameId === gameId);
      return clone(
        [...sessions].sort((a, b) => a.day - b.day || a.startHour - b.startHour),
      );
    },

    async create(payload: CreateSessionPayload): Promise<PlaySession> {
      await delay();
      const user = currentUser();
      const session: PlaySession = {
        id: `session-${Date.now()}`,
        gameId: payload.gameId,
        hostId: user.id,
        host: userRef(user),
        title: payload.title.trim(),
        notes: payload.notes.trim(),
        day: payload.day,
        startHour: payload.startHour,
        durationHours: payload.durationHours,
        slots: payload.slots,
        participants: [userRef(user)],
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      database.sessions.push(session);
      persist();
      return clone(session);
    },

    async join(sessionId: string): Promise<PlaySession> {
      await delay();
      const user = currentUser();
      const session = database.sessions.find((candidate) => candidate.id === sessionId);
      if (!session) throw new ApiError('La sesión no existe.', 404);
      if (session.status !== 'open') throw new ApiError('Esta sesión ya no admite jugadores.', 409);
      if (session.participants.some((participant) => participant.id === user.id)) {
        throw new ApiError('Ya estás inscrito en esta sesión.', 409);
      }

      session.participants.push(userRef(user));
      if (session.participants.length >= session.slots) session.status = 'full';
      persist();
      return clone(session);
    },

    async leave(sessionId: string): Promise<PlaySession> {
      await delay();
      const user = currentUser();
      const session = database.sessions.find((candidate) => candidate.id === sessionId);
      if (!session) throw new ApiError('La sesión no existe.', 404);
      if (session.hostId === user.id) {
        throw new ApiError('Eres quien organiza: cancela la sesión en lugar de salir.', 409);
      }

      session.participants = session.participants.filter(
        (participant) => participant.id !== user.id,
      );
      if (session.status === 'full') session.status = 'open';
      persist();
      return clone(session);
    },

    async cancel(sessionId: string): Promise<void> {
      await delay();
      const user = currentUser();
      const session = database.sessions.find((candidate) => candidate.id === sessionId);
      if (!session) throw new ApiError('La sesión no existe.', 404);
      if (session.hostId !== user.id) {
        throw new ApiError('Solo quien organiza puede cancelar la sesión.', 403);
      }

      database.sessions = database.sessions.filter((candidate) => candidate.id !== sessionId);
      persist();
    },
  },
};
