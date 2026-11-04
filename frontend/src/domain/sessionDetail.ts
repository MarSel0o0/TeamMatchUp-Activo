// Reglas puras del detalle de sesión y de su formulario de edición (spec 009, plan sección 3).
// Sin React, `fetch`, almacenamiento ni reloj; ninguna recibe «hoy».

import { GRID_HOURS, WEEK_DAYS, formatHour } from './availability';
import {
  NOTES_MAX_LENGTH,
  SESSION_ERRORS,
  codePointLength,
  isValidSessionTitle,
  trimText,
  type SessionEditFields,
} from './sessionRules';
import type { PlaySession } from './types';

export type DetailRole = 'host' | 'member' | 'outsider';

export function detailRole(session: PlaySession, sessionUserId: string): DetailRole {
  if (session.hostId === sessionUserId) return 'host';
  if (session.participants.some((participant) => participant.id === sessionUserId)) return 'member';
  return 'outsider';
}

export type DetailActions =
  | { kind: 'host' }
  | { kind: 'leave' }
  | { kind: 'join'; blocked: boolean };

export function detailActions(session: PlaySession, sessionUserId: string): DetailActions {
  const role = detailRole(session, sessionUserId);
  if (role === 'host') return { kind: 'host' };
  if (role === 'member') return { kind: 'leave' };
  return { kind: 'join', blocked: session.status === 'full' };
}

export function formatSessionRange(
  session: Pick<PlaySession, 'day' | 'startHour' | 'durationHours'>,
): string {
  const end = (session.startHour + session.durationHours) % 24;
  return `${WEEK_DAYS[session.day]?.label ?? ''} · ${formatHour(session.startHour)}–${formatHour(end)}`;
}

export function occupancy(session: PlaySession): { taken: number; total: number } {
  return { taken: session.participants.length, total: session.slots };
}

export function openSlotCount(session: PlaySession): number {
  if (session.status === 'full') return 0;
  return Math.max(0, session.slots - session.participants.length);
}

/** Horas de la reja y, si la sesión empieza fuera de ella, esa hora al final. */
export function startHourOptions(currentStartHour: number): number[] {
  return GRID_HOURS.includes(currentStartHour) ? [...GRID_HOURS] : [...GRID_HOURS, currentStartHour];
}

export function slotRange(session: PlaySession): { min: number; max: 6 } {
  if (session.status === 'full') return { min: session.slots, max: 6 };
  return { min: Math.max(2, session.participants.length), max: 6 };
}

export function slotOptions(range: { min: number; max: number }): number[] {
  if (range.min > range.max) return [range.max];
  return Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index);
}

/** Los cupos elegidos bajo el nuevo mínimo pasan al mínimo. */
export function adjustSlots(chosen: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(chosen, range.min));
}

export type EditFormValues = SessionEditFields;

/** Los seis campos tal como están guardados; el título sin recortar. */
export function editFormInitial(session: PlaySession): EditFormValues {
  return {
    title: session.title,
    notes: session.notes,
    day: session.day,
    startHour: session.startHour,
    durationHours: session.durationHours,
    slots: session.slots,
  };
}

export function rebaseEditForm(values: EditFormValues, fresh: PlaySession): EditFormValues {
  return { ...values, slots: adjustSlots(values.slots, slotRange(fresh)) };
}

export type EditCheckError =
  (typeof SESSION_ERRORS)[
    | 'title'
    | 'notes'
    | 'day'
    | 'startHour'
    | 'durationHours'
    | 'slots'
    | 'slotsBelowParticipants'];

export type EditCheck =
  | { ok: true }
  | { ok: false; field: keyof SessionEditFields; error: EditCheckError };

function fail(field: keyof SessionEditFields, error: EditCheckError): EditCheck {
  return { ok: false, field, error };
}

function isIntegerIn(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** Primer fallo en el orden de campos de la 006 (título, notas, día, hora, duración, cupos). */
export function checkEditForm(values: EditFormValues, session: PlaySession): EditCheck {
  if (!isValidSessionTitle(values.title)) return fail('title', SESSION_ERRORS.title);
  if (codePointLength(trimText(values.notes)) > NOTES_MAX_LENGTH) {
    return fail('notes', SESSION_ERRORS.notes);
  }
  if (!isIntegerIn(values.day, 0, 6)) return fail('day', SESSION_ERRORS.day);
  if (!startHourOptions(session.startHour).includes(values.startHour)) {
    return fail('startHour', SESSION_ERRORS.startHour);
  }
  if (!isIntegerIn(values.durationHours, 1, 4)) {
    return fail('durationHours', SESSION_ERRORS.durationHours);
  }
  if (!isIntegerIn(values.slots, 2, 6)) return fail('slots', SESSION_ERRORS.slots);
  if (values.slots < slotRange(session).min) {
    return fail('slots', SESSION_ERRORS.slotsBelowParticipants);
  }
  return { ok: true };
}

/** Los seis campos, título y notas tal como están en el campo (sin recortar). */
export function toEditPayload(values: EditFormValues): SessionEditFields {
  return {
    title: values.title,
    notes: values.notes,
    day: values.day,
    startHour: values.startHour,
    durationHours: values.durationHours,
    slots: values.slots,
  };
}

export type RequestKind = 'load' | 'reread' | 'action';

export type ResponseInfo =
  | { ok: true }
  | { ok: false; status: number; hasMessage: boolean }; // status 0 = sin respuesta, red o plazo

export type Outcome =
  | 'success'
  | 'empty'
  | 'pageError'
  | 'keep'
  | 'messageAndReread'
  | 'messageOnly'
  | 'session';

/** Qué hace la vista con cada respuesta (plan 009, sección 3). El 401 lo trata `execute`. */
export function classifyResponse(kind: RequestKind, response: ResponseInfo): Outcome {
  if (response.ok) return 'success';
  const { status, hasMessage } = response;
  if (status === 401) return 'session';
  if (kind === 'load') return status === 400 || status === 404 ? 'empty' : 'pageError';
  if (kind === 'reread') return status === 400 || status === 404 ? 'empty' : 'keep';
  if (status === 404) return 'empty';
  if (hasMessage && (status === 400 || status === 403 || status === 409)) return 'messageAndReread';
  return 'messageOnly';
}
