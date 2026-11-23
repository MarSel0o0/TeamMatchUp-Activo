import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Configuración de lint de e2etests/ (spec 018, Q6, RNF-2, RNF-3, RF-21, RF-22). Parte de la del
// servidor y añade las reglas propias de la suite.

const markerMessage =
  "no se permite .only, .skip, .fixme ni .fail: ningún escenario se omite ni se marca como fallo esperado (RNF-3)";
const waitMessage = "sin esperas de tiempo fijo: espera un estado de la página (RF-22)";
const locatorMessage =
  "localiza solo por rol, etiqueta o texto: getByRole, getByLabel o getByText (RF-21)";

export default tseslint.config(
  { ignores: ["node_modules", "playwright-report", "playwright-report-json", "test-results"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Los scripts escriben con process.stdout/stderr.write, como backend/scripts/copyUi.ts.
      "no-console": "error",
      // Sin excepciones: tampoco @ts-expect-error (RNF-2).
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": true,
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
      // Sin aserciones de tipo para esquivar el compilador; `as const` sigue permitido (RNF-2).
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    },
  },
  {
    // Marcas que omiten o invierten pruebas: en los escenarios y en las pruebas de node:test.
    files: ["tests/**/*.ts", "lib/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: 'MemberExpression[property.name="only"]', message: markerMessage },
        { selector: 'MemberExpression[property.name="skip"]', message: markerMessage },
        { selector: 'MemberExpression[property.name="fixme"]', message: markerMessage },
        { selector: 'MemberExpression[property.name="fail"]', message: markerMessage },
        { selector: 'Property[key.name="only"]', message: markerMessage },
      ],
    },
  },
  {
    // Escenarios: sin esperas fijas (RF-22) y solo localizadores accesibles (RF-21).
    files: ["tests/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { property: "waitForTimeout", message: waitMessage },
        { property: "locator", message: locatorMessage },
        { property: "$", message: locatorMessage },
        { property: "$$", message: locatorMessage },
        { property: "$eval", message: locatorMessage },
        { property: "$$eval", message: locatorMessage },
        { property: "getByTestId", message: locatorMessage },
        { property: "waitForSelector", message: locatorMessage },
        { property: "frameLocator", message: locatorMessage },
      ],
      "no-restricted-globals": ["error", { name: "setTimeout", message: waitMessage }],
    },
  },
);
