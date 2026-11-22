// Datos únicos de cada escenario (spec 018, RF-11, Definiciones «Título único»). Función pura: el
// token aleatorio llega como parámetro.
//
// Ningún título único contiene a otro: todos empiezan por «E2E » en mayúsculas, que no aparece
// dentro de un código, un rol ni un token (hexadecimal en minúscula); si uno contuviera a otro,
// sería su prefijo, y con roles que no son prefijos entre sí y tokens de longitud fija al final,
// eso solo pasa si son iguales (plan §3).

export const SCENARIO_CODES = ["E1", "E2", "E3", "E4", "C1", "C2", "C3"] as const;
export type ScenarioCode = (typeof SCENARIO_CODES)[number];

// Ningún rol es prefijo de otro.
export const TITLE_ROLES = ["testigo", "original", "editado", "nueva"] as const;
export type TitleRole = (typeof TITLE_ROLES)[number];

// Contraseña ficticia fija: no es un secreto, solo protege usuarios de prueba de la base E2E.
export const TEST_PASSWORD = "contrasena-e2e-ficticia";

const TOKEN_PATTERN = /^[0-9a-f]{12}$/;

export interface UniqueData {
  email: string;
  username: string;
  password: string;
  r6Handle: string;
  title: (code: ScenarioCode, role: TitleRole) => string;
}

export function uniqueData(token: string): UniqueData {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("el token de los datos únicos debe tener 12 caracteres hexadecimales en minúscula");
  }
  return {
    email: `e2e-${token}@example.com`,
    username: `e2e_${token}`,
    password: TEST_PASSWORD,
    r6Handle: `e2e${token}`,
    title: (code, role) => `E2E ${code} ${role} ${token}`,
  };
}
