import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { GAME_IDS } from "../../src/domain/games.ts";
import type { GameId } from "../../src/domain/games.ts";
import { ladder, normalizeStep, pointsBand } from "../../src/domain/rankScale.ts";
import {
  canonicalHandle,
  createRng,
  evolveStep,
  hash32,
  isVerified,
  randInt,
  simulateReading,
  stepAt,
} from "../../src/domain/rankSimulator.ts";
import type { SimulatedReading } from "../../src/domain/rankSimulator.ts";
import { simulatedRankProvider } from "../../src/services/rankProvider.ts";
import type { RankProvider } from "../../src/services/rankProvider.ts";

// Spec 004, RF-34, RF-35, RF-36, RF-41, RF-42, RF-43 y RNF-7; plan, sección 4.

const NOW = new Date("2026-10-18T12:00:00.000Z");
const LATER = new Date("2026-10-19T08:30:15.250Z");
const MINUTE = 60_000;

/** Conjuntos de 100 identificadores válidos por juego (plan, 4.4), ya canónicos. */
function handleSet(gameId: GameId): string[] {
  const handles: string[] = [];
  for (let i = 1; i <= 100; i += 1) {
    if (gameId === "lol") handles.push(`jugador${i}#las`);
    else if (gameId === "r6") handles.push(`jugador${i}`);
    else handles.push(`7656119${String(i).padStart(10, "0")}`);
  }
  return handles;
}

const SAMPLE: Readonly<Record<GameId, string>> = {
  lol: "jugador1#las",
  r6: "jugador1",
  cs2: "76561190000000001",
};

const SUMMARY: Readonly<Record<GameId, RegExp>> = {
  lol: /^(Ahri|Jinx|Thresh|Lee Sin|Lux|Ezreal|Leona|Yasuo) · (\d+)\/(\d+)\/(\d+)$/,
  r6: /^(Ash|Thermite|Sledge|Mute|Valkyrie|Thatcher|Smoke|Doc) · (\d+) bajas$/,
  cs2: /^(Mirage|Inferno|Nuke|Ancient|Anubis|Dust II|Train) · (\d+)-(\d+)$/,
};

const DURATION: Readonly<Record<GameId, { min: number; max: number }>> = {
  lol: { min: 20, max: 45 },
  r6: { min: 15, max: 40 },
  cs2: { min: 25, max: 50 },
};

const DELTA: Readonly<Record<GameId, { min: number; max: number }>> = {
  lol: { min: 12, max: 25 },
  r6: { min: 15, max: 35 },
  cs2: { min: 50, max: 300 },
};

function read(gameId: GameId, handle: string, readingNumber: number, now: Date = NOW): SimulatedReading {
  return simulateReading({ gameId, canonicalHandle: handle, readingNumber, now });
}

/** Comprueba los campos del resumen según el juego y el resultado (plan, 4.3). */
function assertSummary(gameId: GameId, summary: string, result: "win" | "loss", label: string): void {
  const match = SUMMARY[gameId].exec(summary);
  assert.ok(match, `${label}: resumen ${summary}`);
  const numbers = match.slice(2).map(Number);
  if (gameId === "lol") {
    const [k, d, a] = numbers;
    assert.ok(k !== undefined && k <= 15 && d !== undefined && d <= 12 && a !== undefined && a <= 20, label);
  } else if (gameId === "r6") {
    const [kills] = numbers;
    assert.ok(kills !== undefined && kills <= 12, label);
  } else {
    const [left, right] = numbers;
    const [own, other] = result === "win" ? [left, right] : [right, left];
    assert.equal(own, 13, label);
    assert.ok(other !== undefined && other <= 11, label);
  }
}

/** Comprueba RF-36 y RF-43 sobre una lectura. */
function assertReadingShape(gameId: GameId, handle: string, n: number, reading: SimulatedReading): void {
  const label = `${gameId} ${handle} n=${n}`;
  const step = stepAt(gameId, handle, n);
  const steps = ladder(gameId);
  assert.ok(step >= 0 && step < steps.length, label);

  const { snapshot } = reading;
  const expectedStep = steps[step];
  assert.ok(expectedStep, label);
  assert.equal(snapshot.tier, expectedStep.tier, label);
  if (expectedStep.division === undefined) assert.equal("division" in snapshot, false, label);
  else assert.equal(snapshot.division, expectedStep.division, label);
  assert.ok(Number.isInteger(snapshot.points), label);
  const band = pointsBand(gameId, step);
  assert.ok(snapshot.points >= band.min, label);
  if (band.max !== null) assert.ok(snapshot.points <= band.max, label);
  assert.equal(snapshot.normalized, normalizeStep(gameId, step), label);
  assert.equal(snapshot.recordedAt.getTime(), NOW.getTime(), label);

  const { matches } = reading;
  assert.ok(matches.length >= 1 && matches.length <= 8, label);
  assert.equal(new Set(matches.map((m) => m.id)).size, matches.length, label);
  assert.equal(reading.mainMatchId, `m-${n}-0`, label);
  const atNow = matches.filter((m) => m.playedAt.getTime() === NOW.getTime());
  assert.equal(atNow.length, 1, label);
  assert.equal(atNow[0]?.id, reading.mainMatchId, label);
  matches.forEach((m, j) => {
    assert.equal(m.id, `m-${n}-${j}`, label);
    assert.equal(m.gameId, gameId, label);
    if (j > 0) assert.ok(NOW.getTime() - m.playedAt.getTime() >= MINUTE, label);
    assert.ok(m.result === "win" || m.result === "loss", label);
    assert.ok(Number.isInteger(m.durationMinutes), label);
    assert.ok(m.durationMinutes >= DURATION[gameId].min && m.durationMinutes <= DURATION[gameId].max, label);
    const magnitude = Math.abs(m.rankDelta);
    assert.ok(magnitude >= DELTA[gameId].min && magnitude <= DELTA[gameId].max, label);
    assert.equal(Math.sign(m.rankDelta), m.result === "win" ? 1 : -1, label);
    assertSummary(gameId, m.summary, m.result, label);
  });
  assert.equal(reading.verified, isVerified(handle), label);
}

