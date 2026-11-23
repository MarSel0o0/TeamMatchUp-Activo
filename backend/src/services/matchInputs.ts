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
  | { kind: "unranked" } // LoL sin clasificar o con rango pendiente (spec 014, RF-33, RF-44)
  | { kind: "noPremier"; premier: "unrated" | "unavailable" } // CS2 sin rating de Leetify (spec 015, RF-10)
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

  // Spec 014 (RF-13, RF-33, RF-44; D57, D67, D80): cuenta de LoL sin clasificar o con bloque de
  // rango pendiente → 409 al buscar y excluida como candidata; partidas o perfil pendientes no.
  if (gameId === "lol" && (own.currentRank == null || own.pendingBlocks?.includes("rank") === true)) {
    return { kind: "unranked" };
  }

  // Spec 015 (RF-7, RF-8, RF-10, RF-18): una cuenta de CS2 verificada con Steam solo entra con rating
  // de Leetify (`premier: "rated"`). Sin `premier` es anterior a la 015 y su rango es simulado, así
  // que cuenta como «no disponible» hasta resincronizar (no se atribuiría a Leetify un dato simulado).
  if (gameId === "cs2" && own.verification?.source === "steam" && own.premier !== "rated") {
    return { kind: "noPremier", premier: own.premier === "unrated" ? "unrated" : "unavailable" };
  }

  const accounts = await GameAccount.find({
    gameId,
    user: { $ne: userId },
    ...(gameId === "lol" ? { currentRank: { $ne: null }, pendingBlocks: { $ne: "rank" } } : {}),
    // Las de CS2 sin verificar (simuladas, sin `premier`) siguen entrando (RF-22).
    ...(gameId === "cs2" ? { $or: [{ "verification.source": { $ne: "steam" } }, { premier: "rated" }] } : {}),
  });
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
