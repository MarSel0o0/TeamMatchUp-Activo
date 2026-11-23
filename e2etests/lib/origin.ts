// ¿La petición va al mismo origen que el sistema bajo prueba? (spec 018, RF-9). Función pura.
// data: y blob: cuentan como mismo origen: los genera la propia página.

export function isSameOrigin(url: string | URL, baseURL: string): boolean {
  let target: URL;
  try {
    target = typeof url === "string" ? new URL(url) : url;
  } catch {
    return false;
  }
  if (target.protocol === "data:" || target.protocol === "blob:") return true;
  return target.origin === new URL(baseURL).origin;
}
