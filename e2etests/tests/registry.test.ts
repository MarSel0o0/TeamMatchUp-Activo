// Pruebas de orderScenarios (spec 018, RF-13, U11; plan §3 y §6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { orderScenarios } from "./registry.ts";

const list = ["E1", "E2", "E3", "E4", "C1", "C2", "C3"] as const;

test("orden normal: la lista tal cual", () => {
  assert.deepEqual(orderScenarios(list, "normal"), ["E1", "E2", "E3", "E4", "C1", "C2", "C3"]);
});

test("orden inverso: la lista invertida", () => {
  assert.deepEqual(orderScenarios(list, "reverse"), ["C3", "C2", "C1", "E4", "E3", "E2", "E1"]);
});

test("no modifica la lista que recibe y devuelve una copia", () => {
  const input = ["a", "b", "c"];
  const normal = orderScenarios(input, "normal");
  const reverse = orderScenarios(input, "reverse");
  assert.deepEqual(input, ["a", "b", "c"]);
  assert.notEqual(normal, input);
  assert.deepEqual(reverse, ["c", "b", "a"]);
});

test("lista vacía", () => {
  assert.deepEqual(orderScenarios([], "reverse"), []);
});
