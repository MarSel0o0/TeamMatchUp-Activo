import { createStore, type StoreApi } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { WeekDay } from '@/domain/types';
import {
  draftGame,
  proposalDecision,
  type AgendaFilter,
  type DraftAccounts,
  type DraftValues,
  type PendingProposal,
  type ProposalAccounts,
} from '@/domain/agendaRules';

/** Sesión abierta en el panel: solo el identificador (RF-10); `pending` = «por confirmar». */
export interface OpenSession {
  id: string;
  pending: boolean;
}

export interface AgendaState {
  filter: AgendaFilter;
  open: OpenSession | null;
  draft: DraftValues | null;
  proposal: PendingProposal | null;
  /** Visita en curso a /agenda; `null` fuera de ella (DT-16). */
  visit: number | null;

  routeChanged(onAgenda: boolean): void;
  setFilter(filter: AgendaFilter): void;
  selectSession(id: string): void;
  showMine(): void;
  openDraft(slot: { day: WeekDay; startHour: number }, accounts: DraftAccounts): void;
  closeDraft(): void;
  creationConfirmed(sessionId: string, visit: number | null): void;
  listResponded(filter: AgendaFilter, ids: readonly string[]): void;
  visibleListChanged(ids: readonly string[] | null): void;
  sessionCancelled(id: string): void;
  propose(proposal: PendingProposal): void;
  resolveProposal(env: {
    signedIn: boolean;
    accounts: ProposalAccounts;
    cancelDialogOpen: boolean;
  }): void;
  reset(): void;
}

export interface AgendaDevtools {
  name: string;
  enabled: boolean;
}

export type AgendaStore = StoreApi<AgendaState>;

/** Almacén de la agenda (spec 016, RF-10 a RF-16, RF-23 a RF-30; plan 4). */
export function createAgendaStore(options: AgendaDevtools): AgendaStore {
  return createStore<AgendaState>()(
    devtools(
      (set, get) => {
        // Contador de visitas a /agenda (DT-16): cada llegada y cada reinicio dentro de la agenda
        // lo suben; una confirmación con un número anterior ya no vale.
        let lastVisit = 0;

        return {
          filter: 'all',
          open: null,
          draft: null,
          proposal: null,
          visit: null,

          routeChanged(onAgenda) {
            const { visit, open } = get();
            if (onAgenda && visit === null) {
              set({ visit: ++lastVisit }, false, 'agenda/routeChanged');
            } else if (!onAgenda && visit !== null) {
              // RF-15 y RF-30: la sesión abierta queda por confirmar (DT-7); borrador y propuesta se van.
              set(
                {
                  visit: null,
                  draft: null,
                  proposal: null,
                  open: open ? { id: open.id, pending: true } : null,
                },
                false,
                'agenda/routeChanged',
              );
            }
          },

          setFilter(filter) {
            set({ filter }, false, 'agenda/setFilter');
          },

          selectSession(id) {
            set({ open: { id, pending: false } }, false, 'agenda/selectSession');
          },

          showMine() {
            set({ open: null }, false, 'agenda/showMine');
          },

          openDraft(slot, accounts) {
            const gameId = draftGame(get().filter, accounts);
            if (gameId === null) return;
            set(
              { draft: { gameId, day: slot.day, startHour: slot.startHour } },
              false,
              'agenda/openDraft',
            );
          },

          closeDraft() {
            set({ draft: null }, false, 'agenda/closeDraft');
          },

          creationConfirmed(sessionId, visit) {
            const current = get().visit;
            if (current === null || visit !== current) return;
            set(
              { draft: null, open: { id: sessionId, pending: true } },
              false,
              'agenda/creationConfirmed',
            );
          },

          listResponded(filter, ids) {
            const { visit, open } = get();
            if (visit === null || open === null || !open.pending || filter !== get().filter) return;
            set(
              { open: ids.includes(open.id) ? { id: open.id, pending: false } : null },
              false,
              'agenda/listResponded',
            );
          },

          visibleListChanged(ids) {
            const { open } = get();
            if (open === null || open.pending) return;
            if (ids === null || !ids.includes(open.id)) {
              set({ open: null }, false, 'agenda/visibleListChanged');
            }
          },

          sessionCancelled(id) {
            if (get().open?.id === id) set({ open: null }, false, 'agenda/sessionCancelled');
          },

          propose(proposal) {
            set({ proposal }, false, 'agenda/propose');
          },

          resolveProposal(env) {
            const { visit, proposal, draft } = get();
            if (visit === null || proposal === null) return;
            const decision = proposalDecision({
              proposal,
              signedIn: env.signedIn,
              accounts: env.accounts,
              agendaWindowOpen: env.cancelDialogOpen || draft !== null,
            });
            if (decision.action === 'wait') return;
            if (decision.action === 'discard') {
              set({ proposal: null }, false, 'agenda/resolveProposal');
              return;
            }
            set(
              { draft: decision.draft, filter: decision.filter, proposal: null },
              false,
              'agenda/resolveProposal',
            );
          },

          reset() {
            set(
              {
                filter: 'all',
                open: null,
                draft: null,
                proposal: null,
                visit: get().visit === null ? null : ++lastVisit,
              },
              false,
              'agenda/reset',
            );
          },
        };
      },
      { name: options.name, enabled: options.enabled },
    ),
  );
}
