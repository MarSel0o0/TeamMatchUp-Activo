import { describe, expect, it, vi } from 'vitest';
import type {
  DraftAccounts,
  PendingProposal,
  ProposalAccounts,
} from '@/domain/agendaRules';
import { createAgendaStore, type AgendaState, type AgendaStore } from './createAgendaStore';

/** Cada prueba crea su almacén: nada compartido. */
function make(): AgendaStore {
  return createAgendaStore({ name: 'test', enabled: false });
}

/** Parte de datos del estado (sin las acciones), para comparar estados enteros. */
function data(store: AgendaStore) {
  const { filter, open, draft, proposal, visit } = store.getState();
  return { filter, open, draft, proposal, visit };
}

const SLOT = { day: 2, startHour: 20 } as const;
const BOTH: DraftAccounts = { received: true, games: ['lol', 'cs2'] };
const PROPOSAL: PendingProposal = {
  gameId: 'cs2',
  day: 4,
  startHour: 21,
  durationHours: 2,
  title: 'Sesión con Ana',
};
const ACC_CS2: ProposalAccounts = { status: 'loaded', games: ['cs2'] };
const ENV = { signedIn: true, accounts: ACC_CS2, cancelDialogOpen: false };

/** Agenda en pantalla con la sesión `id` abierta y confirmada. */
function onAgendaWithConfirmed(id = 's1'): AgendaStore {
  const store = make();
  store.getState().routeChanged(true);
  store.getState().selectSession(id);
  return store;
}

describe('estado inicial (Definiciones, RF-10)', () => {
  it('almacén nuevo = filtro Todos, nada abierto, sin borrador, sin propuesta, fuera de la agenda', () => {
    const store = make();
    expect(data(store)).toEqual({
      filter: 'all',
      open: null,
      draft: null,
      proposal: null,
      visit: null,
    });
  });

  it('dos almacenes no comparten estado', () => {
    const a = make();
    const b = make();
    a.getState().setFilter('lol');
    expect(b.getState().filter).toBe('all');
  });

  it('RF-10: el estado solo guarda el identificador de la sesión abierta', () => {
    const store = onAgendaWithConfirmed('s9');
    expect(store.getState().open).toEqual({ id: 's9', pending: false });
  });
});

describe('routeChanged (RF-15, RF-30)', () => {
  it('llegar a la agenda empieza una visita; volver a avisar no cambia nada (StrictMode)', () => {
    const store = make();
    store.getState().routeChanged(true);
    const first = store.getState().visit;
    expect(first).not.toBeNull();
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().routeChanged(true);
    expect(store.getState().visit).toBe(first);
    expect(listener).not.toHaveBeenCalled();
  });

  it('fuera de la agenda y sin visita no hace nada', () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().routeChanged(false);
    expect(listener).not.toHaveBeenCalled();
    expect(data(store)).toMatchObject({ visit: null });
  });

  it('cada visita nueva tiene un número distinto', () => {
    const store = make();
    store.getState().routeChanged(true);
    const v1 = store.getState().visit;
    store.getState().routeChanged(false);
    store.getState().routeChanged(true);
    expect(store.getState().visit).not.toBe(v1);
  });

  it('RF-15: salir con una sesión confirmada la deja por confirmar; filtro y sesión siguen', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().setFilter('lol');
    store.getState().routeChanged(false);
    expect(data(store)).toMatchObject({
      visit: null,
      filter: 'lol',
      open: { id: 's1', pending: true },
    });
  });

  it('RF-30: salir cierra el borrador y descarta la propuesta; filtro y sesión siguen', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().setFilter('cs2');
    store.getState().openDraft(SLOT, BOTH);
    store.getState().propose(PROPOSAL);
    expect(store.getState().draft).not.toBeNull();
    store.getState().routeChanged(false);
    expect(data(store)).toMatchObject({
      visit: null,
      draft: null,
      proposal: null,
      filter: 'cs2',
      open: { id: 's1', pending: true },
    });
  });

  it('salir sin sesión abierta deja open en null', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().routeChanged(false);
    expect(store.getState().open).toBeNull();
  });

  it('RF-15: volver con la sesión conservada la deja por confirmar (sigue pendiente)', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().routeChanged(false);
    store.getState().routeChanged(true);
    expect(store.getState().open).toEqual({ id: 's1', pending: true });
  });

  it('RF-15: volver con la respuesta sin la sesión -> open null', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().routeChanged(false);
    store.getState().routeChanged(true);
    store.getState().listResponded('all', ['otra']);
    expect(store.getState().open).toBeNull();
  });

  it('RF-15: volver con la respuesta que la contiene -> confirmada', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().routeChanged(false);
    store.getState().routeChanged(true);
    store.getState().listResponded('all', ['s1', 'x']);
    expect(store.getState().open).toEqual({ id: 's1', pending: false });
  });
});

