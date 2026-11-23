// Limitador asíncrono en ventanas deslizantes para la API de Riot Games (spec 014, RF-37,
// RNF-1, RNF-7; D69, D84, D85; plan, §§2.2, 5.4 y P14-9).
// - Reserva por adelantado todas las consultas de una operación (2, 24 o 24) sobre la ventana
//   deslizante de 2 minutos (100 consultas).
// - Espacia cada consulta real para no superar 20 consultas por segundo, respetando `AbortSignal`.
// - Libera en `release` las consultas reservadas que no se llegaron a usar (D69).
// - `nowMs` y `sleep` son inyectables para pruebas deterministas sin esperas reales (P14-9).
import {
  WINDOW_2MIN_MS,
  canReserveIn2Min,
  pruneTimestamps,
  waitMsForPerSecondLimit,
} from "../domain/riotRateLimiter.ts";

export type SleepFn = (ms: number, signal?: AbortSignal) => Promise<void>;

export interface RiotLimiterOptions {
  /** Reloj en milisegundos (por defecto `Date.now`). */
  nowMs?: () => number;
  /** Espera asíncrona cancelable (por defecto `setTimeout` con soporte de `AbortSignal`). */
  sleep?: SleepFn;
}

/** Cupo reservado para una operación en curso; `remaining` baja en cada `acquire` y llega a 0 en `release`. */
export interface RiotReservation {
  remaining: number;
}

export interface RiotLimiter {
  /** Reserva `count` consultas en la ventana de 2 min, o devuelve `null` si no hay hueco. */
  reserve(count: number): RiotReservation | null;
  /** Consume 1 consulta de la reserva respetando el límite de 20/s y cancelable con `signal`. */
  acquire(reservation: RiotReservation, signal?: AbortSignal): Promise<void>;
  /** Libera las consultas reservadas no usadas (idempotente; llamar siempre en `finally`). */
  release(reservation: RiotReservation): void;
}

function createAbortError(): DOMException {
  return new DOMException("operación cancelada", "AbortError");
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(createAbortError());
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function sleepAbortable(
  sleepFn: SleepFn,
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  if (signal === undefined) {
    await sleepFn(ms);
    return;
  }
  if (signal.aborted) throw createAbortError();

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(createAbortError());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const sleeping = Promise.resolve(sleepFn(ms, signal));
  // Evita rechazos no manejados si `aborted` gana antes de que `sleeping` rechace.
  sleeping.catch(() => undefined);

  try {
    await Promise.race([sleeping, aborted]);
  } finally {
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
}

/** Crea un limitador por instancia de servidor (RF-37, P14-9). */
export function createRiotLimiter(options: RiotLimiterOptions = {}): RiotLimiter {
  const clockMs = options.nowMs ?? Date.now;
  const sleepFn = options.sleep ?? defaultSleep;

  let usedTimestamps: number[] = [];
  let reservedCount = 0;

  return {
    reserve(count) {
      if (!Number.isInteger(count) || count <= 0) {
        throw new RangeError("la reserva de consultas de Riot debe ser un entero positivo");
      }
      const now = clockMs();
      usedTimestamps = pruneTimestamps(usedTimestamps, WINDOW_2MIN_MS, now);
      if (!canReserveIn2Min(usedTimestamps, reservedCount, count, now)) {
        return null;
      }
      reservedCount += count;
      return { remaining: count };
    },

    async acquire(reservation, signal) {
      if (reservation.remaining <= 0) {
        throw new Error("la reserva de consultas de Riot no tiene hueco disponible");
      }
      while (true) {
        if (signal?.aborted) throw createAbortError();
        if (reservation.remaining <= 0) {
          throw new Error("la reserva de consultas de Riot fue liberada");
        }
        const now = clockMs();
        const waitMs = waitMsForPerSecondLimit(usedTimestamps, now);
        if (waitMs === 0) {
          usedTimestamps = pruneTimestamps(usedTimestamps, WINDOW_2MIN_MS, now);
          reservation.remaining -= 1;
          reservedCount = Math.max(0, reservedCount - 1);
          usedTimestamps.push(now);
          return;
        }
        await sleepAbortable(sleepFn, waitMs, signal);
      }
    },

    release(reservation) {
      if (reservation.remaining <= 0) return;
      reservedCount = Math.max(0, reservedCount - reservation.remaining);
      reservation.remaining = 0;
    },
  };
}
