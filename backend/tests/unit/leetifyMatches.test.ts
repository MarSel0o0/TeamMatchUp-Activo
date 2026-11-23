import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { LEETIFY_MATCHES_LIMIT, parseLeetifyMatches } from "../../src/domain/leetify.ts";

// Spec 019, RF-2, RF-3, RF-7, RF-8, RF-9; plan, sección 2.

const match = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "m-1",
  finished_at: "2026-11-20T18:00:00.000Z",
  map_name: "de_mirage",
  outcome: "win",
  score: [13, 9],
  rank: 19309,
  rank_type: 11,
  ...overrides,
});

const body = (recent: unknown): unknown => ({ ranks: { premier: 19309 }, recent_matches: recent });

describe("parseLeetifyMatches: estados de la respuesta (RF-7, RF-8)", () => {
  test("404 (sin perfil) → sin partidas, no fallo (RF-8)", () => {
    assert.deepEqual(parseLeetifyMatches(404, undefined), { kind: "matches", matches: [] });
  });

  test("cualquier otro estado distinto de 200 → fallo (RF-7)", () => {
    for (const status of [400, 401, 403, 429, 500, 503]) {
      assert.deepEqual(parseLeetifyMatches(status, body([match()])), { kind: "failed" }, String(status));
    }
  });

  test("200 sin un objeto legible → fallo (RF-7)", () => {
    for (const bad of [undefined, null, "x", 3, []]) {
      assert.deepEqual(parseLeetifyMatches(200, bad), { kind: "failed" });
    }
  });

  test("recent_matches ausente o nulo → sin partidas (RF-8)", () => {
    assert.deepEqual(parseLeetifyMatches(200, { ranks: {} }), { kind: "matches", matches: [] });
    assert.deepEqual(parseLeetifyMatches(200, body(null)), { kind: "matches", matches: [] });
    assert.deepEqual(parseLeetifyMatches(200, body([])), { kind: "matches", matches: [] });
  });

  test("recent_matches que no es arreglo → fallo (RF-7)", () => {
    assert.deepEqual(parseLeetifyMatches(200, body({ a: 1 })), { kind: "failed" });
    assert.deepEqual(parseLeetifyMatches(200, body("x")), { kind: "failed" });
  });
});

describe("parseLeetifyMatches: cada partida (RF-3, RF-9)", () => {
  test("entrega fecha, mapa, resultado y marcador tal como vienen, sin otros campos (RF-3)", () => {
    assert.deepEqual(parseLeetifyMatches(200, body([match()])), {
      kind: "matches",
      matches: [{ id: "m-1", finishedAt: "2026-11-20T18:00:00.000Z", map: "de_mirage", outcome: "win", score: [13, 9] }],
    });
  });

  test("acepta los tres resultados: win, loss y tie", () => {
    const reading = parseLeetifyMatches(
      200,
      body([
        match({ id: "a", outcome: "win", finished_at: "2026-11-20T03:00:00Z" }),
        match({ id: "b", outcome: "loss", finished_at: "2026-11-20T02:00:00Z" }),
        match({ id: "c", outcome: "tie", score: [12, 12], finished_at: "2026-11-20T01:00:00Z" }),
      ]),
    );
    assert.equal(reading.kind, "matches");
    if (reading.kind !== "matches") return;
    assert.deepEqual(
      reading.matches.map((m) => m.outcome),
      ["win", "loss", "tie"],
    );
  });

  test("omite las partidas sin fecha, mapa, resultado reconocible o marcador de dos números (RF-9)", () => {
    const invalid = [
      match({ finished_at: undefined }),
      match({ finished_at: "no es fecha" }),
      match({ finished_at: 12 }),
      match({ map_name: "" }),
      match({ map_name: null }),
      match({ outcome: "lose" }),
      match({ outcome: undefined }),
      match({ score: [13] }),
      match({ score: [13, 9, 1] }),
      match({ score: [13, "9"] }),
      match({ score: [13, -1] }),
      match({ score: [13.5, 9] }),
      match({ score: null }),
      "no es objeto",
      null,
    ];
    const reading = parseLeetifyMatches(200, body([...invalid, match({ id: "ok" })]));
    assert.equal(reading.kind, "matches");
    if (reading.kind !== "matches") return;
    assert.deepEqual(
      reading.matches.map((m) => m.id),
      ["ok"],
    );
  });

  test("si todas son inválidas → sin partidas (RF-9 → RF-8)", () => {
    assert.deepEqual(parseLeetifyMatches(200, body([match({ outcome: "?" })])), { kind: "matches", matches: [] });
  });

  test("sin id de texto usa la fecha como clave", () => {
    const reading = parseLeetifyMatches(200, body([match({ id: undefined })]));
    assert.equal(reading.kind === "matches" ? reading.matches[0]?.id : undefined, "2026-11-20T18:00:00.000Z");
  });
});

describe("parseLeetifyMatches: orden y tope (RF-2, D3)", () => {
  test("de la más reciente a la más antigua según finished_at", () => {
    const reading = parseLeetifyMatches(
      200,
      body([
        match({ id: "old", finished_at: "2026-11-01T10:00:00Z" }),
        match({ id: "new", finished_at: "2026-11-21T10:00:00Z" }),
        match({ id: "mid", finished_at: "2026-11-10T10:00:00Z" }),
      ]),
    );
    assert.deepEqual(
      reading.kind === "matches" ? reading.matches.map((m) => m.id) : [],
      ["new", "mid", "old"],
    );
  });

  test("como máximo 8: las 8 más recientes", () => {
    assert.equal(LEETIFY_MATCHES_LIMIT, 8);
    const many = Array.from({ length: 12 }, (_, i) =>
      match({ id: `m${i}`, finished_at: new Date(Date.UTC(2026, 10, 1 + i)).toISOString() }),
    );
    const reading = parseLeetifyMatches(200, body(many));
    assert.deepEqual(
      reading.kind === "matches" ? reading.matches.map((m) => m.id) : [],
      ["m11", "m10", "m9", "m8", "m7", "m6", "m5", "m4"],
    );
  });

  test("menos de 8: todas", () => {
    const reading = parseLeetifyMatches(200, body([match({ id: "a" }), match({ id: "b", finished_at: "2026-11-19T00:00:00Z" })]));
    assert.equal(reading.kind === "matches" ? reading.matches.length : -1, 2);
  });
});
