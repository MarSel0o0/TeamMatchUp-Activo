// Fixtures de la suite (spec 018, RF-9, RF-11, RF-12, U6, U8; plan §5.2, §5.3 y §6).
// - blockOtherOrigins (automático): en cada contexto, antes de abrir ninguna página, aborta toda
//   petición a un origen distinto del sistema bajo prueba (RF-9).
// - testUser: registra por la API un usuario de prueba nuevo y, al terminar el escenario, pase o
//   falle, lo elimina con una sesión iniciada de la suite NUEVA (RF-12). Si la limpieza falla, el
//   escenario cuenta como fallido con un error propio (U6).
// La sesión del navegador nunca sale de aquí: los escenarios inician sesión por el formulario (U8).
import { randomUUID } from "node:crypto";
import { test as base, type Page } from "@playwright/test";
import { isSameOrigin } from "../lib/origin.ts";
import { uniqueData, type ScenarioCode, type UniqueData } from "../lib/uniqueData.ts";
import { createSuiteApi, type Failure, type SuiteApi } from "./api.ts";

// Plazo propio de la limpieza, aunque el escenario haya agotado el suyo (plan §5.2).
const TEST_USER_TIMEOUT_MS = 30_000;

export interface LeftoverUser {
  readonly email: string;
  readonly username: string;
}

// Paso de la limpieza que falló.
export type CleanupStep = "el inicio de sesión" | "la eliminación";

// Texto del error de limpieza (plan §5.3). Función pura.
export function cleanupFailure(user: LeftoverUser, step: CleanupStep, failure: Failure): string {
  const outcome =
    failure.kind === "no-response"
      ? `no respondió: ${failure.reason}`
      : `respondió ${failure.status}${failure.problem === null ? "" : ` (${failure.problem})`}`;
  return (
    `Falló la limpieza, no el escenario: el usuario de prueba ${user.email} (${user.username}) ` +
    `quedó en la base E2E; ${step} ${outcome}`
  );
}

// Estado del registro del usuario de prueba (plan §5.2).
type Registration = "created" | "unknown";

function requireBaseURL(baseURL: string | undefined): string {
  if (baseURL === undefined) throw new Error("falta baseURL en la configuración de Playwright");
  return baseURL;
}

// Elimina al usuario con una sesión iniciada de la suite nueva. Devuelve el mensaje de fallo de
// limpieza, o null si no hubo fallo (también cuando el usuario nunca llegó a existir).
async function cleanUp(api: SuiteApi, user: UniqueData, registration: Registration): Promise<string | null> {
  const login = await api.login(user);
  if (!login.ok) {
    // Si el registro no respondió, un 401 «correo o contraseña incorrectos» significa que el
    // usuario no existe: no hay nada que limpiar (RF-12).
    if (login.badCredentials && registration === "unknown") return null;
    const failure: Failure = login.badCredentials
      ? { kind: "status", status: 401, problem: null }
      : login.failure;
    return cleanupFailure(user, "el inicio de sesión", failure);
  }
  const removal = await api.deleteMe(login.session);
  return removal.ok ? null : cleanupFailure(user, "la eliminación", removal.failure);
}

interface SuiteFixtures {
  blockOtherOrigins: void;
  testUser: UniqueData;
}

export const test = base.extend<SuiteFixtures>({
  blockOtherOrigins: [
    async ({ context, baseURL }, use) => {
      const origin = requireBaseURL(baseURL);
      await context.route(
        (url) => !isSameOrigin(url, origin),
        (route) => route.abort("blockedbyclient"),
      );
      await use();
    },
    { auto: true },
  ],

  testUser: [
    async ({ baseURL }, use) => {
      const api = createSuiteApi(requireBaseURL(baseURL));
      const user = uniqueData(randomUUID().replaceAll("-", "").slice(0, 12));

      const registered = await api.register(user);
      if (!registered.ok) {
        if (registered.failure.kind === "status") {
          // El registro respondió con error: el usuario no existe y no hay nada que limpiar.
          throw new Error(
            `Falló la preparación: el registro del usuario de prueba ${user.email} respondió ${registered.failure.status}`,
          );
        }
        // Sin respuesta: puede que se haya creado; la limpieza lo intenta igual (RF-12).
        const preparation = `Falló la preparación: el registro del usuario de prueba ${user.email} no respondió: ${registered.failure.reason}`;
        const cleanupError = await cleanUp(api, user, "unknown");
        throw new Error(cleanupError === null ? preparation : `${preparation}\n${cleanupError}`);
      }

      await use(user);

      const cleanupError = await cleanUp(api, user, "created");
      if (cleanupError !== null) throw new Error(cleanupError);
    },
    { timeout: TEST_USER_TIMEOUT_MS },
  ],
});

export { expect } from "@playwright/test";

// Lo que recibe cada escenario.
export interface ScenarioArgs {
  readonly page: Page;
  readonly testUser: UniqueData;
}

export interface Scenario {
  readonly code: ScenarioCode;
  // «<código> · <resumen>» (plan §8): cada título empieza por su código.
  readonly title: string;
  readonly run: (args: ScenarioArgs) => Promise<void>;
}
