// Modelo `User` (plan §2.5, §3.4). RF-1, RF-3, RF-7, RF-21, RNF-4.
// - `email` en minúsculas con índice único (RF-7, RF-21).
// - `username` se guarda tal como se escribió (recortado); su unicidad sin distinguir
//   mayúsculas la da `usernameKey` (minúsculas, `usernameKey()` de credentials.ts), con
//   índice único propio (D5). Sin collation.
// - `toJSON` en lista blanca: solo datos públicos, sin correo, hash ni `usernameKey` (D6).
// - Spec 003 (D1, §2.5): `availability` (bloques "día-hora") vive en el documento con
//   default `[]` y nunca se serializa en `toJSON`/`toOwnUserJson` (RF-11, RF-12, RNF-2).
// - Spec 004: el usuario no guarda sus cuentas; la relación vive solo en `GameAccount.user`
//   (RF-46: vincular y desvincular no escriben al usuario).
import { Schema, model } from "mongoose";
import type { HydratedDocument } from "mongoose";

export const USER_DEFAULTS = { avatarColor: "#6d5efc", bio: "", timezone: "America/Santiago" } as const;

export interface UserFields {
  email: string;
  username: string;
  usernameKey: string;
  passwordHash: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  timezone: string;
  availability: string[];
  createdAt: Date;
}

export type UserDocument = HydratedDocument<UserFields>;

export interface PublicUserJson {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  timezone: string;
  createdAt: Date;
}

export interface OwnUserJson extends PublicUserJson {
  email: string;
}

// Lista blanca: un campo nuevo del esquema no se expone salvo que se añada aquí.
export function toPublicUserJson(user: UserDocument): PublicUserJson {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    bio: user.bio,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}

const UserSchema = new Schema<UserFields>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    username: { type: String, required: true, trim: true },
    usernameKey: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    avatarColor: { type: String, default: USER_DEFAULTS.avatarColor },
    bio: { type: String, default: USER_DEFAULTS.bio },
    timezone: { type: String, default: USER_DEFAULTS.timezone },
    availability: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (doc: UserDocument) => toPublicUserJson(doc) },
  },
);

export const User = model<UserFields>("User", UserSchema);

// Solo para responder al propio usuario (registro, inicio de sesión, sesión actual).
export function toOwnUserJson(user: UserDocument): OwnUserJson {
  return { ...toPublicUserJson(user), email: user.email };
}
