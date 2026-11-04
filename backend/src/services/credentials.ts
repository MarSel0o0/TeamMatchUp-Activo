// Validación pura de los cuerpos de registro e inicio de sesión
// (RF-3 clave, RF-4, RF-5, RF-6, RF-7, RF-16, RF-18, RF-19, RNF-7). Sin Express ni Mongoose.
import { MAX_PASSWORD_BYTES, passwordByteLength } from "./passwords.ts";

// Copia de frontend/src/shared/utils/validation.ts: la misma regla del formulario (RF-5).
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export const LIMITS = {
  emailMax: 254,
  usernameMin: 3,
  usernameMax: 24,
  passwordMin: 8,
  passwordMaxBytes: MAX_PASSWORD_BYTES,
  displayNameMax: 40,
} as const;

export const MESSAGES = {
  emailType: "el correo debe ser un texto",
  usernameType: "el nombre de usuario debe ser un texto",
  passwordType: "la contraseña debe ser un texto",
  displayNameType: "el nombre visible debe ser un texto",
  emailMissing: "falta el correo",
  usernameMissing: "falta el nombre de usuario",
  passwordMissing: "falta la contraseña",
  emailTooLong: "el correo no puede superar 254 caracteres",
  emailFormat: "el correo no tiene un formato válido",
  usernameLength: "el nombre de usuario debe tener entre 3 y 24 caracteres",
  usernameChars: "el nombre de usuario solo admite letras, dígitos, punto, guion y guion bajo",
  passwordTooShort: "la contraseña debe tener al menos 8 caracteres",
  passwordTooLong: "la contraseña no puede superar 72 bytes",
  displayNameTooLong: "el nombre visible no puede superar 40 caracteres",
  emailTaken: "ya existe una cuenta con ese correo",
  usernameTaken: "ese nombre de usuario ya está en uso",
  badCredentials: "correo o contraseña incorrectos",
} as const;

export interface RegistrationInput {
  email: string;
  username: string;
  usernameKey: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

// Resultado de leer un campo: texto, ausente (sin valor) o error de tipo (RF-19).
type FieldRead = { ok: true; value: string | undefined } | { ok: false; error: string };

// RF-16: solo cuentan las propiedades propias de un objeto que no sea arreglo.
export function readField(body: unknown, key: string): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return undefined;
  }
  return Object.hasOwn(body, key) ? (body as Record<string, unknown>)[key] : undefined;
}

// RF-7: sin espacios en los extremos y en minúsculas (también la parte local).
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// RF-3: clave de unicidad del nombre de usuario, sin distinguir mayúsculas.
export function usernameKey(username: string): string {
  return username.toLowerCase();
}

// Tipo primero (D9). `trimBlank`: un texto de solo espacios cuenta como ausente
// (todos los campos salvo la contraseña). El valor de tipo incorrecto nunca se devuelve.
function readText(body: unknown, key: string, typeMessage: string, trimBlank: boolean): FieldRead {
  const raw = readField(body, key);
  if (raw === undefined || raw === null) {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: typeMessage };
  }
  const blank = trimBlank ? raw.trim() === "" : raw === "";
  return { ok: true, value: blank ? undefined : raw };
}

function fail<T>(error: string): Validation<T> {
  return { ok: false, error };
}

// Orden de RF-5: correo, nombre de usuario, contraseña, nombre visible; primer error.
export function validateRegistration(body: unknown): Validation<RegistrationInput> {
  const emailRead = readText(body, "email", MESSAGES.emailType, true);
  if (!emailRead.ok) return fail(emailRead.error);
  if (emailRead.value === undefined) return fail(MESSAGES.emailMissing);
  const trimmedEmail = emailRead.value.trim();
  if (trimmedEmail.length > LIMITS.emailMax) return fail(MESSAGES.emailTooLong);
  if (!EMAIL_PATTERN.test(trimmedEmail)) return fail(MESSAGES.emailFormat);
  const email = normalizeEmail(trimmedEmail);

  const usernameRead = readText(body, "username", MESSAGES.usernameType, true);
  if (!usernameRead.ok) return fail(usernameRead.error);
  if (usernameRead.value === undefined) return fail(MESSAGES.usernameMissing);
  const username = usernameRead.value.trim();
  if (username.length < LIMITS.usernameMin || username.length > LIMITS.usernameMax) {
    return fail(MESSAGES.usernameLength);
  }
  if (!USERNAME_PATTERN.test(username)) return fail(MESSAGES.usernameChars);

  const passwordRead = readText(body, "password", MESSAGES.passwordType, false);
  if (!passwordRead.ok) return fail(passwordRead.error);
  if (passwordRead.value === undefined) return fail(MESSAGES.passwordMissing);
  const password = passwordRead.value;
  if (password.length < LIMITS.passwordMin) return fail(MESSAGES.passwordTooShort);
  if (passwordByteLength(password) > LIMITS.passwordMaxBytes) return fail(MESSAGES.passwordTooLong);

  const displayNameRead = readText(body, "displayName", MESSAGES.displayNameType, true);
  if (!displayNameRead.ok) return fail(displayNameRead.error);
  let displayName = username;
  if (displayNameRead.value !== undefined) {
    displayName = displayNameRead.value.trim();
    if (displayName.length > LIMITS.displayNameMax) return fail(MESSAGES.displayNameTooLong);
  }

  return {
    ok: true,
    value: { email, username, usernameKey: usernameKey(username), password, displayName },
  };
}

// RF-18, RF-19: sin validar formato ni longitud; si faltan ambos, el error del correo.
export function validateLogin(body: unknown): Validation<LoginInput> {
  const emailRead = readText(body, "email", MESSAGES.emailType, true);
  if (!emailRead.ok) return fail(emailRead.error);
  if (emailRead.value === undefined) return fail(MESSAGES.emailMissing);

  const passwordRead = readText(body, "password", MESSAGES.passwordType, false);
  if (!passwordRead.ok) return fail(passwordRead.error);
  if (passwordRead.value === undefined) return fail(MESSAGES.passwordMissing);

  return { ok: true, value: { email: normalizeEmail(emailRead.value), password: passwordRead.value } };
}
