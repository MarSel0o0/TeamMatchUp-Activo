import { describe, expect, it } from 'vitest';
import { resolveUnlinkFocus, unlinkDialogTitle } from './unlinkDialog';

/** Spec 017, RF-23 a RF-25; plan 5.2 y 5.5. */
describe('unlinkDialogTitle', () => {
  it('con la cuenta, «¿Desvincular <identificador>?»', () => {
    expect(unlinkDialogTitle('Ignxcia#099Da')).toBe('¿Desvincular Ignxcia#099Da?');
    expect(unlinkDialogTitle('76561198000000000')).toBe('¿Desvincular 76561198000000000?');
  });

  it('sin la cuenta (ya no está en la lista), «¿Desvincular esta cuenta?»', () => {
    expect(unlinkDialogTitle(null)).toBe('¿Desvincular esta cuenta?');
  });

  it('un identificador vacío cuenta como ausente', () => {
    expect(unlinkDialogTitle('')).toBe('¿Desvincular esta cuenta?');
  });

  it('entrega el identificador como texto, sin tocarlo (nunca como HTML)', () => {
    expect(unlinkDialogTitle('<img src=x onerror=alert(1)>')).toBe('¿Desvincular <img src=x onerror=alert(1)>?');
  });
});

describe('resolveUnlinkFocus', () => {
  it('al abrir, el foco va a «Volver»', () => {
    expect(resolveUnlinkFocus('opened', {})).toBe('back');
  });

  it('al empezar el envío, el foco va al título de la ventana', () => {
    expect(resolveUnlinkFocus('submitStarted', {})).toBe('dialogTitle');
  });

  it('tras un error, el foco vuelve a «Desvincular» de la ventana', () => {
    expect(resolveUnlinkFocus('failed', {})).toBe('confirm');
  });

  it('con éxito, el foco va al título de la sección «Cuentas vinculadas»', () => {
    expect(resolveUnlinkFocus('succeeded', {})).toBe('sectionTitle');
  });

  it('al cerrar sin enviar, el foco vuelve al botón «Desvincular» de la fila si puede recibirlo', () => {
    expect(resolveUnlinkFocus('closedWithoutSending', { rowButtonFocusable: true })).toBe('rowButton');
  });

  it('al cerrar sin enviar, si la fila ya no existe o su botón no puede recibir el foco, va al título de la sección', () => {
    expect(resolveUnlinkFocus('closedWithoutSending', { rowButtonFocusable: false })).toBe('sectionTitle');
    expect(resolveUnlinkFocus('closedWithoutSending', {})).toBe('sectionTitle');
  });

  it('si se cierra porque la vista cambia, no devuelve el foco a ningún control', () => {
    expect(resolveUnlinkFocus('closedWithoutSending', { viewChanged: true, rowButtonFocusable: true })).toBeNull();
    expect(resolveUnlinkFocus('closedWithoutSending', { viewChanged: true })).toBeNull();
  });
});
