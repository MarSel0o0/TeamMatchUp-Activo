import { describe, expect, it } from 'vitest';
import { resolveAfterListFocus, resolveDraftFocus } from './draftFocus';

/** Spec 017, RF-12, RF-20, RF-22; plan 5.4. */
describe('resolveDraftFocus: abrir', () => {
  it('al abrir, por cualquier camino, el foco va a «Título»', () => {
    for (const opener of ['slot', 'header', 'proposal'] as const) {
      expect(resolveDraftFocus('opened', { opener })).toBe('titleField');
    }
  });

  it('al abrirse por la propuesta pendiente cuando se cierra otra ventana, el foco va a «Título»', () => {
    expect(resolveDraftFocus('reopenedByProposal', { opener: 'proposal' })).toBe('titleField');
  });
});

describe('resolveDraftFocus: enviar', () => {
  it('con el botón, al deshabilitarse el foco va al título de la ventana', () => {
    expect(resolveDraftFocus('submitStarted', { origin: 'button' })).toBe('dialogTitle');
  });

  it('con Intro desde un campo, el foco sigue donde está', () => {
    expect(resolveDraftFocus('submitStarted', { origin: 'enter' })).toBeNull();
  });

  it('si falla la comprobación del cliente o el envío, vuelve al elemento desde el que se envió', () => {
    for (const event of ['clientCheckFailed', 'failed'] as const) {
      expect(resolveDraftFocus(event, { origin: 'button' })).toBe('submitButton');
      expect(resolveDraftFocus(event, { origin: 'enter' })).toBe('titleField');
    }
  });
});

describe('resolveDraftFocus: cerrar', () => {
  it('desde un bloque de la semana, vuelve al bloque si existe y puede recibir el foco', () => {
    expect(resolveDraftFocus('closed', { opener: 'slot', slotFocusable: true, headerFocusable: true })).toBe('slotBlock');
  });

  it('desde un bloque que ya no existe, va al título del panel (aunque «Anotar sesión» pueda recibir el foco)', () => {
    expect(resolveDraftFocus('closed', { opener: 'slot', slotFocusable: false, headerFocusable: true })).toBe('panelTitle');
    expect(resolveDraftFocus('closed', { opener: 'slot' })).toBe('panelTitle');
  });

  it('desde «Anotar sesión» de la cabecera, vuelve a él si puede recibir el foco', () => {
    expect(resolveDraftFocus('closed', { opener: 'header', headerFocusable: true })).toBe('headerButton');
  });

  it('desde una propuesta de «Proponer», va a «Anotar sesión» de la cabecera', () => {
    expect(resolveDraftFocus('closed', { opener: 'proposal', headerFocusable: true, slotFocusable: true })).toBe('headerButton');
  });

  it('si «Anotar sesión» está deshabilitado o no existe, va al título del panel', () => {
    expect(resolveDraftFocus('closed', { opener: 'header', headerFocusable: false })).toBe('panelTitle');
    expect(resolveDraftFocus('closed', { opener: 'proposal', headerFocusable: false })).toBe('panelTitle');
    expect(resolveDraftFocus('closed', { opener: 'header' })).toBe('panelTitle');
  });

  it('si se cierra porque la vista cambia, no devuelve el foco a ningún control', () => {
    expect(
      resolveDraftFocus('closed', { opener: 'slot', slotFocusable: true, headerFocusable: true, closedBy: 'viewChanged' }),
    ).toBeNull();
    expect(resolveDraftFocus('closed', { opener: 'header', headerFocusable: true, closedBy: 'viewChanged' })).toBeNull();
  });

  it('el camino de cierre (Cancelar, cerrar, Escape, fuera o creación) no cambia el destino', () => {
    for (const closedBy of ['cancel', 'closeButton', 'escape', 'outside', 'created'] as const) {
      expect(resolveDraftFocus('closed', { opener: 'slot', slotFocusable: true, closedBy })).toBe('slotBlock');
    }
  });
});

describe('resolveAfterListFocus: primera respuesta de la lista tras cerrar', () => {
  it('si el foco seguía en el bloque y la semana ya no lo muestra, va al título del panel', () => {
    expect(resolveAfterListFocus({ focusWasOnBlock: true, blockStillShown: false, alreadyEvaluated: false })).toBe('panelTitle');
  });

  it('si el jugador movió el foco a otro sitio, no lo mueve', () => {
    expect(resolveAfterListFocus({ focusWasOnBlock: false, blockStillShown: false, alreadyEvaluated: false })).toBeNull();
  });

  it('si la semana sigue mostrando el bloque, no hace nada', () => {
    expect(resolveAfterListFocus({ focusWasOnBlock: true, blockStillShown: true, alreadyEvaluated: false })).toBeNull();
  });

  it('las respuestas posteriores no la vuelven a aplicar', () => {
    expect(resolveAfterListFocus({ focusWasOnBlock: true, blockStillShown: false, alreadyEvaluated: true })).toBeNull();
  });
});
