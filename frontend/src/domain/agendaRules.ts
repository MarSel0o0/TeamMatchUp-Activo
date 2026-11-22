import type { Proposal } from './proposal';
import type { GameId } from './types';

/**
 * Reglas puras de la agenda (spec 016, RF-13 y RF-29; RNF-4). Sin React, sin almacén, sin
 * servicios y sin reloj: lo que cambia con el tiempo llega como parámetro.
 */

export type AgendaFilter = GameId | 'all';

/** Propuesta pendiente: la de `Proposal` sin cupos ni notas (RF-14). */
export type PendingProposal = Omit<Proposal, 'slots' | 'notes'>;

/** Valores con los que se abre «Anotar una sesión»; duración y título solo vienen de una propuesta. */
export interface DraftValues {
  gameId: GameId;
  day: Proposal['day'];
  startHour: number;
  durationHours?: number;
  title?: string;
}

/** Cuentas del jugador tal como las tiene la interfaz para RF-13. */
export type DraftAccounts =
  | { received: false }
  | { received: true; games: readonly GameId[] };

/** Cuentas del usuario de la sesión tal como las tiene la interfaz para RF-29. */
export type ProposalAccounts =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; games: readonly GameId[] };

export interface ProposalInput {
  proposal: PendingProposal;
  signedIn: boolean;
  accounts: ProposalAccounts;
  agendaWindowOpen: boolean;
}

export type ProposalDecision =
  | { action: 'wait' }
  | { action: 'discard' }
  | { action: 'apply'; draft: DraftValues; filter: 'all' };

/**
 * RF-13: juego con el que se abre el borrador. El del filtro si el jugador lo tiene vinculado;
 * si no, el de la primera cuenta de la lista. `null` si no hay cuentas recibidas o ninguna cuenta.
 */
export function draftGame(filter: AgendaFilter, accounts: DraftAccounts): GameId | null {
  if (!accounts.received) return null;
  if (filter !== 'all' && accounts.games.includes(filter)) return filter;
  return accounts.games[0] ?? null;
}

/** RF-29 (con CR-1): primero de los seis casos que se cumpla. */
export function proposalDecision(input: ProposalInput): ProposalDecision {
  const { proposal, signedIn, accounts, agendaWindowOpen } = input;
  if (!signedIn) return { action: 'discard' };
  if (accounts.status === 'loading') return { action: 'wait' };
  if (accounts.status === 'failed') return { action: 'discard' };
  if (!accounts.games.includes(proposal.gameId)) return { action: 'discard' };
  if (agendaWindowOpen) return { action: 'wait' };
  return {
    action: 'apply',
    filter: 'all',
    draft: {
      gameId: proposal.gameId,
      day: proposal.day,
      startHour: proposal.startHour,
      durationHours: proposal.durationHours,
      title: proposal.title,
    },
  };
}
