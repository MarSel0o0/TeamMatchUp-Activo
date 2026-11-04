// Escrituras de las sesiones de juego (spec 006, plan, sección 6). RF-5, RF-7 a RF-10, RF-16,
// RF-18, RF-24, RF-25, DP6-39.
// - `createSession`: crear la sesión (un solo insert), comprobar que el anfitrión existe y compensar
//   con `deleteOne` si ya no existe o si algo lanza, como `linkAccount` de la 004. La compensación es
//   401 "token inválido" (la credencial ya no corresponde a ningún usuario, igual que en
//   `createWithUser` y `matches.ts`), no 404. El usuario no se escribe nunca. Sin transacciones
//   (P6-2): hay un intervalo de milisegundos con la sesión de un usuario eliminado, que RF-24 oculta
//   y esta compensación (o C4 de la cascada) borra.
// - `mutateSession`: lo único que escribe una sesión que ya existe (editar, sumarse, salir, cascada),
//   con el patrón de `updateOwnedAccount` de la 004: `findById` -> regla pura -> `save()` con
//   concurrencia optimista (RF-25). Ante `VersionError` se relee y se vuelve a aplicar la regla sobre
//   el estado nuevo (máx. `maxAttempts`); un documento borrado entretanto da 404 y `save()` nunca lo
//   recrea. Agotados los intentos lanza (-> `errorHandler`, 500) sin haber cambiado nada.
// - `joinSession`: sumarse con `mutateSession`; si el usuario ya no existe, lo quita y compensa con
//   401 "token inválido" (DP6-39), como `createSession`.
// - `removeUserFromSessions`: la parte de la cascada de RF-16 que quita al usuario de sus sesiones.
// - `cancelSession`: existencia (también del anfitrión, RF-24) -> 404, no anfitrión -> 403,
//   `deleteOne` (RF-9, RF-10).
import mongoose from "mongoose";
import { SESSION_ERRORS } from "../domain/sessionRules.ts";
import { applyJoin, removeParticipant } from "../domain/sessionState.ts";
import type { SessionRecord, StateResult } from "../domain/sessionState.ts";
import { PlaySession } from "../models/playSession.ts";
import type { PlaySessionDocument } from "../models/playSession.ts";
import { User } from "../models/user.ts";
import { toRecord } from "./sessionReads.ts";
import { SESSION_MESSAGES } from "./sessionToken.ts";

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; status: 401; error: string };

/** Guarda la sesión nueva; si el anfitrión ya no existe, no deja nada y devuelve el 401. */
export async function createSession(data: Omit<SessionRecord, "id">): Promise<CreateResult> {
  const created = await PlaySession.create({
    gameId: data.gameId,
    host: data.hostId,
    title: data.title,
    notes: data.notes,
    day: data.day,
    startHour: data.startHour,
    durationHours: data.durationHours,
    slots: data.slots,
    participants: data.participantIds,
    status: data.status,
    createdAt: data.createdAt,
  });
  try {
    if ((await User.exists({ _id: data.hostId })) === null) {
      // Usuario eliminado entretanto (RF-16, RF-18): no queda ninguna sesión suya.
      await PlaySession.deleteOne({ _id: created._id });
      return { ok: false, status: 401, error: SESSION_MESSAGES.invalidToken };
    }
  } catch (error) {
    await PlaySession.deleteOne({ _id: created._id }); // 500 sin sesión a medias
    throw error; // → errorHandler (500)
  }
  return { ok: true, id: created._id.toString() };
}

export type MutateResult =
  | { ok: true; record: SessionRecord }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

/** Regla pura de una escritura: recibe la sesión leída y devuelve la sesión nueva o su error. */
export type ApplyRule = (session: SessionRecord) => StateResult;

export interface MutateOptions {
  /** Si el anfitrión ya no existe, la sesión se trata como inexistente (404, RF-24). */
  requireHost: boolean;
}

function notFound(): MutateResult {
  return { ok: false, status: 404, error: SESSION_ERRORS.notFound };
}

