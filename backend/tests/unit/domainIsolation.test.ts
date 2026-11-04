import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Spec 004, RNF-7; plan, sección 2.1 y P-17 (T3b): `domain/` solo importa de `domain/`.
// Solo vigila estas cuatro carpetas del backend; no prohíbe `express`, `mongoose` ni
// `node:*` (decisión del usuario, 2026-10-18).

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");
const DOMAIN_DIR = path.join(SRC_DIR, "domain");
const FORBIDDEN_DIRS = ["services", "utils", "models", "controllers"].map((name) =>
  path.join(SRC_DIR, name),
);

// `import … from`, `export … from` e `import type … from` (también en varias líneas),
// `import "…"` e `import("…")`.
const SPECIFIER_PATTERNS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function extractSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.push(specifier);
    }
  }
  return specifiers;
}

function isInside(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// Especificadores de `source` (archivo `filePath`) que caen en una carpeta prohibida.
function forbiddenImports(source: string, filePath: string): string[] {
  return extractSpecifiers(source).filter((specifier) => {
    if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) return false;
    const resolved = path.resolve(path.dirname(filePath), specifier);
    return FORBIDDEN_DIRS.some((dir) => isInside(dir, resolved));
  });
}

function domainFiles(): string[] {
  return readdirSync(DOMAIN_DIR, { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".ts"))
    .map((name) => path.join(DOMAIN_DIR, name))
    .sort();
}

describe("aislamiento de domain/", () => {
  test("encuentra al menos un .ts en domain/", () => {
    assert.ok(domainFiles().length > 0, `sin archivos .ts en ${DOMAIN_DIR}`);
  });

  test("el extractor detecta imports prohibidos en un texto de muestra", () => {
    const sampleFile = path.join(DOMAIN_DIR, "sample.ts");
    const sample = [
      'import { MESSAGES } from "../utils/errors.ts";',
      "import {",
      "  resolveUserTarget,",
      '} from "../services/userTarget.ts";',
      'import type { User } from "./../models/user.ts";',
      'export { router } from "../../src/controllers/users.ts";',
      'import "../utils/logger.ts";',
      'const later = await import("../services/passwords.ts");',
      'import { GAMES } from "./games.ts";',
      'import express from "express";',
      'import mongoose from "mongoose";',
      'import { readFileSync } from "node:fs";',
      'import { servicesHelper } from "./services/helper.ts";',
    ].join("\n");
    assert.deepEqual(forbiddenImports(sample, sampleFile).sort(), [
      "../../src/controllers/users.ts",
      "../services/passwords.ts",
      "../services/userTarget.ts",
      "../utils/errors.ts",
      "../utils/logger.ts",
      "./../models/user.ts",
    ]);
  });

  test("ningún archivo de domain/ importa de services, utils, models ni controllers", () => {
    const violations = domainFiles().flatMap((file) =>
      forbiddenImports(readFileSync(file, "utf8"), file).map(
        (specifier) => `${path.relative(SRC_DIR, file)} importa "${specifier}"`,
      ),
    );
    assert.deepEqual(violations, []);
  });
});
