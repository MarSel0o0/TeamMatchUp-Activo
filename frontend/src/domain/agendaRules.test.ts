import { describe, expect, it } from 'vitest';
import { draftGame, proposalDecision } from './agendaRules';
import type { PendingProposal, ProposalAccounts, ProposalInput } from './agendaRules';

const proposal: PendingProposal = {
  gameId: 'cs2',
  day: 3,
  startHour: 21,
  durationHours: 2,
  title: 'Partida con Ana',
};

function decide(over: Partial<ProposalInput> = {}) {
  return proposalDecision({
    proposal,
    signedIn: true,
    accounts: { status: 'loaded', games: ['cs2'] },
    agendaWindowOpen: false,
    ...over,
  });
}

describe('proposalDecision (RF-29, CR-1)', () => {
  it('caso 1: sin usuario de sesión descarta, aunque las cuentas carguen', () => {
    expect(decide({ signedIn: false, accounts: { status: 'loading' } })).toEqual({ action: 'discard' });
    expect(decide({ signedIn: false })).toEqual({ action: 'discard' });
  });

  it('caso 2: cuentas cargando espera, también con ventana abierta', () => {
    expect(decide({ accounts: { status: 'loading' } })).toEqual({ action: 'wait' });
    expect(decide({ accounts: { status: 'loading' }, agendaWindowOpen: true })).toEqual({ action: 'wait' });
  });

  it('caso 3: cuentas fallidas descarta, también con cuenta en el juego o ventana abierta', () => {
    expect(decide({ accounts: { status: 'failed' } })).toEqual({ action: 'discard' });
    expect(decide({ accounts: { status: 'failed' }, agendaWindowOpen: true })).toEqual({ action: 'discard' });
  });

  it('caso 4: cargadas sin cuenta en el juego propuesto descarta, también con ventana abierta', () => {
    const accounts: ProposalAccounts = { status: 'loaded', games: ['lol', 'r6'] };
    expect(decide({ accounts })).toEqual({ action: 'discard' });
    expect(decide({ accounts, agendaWindowOpen: true })).toEqual({ action: 'discard' });
    expect(decide({ accounts: { status: 'loaded', games: [] } })).toEqual({ action: 'discard' });
  });

  it('caso 5: con cuenta en el juego y una ventana abierta espera (CR-1)', () => {
    expect(decide({ agendaWindowOpen: true })).toEqual({ action: 'wait' });
  });

  it('caso 6: con cuenta en el juego y sin ventana aplica el borrador con los cinco datos y filtro "all"', () => {
    expect(decide({ accounts: { status: 'loaded', games: ['lol', 'cs2'] } })).toEqual({
      action: 'apply',
      filter: 'all',
      draft: { gameId: 'cs2', day: 3, startHour: 21, durationHours: 2, title: 'Partida con Ana' },
    });
  });

  it('CR-1: la misma entrada espera con ventana y aplica al cerrarse; descarta si antes sale la cuenta', () => {
    expect(decide({ agendaWindowOpen: true }).action).toBe('wait');
    expect(decide({ agendaWindowOpen: false }).action).toBe('apply');
    expect(decide({ agendaWindowOpen: true, signedIn: false }).action).toBe('discard');
  });

  it('no modifica la propuesta ni las cuentas recibidas', () => {
    const games = ['cs2'] as const;
    const copy = { ...proposal };
    decide({ accounts: { status: 'loaded', games } });
    expect(proposal).toEqual(copy);
    expect(games).toEqual(['cs2']);
  });
});

describe('draftGame (RF-13)', () => {
  it('a: filtro de un juego vinculado -> ese juego', () => {
    expect(draftGame('lol', { received: true, games: ['cs2', 'lol'] })).toBe('lol');
  });

  it('a: "Todos los juegos" -> el primero de la lista de cuentas', () => {
    expect(draftGame('all', { received: true, games: ['r6', 'lol'] })).toBe('r6');
  });

  it('a: filtro de un juego nunca vinculado -> el primero de la lista', () => {
    expect(draftGame('r6', { received: true, games: ['lol', 'cs2'] })).toBe('lol');
  });

  it('a: filtro de un juego ya desvinculado (la lista recibida ya no lo tiene) -> el primero', () => {
    expect(draftGame('lol', { received: true, games: ['cs2'] })).toBe('cs2');
  });

  it('a: el orden es el de la lista de cuentas, no el del catálogo (CS2 antes que LoL -> CS2)', () => {
    expect(draftGame('all', { received: true, games: ['cs2', 'lol'] })).toBe('cs2');
  });

  it('c y d: sin cuentas recibidas (cargando o fallida) -> null, con cualquier filtro', () => {
    expect(draftGame('all', { received: false })).toBeNull();
    expect(draftGame('lol', { received: false })).toBeNull();
  });

  it('b: cuentas recibidas sin ningún juego -> null, con cualquier filtro', () => {
    expect(draftGame('all', { received: true, games: [] })).toBeNull();
    expect(draftGame('cs2', { received: true, games: [] })).toBeNull();
  });
});