describe('filtro (RF-11)', () => {
  it('setFilter cambia el filtro y deja la sesión abierta como está', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().setFilter('lol');
    expect(data(store)).toMatchObject({ filter: 'lol', open: { id: 's1', pending: false } });
  });

  it('RF-11: una respuesta del filtro anterior no decide', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().routeChanged(false);
    store.getState().routeChanged(true);
    store.getState().setFilter('lol');
    store.getState().listResponded('all', []);
    expect(store.getState().open).toEqual({ id: 's1', pending: true });
  });
});

describe('listResponded (RF-26, I-1)', () => {
  it('con la agenda en pantalla, por confirmar y filtro vigente: con ella -> confirmada', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    expect(store.getState().open).toEqual({ id: 'n1', pending: true });
    store.getState().listResponded('all', ['n1']);
    expect(store.getState().open).toEqual({ id: 'n1', pending: false });
  });

  it('sin ella -> open null', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    store.getState().listResponded('all', ['otra']);
    expect(store.getState().open).toBeNull();
  });

  it('respuesta fuera de la agenda -> nada', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().routeChanged(false);
    store.getState().listResponded('all', []);
    expect(store.getState().open).toEqual({ id: 's1', pending: true });
  });

  it('respuesta de otro filtro -> nada', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    store.getState().listResponded('lol', []);
    expect(store.getState().open).toEqual({ id: 'n1', pending: true });
  });

  it('sin sesión abierta o ya confirmada -> nada', () => {
    const store = onAgendaWithConfirmed('s1');
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().listResponded('all', []);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().open).toEqual({ id: 's1', pending: false });
  });

  it('I-1: un fallo no llama a nada; la siguiente listResponded decide', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    // Un fallo de la consulta no llega al almacén (agendaResponses no reenvía errores):
    // el estado queda idéntico y la espera sigue.
    expect(store.getState().open).toEqual({ id: 'n1', pending: true });
    store.getState().listResponded('all', ['n1']);
    expect(store.getState().open).toEqual({ id: 'n1', pending: false });
  });
});

describe('creationConfirmed (RF-24)', () => {
  it('con la visita vigente: cierra el borrador y abre la creada por confirmar', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().openDraft(SLOT, BOTH);
    store.getState().creationConfirmed('n1', store.getState().visit);
    expect(data(store)).toMatchObject({ draft: null, open: { id: 'n1', pending: true } });
  });

  it('sustituye a la sesión que hubiera abierta', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().creationConfirmed('n1', store.getState().visit);
    expect(store.getState().open).toEqual({ id: 'n1', pending: true });
  });

  it('con una visita vieja -> nada', () => {
    const store = make();
    store.getState().routeChanged(true);
    const old = store.getState().visit;
    store.getState().routeChanged(false);
    store.getState().routeChanged(true);
    store.getState().openDraft(SLOT, BOTH);
    store.getState().creationConfirmed('n1', old);
    expect(data(store)).toMatchObject({ open: null });
    expect(store.getState().draft).not.toBeNull();
  });

  it('fuera de la agenda -> nada', () => {
    const store = make();
    store.getState().creationConfirmed('n1', 1);
    store.getState().creationConfirmed('n1', null);
    expect(store.getState().open).toBeNull();
  });
});

