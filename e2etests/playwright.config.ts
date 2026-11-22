// Configuración de Playwright de la suite E2E (spec 018; plan §4.1 y §6).
// RF-2 y RF-7: el sistema bajo prueba lo arranca el lanzador propio y nunca se reutiliza uno que
// ya esté escuchando. RF-10: `webServer` no lleva `env`, así que la configuración que serializan
// los informes no contiene el secreto de firma, que solo conoce el lanzador.
import { defineConfig, devices } from "@playwright/test";
import { formatPreflightErrors } from "./lib/preflight.ts";
import { readSettings } from "./lib/settings.ts";

const result = readSettings(process.env);
if (!result.ok) throw new Error(formatPreflightErrors(result.errors));
const { baseURL } = result.settings;

export default defineConfig({
  testDir: "./tests",
  // En serie: un solo escenario a la vez (RF-2, paso 4; RF-13).
  fullyParallel: false,
  workers: 1,
  // Sin reintentos ni pruebas marcadas con .only (RNF-3).
  retries: 0,
  forbidOnly: true,
  // Esperas a estados de la página, nunca tiempos fijos (RF-22).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report-json/report.json" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // Configuración regional fija (RNF-10).
    locale: "es-CL",
    timezoneId: "UTC",
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", testMatch: "suite.spec.ts" },
    { name: "chromium-reverse", testMatch: "suite.reverse.spec.ts" },
  ],
  webServer: {
    command: "node scripts/start-server.ts",
    // Listo cuando el servidor entrega index.html.
    url: `${baseURL}/`,
    reuseExistingServer: false,
    // Compilación incluida; el plazo de 60 s para responder lo vigila el lanzador.
    timeout: 240_000,
    // tsc escribe sus errores en stdout; el servidor, los suyos en stderr.
    stdout: "pipe",
    stderr: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
