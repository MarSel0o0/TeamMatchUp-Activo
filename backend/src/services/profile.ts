// Validación pura de la actualización del perfil (RF-7, RF-8, RF-9, RF-15, RF-16, RF-17,
// RF-19, RF-21, RNF-3, RNF-4). Sin Express ni Mongoose.
import { readField, type Validation } from "./credentials.ts";
import { isValidTimezone } from "./timezones.ts";

export const PROFILE_LIMITS = { displayNameMax: 40, bioMax: 200 } as const;
export const AVATAR_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const PROFILE_MESSAGES = {
  displayNameType: "el nombre visible debe ser un texto",
  displayNameEmpty: "el nombre visible no puede estar vacío",
  displayNameTooLong: "el nombre visible no puede superar 40 caracteres",
  bioType: "la biografía debe ser un texto",
  bioTooLong: "la biografía no puede superar 200 caracteres",
  timezoneType: "la zona horaria debe ser un texto",
  timezoneInvalid: "la zona horaria no es válida",
  avatarColorType: "el color de avatar debe ser un texto",
  avatarColorFormat: "el color de avatar debe tener la forma #RRGGBB",
} as const;

export interface ProfileUpdate {
  displayName?: string;
  bio?: string;
  timezone?: string;
  avatarColor?: string;
}

type ProfileField = keyof ProfileUpdate;

// Regla de cada campo sobre el texto ya recortado: el valor a guardar o el mensaje de error.
type FieldRule = (trimmed: string) => { ok: true; value: string } | { ok: false; error: string };

// Espera el valor ya recortado (RF-8).
export function isValidAvatarColor(trimmed: string): boolean {
  return AVATAR_COLOR_PATTERN.test(trimmed);
}

// Orden de RF-19: nombre visible, biografía, zona horaria, color de avatar.
const RULES: readonly (readonly [ProfileField, string, FieldRule])[] = [
  [
    "displayName",
    PROFILE_MESSAGES.displayNameType,
    (t) => {
      if (t === "") return { ok: false, error: PROFILE_MESSAGES.displayNameEmpty }; // RF-15
      if (t.length > PROFILE_LIMITS.displayNameMax) {
        return { ok: false, error: PROFILE_MESSAGES.displayNameTooLong }; // RF-8
      }
      return { ok: true, value: t };
    },
  ],
  [
    "bio",
    PROFILE_MESSAGES.bioType,
    (t) =>
      t.length > PROFILE_LIMITS.bioMax
        ? { ok: false, error: PROFILE_MESSAGES.bioTooLong } // RF-8; "" válido (RF-21)
        : { ok: true, value: t },
  ],
  [
    "timezone",
    PROFILE_MESSAGES.timezoneType,
    (t) =>
      isValidTimezone(t) ? { ok: true, value: t } : { ok: false, error: PROFILE_MESSAGES.timezoneInvalid }, // RF-16
  ],
  [
    "avatarColor",
    PROFILE_MESSAGES.avatarColorType,
    (t) =>
      isValidAvatarColor(t)
        ? { ok: true, value: t.toLowerCase() } // RF-21
        : { ok: false, error: PROFILE_MESSAGES.avatarColorFormat }, // RF-8
  ],
];

// Solo omitir un campo lo conserva; `null` u otro tipo es error de tipo (RF-7, RF-17).
// Un cuerpo que no es objeto (o es lista) no trae campos. Ningún otro campo se lee (RF-9).
export function validateProfileUpdate(body: unknown): Validation<ProfileUpdate> {
  const update: ProfileUpdate = {};
  for (const [field, typeMessage, rule] of RULES) {
    const raw = readField(body, field);
    if (raw === undefined) continue;
    if (typeof raw !== "string") return { ok: false, error: typeMessage };
    const checked = rule(raw.trim());
    if (!checked.ok) return checked;
    update[field] = checked.value;
  }
  return { ok: true, value: update };
}
