// Modelo `PlaySession` (spec 006, plan, sección 4). RF-5, RF-25, DP6-7, P6-3, P6-5.
// - Concurrencia optimista (`optimisticConcurrency`) y sin `timestamps`: `createdAt` lo fija
//   el controlador con `clock.now()` (RF-5, P6-5).
// - El esquema repite las validaciones como red de seguridad; los textos que ve el cliente
//   salen de `domain/sessionRules.ts`.
// - `title` y `notes` no llevan `maxlength`: Mongoose cuenta unidades UTF-16 y rechazaría
//   60 emojis (DP6-7); el largo lo garantiza `sessionRules.ts`.
// - No hay `populate` ni `toJSON` público: la representación sale siempre de
//   `toSessionView` (P6-4). El `toJSON` solo cambia `_id` por `id` y quita `__v`, para
//   depuración; ningún controlador lo envía.
import { Schema, model } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";
import { GAME_IDS } from "../domain/games.ts";
import type { GameId } from "../domain/games.ts";
import type { SessionStatus } from "../domain/sessionState.ts";

export interface PlaySessionFields {
  gameId: GameId;
  host: Types.ObjectId;
  title: string;
  notes: string;
  day: number;
  startHour: number;
  durationHours: number;
  slots: number;
  participants: Types.ObjectId[];
  status: SessionStatus;
  createdAt: Date;
}

export type PlaySessionDocument = HydratedDocument<PlaySessionFields>;

function integerInRange(min: number, max: number) {
  return {
    type: Number,
    required: true,
    validate: {
      validator: (value: number) => Number.isInteger(value) && value >= min && value <= max,
      message: `{PATH} debe ser un entero entre ${min} y ${max}`,
    },
  };
}

const PlaySessionSchema = new Schema<PlaySessionFields>(
  {
    gameId: { type: String, required: true, enum: GAME_IDS },
    host: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    notes: { type: String, default: "" },
    day: integerInRange(0, 6),
    startHour: integerInRange(0, 23),
    durationHours: integerInRange(1, 4),
    slots: integerInRange(2, 6),
    participants: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], index: true },
    status: { type: String, required: true, enum: ["open", "full"] },
    createdAt: { type: Date, required: true },
  },
  {
    optimisticConcurrency: true,
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const PlaySession = model<PlaySessionFields>("PlaySession", PlaySessionSchema);
