import { intersectBlocks } from './availability';
import { rankDistance } from './games';
import type { GameAccount, MatchCandidate, MatchFilters, TimeBlock, User } from './types';

/** Peso de la cercanía de rango frente al traslape horario en el puntaje final. */
const RANK_WEIGHT = 0.55;
const OVERLAP_WEIGHT = 0.45;

/** Horas semanales en común a partir de las cuales el traslape se considera ideal. */
const IDEAL_SHARED_HOURS = 8;

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/**
 * Motor de recomendación.
 *
 * Vive en el frontend mientras no exista el servidor: cuando Express implemente
 * `GET /matches`, este módulo queda como referencia del criterio acordado y la
 * interfaz no cambia, porque ambos producen `MatchCandidate[]`.
 */
export function scoreCandidate(
  viewerBlocks: TimeBlock[],
  viewerAccount: GameAccount,
  candidateAccount: GameAccount,
  candidateBlocks: TimeBlock[],
): Omit<MatchCandidate, 'user' | 'gameId' | 'account'> {
  const sharedBlocks = intersectBlocks(viewerBlocks, candidateBlocks);
  const distance = rankDistance(viewerAccount.currentRank, candidateAccount.currentRank);

  // Una diferencia de 25 puntos normalizados deja el componente de rango en 0.
  const rankScore = clamp(100 - distance * 4);
  const overlapScore = clamp((sharedBlocks.length / IDEAL_SHARED_HOURS) * 100);

  return {
    rankDistance: distance,
    sharedBlocks,
    score: Math.round(rankScore * RANK_WEIGHT + overlapScore * OVERLAP_WEIGHT),
  };
}

export interface CandidateInput {
  user: User;
  account: GameAccount;
  blocks: TimeBlock[];
}

/** Calcula, filtra y ordena las coincidencias para un juego. */
export function buildMatches(
  filters: MatchFilters,
  viewerAccount: GameAccount,
  viewerBlocks: TimeBlock[],
  candidates: CandidateInput[],
): MatchCandidate[] {
  const search = filters.search.trim().toLowerCase();

  return candidates
    .map(({ user, account, blocks }) => ({
      user,
      gameId: filters.gameId,
      account,
      ...scoreCandidate(viewerBlocks, viewerAccount, account, blocks),
    }))
    .filter((candidate) => {
      if (candidate.rankDistance > filters.maxRankDistance) return false;
      if (candidate.sharedBlocks.length < filters.minSharedHours) return false;
      if (filters.onlyVerified && !candidate.account.verified) return false;
      if (
        search &&
        !candidate.user.displayName.toLowerCase().includes(search) &&
        !candidate.user.username.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

/** Etiqueta legible para el puntaje, usada en las tarjetas de coincidencia. */
export function scoreLabel(score: number): 'Excelente' | 'Buena' | 'Aceptable' | 'Baja' {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Buena';
  if (score >= 40) return 'Aceptable';
  return 'Baja';
}