describe('visibleListChanged (RF-25, RF-27)', () => {
  it('cierra la sesión confirmada que ya no está en la lista', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().visibleListChanged(['x']);
    expect(store.getState().open).toBeNull();
  });

  it('cierra la confirmada si no hay lista que se ve (null)', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().visibleListChanged(null);
    expect(store.getState().open).toBeNull();
  });

  it('mantiene la confirmada si sigue en la lista', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().visibleListChanged(['s1']);
    expect(store.getState().open).toEqual({ id: 's1', pending: false });
  });

  it('no cierra la por confirmar (ni con lista null ni sin ella)', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    store.getState().visibleListChanged(['x']);
    store.getState().visibleListChanged(null);
    expect(store.getState().open).toEqual({ id: 'n1', pending: true });
  });

  it('sin sesión abierta no hace nada', () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().visibleListChanged([]);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('selectSession y showMine (RF-12, RF-23)', () => {
  it('selectSession abre confirmada y termina la espera de la anterior', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    store.getState().selectSession('s2');
    expect(store.getState().open).toEqual({ id: 's2', pending: false });
    // Una respuesta posterior ya no decide.
    store.getState().listResponded('all', []);
    expect(store.getState().open).toEqual({ id: 's2', pending: false });
  });

  it('showMine cierra la sesión (también la por confirmar)', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().creationConfirmed('n1', store.getState().visit);
    store.getState().showMine();
    expect(store.getState().open).toBeNull();
  });
});

describe('sessionCancelled (RF-27, 204)', () => {
  it('cierra la sesión abierta si es la cancelada, confirmada o por confirmar', () => {
    const a = onAgendaWithConfirmed('s1');
    a.getState().sessionCancelled('s1');
    expect(a.getState().open).toBeNull();

    const b = make();
    b.getState().routeChanged(true);
    b.getState().creationConfirmed('n1', b.getState().visit);
    b.getState().sessionCancelled('n1');
    expect(b.getState().open).toBeNull();
  });

  it('no toca otra sesión abierta', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().sessionCancelled('s2');
    expect(store.getState().open).toEqual({ id: 's1', pending: false });
  });
});

describe('borrador (RF-13)', () => {
  it('openDraft usa el juego del filtro si está vinculado', () => {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().setFilter('cs2');
    store.getState().openDraft(SLOT, BOTH);
    expect(store.getState().draft).toEqual({ gameId: 'cs2', day: 2, startHour: 20 });
  });

  it('con «Todos los juegos» usa el de la primera cuenta', () => {
    const store = make();
    store.getState().openDraft(SLOT, BOTH);
    expect(store.getState().draft?.gameId).toBe('lol');
  });

  it('sin cuentas recibidas o sin juegos no abre nada', () => {
    const store = make();
    store.getState().openDraft(SLOT, { received: false });
    store.getState().openDraft(SLOT, { received: true, games: [] });
    expect(store.getState().draft).toBeNull();
  });

  it('closeDraft lo cierra', () => {
    const store = make();
    store.getState().openDraft(SLOT, BOTH);
    store.getState().closeDraft();
    expect(store.getState().draft).toBeNull();
  });
});

describe('propose (RF-14)', () => {
  it('guarda la propuesta y una nueva sustituye a la anterior', () => {
    const store = make();
    store.getState().propose(PROPOSAL);
    expect(store.getState().proposal).toEqual(PROPOSAL);
    const other: PendingProposal = { ...PROPOSAL, title: 'Sesión con Luis', day: 1 };
    store.getState().propose(other);
    expect(store.getState().proposal).toEqual(other);
  });
});

