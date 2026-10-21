// Reglas de la ficha de jugador (spec 008, RF-4, RF-6, RF-7, RF-9, RF-10, RF-12, RF-13,
// RF-15, RF-17, RF-19, RF-20, RF-22, RF-23, RNF-6). Dominio puro: sin React, sin HTTP, sin
// almacenamiento y sin reloj; ninguna función recibe "hoy" porque la semana tipo no tiene
// fecha. Los bloques en común, el agrupado en tramos, la distancia y el primer bloque
// proponible no se repiten aquí: se delegan en las funciones de las specs 005 y 007.
// Los textos viven en `copy.ts`; este módulo devuelve códigos.
import { groupBlocks, intersectBlocks } from './availability';
import type { BlockRange } from './availability';
import { GAME_IDS } from './games';
import { rankDistance } from './matching';
import { blockReason, buildProposal } from './proposal';
import type { BlockReason, Proposal } from './proposal';
import type { GameId, TimeBlock } from './types';

/** Estado de un dato ya traducido desde la consulta (la traducción vive en los hooks). */
export type Loadable<T> = { state: 'loading' } | { state: 'failed' } | { state: 'ready'; value: T };

/**
 * RF-15 (P35, P43, P49): la referencia propia es solo `me` exacto; el identificador se
 * compara con el de la sesión sin distinguir mayúsculas. `' me'`, `'Me'` o `'ME'` no lo son.
 */
export function isOwnPlayerRef(rawId: string, sessionUserId: string): boolean {
  return rawId === 'me' || rawId.toLowerCase() === sessionUserId.toLowerCase();
}

/** RF-4: juegos con cuenta, siempre en el orden de `GAME_IDS` (LoL, R6, CS2), sin repetidos. */
export function playerTabs(accounts: readonly { gameId: GameId }[]): GameId[] {
  return GAME_IDS.filter((gameId) => accounts.some((account) => account.gameId === gameId));
}

/** RF-19, RF-20 (P7, P13, P14): pestaña elegida y juego que debe quedar en la dirección. */
export interface TabResolution {
  tab: GameId | null;
  urlGame: GameId | null;
  mustReplace: boolean;
}

/**
 * `requested` es el valor crudo de `?juego=` (o `null`). Se compara con `GAME_IDS` por
 * igualdad exacta (P58): `'LOL'`, `'constructor'` o un juego sin cuenta no valen.
 */
export function resolveTab(
  accounts: readonly { gameId: GameId }[],
  requested: string | null,
): TabResolution {
  const tabs = playerTabs(accounts);
  const first = tabs[0];
  if (first === undefined) return { tab: null, urlGame: null, mustReplace: requested !== null };
  const game = GAME_IDS.find((gameId) => gameId === requested);
  if (game !== undefined && tabs.includes(game)) {
    return { tab: game, urlGame: game, mustReplace: false };
  }
  return { tab: first, urlGame: first, mustReplace: true };
}

/** RF-9, RF-18: qué ocupa la página según la consulta del usuario. */
export type PlayerPageState = 'loading' | 'notFound' | 'failed' | 'ready';

export function playerPageState(user: {
  state: 'loading' | 'failed' | 'ready';
  errorStatus: number | null;
}): PlayerPageState {
  if (user.state === 'loading') return 'loading';
  if (user.state === 'ready') return 'ready';
  return user.errorStatus === 400 || user.errorStatus === 404 ? 'notFound' : 'failed';
}

/**
 * RF-6: bloques en común (`intersectBlocks`, criterio de la 005), tramos (`groupBlocks`, como
 * la fila de coincidencias) y total. `blocks` es un arreglo nuevo, apto para `groupBlocks` y
 * la grilla.
 */
export function sharedHours(
  mine: readonly TimeBlock[],
  theirs: readonly TimeBlock[],
): { blocks: TimeBlock[]; ranges: BlockRange[]; total: number } {
  const blocks = intersectBlocks(mine, theirs);
  return { blocks, ranges: groupBlocks(blocks), total: blocks.length };
}

