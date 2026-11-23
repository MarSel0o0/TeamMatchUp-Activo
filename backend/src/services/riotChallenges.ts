// Acceso a datos de desafíos de verificación con Riot Games (spec 014, RF-1, RF-4, RF-10, RF-19,
// RF-21, RF-23, RF-24, RF-28, RF-29, RF-43, RF-45, RF-48; D15, D87, D97, D104; plan, §§2.2, 3.1,
// 5.1, 5.2, P14-1 y P14-2).
// - Las reglas puras de tiempos y selección de íconos viven en `domain/riotChallenge.ts`.
// - Toda anulación o cierre aplica `$min: { deleteAt: challengeDeleteAt(at) }` para cumplir D87
//   de forma exacta (24 h desde vencer, anularse o cerrarse, lo que ocurra primero) sin alargar
//   nunca el borrado si el desafío ya había vencido.
// - `completeChallenge` es atómico sobre `{ _id, user, status: "open" }` (P14-2, D104).
import mongoose from "mongoose";
import {
  CHALLENGE_HOURLY_WINDOW_MS,
  challengeDeleteAt,
  challengeExpiry,
} from "../domain/riotChallenge.ts";
import { RiotChallenge } from "../models/riotChallenge.ts";
import type { RiotChallengeDocument } from "../models/riotChallenge.ts";

export interface CreateChallengeInput {
  userId: string;
  puuid: string;
  riotId: string;
  region: string;
  iconId: number;
  now: Date;
}

export interface RecentChallengesSummary {
  count: number;
  /** Fechas de creación ordenadas de la más reciente a la más antigua (para `hourlyRateLimitWait`). */
  createdDates: Date[];
}

async function cancelMatchingOpenChallenges(
  filter: Record<string, unknown>,
  at: Date,
): Promise<number> {
  const result = await RiotChallenge.updateMany(
    { ...filter, status: "open" },
    { $set: { status: "cancelled" }, $min: { deleteAt: challengeDeleteAt(at) } },
  );
  return result.modifiedCount;
}

/**
 * Desafío abierto y vigente del usuario en `now` (RF-45, D15: `expiresAt > now`).
 * Devuelve `null` si no existe, ya venció (incluidos los 10:00 exactos), se anuló o se cerró.
 */
export async function findOpenChallenge(
  userId: string,
  now: Date,
): Promise<RiotChallengeDocument | null> {
  return RiotChallenge.findOne({
    user: userId,
    status: "open",
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });
}

/**
 * Busca un desafío por su identificador filtrando siempre por el usuario dueño (constitución 5,
 * RF-23). Un identificador inválido o de otro usuario devuelve `null`.
 */
export async function findChallengeByIdForUser(
  id: string,
  userId: string,
): Promise<RiotChallengeDocument | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return RiotChallenge.findOne({ _id: id, user: userId });
}

/**
 * Desafíos creados por el usuario estrictamente dentro de la última hora `(now - 1 h, +∞)`,
 * sin importar su estado actual (RF-21, D34).
 */
export async function countRecentChallenges(
  userId: string,
  now: Date,
): Promise<RecentChallengesSummary> {
  const windowStart = new Date(now.getTime() - CHALLENGE_HOURLY_WINDOW_MS);
  const docs = await RiotChallenge.find(
    { user: userId, createdAt: { $gt: windowStart } },
    { createdAt: 1 },
  )
    .sort({ createdAt: -1 })
    .lean();
  const createdDates = docs.map((doc) => doc.createdAt);
  return { count: createdDates.length, createdDates };
}

/**
 * Desafíos abiertos y vigentes de cualquier usuario para una misma cuenta interna de Riot
 * (RF-19, RF-43), ordenados por vencimiento ascendente.
 */
export async function openChallengesForPuuid(
  puuid: string,
  now: Date,
): Promise<RiotChallengeDocument[]> {
  return RiotChallenge.find({
    puuid,
    status: "open",
    expiresAt: { $gt: now },
  }).sort({ expiresAt: 1 });
}

/**
 * Crea un desafío nuevo para `userId` y anula cualquier desafío abierto previo suyo (RF-1, RF-4,
 * RF-28, D87). Si la creación falla, ningún desafío previo se modifica.
 */
export async function createChallengeAndCancelPrevious(
  input: CreateChallengeInput,
): Promise<RiotChallengeDocument> {
  const expiresAt = challengeExpiry(input.now);
  const deleteAt = challengeDeleteAt(expiresAt);
  const created = await RiotChallenge.create({
    user: input.userId,
    puuid: input.puuid,
    riotId: input.riotId,
    region: input.region,
    iconId: input.iconId,
    status: "open",
    attempts: 0,
    createdAt: input.now,
    expiresAt,
    deleteAt,
  });
  await cancelMatchingOpenChallenges({ user: input.userId, _id: { $ne: created._id } }, input.now);
  return created;
}

/** Suma 1 al contador de confirmaciones contadas del desafío (RF-10, D9). */
export async function incrementChallengeAttempts(
  id: string,
): Promise<RiotChallengeDocument | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return RiotChallenge.findOneAndUpdate(
    { _id: id },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  );
}

/**
 * Anula un desafío abierto y adelanta `deleteAt` a `at + 24 h` si todavía no había vencido
 * (RF-10, RF-24, RF-50, D87). Devuelve `null` si no existe o ya no está abierto.
 */
export async function cancelChallenge(
  id: string,
  at: Date,
): Promise<RiotChallengeDocument | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return RiotChallenge.findOneAndUpdate(
    { _id: id, status: "open" },
    { $set: { status: "cancelled" }, $min: { deleteAt: challengeDeleteAt(at) } },
    { returnDocument: "after" },
  );
}

/** Anula todos los desafíos abiertos de los usuarios indicados (RF-29, D59, D87, D89). */
export async function cancelOpenChallengesForUsers(
  userIds: readonly string[],
  at: Date,
): Promise<number> {
  if (userIds.length === 0) return 0;
  return cancelMatchingOpenChallenges({ user: { $in: [...userIds] } }, at);
}

/**
 * Cierra atómicamente un desafío abierto perteneciente a `userId` (RF-7, RF-27, RF-48, D87, D97,
 * D104, P14-2). Devuelve `null` si ya fue anulado entretanto, ya se completó o no pertenece al
 * usuario.
 */
export async function completeChallenge(
  id: string,
  userId: string,
  at: Date,
): Promise<RiotChallengeDocument | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return RiotChallenge.findOneAndUpdate(
    { _id: id, user: userId, status: "open" },
    { $set: { status: "completed" }, $min: { deleteAt: challengeDeleteAt(at) } },
    { returnDocument: "after" },
  );
}
