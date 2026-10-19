// Lectura de datos para el motor de coincidencias (spec 005, plan, sección 4).
// RF-4, RF-6, RF-13, RF-17, DP5-10.
// - Devuelve un resultado discriminado; no responde HTTP (lo hace el controlador).
// - El usuario de la sesión se lee solo por su disponibilidad; los dueños de las cuentas, con
//   una lista explícita de campos que nunca incluye el correo ni el hash (P5-4).
// - Cuentas y dueños en dos consultas y unión pura `assembleCandidates` (P5-2); la cuenta es
//   exactamente la que serializa la spec 004 (P5-3).
import type { Types } from "mongoose";
import { assembleCandidates } from "../domain/matching.ts";
import type { CandidateInput, CandidateUser } from "../domain/matching.ts";
import type { GameId } from "../domain/games.ts";
import { GameAccount, toGameAccountJson } from "../models/gameAccount.ts";
import type { GameAccountJson } from "../models/gameAccount.ts";
import { User } from "../models/user.ts";

export type { GameAccountJson };

export type MatchInputs =
  | { kind: "noSession" } // el usuario de la sesión ya no existe (RF-13)
  | { kind: "noAccount" } // sin cuenta propia en el juego (RF-6)
  | {
      kind: "ok";
      viewer: { userId: string; account: GameAccountJson; blocks: string[] };
      candidates: CandidateInput<GameAccountJson>[];
    };

/** Lo que se lee de cada dueño de cuenta; `toCandidateUser` toma solo siete de estos campos. */
export interface CandidateOwner {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  timezone: string;
  createdAt: Date;
}

/** Lista explícita de campos públicos del candidato (DP5-10): ningún campo extra pasa. */
export function toCandidateUser(owner: CandidateOwner): CandidateUser {
  return {
    id: owner._id.toString(),
    username: owner.username,
    displayName: owner.displayName,
    avatarColor: owner.avatarColor,
    bio: owner.bio,
    timezone: owner.timezone,
    createdAt: owner.createdAt.toISOString(),
  };
}

export async function loadMatchInputs(userId: string, gameId: GameId): Promise<MatchInputs> {
  const viewer = await User.findById(userId).select("availability").lean();
  if (viewer === null) return { kind: "noSession" };

  const own = await GameAccount.findOne({ user: userId, gameId });
  if (own === null) return { kind: "noAccount" };

  const accounts = await GameAccount.find({ gameId, user: { $ne: userId } });
  const ownerIds = [...new Set(accounts.map((account) => account.user.toString()))];
  const owners = await User.find({ _id: { $in: ownerIds } })
    .select("username displayName avatarColor bio timezone createdAt availability")
    .lean();

  const ownersById = new Map(
    owners.map((owner) => [
      owner._id.toString(),
      { user: toCandidateUser(owner), blocks: owner.availability },
    ]),
  );

  return {
    kind: "ok",
    viewer: { userId, account: toGameAccountJson(own), blocks: viewer.availability },
    candidates: assembleCandidates(accounts.map(toGameAccountJson), ownersById),
  };
}