describe("primitivas (plan, 4.1)", () => {
  test("hash32 es FNV-1a de 32 bits", () => {
    assert.equal(hash32(""), 0x811c9dc5);
    assert.equal(hash32("a"), 0xe40c292c);
    assert.equal(hash32("foobar"), 0xbf9cf968);
  });

  test("createRng es determinista y devuelve valores en [0, 1)", () => {
    const first = createRng(12345);
    const second = createRng(12345);
    const other = createRng(54321);
    const a = Array.from({ length: 200 }, () => first());
    const b = Array.from({ length: 200 }, () => second());
    const c = Array.from({ length: 200 }, () => other());
    assert.deepStrictEqual(a, b);
    assert.notDeepStrictEqual(a, c);
    for (const value of a) assert.ok(value >= 0 && value < 1);
  });

  test("randInt queda dentro de [min, max] y alcanza los extremos", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const value = randInt(rng, -1, 1);
      assert.ok(Number.isInteger(value) && value >= -1 && value <= 1);
      seen.add(value);
    }
    assert.deepStrictEqual([...seen].sort(), [-1, 0, 1]);
  });

  test("canonicalHandle quita espacios en los extremos y pasa a minúsculas", () => {
    assert.equal(canonicalHandle("  Jugador1#LAS "), "jugador1#las");
    assert.equal(canonicalHandle("\tJUGADOR1\n"), "jugador1");
    assert.equal(canonicalHandle("76561190000000001"), "76561190000000001");
  });
});

describe("determinismo (RF-35, RF-43, RNF-7)", () => {
  test("mismas entradas → la misma lectura", () => {
    for (const gameId of GAME_IDS) {
      for (const n of [0, 1, 5, 30]) {
        assert.deepStrictEqual(read(gameId, SAMPLE[gameId], n), read(gameId, SAMPLE[gameId], n));
      }
    }
  });

  test("mayúsculas y espacios → la misma lectura", () => {
    const variants: Readonly<Record<GameId, readonly string[]>> = {
      lol: ["Jugador1#LAS", "  jugador1#las  ", "JUGADOR1#las"],
      r6: ["JUGADOR1", " Jugador1 ", "jugador1"],
      cs2: [" 76561190000000001", "76561190000000001 "],
    };
    for (const gameId of GAME_IDS) {
      const expected = read(gameId, SAMPLE[gameId], 3);
      for (const variant of variants[gameId]) {
        assert.deepStrictEqual(read(gameId, canonicalHandle(variant), 3), expected, `${gameId} ${variant}`);
      }
    }
  });

  test("mismo n a dos instantes → todo igual salvo las fechas, desplazadas por la diferencia", () => {
    const shift = LATER.getTime() - NOW.getTime();
    for (const gameId of GAME_IDS) {
      for (const handle of handleSet(gameId).slice(0, 10)) {
        for (const n of [0, 1, 7]) {
          const early = read(gameId, handle, n, NOW);
          const late = read(gameId, handle, n, LATER);
          assert.equal(late.snapshot.recordedAt.getTime(), LATER.getTime());
          assert.deepStrictEqual(
            { ...late.snapshot, recordedAt: early.snapshot.recordedAt },
            early.snapshot,
          );
          assert.equal(late.matches.length, early.matches.length);
          late.matches.forEach((match, j) => {
            const before = early.matches[j];
            assert.ok(before);
            assert.equal(match.playedAt.getTime() - before.playedAt.getTime(), shift);
            assert.deepStrictEqual({ ...match, playedAt: before.playedAt }, before);
          });
          assert.equal(late.mainMatchId, early.mainMatchId);
          assert.equal(late.verified, early.verified);
        }
      }
    }
  });

  test("el instante recibido no se modifica", () => {
    const now = new Date(NOW.getTime());
    read("lol", SAMPLE.lol, 2, now);
    assert.equal(now.getTime(), NOW.getTime());
  });
});

