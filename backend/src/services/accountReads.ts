// Lectura de cuentas sin dueños inexistentes (spec 004, plan, secciones 6.2 y 6.3; P-21).
// T20: RF-14, RF-2, RF-3.
// - Defensa del fallo doble de la cascada de eliminación (R2): una cuenta cuyo dueño ya no
//   existe nunca se muestra al listar ni al obtener.
// - Sin `$lookup`: `find` + `sort` simples del controlador y una sola consulta de dueños,
//   así el orden por `_id` ascendente de la lista no cambia.
import type { Types } from "mongoose";
import { User } from "../models/user.ts";

interface WithOwner {
  user: Types.ObjectId;
}

/** Cuentas cuyo dueño existe, en el mismo orden de entrada (una sola consulta a `User`). */
export async function withExistingOwners<T extends WithOwner>(accounts: readonly T[]): Promise<T[]> {
  if (accounts.length === 0) return [];
  const ownerIds = [...new Set(accounts.map((account) => account.user.toString()))];
  const owners = await User.find({ _id: { $in: ownerIds } }, { _id: 1 }).lean();
  const existing = new Set(owners.map((owner) => owner._id.toString()));
  return accounts.filter((account) => existing.has(account.user.toString()));
}

/** `true` si el dueño de la cuenta existe. */
export async function ownerExists(account: WithOwner): Promise<boolean> {
  return (await User.exists({ _id: account.user })) !== null;
}
