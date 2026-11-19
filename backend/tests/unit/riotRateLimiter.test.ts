import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  RATE_LIMIT_1SEC,
  RATE_LIMIT_2MIN,
  RESERVE_CONFIRM,
  RESERVE_CREATE,
  RESERVE_SYNC,
  WINDOW_1SEC_MS,
  WINDOW_2MIN_MS,
  canReserveIn2Min,
  pruneTimestamps,
  waitMsForPerSecondLimit,
} from "../../src/domain/riotRateLimiter.ts";

// Spec 014, RF-37, RNF-1; D84, D85.

describe("constantes del limitador de Riot (D84, D85, RNF-1)", () => {
  test("límites de ventanas deslizantes y reservas exactas", () => {
    assert.equal(RATE_LIMIT_2MIN, 100);
    assert.equal(WINDOW_2MIN_MS, 120_000);
    assert.equal(RATE_LIMIT_1SEC, 20);
    assert.equal(WINDOW_1SEC_MS, 1_000);
    assert.equal(RESERVE_CREATE, 2);
    assert.equal(RESERVE_CONFIRM, 24);
    assert.equal(RESERVE_SYNC, 24);
  });
});

describe("pruneTimestamps (ventanas deslizantes D85)", () => {
  test("conserva solo marcas estrictamente mayores a nowMs - windowMs sin mutar la entrada", () => {
    const input = Object.freeze([0, 999, 1_000, 1_001, 1_500, 2_000]);
    assert.deepEqual(pruneTimestamps(input, WINDOW_1SEC_MS, 2_000), [1_001, 1_500, 2_000]);
  });

  test("funciona con la ventana de 2 minutos", () => {
    const input = [0, 1, 60_000, 120_000];
    assert.deepEqual(pruneTimestamps(input, WINDOW_2MIN_MS, 120_000), [1, 60_000, 120_000]);
  });
});

describe("canReserveIn2Min (RF-37, D84, D85)", () => {
  test("permite reservar hasta completar 100 entre usadas y reservadas y rechaza al pasar de 100", () => {
    const nowMs = 200_000;
    const used76 = Array.from({ length: 76 }, (_, i) => nowMs - 1_000 - i);
    assert.equal(canReserveIn2Min(used76, 0, RESERVE_CONFIRM, nowMs), true);

    const used77 = Array.from({ length: 77 }, (_, i) => nowMs - 1_000 - i);
    assert.equal(canReserveIn2Min(used77, 0, RESERVE_CONFIRM, nowMs), false);

    const used98 = Array.from({ length: 98 }, (_, i) => nowMs - 1_000 - i);
    assert.equal(canReserveIn2Min(used98, 0, RESERVE_CREATE, nowMs), true);
    assert.equal(canReserveIn2Min([...used98, nowMs], 0, RESERVE_CREATE, nowMs), false);
  });

  test("tiene en cuenta las consultas reservadas por operaciones en curso y su liberación", () => {
    const nowMs = 200_000;
    const used50 = Array.from({ length: 50 }, (_, i) => nowMs - 5_000 - i);
    // 50 usadas + 26 reservadas + 24 pedidas = 100 → cabe
    assert.equal(canReserveIn2Min(used50, 26, RESERVE_SYNC, nowMs), true);
    // 50 usadas + 27 reservadas + 24 pedidas = 101 → no cabe
    assert.equal(canReserveIn2Min(used50, 27, RESERVE_SYNC, nowMs), false);
    // Al liberar 23 sobrantes (27 → 4) vuelve a caber
    assert.equal(canReserveIn2Min(used50, 4, RESERVE_SYNC, nowMs), true);
  });

  test("descarta automáticamente marcas fuera de la ventana deslizante de 2 minutos", () => {
    const base = 100_000;
    const old80 = Array.from({ length: 80 }, () => base);
    // A 1 ms de vencer la ventana: 80 + 24 = 104 → no cabe
    assert.equal(canReserveIn2Min(old80, 0, RESERVE_CONFIRM, base + WINDOW_2MIN_MS - 1), false);
    // Justo a los 120_000 ms: las 80 expiraron → cabe
    assert.equal(canReserveIn2Min(old80, 0, RESERVE_CONFIRM, base + WINDOW_2MIN_MS), true);
  });
});

describe("waitMsForPerSecondLimit (20/s en ventana deslizante, D85)", () => {
  test("devuelve 0 cuando hay menos de 20 consultas en el último segundo", () => {
    const nowMs = 10_000;
    assert.equal(waitMsForPerSecondLimit([], nowMs), 0);
    const nineteen = Array.from({ length: 19 }, (_, i) => nowMs - i);
    assert.equal(waitMsForPerSecondLimit(nineteen, nowMs), 0);
  });

  test("ignora marcas con 1 segundo o más de antigüedad", () => {
    const nowMs = 10_000;
    const mixed = [
      nowMs - WINDOW_1SEC_MS, // justo hace 1 s → fuera
      nowMs - 50_000, // dentro de 2 min pero fuera de 1 s
      ...Array.from({ length: 19 }, (_, i) => nowMs - i * 10),
    ];
    assert.equal(waitMsForPerSecondLimit(mixed, nowMs), 0);
  });

  test("con 20 consultas en el último segundo calcula la espera exacta hasta que salga la más antigua", () => {
    // 20 marcas entre 10_100 y 10_290; en nowMs = 10_350 la más antigua (10_100) vence en 11_100 → 750 ms
    const timestamps = Object.freeze(
      Array.from({ length: 20 }, (_, i) => 10_100 + i * 10).reverse(), // desordenadas
    );
    const wait = waitMsForPerSecondLimit(timestamps, 10_350);
    assert.equal(wait, 750);
    assert.ok(wait > 0 && wait < WINDOW_1SEC_MS);
    // Tras avanzar exactamente `wait` ms, queda hueco inmediato (sin bucle off-by-one)
    assert.equal(waitMsForPerSecondLimit(timestamps, 10_350 + wait), 0);
    assert.equal(waitMsForPerSecondLimit(timestamps, 10_350 + wait - 1), 1);
  });

  test("con 20 consultas en el mismo milisegundo espera hasta t + 1000 ms", () => {
    const burst = Array.from({ length: 20 }, () => 5_000);
    assert.equal(waitMsForPerSecondLimit(burst, 5_000), 1_000);
    assert.equal(waitMsForPerSecondLimit(burst, 5_001), 999);
    assert.equal(waitMsForPerSecondLimit(burst, 5_999), 1);
    assert.equal(waitMsForPerSecondLimit(burst, 6_000), 0);
  });

  test("si hubiera más de 20 marcas activas espera hasta que la 20.ª más reciente salga de la ventana", () => {
    // 21 marcas: una en 1_000 y veinte en 1_200; para bajar a < 20 debe vencer una de las de 1_200 (en 2_200)
    const twentyOne = [1_000, ...Array.from({ length: 20 }, () => 1_200)];
    const wait = waitMsForPerSecondLimit(twentyOne, 1_500);
    assert.equal(wait, 700);
    assert.equal(waitMsForPerSecondLimit(twentyOne, 1_500 + wait), 0);
  });
});
