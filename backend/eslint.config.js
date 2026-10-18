import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Mensaje común para cualquier forma de `.only` en las pruebas (RNF-2): `node --test`
// sin `--test-only` solo avisa y ejecuta todo, así que el lint es quien lo impide.
const onlyMessage = "no se permite .only en las pruebas";

export default tseslint.config(
  { ignores: ["out", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "error",
    },
  },
  {
    // Único archivo que puede escribir en la consola (RT-06).
    files: ["src/utils/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["tests/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "test", property: "only", message: onlyMessage },
        { object: "describe", property: "only", message: onlyMessage },
        { object: "it", property: "only", message: onlyMessage },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: 'Property[key.name="only"]', message: onlyMessage },
      ],
    },
  },
);
