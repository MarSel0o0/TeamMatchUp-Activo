/**
 * Reglas puras de la ventana de desvincular una cuenta (spec 017, RF-23 a RF-25; plan 5.2 y 5.5).
 * Misma forma que `sessions/detail/focusRule.ts`: la regla devuelve un destino y la vista lo aplica.
 * Sin React, sin DOM y sin reloj.
 */
export type UnlinkFocusEvent = 'opened' | 'submitStarted' | 'failed' | 'succeeded' | 'closedWithoutSending';
export type UnlinkFocusTarget = 'back' | 'dialogTitle' | 'confirm' | 'sectionTitle' | 'rowButton';

export interface UnlinkFocusContext {
  /** La ventana se cierra porque la vista cambia (RF-22; por ejemplo, un 401). */
  viewChanged?: boolean;
  /** El botón «Desvincular» de la fila que la abrió existe y puede recibir el foco. */
  rowButtonFocusable?: boolean;
}

/**
 * Título de la ventana, calculado al abrirla: «¿Desvincular <identificador>?» o, si la cuenta ya no
 * está en la lista (o no tiene identificador), «¿Desvincular esta cuenta?». Devuelve texto: quien lo
 * muestra no debe insertarlo como HTML.
 */
export function unlinkDialogTitle(handle: string | null): string {
  return handle !== null && handle !== '' ? `¿Desvincular ${handle}?` : '¿Desvincular esta cuenta?';
}

/** Destino del foco en cada momento de la ventana (RF-24, RF-25); `null` = no mover el foco. */
export function resolveUnlinkFocus(event: UnlinkFocusEvent, ctx: UnlinkFocusContext): UnlinkFocusTarget | null {
  switch (event) {
    case 'opened':
      return 'back';
    case 'submitStarted':
      return 'dialogTitle';
    case 'failed':
      return 'confirm';
    case 'succeeded':
      return 'sectionTitle';
    case 'closedWithoutSending':
      if (ctx.viewChanged === true) return null;
      return ctx.rowButtonFocusable === true ? 'rowButton' : 'sectionTitle';
  }
}
