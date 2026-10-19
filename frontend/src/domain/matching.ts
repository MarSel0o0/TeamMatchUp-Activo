// Motor de coincidencias (spec 005, RF-2, RF-3, RF-4, RF-7, RF-8, RF-9, RF-17, DP5-7, DP5-8,
// DP5-11, DP5-12, DP-26; spec 007, RNF-6). Copia del criterio de
// `backend/src/domain/matching.ts` con los mismos nombres y firmas; si divergen, manda la del
// servidor. Reglas puras: sin React, red ni reloj. La usa el backend simulado.
import { intersectBlocks } from './availability';
import type { GameId, PublicUser } from './types';

/** Criterios de la consulta ya validados (misma forma que `MatchCriteria` del servidor). */
export interface MatchCriteria {
  gameId: GameId;
  maxRankDistance: number;
  minSharedHours: number;
  onlyVerified: boolean;
  /** `null` = no filtra; si no, ya sin espacios en los extremos. */
  search: string | null;
}

/** Lo mínimo que el motor necesita de una cuenta; el resto (`simulated`, `handle`…) pasa intacto. */
export interface RankedAccount {
  userId: string;
  currentRank: { normalized: number };
  verified: boolean;
}

/** Datos públicos del jugador candidato: sin correo ni hash (DP5-10). */
export type CandidateUser = PublicUser;

export interface CandidateInput<A extends RankedAccount> {
  user: CandidateUser;
  account: A;
  blocks: readonly string[];
}

export interface MatchCandidate<A extends RankedAccount> {
  user: CandidateUser;
  gameId: GameId;
  account: A;
  rankDistance: number;
  sharedBlocks: string[];
  score: number;
}

/** Distancia de rango: diferencia absoluta de los valores normalizados guardados (DP-26). */
export function rankDistance(a: { normalized: number }, b: { normalized: number }): number {
  return Math.abs(a.normalized - b.normalized);
}

/**
 * Puntaje 0–100 en aritmética entera (DP5-7, sin coma flotante).
 *
 * Valor exacto = 0,55·R + 0,45·H, con R = máx(0, 100 − 4·d) y H = mín(100, 12,5·b).
 * Multiplicado por 40 es el entero N = 22·R + mín(1800, 225·b); el redondeo con mitades hacia
 * arriba es ⌊(N + 20) / 40⌋, escrito sin división decimal.
 *
 * @param distance entero 0..100 (distancia de rango)
 * @param sharedCount entero ≥ 0 (bloques horarios en común)
 */
export function scoreCandidate(distance: number, sharedCount: number): number {
  const rankPart = Math.max(0, 100 - 4 * distance);
  const times40 = 22 * rankPart + Math.min(1800, 225 * sharedCount);
  const shifted = times40 + 20;
  return (shifted - (shifted % 40)) / 40;
}

/** Texto comparable: forma NFC y minúsculas por la tabla Unicode, sin depender del idioma (DP5-12). */
export function foldText(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

/**
 * RF-9: el texto buscado está contenido, como texto literal, en el nombre visible o en el
 * nombre de usuario. `null` no filtra. Los acentos cuentan: `nandu` no encuentra a `Ñandú`.
 */
export function matchesSearch(
  user: Pick<CandidateUser, 'username' | 'displayName'>,
  search: string | null,
): boolean {
  if (search === null) return true;
  const needle = foldText(search);
  return foldText(user.displayName).includes(needle) || foldText(user.username).includes(needle);
}

/**
 * Compara por código Unicode (no por unidad UTF-16, como haría `<`): el primer código distinto
 * decide; si uno es prefijo del otro, va primero el más corto (DP5-8).
 */
export function compareByCodePoint(a: string, b: string): number {
  let indexA = 0;
  let indexB = 0;
  while (indexA < a.length && indexB < b.length) {
    const codeA = a.codePointAt(indexA);
    const codeB = b.codePointAt(indexB);
    if (codeA === undefined || codeB === undefined) break;
    if (codeA !== codeB) return codeA < codeB ? -1 : 1;
    indexA += codeA > 0xffff ? 2 : 1;
    indexB += codeB > 0xffff ? 2 : 1;
  }
  const remainingA = a.length - indexA;
  const remainingB = b.length - indexB;
  if (remainingA === remainingB) return 0;
  return remainingA < remainingB ? -1 : 1;
}

/**
 * Orden de RF-2: mayor puntaje, menor distancia de rango, más bloques en común y, por último,
 * nombre de usuario por código Unicode (los nombres son únicos: el orden es total).
 */
export function compareCandidates<A extends RankedAccount>(
  x: MatchCandidate<A>,
  y: MatchCandidate<A>,
): number {
  return (
    y.score - x.score ||
    x.rankDistance - y.rankDistance ||
    y.sharedBlocks.length - x.sharedBlocks.length ||
    compareByCodePoint(x.user.username, y.user.username)
  );
}

/** RF-17: une cada cuenta con su dueño; una cuenta sin dueño en el mapa se omite. */
export function assembleCandidates<A extends RankedAccount>(
  accounts: readonly A[],
  owners: ReadonlyMap<string, { user: CandidateUser; blocks: readonly string[] }>,
): CandidateInput<A>[] {
  const inputs: CandidateInput<A>[] = [];
  for (const account of accounts) {
    const owner = owners.get(account.userId);
    if (owner === undefined) continue;
    inputs.push({ user: owner.user, account, blocks: owner.blocks });
  }
  return inputs;
}

/**
 * Coincidencias de un juego (RF-2, RF-4, RF-7, RF-8, RF-9): excluye al propio usuario, calcula
 * distancia, bloques en común y puntaje, aplica los filtros y ordena con `compareCandidates`.
 */
export function buildMatches<A extends RankedAccount>(
  criteria: MatchCriteria,
  viewer: { userId: string; account: RankedAccount; blocks: readonly string[] },
  candidates: readonly CandidateInput<A>[],
): MatchCandidate<A>[] {
  return candidates
    .filter((candidate) => candidate.account.userId !== viewer.userId)
    .map((candidate): MatchCandidate<A> => {
      const distance = rankDistance(viewer.account.currentRank, candidate.account.currentRank);
      const sharedBlocks = intersectBlocks(viewer.blocks, candidate.blocks);
      return {
        user: candidate.user,
        gameId: criteria.gameId,
        account: candidate.account,
        rankDistance: distance,
        sharedBlocks,
        score: scoreCandidate(distance, sharedBlocks.length),
      };
    })
    .filter((match) => match.rankDistance <= criteria.maxRankDistance)
    .filter((match) => match.sharedBlocks.length >= criteria.minSharedHours)
    .filter((match) => !criteria.onlyVerified || match.account.verified)
    .filter((match) => matchesSearch(match.user, criteria.search))
    .sort(compareCandidates);
}

/** Etiqueta legible para el puntaje, usada en las tarjetas de coincidencia (solo interfaz). */
export function scoreLabel(score: number): 'Excelente' | 'Buena' | 'Aceptable' | 'Baja' {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Buena';
  if (score >= 40) return 'Aceptable';
  return 'Baja';
}