/** RF-22 (P15): zonas distintas tal como están guardadas, sin recortar ni comparar desfases. */
export function zonesDiffer(theirZone: string, myZone: string): boolean {
  return theirZone !== myZone;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** RF-17 (P30): valor normalizado del rango vigente, o `null` si falta o no es un número finito. */
export function readNormalized(
  account: { currentRank?: { normalized?: unknown } | null } | null | undefined,
): number | null {
  return finiteOrNull(account?.currentRank?.normalized);
}

/** RF-17 (P30): tasa de victorias del resumen, o `null` si falta o no es un número finito. */
export function readWinRate(summary: { winRate?: unknown } | null | undefined): number | null {
  return finiteOrNull(summary?.winRate);
}

/** RF-6, RF-13, RF-17, RF-27, P19, P33: qué se muestra en el lugar de la distancia. */
export type DistanceView =
  | { kind: 'loading' }
  | { kind: 'failed'; source: 'ownAccounts' | 'summary' }
  | { kind: 'noOwnAccount'; gameId: GameId }
  | { kind: 'noData' }
  | { kind: 'value'; points: number; simulated: boolean };

/**
 * Primero las cuentas propias (RF-13 prevalece sobre RF-17 y sobre el estado del resumen,
 * P30, P33); después el resumen del jugador; la distancia la da `rankDistance` (005).
 */
export function distanceView(input: {
  gameId: GameId;
  myAccounts: Loadable<
    readonly { gameId: GameId; currentRank?: { normalized?: unknown } | null }[]
  >;
  theirAccount: Loadable<{ currentRank?: { normalized?: unknown } | null; simulated?: boolean }>;
}): DistanceView {
  const mine = input.myAccounts;
  if (mine.state === 'loading') return { kind: 'loading' };
  if (mine.state === 'failed') return { kind: 'failed', source: 'ownAccounts' };
  const own = mine.value.find((account) => account.gameId === input.gameId);
  if (own === undefined) return { kind: 'noOwnAccount', gameId: input.gameId };

  const theirs = input.theirAccount;
  if (theirs.state === 'loading') return { kind: 'loading' };
  if (theirs.state === 'failed') return { kind: 'failed', source: 'summary' };

  const myNormalized = readNormalized(own);
  const theirNormalized = readNormalized(theirs.value);
  if (myNormalized === null || theirNormalized === null) return { kind: 'noData' };
  return {
    kind: 'value',
    points: rankDistance({ normalized: myNormalized }, { normalized: theirNormalized }),
    simulated: theirs.value.simulated === true,
  };
}

/** RF-7, RF-10, RF-12, RF-23 (P18): motivo de bloqueo; los de la 007 más los motivos 1 y 2. */
export type SheetBlockReason = 'noTheirAccounts' | 'noOwnAccount' | BlockReason;

export type ProposeState =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'blocked'; reason: SheetBlockReason; gameId: GameId | null }
  | { kind: 'ready'; proposal: Proposal };

/**
 * Recorre los datos en el orden de los motivos y se detiene en el primer dato sin cargar
 * solo cuando llega a él: un motivo anterior se muestra aunque falten los siguientes (P18).
 * Los motivos 3 a 6 y la propuesta salen de `blockReason`/`buildProposal` (007, RF-29).
 */
export function proposeState(input: {
  gameId: GameId | null;
  displayName: string;
  theirAccounts: Loadable<readonly { gameId: GameId }[]>;
  myAccounts: Loadable<readonly { gameId: GameId }[]>;
  myBlocks: Loadable<readonly TimeBlock[]>;
  theirBlocks: Loadable<readonly TimeBlock[]>;
}): ProposeState {
  const theirAccounts = input.theirAccounts;
  if (theirAccounts.state === 'loading') return { kind: 'loading' };
  if (theirAccounts.state === 'failed') return { kind: 'failed' };
  if (theirAccounts.value.length === 0) {
    return { kind: 'blocked', reason: 'noTheirAccounts', gameId: null };
  }

  const gameId = input.gameId;
  if (gameId === null) return { kind: 'loading' }; // corrección de pestaña en curso

  const myAccounts = input.myAccounts;
  if (myAccounts.state === 'loading') return { kind: 'loading' };
  if (myAccounts.state === 'failed') return { kind: 'failed' };
  if (!myAccounts.value.some((account) => account.gameId === gameId)) {
    return { kind: 'blocked', reason: 'noOwnAccount', gameId };
  }

  const myBlocks = input.myBlocks;
  if (myBlocks.state === 'loading') return { kind: 'loading' };
  if (myBlocks.state === 'failed') return { kind: 'failed' };
  if (myBlocks.value.length === 0) return { kind: 'blocked', reason: 'noOwnHours', gameId };

  const theirBlocks = input.theirBlocks;
  if (theirBlocks.state === 'loading') return { kind: 'loading' };
  if (theirBlocks.state === 'failed') return { kind: 'failed' };

  const reason = blockReason(myBlocks.value, theirBlocks.value);
  if (reason !== null) return { kind: 'blocked', reason, gameId };

  const proposal = buildProposal({
    gameId,
    displayName: input.displayName,
    mine: myBlocks.value,
    theirs: theirBlocks.value,
  });
  return proposal === null ? { kind: 'loading' } : { kind: 'ready', proposal };
}
