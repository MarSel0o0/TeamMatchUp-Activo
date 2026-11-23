// Pruebas de weekBlockName (spec 018, RF-21, Definiciones «La semana muestra <título>»; plan §3 y §8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { weekBlockName } from "./ui.ts";

const title = "E2E C1 testigo 0123456789ab";

test("coincide con el nombre accesible del bloque de su título", () => {
  assert.match(`${title}, Viernes 19:00, 1 de 4 jugadores`, weekBlockName(title));
});

test("no coincide con el bloque de otro título que empieza igual", () => {
  assert.doesNotMatch("E2E C1 testigo 0123456789abcd, Viernes 19:00, 1 de 4 jugadores", weekBlockName(title));
  assert.doesNotMatch("E2E C1 testigo ffffffffffff, Viernes 19:00, 1 de 4 jugadores", weekBlockName(title));
});

test("el título va al principio del nombre", () => {
  assert.doesNotMatch(`Otro ${title}, Viernes 19:00, 1 de 4 jugadores`, weekBlockName(title));
});

test("los caracteres especiales del título se toman tal cual", () => {
  const special = "a.b (c)+[d]";
  assert.match(`${special}, Lunes 20:00, 1 de 4 jugadores`, weekBlockName(special));
  assert.doesNotMatch("axb (c)+[d], Lunes 20:00, 1 de 4 jugadores", weekBlockName(special));
});
