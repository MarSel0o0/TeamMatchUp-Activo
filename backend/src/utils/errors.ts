// Traducción de cualquier error a la respuesta HTTP genérica (RF-5, RF-6, RF-16, RF-17).
// Los mensajes van en español, en minúscula y sin punto final (RNF-3).

export const MESSAGES = {
  unknownEndpoint: "endpoint desconocido",
  malformedJson: "JSON mal formado",
  payloadTooLarge: "cuerpo demasiado grande",
  unsupportedEncoding: "codificación no soportada",
  internal: "error interno del servidor",
  // Genéricos para los recursos con identificador (spec 003, D8; reutilizables en 004–006).
  invalidId: "id con formato inválido",
  forbidden: "no tienes permiso para esta operación",
} as const;

export interface ErrorResponse {
  status: number;
  error: string;
}

// body-parser marca sus errores con la propiedad `type` (D7).
function errorType(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("type" in error)) return undefined;
  return typeof error.type === "string" ? error.type : undefined;
}

// Pura: nunca copia el mensaje, la traza ni otros datos del error original (RF-6).
export function mapErrorToResponse(error: unknown): ErrorResponse {
  switch (errorType(error)) {
    case "entity.parse.failed":
      return { status: 400, error: MESSAGES.malformedJson };
    case "entity.too.large":
      return { status: 413, error: MESSAGES.payloadTooLarge };
    case "encoding.unsupported":
    case "charset.unsupported":
      return { status: 415, error: MESSAGES.unsupportedEncoding };
    default:
      return { status: 500, error: MESSAGES.internal };
  }
}
