// Reglas puras de variación de LP por partida e historial real de Riot Games
// (spec 014, RF-11, RF-12, RF-30, RF-32; D37, D52, D78, D81, D102; plan, §§2.1, 4 y P14-4).
// Sin Express, Mongoose, red ni reloj. No muta ninguna entrada.
import { mergeMatches, shouldAppendSnapshot } from "./accountState.ts";
import { isApexLolTier } from "./riotData.ts";
import type { RiotMatchRecord, RiotRankSnapshot } from "./riotData.ts";

/** Tramo comparable de rango para RF-30 (tier y división opcional). */
export interface RankBracket {
  tier: string;
  division?: string;
}

/**
 * Última lectura completa de rango y partidas (con 0 partidas omitidas), usada como referencia
 * de RF-30 (P14-4, D78, D81, D102). Nunca sale en respuestas JSON.
 */
export interface RiotLpBaseline {
  /** Tier crudo de la última lectura completa, o `null` si la cuenta estaba sin clasificar. */
  tier: string | null;
  division?: string;
  points?: number;
  /**
   * Identificadores de las partidas de modo Solo/Dúo no anuladas de esa lectura completa (spec 020, RF-14: las de
   * otros modos no cuentan como «partida nueva», así que no se guardan aquí).
   */
  matchIds: string[];
}

export interface ApplyRiotReadingInput {
  previousRank: RiotRankSnapshot | null;
  previousHistory: readonly RiotRankSnapshot[];
  previousMatches: readonly RiotMatchRecord[];
  previousBaseline: RiotLpBaseline | null;
  rankResult: { ok: true; rank: RiotRankSnapshot | null } | { ok: false };
  matchesResult:
    | { ok: true; matches: readonly RiotMatchRecord[]; omittedAny: boolean }
    | { ok: false };
  isVerification: boolean;
}

export interface ApplyRiotReadingResult {
  currentRank: RiotRankSnapshot | null;
  rankHistory: RiotRankSnapshot[];
  matches: RiotMatchRecord[];
  nextBaseline: RiotLpBaseline | null;
}

/**
 * Comprueba si dos lecturas están en el mismo tramo de rango para calcular variación de LP
 * (RF-30, D37): misma división en tiers con divisiones; en MASTER, GRANDMASTER y CHALLENGER
 * basta el mismo tier.
 */
export function sameRankBracket(a: RankBracket, b: RankBracket): boolean {
  const tierA = a.tier.toUpperCase();
  const tierB = b.tier.toUpperCase();
  if (tierA !== tierB) return false;
  if (isApexLolTier(tierA)) return true;
  return a.division === b.division;
}

function stripRankDelta(match: RiotMatchRecord): RiotMatchRecord {
  const { id, gameId, playedAt, result, summary, durationMinutes, mode } = match;
  return { id, gameId, playedAt, result, summary, durationMinutes, mode };
}

function withRankDelta(match: RiotMatchRecord, delta: number): RiotMatchRecord {
  return { ...stripRankDelta(match), rankDelta: delta };
}

function dedupeMatches(matches: readonly RiotMatchRecord[]): RiotMatchRecord[] {
  const seen = new Set<string>();
  const unique: RiotMatchRecord[] = [];
  for (const m of matches) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    unique.push(m);
  }
  return unique;
}

/**
 * Aplica una lectura real de Riot (verificación inicial o resincronización) sobre el estado
 * previo de la cuenta sin mutar entradas:
 * - Historial (RF-32, D52): en verificación reemplaza el historial simulado; en resincronización
 *   añade punto solo si el rango se leyó bien, no es `null` (sin clasificar) y difiere del último
 *   punto guardado del historial. Si falla el rango en resincronización, conserva el estado previo.
 * - Variación de LP (RF-30, D37, D78, D81, D102): solo calcula cuando la lectura actual es
 *   completa de rango y partidas (`rankResult.ok && matchesResult.ok && !matchesResult.omittedAny`)
 *   y existe una lectura anterior completa (`previousBaseline`), con exactamente 1 partida nueva
 *   respecto a `previousBaseline.matchIds` y mismo tramo de rango (`sameRankBracket`). Conserva
 *   siempre inmutables las variaciones ya asignadas y permite asignar variación sobre partidas
 *   que quedaron con `undefined` (`"—"`) en lecturas no completas. Spec 020 (RF-13 a RF-15): solo
 *   cuentan como partida nueva las de modo Solo/Dúo, y las de los demás modos nunca reciben variación;
 *   una partida omitida, de cualquier modo, vuelve incompleta la lectura.
 * - Partidas: fusiona conservando las guardadas y ordena como RF-28 de la spec 004, máx. 20.
 */
