/**
 * Reglas puras de foco de «Anotar una sesión» (spec 017, RF-12, RF-20, RF-22; plan 5.4). Misma forma
 * que `sessions/detail/focusRule.ts`: la regla devuelve un destino y la vista lo aplica. Sin React,
 * sin DOM y sin reloj.
 */
export type DraftFocusTarget =
  | 'titleField'
  | 'dialogTitle'
  | 'submitButton'
  | 'slotBlock'
  | 'headerButton'
  | 'panelTitle';

/** De dónde se abrió el borrador: un bloque de la semana, «Anotar sesión» o una propuesta de «Proponer». */
export type DraftOpener = 'slot' | 'header' | 'proposal';

export type DraftFocusEvent =
  | 'opened'
  | 'reopenedByProposal'
  | 'submitStarted'
  | 'clientCheckFailed'
  | 'failed'
  | 'closed';

export type DraftClosedBy = 'cancel' | 'closeButton' | 'escape' | 'outside' | 'created' | 'viewChanged';

export interface DraftFocusContext {
  /** Cómo se envió: con el botón o con Intro desde un campo. */
  origin?: 'button' | 'enter';
  opener?: DraftOpener;
  closedBy?: DraftClosedBy;
  /** El bloque que abrió la ventana existe y puede recibir el foco. */
  slotFocusable?: boolean;
  /** «Anotar sesión» de la cabecera existe y puede recibir el foco (no está deshabilitado). */
  headerFocusable?: boolean;
}

/** Destino del foco en cada momento de la ventana; `null` = no mover el foco. */
export function resolveDraftFocus(event: DraftFocusEvent, ctx: DraftFocusContext): DraftFocusTarget | null {
  switch (event) {
    case 'opened':
    case 'reopenedByProposal':
      return 'titleField';
    case 'submitStarted':
      // Con Intro, el foco sigue en el campo, que no se deshabilita.
      return ctx.origin === 'button' ? 'dialogTitle' : null;
    case 'clientCheckFailed':
    case 'failed':
      return ctx.origin === 'button' ? 'submitButton' : 'titleField';
    case 'closed':
      if (ctx.closedBy === 'viewChanged') return null;
      if (ctx.opener === 'slot' && ctx.slotFocusable === true) return 'slotBlock';
      if ((ctx.opener === 'header' || ctx.opener === 'proposal') && ctx.headerFocusable === true) return 'headerButton';
      return 'panelTitle';
  }
}

export interface AfterListFocusContext {
  /** El último elemento con foco era el bloque al que volvió el foco al cerrar. */
  focusWasOnBlock: boolean;
  /** La semana sigue mostrando ese bloque en la primera respuesta posterior de la lista. */
  blockStillShown: boolean;
  /** La regla ya se evaluó con una respuesta anterior (vale solo para la primera). */
  alreadyEvaluated: boolean;
}

/** Primera respuesta de la lista tras cerrar: el foco no debe quedar en el cuerpo de la página. */
export function resolveAfterListFocus(ctx: AfterListFocusContext): 'panelTitle' | null {
  if (ctx.alreadyEvaluated) return null;
  return ctx.focusWasOnBlock && !ctx.blockStillShown ? 'panelTitle' : null;
}
