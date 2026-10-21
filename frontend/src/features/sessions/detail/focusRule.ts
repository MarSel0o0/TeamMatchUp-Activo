// Regla general del foco del detalle de sesión (spec 009, RNF-2; plan 4.3). Pura: sin React, DOM
// ni reloj. El controlador deja un `focusRequest` con el resultado y un efecto lo aplica.

import type { DetailRole } from '@/domain/sessionDetail';

export type FocusTarget =
  | 'sessionTitle'
  | 'emptyTitle'
  | 'errorMessage'
  | 'joinButton'
  | 'leaveButton'
  | 'editButton'
  | 'cancelButton'
  | 'zoneMessage'
  | 'saveButton'
  | 'titleField'
  | 'dialogBack'
  | 'dialogTitle'
  | 'dialogConfirm'
  | 'panelTitle';

export type FocusEventName =
  | 'loadDone'
  | 'retryDone'
  | 'joinLeaveOk'
  | 'saveOk'
  | 'formClosed'
  | 'clientCheckFailed'
  | 'actionEnded'
  | 'rereadArrived'
  | 'dialogClosed'
  | 'cancelInFlight'
  | 'empty'
  | 'panelFocus'
  | 'lateResponse';

export type FocusAction = 'join' | 'leave' | 'save' | 'cancel';

export interface FocusContext {
  /** Resultado de la carga (`loadDone`, `retryDone`). */
  load?: 'success' | 'empty' | 'pageError';
  /** Acción en curso o terminada. */
  action?: FocusAction;
  /** Cómo se envió: con el botón o con Intro en «Título» (solo cambia el guardado). */
  origin?: 'button' | 'titleEnter';
  /** Rol del usuario de la sesión en la nueva lectura (`rereadArrived`). */
  roleAfter?: DetailRole;
  /** El usuario de la sesión es el anfitrión (`formClosed`, `saveOk`, `dialogClosed`). */
  isHost?: boolean;
}

/** El elemento que tenía el foco al lanzar la acción (Q17). */
function originOf(context: FocusContext): FocusTarget | null {
  switch (context.action) {
    case 'join':
      return 'joinButton';
    case 'leave':
      return 'leaveButton';
    case 'save':
      return context.origin === 'titleEnter' ? 'titleField' : 'saveButton';
    case 'cancel':
      return 'dialogConfirm';
    default:
      return null;
  }
}

/** Rol con el que el elemento de origen de la acción sigue existiendo (mismo nodo y función). */
function roleKeepingOrigin(action: FocusAction | undefined): DetailRole | null {
  switch (action) {
    case 'join':
      return 'outsider';
    case 'leave':
      return 'member';
    case 'save':
    case 'cancel':
      return 'host';
    default:
      return null;
  }
}

/**
 * Destino del foco para un evento, o `null` si no debe moverse (la respuesta de una acción que
 * llega cuando el usuario ya no está en el detalle que la inició: R16).
 */
export function resolveFocus(event: FocusEventName, context: FocusContext): FocusTarget | null {
  switch (event) {
    case 'loadDone':
    case 'retryDone':
      if (context.load === 'success') return 'sessionTitle';
      if (context.load === 'empty') return 'emptyTitle';
      return 'errorMessage';
    case 'joinLeaveOk':
      return context.action === 'join' ? 'leaveButton' : 'joinButton';
    case 'saveOk':
    case 'formClosed':
      return context.isHost ? 'editButton' : 'zoneMessage';
    case 'dialogClosed':
      return context.isHost ? 'cancelButton' : 'zoneMessage';
    case 'clientCheckFailed':
    case 'actionEnded':
      return originOf(context);
    case 'rereadArrived':
      return roleKeepingOrigin(context.action) === context.roleAfter
        ? originOf(context)
        : 'zoneMessage';
    case 'cancelInFlight':
      return 'dialogTitle';
    case 'empty':
      return 'emptyTitle';
    case 'panelFocus':
      return 'panelTitle';
    case 'lateResponse':
      return null;
  }
}