export function applyRiotReading(input: ApplyRiotReadingInput): ApplyRiotReadingResult {
  const {
    previousRank,
    previousHistory,
    previousMatches,
    previousBaseline,
    rankResult,
    matchesResult,
    isVerification,
  } = input;

  // 1. Rango vigente e historial (RF-27, RF-32, RF-53, D52).
  let currentRank: RiotRankSnapshot | null;
  let rankHistory: RiotRankSnapshot[];

  if (isVerification) {
    if (rankResult.ok) {
      currentRank = rankResult.rank;
      rankHistory = rankResult.rank === null ? [] : [rankResult.rank];
    } else {
      currentRank = null;
      rankHistory = [];
    }
  } else if (!rankResult.ok) {
    currentRank = previousRank;
    rankHistory = [...previousHistory];
  } else {
    currentRank = rankResult.rank;
    if (rankResult.rank === null) {
      rankHistory = [...previousHistory];
    } else {
      const lastPoint = previousHistory.at(-1);
      rankHistory =
        lastPoint === undefined || shouldAppendSnapshot(lastPoint, rankResult.rank)
          ? [...previousHistory, rankResult.rank]
          : [...previousHistory];
    }
  }

  // 2. Variación de LP y baseline (RF-30, D37, D78, D81, D102).
  const baseMatches = isVerification ? [] : previousMatches;
  const effectivePrevBaseline = isVerification ? null : previousBaseline;
  const isCompleteForLpDelta =
    rankResult.ok && matchesResult.ok && !matchesResult.omittedAny;

  const prevById = new Map<string, RiotMatchRecord>();
  for (const m of baseMatches) prevById.set(m.id, m);

  let assignedMatchId: string | null = null;
  let assignedDelta: number | undefined;
  let nextBaseline: RiotLpBaseline | null = effectivePrevBaseline;

  if (isCompleteForLpDelta) {
    const incomingUnique = dedupeMatches(matchesResult.matches);
    // Spec 020, RF-14: solo las partidas de Solo/Dúo mueven los LP de este rango.
    const incomingSolo = incomingUnique.filter((m) => m.mode === "solo");
    const nextRank = rankResult.rank;

    if (effectivePrevBaseline !== null) {
      const prevBaselineIds = new Set(effectivePrevBaseline.matchIds);
      const newMatches = incomingSolo.filter((m) => !prevBaselineIds.has(m.id));
      if (
        newMatches.length === 1 &&
        effectivePrevBaseline.tier !== null &&
        effectivePrevBaseline.points !== undefined &&
        nextRank !== null &&
        sameRankBracket(
          {
            tier: effectivePrevBaseline.tier,
            ...(effectivePrevBaseline.division === undefined
              ? {}
              : { division: effectivePrevBaseline.division }),
          },
          nextRank,
        )
      ) {
        const onlyNew = newMatches[0];
        if (onlyNew !== undefined) {
          const existing = prevById.get(onlyNew.id);
          // D37: variación asignada es inmutable; D81: undefined ("—") sí puede recibir variación.
          if (existing === undefined || existing.rankDelta === undefined) {
            assignedMatchId = onlyNew.id;
            assignedDelta = nextRank.points - effectivePrevBaseline.points;
          }
        }
      }
    }

    const matchIds = incomingSolo.map((m) => m.id);
    nextBaseline =
      nextRank === null
        ? { tier: null, matchIds }
        : {
            tier: nextRank.tier,
            ...(nextRank.division === undefined ? {} : { division: nextRank.division }),
            points: nextRank.points,
            matchIds,
          };
  }

  // 3. Fusión de partidas (RF-11, RF-12, RF-15/RF-28 de 004, RF-53, D37, D81).
  let matches: RiotMatchRecord[];
  if (!matchesResult.ok) {
    matches = isVerification ? [] : [...previousMatches];
  } else {
    const updatedSaved = baseMatches.map((m) => {
      if (m.id === assignedMatchId && m.rankDelta === undefined && assignedDelta !== undefined) {
        return withRankDelta(m, assignedDelta);
      }
      return m;
    });
    const preparedIncoming = dedupeMatches(matchesResult.matches).map((m) =>
      m.id === assignedMatchId && assignedDelta !== undefined
        ? withRankDelta(m, assignedDelta)
        : stripRankDelta(m),
    );
    matches = mergeMatches(updatedSaved, preparedIncoming, "");
  }

  return { currentRank, rankHistory, matches, nextBaseline };
}
