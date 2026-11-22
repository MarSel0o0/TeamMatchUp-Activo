// Pruebas de isSameOrigin (spec 018, RF-9; plan §3 y §6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "./origin.ts";

const base = "http://127.0.0.1:3901";

test("mismo origen: la raíz, una ruta, la API y una consulta", () => {
  assert.equal(isSameOrigin("http://127.0.0.1:3901/", base), true);
  assert.equal(isSameOrigin("http://127.0.0.1:3901/agenda/abc", base), true);
  assert.equal(isSameOrigin("http://127.0.0.1:3901/api/auth/login?x=1#y", base), true);
});

test("acepta también un objeto URL", () => {
  assert.equal(isSameOrigin(new URL("http://127.0.0.1:3901/inicio"), base), true);
  assert.equal(isSameOrigin(new URL("https://example.com/"), base), false);
});

test("la baseURL con barra final o con ruta da el mismo origen", () => {
  assert.equal(isSameOrigin("http://127.0.0.1:3901/x", "http://127.0.0.1:3901/"), true);
});

test("otro puerto, otro host, otro esquema u otro dominio no son el mismo origen", () => {
  assert.equal(isSameOrigin("http://127.0.0.1:3001/", base), false);
  assert.equal(isSameOrigin("http://localhost:3901/", base), false);
  assert.equal(isSameOrigin("https://127.0.0.1:3901/", base), false);
  assert.equal(isSameOrigin("ws://127.0.0.1:3901/", base), false);
  assert.equal(isSameOrigin("https://ddragon.leagueoflegends.com/api/versions.json", base), false);
  assert.equal(isSameOrigin("https://fonts.googleapis.com/css2", base), false);
  assert.equal(isSameOrigin("http://127.0.0.1:3901.example.com/", base), false);
  assert.equal(isSameOrigin("http://127.0.0.1@example.com:3901/", base), false);
});

test("data: y blob: cuentan como mismo origen", () => {
  assert.equal(isSameOrigin("data:image/png;base64,AAAA", base), true);
  assert.equal(isSameOrigin("blob:http://127.0.0.1:3901/0b6c1f2a", base), true);
});

test("una dirección que no se puede interpretar no es el mismo origen", () => {
  assert.equal(isSameOrigin("no es una dirección", base), false);
  assert.equal(isSameOrigin("", base), false);
});