describe('resolveProposal (RF-28, RF-29, CR-1)', () => {
  function withProposal(): AgendaStore {
    const store = make();
    store.getState().routeChanged(true);
    store.getState().setFilter('lol');
    store.getState().propose(PROPOSAL);
    return store;
  }

  it('aplicar: en un solo cambio de estado, borrador completo, filtro Todos, propuesta fuera', () => {
    const store = withProposal();
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().resolveProposal(ENV);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(data(store)).toMatchObject({
      filter: 'all',
      proposal: null,
      draft: {
        gameId: 'cs2',
        day: 4,
        startHour: 21,
        durationHours: 2,
        title: 'Sesión con Ana',
      },
    });
  });

  it('descartar (sin usuario): filtro, sesión y borrador intactos', () => {
    const store = withProposal();
    store.getState().selectSession('s1');
    store.getState().openDraft(SLOT, BOTH);
    const before = data(store);
    store.getState().resolveProposal({ ...ENV, signedIn: false });
    expect(data(store)).toEqual({ ...before, proposal: null });
  });

  it('descartar (cuentas fallidas, o sin la cuenta del juego)', () => {
    const a = withProposal();
    a.getState().resolveProposal({ ...ENV, accounts: { status: 'failed' } });
    expect(a.getState().proposal).toBeNull();
    const b = withProposal();
    b.getState().resolveProposal({ ...ENV, accounts: { status: 'loaded', games: ['lol'] } });
    expect(b.getState().proposal).toBeNull();
    expect(b.getState().draft).toBeNull();
    expect(b.getState().filter).toBe('lol');
  });

  it('esperar (cuentas cargando): estado idéntico y sin avisos', () => {
    const store = withProposal();
    const before = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().resolveProposal({ ...ENV, accounts: { status: 'loading' } });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(before);
  });

  it('fuera de la agenda no hace nada', () => {
    const store = make();
    store.getState().propose(PROPOSAL);
    const before = store.getState();
    store.getState().resolveProposal(ENV);
    expect(store.getState()).toBe(before);
  });

  it('sin propuesta no hace nada', () => {
    const store = make();
    store.getState().routeChanged(true);
    const before = store.getState();
    store.getState().resolveProposal(ENV);
    expect(store.getState()).toBe(before);
  });

  it('CR-1: con el cuadro de cancelar abierto espera; al cerrarse aplica', () => {
    const store = withProposal();
    store.getState().resolveProposal({ ...ENV, cancelDialogOpen: true });
    expect(store.getState().proposal).toEqual(PROPOSAL);
    expect(store.getState().draft).toBeNull();
    store.getState().resolveProposal({ ...ENV, cancelDialogOpen: false });
    expect(store.getState().proposal).toBeNull();
    expect(store.getState().draft?.gameId).toBe('cs2');
  });

  it('CR-1: con el borrador abierto espera; al cerrarse aplica', () => {
    const store = withProposal();
    store.getState().openDraft(SLOT, { received: true, games: ['lol'] });
    const mine = store.getState().draft;
    store.getState().resolveProposal(ENV);
    expect(store.getState().proposal).toEqual(PROPOSAL);
    expect(store.getState().draft).toEqual(mine);
    store.getState().closeDraft();
    store.getState().resolveProposal(ENV);
    expect(store.getState().proposal).toBeNull();
    expect(store.getState().draft?.title).toBe('Sesión con Ana');
  });

  it('CR-1: esperando con una ventana abierta, salir antes descarta', () => {
    const store = withProposal();
    store.getState().resolveProposal({ ...ENV, cancelDialogOpen: true });
    store.getState().routeChanged(false);
    expect(store.getState().proposal).toBeNull();
    store.getState().resolveProposal(ENV);
    expect(store.getState().draft).toBeNull();
  });
});

describe('reset (RF-16)', () => {
  it('lleva filtro, sesión, borrador y propuesta al estado inicial', () => {
    const store = onAgendaWithConfirmed('s1');
    store.getState().setFilter('lol');
    store.getState().openDraft(SLOT, BOTH);
    store.getState().propose(PROPOSAL);
    store.getState().reset();
    expect(data(store)).toMatchObject({
      filter: 'all',
      open: null,
      draft: null,
      proposal: null,
    });
  });

  it('fuera de la agenda deja visit en null', () => {
    const store = make();
    store.getState().setFilter('lol');
    store.getState().reset();
    expect(store.getState().visit).toBeNull();
  });

  it('en la agenda renueva la visita: una confirmación anterior ya no vale', () => {
    const store = make();
    store.getState().routeChanged(true);
    const old = store.getState().visit;
    store.getState().reset();
    expect(store.getState().visit).not.toBeNull();
    expect(store.getState().visit).not.toBe(old);
    store.getState().creationConfirmed('n1', old);
    expect(store.getState().open).toBeNull();
  });
});

/** Comprobación de tipos: el estado expone justo lo del plan. */
const _shape: (keyof AgendaState)[] = [
  'filter', 'open', 'draft', 'proposal', 'visit', 'routeChanged', 'setFilter', 'selectSession',
  'showMine', 'openDraft', 'closeDraft', 'creationConfirmed', 'listResponded',
  'visibleListChanged', 'sessionCancelled', 'propose', 'resolveProposal', 'reset',
];
void _shape;
