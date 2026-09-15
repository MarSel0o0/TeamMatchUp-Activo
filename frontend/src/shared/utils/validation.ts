/** Reglas de validación compartidas por los formularios. */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function required(value: string, message = 'Este campo es obligatorio.'): string | undefined {
  return value.trim() ? undefined : message;
}

export function validEmail(value: string): string | undefined {
  if (!value.trim()) return 'Ingresa tu correo.';
  return EMAIL_PATTERN.test(value.trim()) ? undefined : 'El correo no tiene un formato válido.';
}

export function validPassword(value: string): string | undefined {
  if (!value) return 'Ingresa tu contraseña.';
  return value.length >= 8 ? undefined : 'La contraseña debe tener al menos 8 caracteres.';
}

export function validUsername(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Elige un nombre de usuario.';
  if (trimmed.length < 3) return 'Debe tener al menos 3 caracteres.';
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return 'Solo se permiten letras, números, puntos, guiones y guion bajo.';
  }
  return undefined;
}

/** `true` si el objeto de errores no contiene ningún mensaje. */
export function isValid<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).every((error) => !error);
}