/** Asigna al documento solo lo que cambió, para que una escritura sin cambios no toque la base. */
function assignChanges(document: PlaySessionDocument, before: SessionRecord, after: SessionRecord): void {
  if (after.title !== before.title) document.title = after.title;
  if (after.notes !== before.notes) document.notes = after.notes;
  if (after.day !== before.day) document.day = after.day;
  if (after.startHour !== before.startHour) document.startHour = after.startHour;
  if (after.durationHours !== before.durationHours) document.durationHours = after.durationHours;
  if (after.slots !== before.slots) document.slots = after.slots;
  if (after.status !== before.status) document.status = after.status;
  const sameParticipants =
    after.participantIds.length === before.participantIds.length &&
    after.participantIds.every((id, index) => id === before.participantIds[index]);
  if (!sameParticipants) {
    document.set(
      "participants",
      after.participantIds.map((id) => new mongoose.Types.ObjectId(id)),
    );
  }
}

/** Lee, aplica la regla pura y guarda con reintento optimista (RF-25). */
export async function mutateSession(
  id: string,
  apply: ApplyRule,
  { requireHost }: MutateOptions,
  maxAttempts = 5,
): Promise<MutateResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const document = await PlaySession.findById(id);
    if (document === null) return notFound();
    if (requireHost && (await User.exists({ _id: document.host })) === null) return notFound(); // RF-24
    const before = toRecord(document);
    const result = apply(before);
    if (!result.ok) return { ok: false, status: result.status, error: result.error };
    assignChanges(document, before, result.value);
    try {
      await document.save();
      return { ok: true, record: result.value };
    } catch (saveError) {
      if (saveError instanceof mongoose.Error.VersionError) continue; // otra escritura ganó: releer
      if (saveError instanceof mongoose.Error.DocumentNotFoundError) return notFound(); // cancelada en medio
      throw saveError; // -> errorHandler (500)
    }
  }
  throw new Error(`no se pudo escribir la sesión ${id} tras ${maxAttempts} intentos`);
}

export type JoinResult = MutateResult | { ok: false; status: 401; error: string };

/**
 * Sumarse (RF-11, RF-12, RF-16, DP6-38, DP6-39): `applyJoin` con el anfitrión exigido (RF-24). Si
 * la escritura salió bien pero el usuario ya no existe (eliminado entretanto), se quita su
 * participación y se responde 401 "token inválido"; que la sesión ya no exista (404) se ignora.
 */
export async function joinSession(id: string, userId: string): Promise<JoinResult> {
  const result = await mutateSession(id, (session) => applyJoin(session, userId), { requireHost: true });
  if (result.ok && (await User.exists({ _id: userId })) === null) {
    await mutateSession(id, (session) => ({ ok: true, value: removeParticipant(session, userId) }), {
      requireHost: false,
    });
    return { ok: false, status: 401, error: SESSION_MESSAGES.invalidToken };
  }
  return result;
}

/**
 * Cascada de RF-16: quita al usuario de cada sesión donde participa y recalcula su estado. No exige
 * anfitrión (RF-24) y un 404 (sesión cancelada entretanto) se ignora. Una a una, sin concurrencia.
 */
export async function removeUserFromSessions(userId: string): Promise<void> {
  const sessionIds = await PlaySession.find({ participants: userId }).distinct("_id");
  for (const sessionId of sessionIds) {
    await mutateSession(
      String(sessionId),
      (session) => ({ ok: true, value: removeParticipant(session, userId) }),
      { requireHost: false },
    );
  }
}

export type CancelResult =
  | { ok: true }
  | { ok: false; status: 403 | 404; error: string };

/** Cancelar (RF-9, RF-10, RF-24): 404 si no existe o si su anfitrión ya no existe; 403 si no es el anfitrión. */
export async function cancelSession(id: string, userId: string): Promise<CancelResult> {
  const document = await PlaySession.findById(id);
  if (document === null || (await User.exists({ _id: document.host })) === null) {
    return { ok: false, status: 404, error: SESSION_ERRORS.notFound };
  }
  if (!document.host.equals(userId)) return { ok: false, status: 403, error: SESSION_ERRORS.notHostCancel };
  await PlaySession.deleteOne({ _id: document._id }); // si ya la borraron, 204 igual
  return { ok: true };
}