describe("lectura, banda y escala (RF-36, RF-43)", () => {
  test("una lectura de cada juego cumple la forma completa", () => {
    for (const gameId of GAME_IDS) assertReadingShape(gameId, SAMPLE[gameId], 0, read(gameId, SAMPLE[gameId], 0));
  });

  test("los 100 identificadores de cada juego y n = 0..30 cumplen la forma completa", () => {
    for (const gameId of GAME_IDS) {
      for (const handle of handleSet(gameId)) {
        for (let n = 0; n <= 30; n += 1) assertReadingShape(gameId, handle, n, read(gameId, handle, n));
      }
    }
  });
});

describe("evolución (RF-42)", () => {
  test("evolveStep no sale de la escala", () => {
    assert.equal(evolveStep(30, 1, 31), 30);
    assert.equal(evolveStep(6, 1, 7), 6);
    assert.equal(evolveStep(35, 1, 36), 35);
    assert.equal(evolveStep(0, -1, 31), 0);
    assert.equal(evolveStep(0, -1, 7), 0);
    assert.equal(evolveStep(0, -1, 36), 0);
    assert.equal(evolveStep(10, 1, 31), 11);
    assert.equal(evolveStep(10, -1, 31), 9);
    assert.equal(evolveStep(10, 0, 31), 10);
  });

  test("±1 escalón como mucho y dentro de la escala: 100 identificadores por juego, n = 0..30", () => {
    for (const gameId of GAME_IDS) {
      const size = ladder(gameId).length;
      for (const handle of handleSet(gameId)) {
        let previous = stepAt(gameId, handle, 0);
        assert.ok(previous >= 0 && previous < size);
        for (let n = 1; n <= 30; n += 1) {
          const current = stepAt(gameId, handle, n);
          assert.ok(current >= 0 && current < size, `${gameId} ${handle} n=${n}`);
          assert.ok(Math.abs(current - previous) <= 1, `${gameId} ${handle} n=${n}`);
          previous = current;
        }
      }
    }
  });

  test("la lectura 0 reparte el escalón por toda la escala", () => {
    for (const gameId of GAME_IDS) {
      const steps = new Set(handleSet(gameId).map((handle) => stepAt(gameId, handle, 0)));
      assert.ok(steps.size > 1, gameId);
    }
  });

  test("la partida principal de n no aparece en las lecturas 0..n − 1", () => {
    for (const gameId of GAME_IDS) {
      for (const handle of handleSet(gameId)) {
        const seen = new Set<string>();
        for (let n = 0; n <= 30; n += 1) {
          const reading = read(gameId, handle, n);
          assert.equal(seen.has(reading.mainMatchId), false, `${gameId} ${handle} n=${n}`);
          for (const match of reading.matches) seen.add(match.id);
        }
      }
    }
  });
});

describe("verificada (RF-41)", () => {
  const examples: readonly { gameId: GameId; handle: string; verified: boolean }[] = [
    { gameId: "lol", handle: "jugador1#las", verified: true },
    { gameId: "lol", handle: "Jugador3#LAS", verified: true },
    { gameId: "lol", handle: "jugador2#las", verified: false },
    { gameId: "lol", handle: "jugador4#las", verified: false },
    { gameId: "r6", handle: "jugador2", verified: true },
    { gameId: "r6", handle: "jugador4", verified: true },
    { gameId: "r6", handle: "jugador1", verified: false },
    { gameId: "r6", handle: "jugador3", verified: false },
    { gameId: "cs2", handle: "76561190000000001", verified: true },
    { gameId: "cs2", handle: "76561190000000003", verified: true },
    { gameId: "cs2", handle: "76561190000000002", verified: false },
    { gameId: "cs2", handle: "76561190000000004", verified: false },
  ];

  test("los 12 ejemplos de la tabla 4.4", () => {
    for (const { gameId, handle, verified } of examples) {
      const canonical = canonicalHandle(handle);
      assert.equal(isVerified(canonical), verified, `${gameId} ${handle}`);
      assert.equal(read(gameId, canonical, 0).verified, verified, `${gameId} ${handle}`);
    }
  });

  test("conjuntos de 100: LoL 51, R6 49, CS2 51 verificados", () => {
    const expected: Readonly<Record<GameId, number>> = { lol: 51, r6: 49, cs2: 51 };
    for (const gameId of GAME_IDS) {
      const count = handleSet(gameId).filter((handle) => isVerified(handle)).length;
      assert.equal(count, expected[gameId], gameId);
      assert.ok(count >= 40 && count <= 60, gameId);
    }
  });

  test("la marca no cambia entre lecturas n = 0..10", () => {
    for (const gameId of GAME_IDS) {
      for (const handle of handleSet(gameId)) {
        const expected = isVerified(handle);
        for (let n = 0; n <= 10; n += 1) {
          assert.equal(read(gameId, handle, n).verified, expected, `${gameId} ${handle} n=${n}`);
        }
      }
    }
  });
});

describe("proveedor de rango (RF-34)", () => {
  test("simulatedRankProvider entrega la lectura del simulador puro", () => {
    const provider: RankProvider = simulatedRankProvider;
    for (const gameId of GAME_IDS) {
      const input = { gameId, canonicalHandle: SAMPLE[gameId], readingNumber: 4, now: NOW };
      assert.deepStrictEqual(provider.read(input), simulateReading(input));
    }
  });
});
