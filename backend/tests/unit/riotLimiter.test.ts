// Pruebas unitarias del limitador asíncrono y del bloqueo por usuario en memoria (spec 014, T5).
// RF-25, RF-28, RF-37, RF-49, RF-51, RNF-1, RNF-7; D63, D69, D84, D85; plan §5.4, P14-2, P14-9.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  RESERVE_CONFIRM,
  RESERVE_CREATE,
  RESERVE_SYNC,
  WINDOW_1SEC_MS,
  WINDOW_2MIN_MS,
} from "../../src/domain/riotRateLimiter.ts";
import { createRiotLimiter } from "../../src/services/riotLimiter.ts";
import { createRiotUserLock } from "../../src/services/riotUserLock.ts";

describe("createRiotLimiter: reservas 2/24/24 y ventana de 2 minutos (RF-37, D84, D85, RNF-1)", () => {
  test("permite reservar hasta 100 consultas en 2 min y rechaza con null al superar el tope", () => {
    let now = 100_000;
    const limiter = createRiotLimiter({
      nowMs: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    // 24 + 24 + 24 + 24 + 2 + 2 = 100
    const r1 = limiter.reserve(RESERVE_CONFIRM);
    const r2 = limiter.reserve(RESERVE_SYNC);
    const r3 = limiter.reserve(RESERVE_CONFIRM);
    const r4 = limiter.reserve(RESERVE_SYNC);
    const r5 = limiter.reserve(RESERVE_CREATE);
    const r6 = limiter.reserve(RESERVE_CREATE);
    assert.ok(r1 && r2 && r3 && r4 && r5 && r6);

    // 101 ya no cabe
    assert.equal(limiter.reserve(RESERVE_CREATE), null);
    assert.equal(limiter.reserve(1), null);
  });

  test("libera sobrantes en release y permite reutilizar el hueco de inmediato (D69)", async () => {
    let now = 200_000;
    const limiter = createRiotLimiter({
      nowMs: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    // 4 reservas de 24 (= 96): no cabe otra de 24
    const active = [
      limiter.reserve(RESERVE_CONFIRM),
      limiter.reserve(RESERVE_CONFIRM),
      limiter.reserve(RESERVE_CONFIRM),
      limiter.reserve(RESERVE_CONFIRM),
    ];
    for (const r of active) assert.ok(r);
    assert.equal(limiter.reserve(RESERVE_CONFIRM), null);

    // La primera confirmación falla por ícono distinto tras 1 consulta y libera las 23 sobrantes
    const first = active[0];
    assert.ok(first);
    await limiter.acquire(first);
    assert.equal(first.remaining, 23);
    limiter.release(first);
    assert.equal(first.remaining, 0);
    // Llamar release dos veces es idempotente
    limiter.release(first);

    // Ahora hay 1 usada + 72 reservadas = 73 → cabe otra reserva de 24 (total 97 <= 100)
    const fifth = limiter.reserve(RESERVE_CONFIRM);
    assert.ok(fifth);
    assert.equal(fifth.remaining, 24);
  });

  test("las consultas usadas salen de la ventana deslizante a los 120 000 ms exactos (D85)", async () => {
    let now = 500_000;
    const limiter = createRiotLimiter({
      nowMs: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    // Gastar 80 consultas en t = 500_000..503_000
    const r = limiter.reserve(80);
    assert.ok(r);
    for (let i = 0; i < 80; i += 1) {
      await limiter.acquire(r);
    }
    // Las 20 primeras se ejecutaron en t = 500_000; la última en 503_000
    const firstBatchAt = 500_000;
    // Con 80 usadas, no cabe una confirmación de 24
    assert.equal(limiter.reserve(RESERVE_CONFIRM), null);

    // Justo 1 ms antes de que salga la primera tanda de 20: siguen 80 activas → no cabe 24
    now = firstBatchAt + WINDOW_2MIN_MS - 1;
    assert.equal(limiter.reserve(RESERVE_CONFIRM), null);

    // A los 120 000 ms exactos desde la primera tanda salen 20 → quedan 60 → cabe 24 (84 <= 100)
    now = firstBatchAt + WINDOW_2MIN_MS;
    const next = limiter.reserve(RESERVE_CONFIRM);
    assert.ok(next);
  });

  test("rechaza reservas inválidas y rechaza acquire si la reserva no tiene consultas pendientes", async () => {
    const limiter = createRiotLimiter({ nowMs: () => 0, sleep: async () => undefined });
    assert.throws(() => limiter.reserve(0), RangeError);
    assert.throws(() => limiter.reserve(-1), RangeError);
    assert.throws(() => limiter.reserve(1.5), RangeError);

    const reservation = limiter.reserve(1);
    assert.ok(reservation);
    await limiter.acquire(reservation);
    await assert.rejects(() => limiter.acquire(reservation));
  });
});

describe("createRiotLimiter: espaciado de 20/s y cancelación por señal (RF-37, RNF-7, P14-9)", () => {
  test("espacia al llegar a 20/s con esperas de menos de 1 s cuando las consultas están repartidas", async () => {
    let now = 10_000;
    const sleeps: number[] = [];
    const limiter = createRiotLimiter({
      nowMs: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });

    const reservation = limiter.reserve(RESERVE_CONFIRM);
    assert.ok(reservation);

    // 20 consultas espaciadas 10 ms entre sí (10_000..10_190) → sin esperas
    for (let i = 0; i < 20; i += 1) {
      await limiter.acquire(reservation);
      now += 10;
    }
    assert.deepEqual(sleeps, []);

    // En now = 10_200, la 21.ª consulta debe esperar hasta 11_000 (800 ms < 1 s)
    await limiter.acquire(reservation);
    assert.equal(sleeps.length, 1);
    assert.equal(sleeps[0], 800);
    assert.ok((sleeps[0] ?? 0) > 0 && (sleeps[0] ?? 0) < WINDOW_1SEC_MS);
    assert.equal(now, 11_000);

    // Las 3 consultas restantes de las 24 también se espacian 10 ms cada una (11_010, 11_020, 11_030)
    await limiter.acquire(reservation);
    await limiter.acquire(reservation);
    await limiter.acquire(reservation);
    assert.deepEqual(sleeps, [800, 10, 10, 10]);
    assert.equal(reservation.remaining, 0);
  });

  test("si la señal ya está cancelada, acquire falla con AbortError sin consumir el cupo", async () => {
    const controller = new AbortController();
    controller.abort();
    const limiter = createRiotLimiter({ nowMs: () => 50_000, sleep: async () => undefined });
    const reservation = limiter.reserve(RESERVE_CREATE);
    assert.ok(reservation);

    await assert.rejects(
      () => limiter.acquire(reservation, controller.signal),
      (err: unknown) => err instanceof Error && err.name === "AbortError",
    );
    assert.equal(reservation.remaining, RESERVE_CREATE);
    limiter.release(reservation);
    assert.equal(reservation.remaining, 0);
  });

  test("cancela la espera del limitador al dispararse la señal de 60 s y libera el resto al salir (RNF-7)", async () => {
    const now = 30_000;
    let sleepStarted = false;
    const limiter = createRiotLimiter({
      nowMs: () => now,
      sleep: (_ms, signal) =>
        new Promise<void>((_resolve, reject) => {
          sleepStarted = true;
          signal?.addEventListener("abort", () =>
            reject(new DOMException("cancelado", "AbortError")),
          );
        }),
    });

    const reservation = limiter.reserve(RESERVE_CONFIRM);
    assert.ok(reservation);
    for (let i = 0; i < 20; i += 1) {
      await limiter.acquire(reservation);
    }
    assert.equal(reservation.remaining, 4);

    const opController = new AbortController();
    const waiting = limiter.acquire(reservation, opController.signal);
    await Promise.resolve();
    assert.equal(sleepStarted, true);

    opController.abort();
    await assert.rejects(
      () => waiting,
      (err: unknown) => err instanceof Error && err.name === "AbortError",
    );
    // Los 4 cupos pendientes no se consumieron y se liberan con release
    assert.equal(reservation.remaining, 4);
    limiter.release(reservation);
    // Quedaron solo 20 usadas → caben 80 más
    assert.ok(limiter.reserve(80));
  });

  test("el sleep por defecto también se cancela de inmediato con AbortSignal sin esperar 1 s", async () => {
    const limiter = createRiotLimiter({ nowMs: () => 1_000 });
    const reservation = limiter.reserve(21);
    assert.ok(reservation);
    for (let i = 0; i < 20; i += 1) {
      await limiter.acquire(reservation);
    }

    const controller = new AbortController();
    const pending = limiter.acquire(reservation, controller.signal);
    controller.abort();
    await assert.rejects(
      () => pending,
      (err: unknown) => err instanceof Error && err.name === "AbortError",
    );
    limiter.release(reservation);
  });
});

describe("createRiotUserLock: bloqueo por usuario en memoria por instancia (RF-25, RF-28, RF-49, P14-2)", () => {
  test("bloquea operaciones concurrentes del mismo usuario y no afecta a otros usuarios", () => {
    const lock = createRiotUserLock();

    assert.equal(lock.tryAcquire("user-1"), true);
    assert.equal(lock.tryAcquire("user-1"), false);
    assert.equal(lock.tryAcquire("user-2"), true);
    assert.equal(lock.tryAcquire("user-2"), false);

    lock.release("user-1");
    assert.equal(lock.tryAcquire("user-1"), true);
    assert.equal(lock.tryAcquire("user-2"), false);

    // Liberar un usuario inexistente o ya liberado es inocuo
    lock.release("user-desconocido");
    lock.release("user-1");
    lock.release("user-1");
    assert.equal(lock.tryAcquire("user-1"), true);
  });

  test("dos instancias de createRiotUserLock mantienen estados independientes", () => {
    const lockA = createRiotUserLock();
    const lockB = createRiotUserLock();

    assert.equal(lockA.tryAcquire("user-1"), true);
    assert.equal(lockB.tryAcquire("user-1"), true);
    lockA.release("user-1");
    assert.equal(lockB.tryAcquire("user-1"), false);
  });
});
