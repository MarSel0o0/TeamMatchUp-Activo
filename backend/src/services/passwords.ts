// Hash y verificación de contraseñas con bcrypt (RF-2, RF-9, RNF-5).
import bcrypt from "bcrypt";

export const BCRYPT_COST = 10;
// bcrypt solo usa los primeros 72 bytes: lo que pase de ahí no se recorta, se rechaza.
export const MAX_PASSWORD_BYTES = 72;

export function passwordByteLength(password: string): number {
  return Buffer.byteLength(password, "utf8");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Sin comparar: bcrypt aceptaría una contraseña más larga con los mismos 72 primeros bytes.
  if (passwordByteLength(password) > MAX_PASSWORD_BYTES) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
