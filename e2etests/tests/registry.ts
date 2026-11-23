// Lista ordenada de escenarios y su registro (spec 018, RF-13, U11; plan §6, decisión D4).
// Con un solo trabajador, Playwright ejecuta las pruebas de un archivo en el orden en que se
// declaran; suite.spec.ts las registra en el orden habitual y suite.reverse.spec.ts en el inverso.
import { AGENDA_SCENARIOS } from "./agenda.scenarios.ts";
import { AUTH_SCENARIOS } from "./auth.scenarios.ts";
import { test, type Scenario } from "./fixtures.ts";

export type ScenarioOrder = "normal" | "reverse";

// Devuelve siempre una copia: la lista habitual no se modifica.
export function orderScenarios<T>(list: readonly T[], order: ScenarioOrder): T[] {
  return order === "reverse" ? [...list].reverse() : [...list];
}

// Orden habitual: E1, E2, E3, E4, C1, C2, C3.
export const SCENARIOS: readonly Scenario[] = [...AUTH_SCENARIOS, ...AGENDA_SCENARIOS];

export function registerScenarios(order: ScenarioOrder): void {
  for (const scenario of orderScenarios(SCENARIOS, order)) {
    test(scenario.title, async ({ page, testUser }) => {
      await scenario.run({ page, testUser });
    });
  }
}
